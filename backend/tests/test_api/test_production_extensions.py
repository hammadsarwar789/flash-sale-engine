import uuid
from datetime import datetime, timezone, timedelta
import pytest
from app.core.extensions import db
from app.models.user import User
from app.models.seller import Seller
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.sub_order import SubOrder
from app.models.financials import LedgerEntry
from app.models.return_request import ReturnRequest
from app.models.outbox import OutboxEvent
from app.services.inspection_service import inspection_service
from app.workers.tasks import enforce_vendor_inspection_sla, reconcile_returned_escrow


@pytest.fixture
def setup_return_fixtures(app):
    """Fixture initializing customer, seller, product, order, and sub-order for extension testing."""
    customer = User(
        id=str(uuid.uuid4()),
        email=f"cust_{uuid.uuid4().hex[:6]}@example.com",
        password_hash="hash_cust_pass",
        full_name="Return Customer",
        role="customer"
    )
    seller_user = User(
        id=str(uuid.uuid4()),
        email=f"seller_{uuid.uuid4().hex[:6]}@example.com",
        password_hash="hash_seller_pass",
        full_name="Merchant Owner",
        role="vendor"
    )
    db.session.add_all([customer, seller_user])
    db.session.flush()

    seller = Seller(
        id=str(uuid.uuid4()),
        owner_user_id=seller_user.id,
        store_name="Tech Outlet Central",
        store_slug=f"tech-outlet-{uuid.uuid4().hex[:4]}"
    )
    db.session.add(seller)
    db.session.flush()

    product = Product(
        id=str(uuid.uuid4()),
        sku=f"PROD-{uuid.uuid4().hex[:6]}",
        name="Wireless Headphones",
        price=150.00,
        total_stock=20,
        available_stock=10,
        seller_id=seller.id
    )
    exchange_product = Product(
        id=str(uuid.uuid4()),
        sku=f"EXCH-{uuid.uuid4().hex[:6]}",
        name="Replacement Wireless Headphones (Pro)",
        price=150.00,
        total_stock=10,
        available_stock=5,
        seller_id=seller.id
    )
    db.session.add_all([product, exchange_product])
    db.session.flush()

    master_order = Order(
        id=str(uuid.uuid4()),
        user_id=customer.id,
        total_amount=150.00,
        subtotal=150.00,
        status=OrderStatus.PAID,
        idempotency_key=f"order-key-{uuid.uuid4()}",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1)
    )
    db.session.add(master_order)
    db.session.flush()

    sub_order = SubOrder(
        id=str(uuid.uuid4()),
        order_id=master_order.id,
        seller_id=seller.id,
        subtotal=150.00,
        commission_amount=15.00,
        seller_payout_amount=135.00,
        status="DELIVERED"
    )
    db.session.add(sub_order)
    db.session.flush()

    # Seed pending escrow hold ledger entry
    escrow_hold = LedgerEntry(
        id=str(uuid.uuid4()),
        seller_id=seller.id,
        sub_order_id=sub_order.id,
        entry_type="ESCROW_HOLD",
        amount=135.00,
        status="HELD"
    )
    db.session.add(escrow_hold)
    db.session.commit()

    return {
        "customer": customer,
        "seller": seller,
        "product": product,
        "exchange_product": exchange_product,
        "order": master_order,
        "sub_order": sub_order,
        "escrow_hold": escrow_hold
    }


def test_courier_logistics_webhook(client, setup_return_fixtures):
    """Test 1: Idempotent courier HTTP tracking webhook endpoint."""
    fx = setup_return_fixtures
    return_req = ReturnRequest(
        id=str(uuid.uuid4()),
        order_id=fx["order"].id,
        sub_order_id=fx["sub_order"].id,
        seller_id=fx["seller"].id,
        customer_id=fx["customer"].id,
        product_id=fx["product"].id,
        type="RETURN",
        status="REQUESTED",
        courier_ticket_id="COURIER-TRACK-9988"
    )
    db.session.add(return_req)
    db.session.commit()

    # Webhook payload for status DELIVERED_TO_WAREHOUSE
    payload = {
        "courier_ticket_id": "COURIER-TRACK-9988",
        "status": "DELIVERED_TO_WAREHOUSE"
    }
    response = client.post("/api/v1/webhooks/courier/update", json=payload)
    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data["message"] == "Webhook processed successfully"
    assert res_data["status"] == "ARRIVED_AT_WAREHOUSE"

    # Verify ReturnRequest status updated in DB
    updated_req = db.session.query(ReturnRequest).filter_by(id=return_req.id).first()
    assert updated_req.status == "ARRIVED_AT_WAREHOUSE"

    # Verify OutboxEvent written for notification
    outbox = db.session.query(OutboxEvent).filter_by(aggregate_id=return_req.id).first()
    assert outbox is not None
    assert outbox.event_type == "return.status_arrived_at_warehouse"


