import pytest
from app import create_app
from app.core.extensions import db
from app.core.security import hash_password, create_access_token
from app.models.tenant import Tenant, Outlet
from app.models.user import User
from app.models.rbac import Role, Permission, UserRole, UserOutletScope
from app.models.approval import RegistrationRequest, ApprovalAuditLog
from app.models.outlet_inventory import OutletInventory


@pytest.fixture
def app_instance():
    """Create testing app instance with SQLite test database."""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app_instance):
    return app_instance.test_client()


def test_multi_tenant_outlet_creation(app_instance):
    """Phase 1 Test: Verify multi-tenant enterprise and outlet creation."""
    with app_instance.app_context():
        tenant = Tenant(name="Enterprise HQ", domain="hq.store.com")
        db.session.add(tenant)
        db.session.commit()

        outlet_1 = Outlet(tenant_id=tenant.id, code="OUT-001", name="North Outlet")
        outlet_2 = Outlet(tenant_id=tenant.id, code="OUT-002", name="South Outlet")
        db.session.add_all([outlet_1, outlet_2])
        db.session.commit()

        assert tenant.id.startswith("ten_")
        assert outlet_1.id.startswith("out_")
        assert len(tenant.outlets) == 2


def test_scope_aware_rbac_middleware(client, app_instance):
    """Phase 2 & Scope Access Test: Verify outlet-level scope isolation."""
    with app_instance.app_context():
        tenant = Tenant(name="Enterprise HQ")
        db.session.add(tenant)
        db.session.commit()

        outlet_1 = Outlet(tenant_id=tenant.id, code="OUT-001", name="North Outlet")
        outlet_2 = Outlet(tenant_id=tenant.id, code="OUT-002", name="South Outlet")
        db.session.add_all([outlet_1, outlet_2])
        db.session.commit()

        perm_read = Permission(code="outlet:stock:read", module="stock", description="Read store stock")
        db.session.add(perm_read)
        db.session.commit()

        role_manager = Role(tenant_id=tenant.id, name="Outlet Manager")
        role_manager.permissions.append(perm_read)
        db.session.add(role_manager)
        db.session.commit()

        user = User(
            email="manager@outlet1.com",
            password_hash=hash_password("Pass123!"),
            full_name="Outlet 1 Manager",
            tenant_id=tenant.id,
            status="ACTIVE",
        )
        db.session.add(user)
        db.session.commit()

        db.session.add(UserRole(user_id=user.id, role_id=role_manager.id))
        db.session.add(UserOutletScope(user_id=user.id, outlet_id=outlet_1.id))
        db.session.commit()

        # Seed inventory
        inv1 = OutletInventory(outlet_id=outlet_1.id, product_sku="SKU-AAA", quantity_available=100)
        inv2 = OutletInventory(outlet_id=outlet_2.id, product_sku="SKU-AAA", quantity_available=50)
        db.session.add_all([inv1, inv2])
        db.session.commit()

        # Generate scoped token for Manager of Outlet 1
        secret_key = app_instance.config["SECRET_KEY"]
        token = create_access_token(
            user_id=user.id,
            role="user",
            secret_key=secret_key,
            context={
                "tenant_id": tenant.id,
                "is_enterprise_admin": False,
                "assigned_outlets": [outlet_1.id],
                "roles": ["Outlet Manager"],
                "permissions": ["outlet:stock:read"],
            },
        )
        headers = {"Authorization": f"Bearer {token}"}

        # Access assigned Outlet 1 -> Expect 200 OK
        resp1 = client.get(f"/api/v1/outlets/{outlet_1.id}/inventory", headers=headers)
        assert resp1.status_code == 200

        # Attempt access to unassigned Outlet 2 -> Expect 403 Forbidden Scope Access
        resp2 = client.get(f"/api/v1/outlets/{outlet_2.id}/inventory", headers=headers)
        assert resp2.status_code == 403
        assert "Forbidden Scope Access" in resp2.json["error"]


def test_registration_approval_workflow(app_instance):
    """Phase 3 Test: Verify registration queuing and administrative approval."""
    with app_instance.app_context():
        tenant = Tenant(name="Enterprise HQ")
        db.session.add(tenant)
        db.session.commit()

        req = RegistrationRequest(
            tenant_id=tenant.id,
            applicant_email="vendor@supplier.com",
            applicant_name="Acme Supplies",
            request_type="VENDOR_REGISTRATION",
            payload={"company": "Acme Inc", "password": "SecureVendorPass123"},
            status="PENDING",
        )
        db.session.add(req)
        db.session.commit()

        assert req.status == "PENDING"

        # Simulate Admin approval action
        req.status = "APPROVED"
        new_user = User(
            email=req.applicant_email,
            password_hash=hash_password(req.payload["password"]),
            full_name=req.applicant_name,
            tenant_id=req.tenant_id,
            user_type="VENDOR",
            status="ACTIVE",
        )
        db.session.add(new_user)
        db.session.flush()

        audit_log = ApprovalAuditLog(
            request_id=req.id,
            actor_id="usr_admin_01",
            action="APPROVED",
            comments="Approved vendor credentials.",
        )
        db.session.add(audit_log)
        db.session.commit()

        assert new_user.status == "ACTIVE"
        assert audit_log.action == "APPROVED"


def test_inter_outlet_stock_transfer(app_instance):
    """Phase 4 Test: Verify atomic inter-outlet stock transfer."""
    with app_instance.app_context():
        from app.services.multi_outlet_service import MultiOutletService

        tenant = Tenant(name="Enterprise HQ")
        db.session.add(tenant)
        db.session.commit()

        out1 = Outlet(tenant_id=tenant.id, code="O1", name="Outlet 1")
        out2 = Outlet(tenant_id=tenant.id, code="O2", name="Outlet 2")
        db.session.add_all([out1, out2])
        db.session.commit()

        MultiOutletService.adjust_stock(out1.id, "SKU-TRANSFER", 50)

        success, msg, res = MultiOutletService.transfer_stock(out1.id, out2.id, "SKU-TRANSFER", 20)
        assert success is True

        inv1 = db.session.query(OutletInventory).filter_by(outlet_id=out1.id, product_sku="SKU-TRANSFER").first()
        inv2 = db.session.query(OutletInventory).filter_by(outlet_id=out2.id, product_sku="SKU-TRANSFER").first()

        assert inv1.quantity_available == 30
        assert inv2.quantity_available == 20
