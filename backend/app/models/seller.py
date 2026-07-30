import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class Seller(db.Model):
    """Multi-vendor seller entity model."""

    __tablename__ = "sellers"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_user_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    store_name = db.Column(db.String(150), nullable=False)
    store_slug = db.Column(db.String(150), unique=True, nullable=False, index=True)
    business_registration_no = db.Column(db.String(100), nullable=True)
    tax_id = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(32), nullable=False, default="PENDING", index=True)  # PENDING, APPROVED, SUSPENDED, REJECTED
    commission_rate = db.Column(db.Numeric(5, 2), nullable=False, default=10.00)
    payout_method = db.Column(db.String(32), nullable=True, default="BANK_TRANSFER")
    payout_account_ref = db.Column(db.String(150), nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = db.relationship("User", foreign_keys=[owner_user_id])
    staff = db.relationship("SellerStaff", back_populates="seller", cascade="all, delete-orphan")
    kyc_documents = db.relationship("SellerKYCDocument", back_populates="seller", cascade="all, delete-orphan")
    warehouses = db.relationship("Warehouse", back_populates="seller", cascade="all, delete-orphan")
    products = db.relationship("Product", back_populates="seller")

    def to_dict(self):
        return {
            "id": self.id,
            "owner_user_id": self.owner_user_id,
            "owner_name": self.owner.full_name if self.owner else "Store Owner",
            "owner_email": self.owner.email if self.owner else None,
            "store_name": self.store_name,
            "store_slug": self.store_slug,
            "business_registration_no": self.business_registration_no,
            "tax_id": self.tax_id,
            "status": self.status,
            "commission_rate": float(self.commission_rate),
            "payout_method": self.payout_method,
            "payout_account_ref": self.payout_account_ref,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "kyc_documents": [doc.to_dict() for doc in self.kyc_documents] if self.kyc_documents else [],
        }


class SellerStaff(db.Model):
    """Sub-users associated with a seller store (owner, manager, staff)."""

    __tablename__ = "seller_staff"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    seller_id = db.Column(db.String(36), db.ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.String(64), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = db.Column(db.String(32), nullable=False, default="STAFF")  # OWNER, MANAGER, STAFF

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    seller = db.relationship("Seller", back_populates="staff")
    user = db.relationship("User")

    __table_args__ = (
        db.UniqueConstraint("seller_id", "user_id", name="uq_seller_staff_user"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "seller_id": self.seller_id,
            "user_id": self.user_id,
            "user_email": self.user.email if self.user else None,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SellerKYCDocument(db.Model):
    """KYC and verification documents for seller store approval."""

    __tablename__ = "seller_kyc_documents"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    seller_id = db.Column(db.String(36), db.ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False, index=True)
    doc_type = db.Column(db.String(64), nullable=False)  # CNIC, BUSINESS_LICENSE, TAX_CERTIFICATE
    file_url = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="SUBMITTED")  # SUBMITTED, VERIFIED, REJECTED
    reviewed_by = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=True)
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    seller = db.relationship("Seller", back_populates="kyc_documents")
    reviewer = db.relationship("User", foreign_keys=[reviewed_by])

    def to_dict(self):
        return {
            "id": self.id,
            "seller_id": self.seller_id,
            "doc_type": self.doc_type,
            "file_url": self.file_url,
            "status": self.status,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Warehouse(db.Model):
    """Warehouse fulfillment center model (seller-owned or central platform)."""

    __tablename__ = "warehouses"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    seller_id = db.Column(db.String(36), db.ForeignKey("sellers.id", ondelete="CASCADE"), nullable=True, index=True)  # NULL = Platform Central
    name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.Text, nullable=False)
    city = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    seller = db.relationship("Seller", back_populates="warehouses")

    def to_dict(self):
        return {
            "id": self.id,
            "seller_id": self.seller_id,
            "seller_name": self.seller.store_name if self.seller else "Platform Central Warehouse",
            "name": self.name,
            "address": self.address,
            "city": self.city,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