def test_warehouse_inspection_path_a_return_and_refund(client, setup_return_fixtures):
    """Test 2: Warehouse Quality Control Inspection Path A (Full Return & Double-Entry Refund)."""
    fx = setup_return_fixtures
    initial_stock = fx["product"].available_stock

    return_req = ReturnRequest(
        id=str(uuid.uuid4()),
        order_id=fx["order"].id,
        sub_order_id=fx["sub_order"].id,
        seller_id=fx["seller"].id,
        customer_id=fx["customer"].id,
        product_id=fx["product"].id,
        type="RETURN",
        status="ARRIVED_AT_WAREHOUSE",
        courier_ticket_id=f"TICK-{uuid.uuid4().hex[:6]}"
    )
    db.session.add(return_req)
    db.session.commit()

    # Process warehouse inspection (Passed QC)
    res = inspection_service.process_warehouse_inspection(
        return_id=return_req.id,
        inspection_passed=True,
        inspector_notes="Box intact, all accessories included."
    )
    assert res["status"] == "SUCCESS"
    assert res["next_action"] == "REFUNDED"

    # Verify ReturnRequest status
    updated_req = db.session.query(ReturnRequest).filter_by(id=return_req.id).first()
    assert updated_req.status == "REFUNDED"
    assert updated_req.inspector_notes == "Box intact, all accessories included."

    # Verify Stock Restocked in DB (+1)
    restocked_product = db.session.query(Product).filter_by(id=fx["product"].id).first()
    assert restocked_product.available_stock == initial_stock + 1

    # Verify Double-Entry Refund Ledger Entry Created
    refund_ledger = db.session.query(LedgerEntry).filter_by(
        seller_id=fx["seller"].id,
        entry_type="REFUND"
    ).first()
    assert refund_ledger is not None
    assert float(refund_ledger.amount) == -150.00
    assert refund_ledger.status == "COMPLETED"

    # Verify Pending Escrow Hold Cancelled
    cancelled_hold = db.session.query(LedgerEntry).filter_by(id=fx["escrow_hold"].id).first()
    assert cancelled_hold.status == "CANCELLED_DUE_TO_RETURN"


def test_warehouse_inspection_path_b_exchange(client, setup_return_fixtures):
    """Test 3: Warehouse Quality Control Inspection Path B (Replacement Item Release)."""
    fx = setup_return_fixtures
    initial_exchange_stock = fx["exchange_product"].available_stock

    return_req = ReturnRequest(
        id=str(uuid.uuid4()),
        order_id=fx["order"].id,
        sub_order_id=fx["sub_order"].id,
        seller_id=fx["seller"].id,
        customer_id=fx["customer"].id,
        product_id=fx["product"].id,
        exchange_product_id=fx["exchange_product"].id,
        type="EXCHANGE",
        status="ARRIVED_AT_WAREHOUSE",
        courier_ticket_id=f"EXCH-{uuid.uuid4().hex[:6]}"
    )
    db.session.add(return_req)
    db.session.commit()

    # Process inspection
    res = inspection_service.process_warehouse_inspection(
        return_id=return_req.id,
        inspection_passed=True,
        inspector_notes="Item verified, replacement dispatched."
    )
    assert res["status"] == "SUCCESS"
    assert res["next_action"] == "EXCHANGE_DISPATCHED"

    # Verify Exchange Product Stock Deducted (-1)
    exch_product = db.session.query(Product).filter_by(id=fx["exchange_product"].id).first()
    assert exch_product.available_stock == initial_exchange_stock - 1


def test_vendor_sla_auto_approval_beat_task(client, setup_return_fixtures):
    """Test 4: Celery Beat task auto-approving returns stuck past 48-hour SLA cutoff."""
    fx = setup_return_fixtures

    # Overdue return request (updated 50 hours ago)
    overdue_req = ReturnRequest(
        id=str(uuid.uuid4()),
        order_id=fx["order"].id,
        sub_order_id=fx["sub_order"].id,
        seller_id=fx["seller"].id,
        customer_id=fx["customer"].id,
        product_id=fx["product"].id,
        type="RETURN",
        status="ARRIVED_AT_WAREHOUSE",
        courier_ticket_id=f"SLA-{uuid.uuid4().hex[:6]}"
    )
    overdue_req.updated_at = datetime.now(timezone.utc) - timedelta(hours=50)
    db.session.add(overdue_req)
    db.session.commit()

    # Execute SLA enforcement engine directly
    result = inspection_service.enforce_vendor_inspection_sla()
    assert result["status"] == "sla_enforced"
    assert result["approved_count"] >= 1

    # Verify overdue return automatically transitioned to REFUNDED
    updated_req = db.session.query(ReturnRequest).filter_by(id=overdue_req.id).first()
    assert updated_req.status == "REFUNDED"
    assert updated_req.inspector_notes == "SYSTEM_AUTO_APPROVAL_VENDOR_SLA_BREACH"
