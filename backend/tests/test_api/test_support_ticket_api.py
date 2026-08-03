import uuid
from datetime import datetime, timezone, timedelta
import pytest
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.models.seller import Seller
from app.core.extensions import db


@pytest.fixture(autouse=True)
def seed_test_purchase(test_user):
    """Seed a valid purchase order for test_user so ticket creation validation passes."""
    existing = db.session.query(Order).filter_by(user_id=test_user.id).first()
    if not existing:
        order = Order(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            total_amount=99.99,
            status=OrderStatus.PAID,
            idempotency_key=f"test-seed-{uuid.uuid4()}",
            expires_at=datetime.now(timezone.utc) + timedelta(days=1)
        )
        db.session.add(order)
        db.session.commit()


def test_customer_create_support_ticket(client, user_token):
    """Test customer submitting a new support ticket."""
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "subject": "Wrong size delivered",
        "message": "Hi, I ordered size 43 shoes but received size 41. Please assist.",
        "category": "RETURNS",
        "priority": "HIGH"
    }
    response = client.post("/api/v1/support/tickets", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.get_json()
    assert "ticket" in data
    assert data["ticket"]["subject"] == "Wrong size delivered"
    assert data["ticket"]["category"] == "RETURNS"
    assert data["ticket"]["priority"] == "HIGH"
    assert data["ticket"]["status"] == "OPEN"
    assert data["ticket"]["ticket_number"].startswith("TICK-")


def test_purchaser_only_validation(client):
    """Test non-purchaser user blocked from creating tickets with 403 Forbidden."""
    from werkzeug.security import generate_password_hash
    from app.core.security import create_access_token

    non_purchaser = User(
        id=str(uuid.uuid4()),
        email=f"nopurchase_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=generate_password_hash("Password123!"),
        full_name="Non Purchaser",
        role="customer",
        is_email_verified=True,
        status="ACTIVE"
    )
    db.session.add(non_purchaser)
    db.session.commit()

    token = create_access_token(
        user_id=non_purchaser.id,
        role="customer",
        secret_key=client.application.config["JWT_SECRET_KEY"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt ticket creation
    response = client.post("/api/v1/support/tickets", json={"subject": "No Purchase Query", "message": "I have not bought anything."}, headers=headers)
    assert response.status_code == 403
    assert "Forbidden" in response.get_json()["error"]
    assert "purchased products" in response.get_json()["message"]


def test_list_support_tickets(client, user_token):
    """Test fetching paginated support tickets."""
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/support/tickets", json={"subject": "Order Query", "message": "Where is my order?"}, headers=headers)

    response = client.get("/api/v1/support/tickets", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert "items" in data
    assert len(data["items"]) >= 1


def test_ticket_detail_and_reply(client, user_token):
    """Test viewing ticket thread detail and posting a reply message."""
    headers = {"Authorization": f"Bearer {user_token}"}
    create_res = client.post("/api/v1/support/tickets", json={"subject": "Damaged Box", "message": "The outer box was torn."}, headers=headers)
    ticket_id = create_res.get_json()["ticket"]["id"]

    # Get Ticket Detail
    detail_res = client.get(f"/api/v1/support/tickets/{ticket_id}", headers=headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.get_json()
    assert detail_data["subject"] == "Damaged Box"
    assert len(detail_data["messages"]) == 1

    # Add Reply
    reply_res = client.post(f"/api/v1/support/tickets/{ticket_id}/reply", json={"message": "Here is an image link of the box."}, headers=headers)
    assert reply_res.status_code == 201
    reply_data = reply_res.get_json()
    assert reply_data["ticket_message"]["message"] == "Here is an image link of the box."


def test_assign_agent_and_update_status(client, user_token, admin_token):
    """Test admin assigning an agent and changing ticket status."""
    headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    create_res = client.post("/api/v1/support/tickets", json={"subject": "Refund Request", "message": "Item arrived broken."}, headers=headers)
    ticket_id = create_res.get_json()["ticket"]["id"]

    # Admin Assign Agent
    assign_res = client.post(f"/api/v1/support/tickets/{ticket_id}/assign", json={}, headers=admin_headers)
    assert assign_res.status_code == 200
    assert assign_res.get_json()["ticket"]["status"] == "IN_PROGRESS"

    # Update Status to RESOLVED
    status_res = client.put(f"/api/v1/support/tickets/{ticket_id}/status", json={"status": "RESOLVED"}, headers=admin_headers)
    assert status_res.status_code == 200
    assert status_res.get_json()["ticket"]["status"] == "RESOLVED"


def test_support_dashboard_metrics(client, admin_token):
    """Test fetching support metrics dashboard."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    metrics_res = client.get("/api/v1/support/tickets/dashboard/metrics", headers=admin_headers)
    assert metrics_res.status_code == 200
    data = metrics_res.get_json()
    assert "open_tickets" in data
    assert "critical_tickets" in data
    assert "sla_compliance_percentage" in data


def test_ai_summarization_and_rag_suggested_reply(client, user_token, admin_token):
    """Test AI summarization & Cosine Similarity RAG response generation."""
    headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    create_res = client.post("/api/v1/support/tickets", json={"subject": "Damaged Item Return", "message": "The product arrived broken, I need a replacement exchange."}, headers=headers)
    ticket_id = create_res.get_json()["ticket"]["id"]

    # AI Summarize
    sum_res = client.post(f"/api/v1/support/tickets/{ticket_id}/summarize", json={}, headers=admin_headers)
    assert sum_res.status_code == 200
    assert "ai_metadata" in sum_res.get_json()

    # RAG Suggested Reply
    rag_res = client.post(f"/api/v1/support/tickets/{ticket_id}/suggest-reply", json={}, headers=admin_headers)
    assert rag_res.status_code == 200
    rag_data = rag_res.get_json()
    assert "suggested_reply" in rag_data
    assert "confidence" in rag_data
    assert "vector_similarity_score" in rag_data
    assert len(rag_data["source_documents"]) > 0


def test_marshmallow_validation_and_domain_rbac_enforcement(client, user_token, admin_token):
    """Test Marshmallow input validation and domain RBAC state transitions."""
    headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Invalid Marshmallow Request (subject too short)
    invalid_res = client.post("/api/v1/support/tickets", json={"subject": "Hi", "message": "Short"}, headers=headers)
    assert invalid_res.status_code == 400
    assert "Validation Error" in invalid_res.get_json()["error"]

    # 2. Valid Ticket Creation
    valid_res = client.post("/api/v1/support/tickets", json={"subject": "Valid Subject Text", "message": "Detailed description of customer complaint."}, headers=headers)
    assert valid_res.status_code == 201
    ticket_id = valid_res.get_json()["ticket"]["id"]

    # 3. Domain RBAC Enforcement: Customer attempting to mark RESOLVED -> 403 Forbidden
    rbac_fail = client.put(f"/api/v1/support/tickets/{ticket_id}/status", json={"status": "RESOLVED"}, headers=headers)
    assert rbac_fail.status_code == 403
    assert "Permission Error" in rbac_fail.get_json()["error"]

    # 4. Domain RBAC Enforcement: Customer cancelling own ticket to CLOSED -> 200 OK
    rbac_pass = client.put(f"/api/v1/support/tickets/{ticket_id}/status", json={"status": "CLOSED"}, headers=headers)
    assert rbac_pass.status_code == 200
    assert rbac_pass.get_json()["ticket"]["status"] == "CLOSED"


def test_reply_to_closed_ticket_blocked(client, user_token, admin_token):
    """Test that replying to a CLOSED or RESOLVED ticket returns 403 Forbidden."""
    headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    create_res = client.post("/api/v1/support/tickets", json={"subject": "Closing Query", "message": "Closing this ticket request."}, headers=headers)
    ticket_id = create_res.get_json()["ticket"]["id"]

    # Close ticket
    client.put(f"/api/v1/support/tickets/{ticket_id}/status", json={"status": "CLOSED"}, headers=headers)

    # Attempt to reply to closed ticket -> 403 Forbidden
    reply_res = client.post(f"/api/v1/support/tickets/{ticket_id}/reply", json={"message": "Can I add one more message?"}, headers=headers)
    assert reply_res.status_code == 403
    assert "Forbidden" in reply_res.get_json()["error"]
    assert "Cannot reply to a ticket with status 'CLOSED'" in reply_res.get_json()["message"]
