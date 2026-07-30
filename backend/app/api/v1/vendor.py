from datetime import datetime, timezone
from flask import request, jsonify, g
from flask_smorest import Blueprint
from app.core.extensions import db
from app.api.decorators import jwt_required
from app.models.seller import Seller, SellerStaff, SellerKYCDocument
from app.models.user import User

vendor_bp = Blueprint("vendor", "vendor", url_prefix="/api/v1/vendor", description="Multi-Vendor Seller Desk & Onboarding")


@vendor_bp.route("/onboarding", methods=["POST"])
@jwt_required
def apply_vendor_onboarding():
    """Submit a multi-vendor merchant application with business info and KYC documents."""
    user_id = g.current_user_id
    data = request.get_json() or {}

    store_name = data.get("store_name", "").strip()
    store_slug = data.get("store_slug", "").strip().lower().replace(" ", "-")
    business_reg = data.get("business_registration_no")
    tax_id = data.get("tax_id")
    payout_method = data.get("payout_method", "BANK_TRANSFER")
    payout_account_ref = data.get("payout_account_ref")
    kyc_docs = data.get("kyc_documents", [])

    if not store_name or not store_slug:
        return jsonify({"error": "Bad Request", "message": "Store name and store slug are required."}), 400

    existing_slug = db.session.query(Seller).filter_by(store_slug=store_slug).first()
    if existing_slug:
        return jsonify({"error": "Conflict", "message": f"Store slug '{store_slug}' is already taken by another merchant."}), 409

    existing_seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()
    if existing_seller:
        return jsonify({"error": "Conflict", "message": "You have already submitted a vendor merchant application.", "seller": existing_seller.to_dict()}), 409

    seller = Seller(
        owner_user_id=user_id,
        store_name=store_name,
        store_slug=store_slug,
        business_registration_no=business_reg,
        tax_id=tax_id,
        status="PENDING",
        payout_method=payout_method,
        payout_account_ref=payout_account_ref,
    )
    db.session.add(seller)
    db.session.flush()

    staff_entry = SellerStaff(seller_id=seller.id, user_id=user_id, role="OWNER")
    db.session.add(staff_entry)

    for doc in kyc_docs:
        doc_type = doc.get("doc_type", "BUSINESS_LICENSE")
        file_url = doc.get("file_url", "")
        if file_url:
            kyc_entry = SellerKYCDocument(seller_id=seller.id, doc_type=doc_type, file_url=file_url, status="SUBMITTED")
            db.session.add(kyc_entry)

    user = db.session.query(User).filter_by(id=user_id).first()
    if user:
        user.role = "vendor"
        user.user_type = "VENDOR"
        user.status = "PENDING_APPROVAL"

    db.session.commit()

    return jsonify({
        "message": "Vendor merchant application submitted successfully! Pending administrative review.",
        "seller": seller.to_dict(),
    }), 201


@vendor_bp.route("/profile", methods=["GET"])
@jwt_required
def get_vendor_profile():
    """Retrieve seller store profile and onboarding status for current merchant user."""
    user_id = g.current_user_id
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()

    if not seller:
        staff_entry = db.session.query(SellerStaff).filter_by(user_id=user_id).first()
        if staff_entry:
            seller = staff_entry.seller

    if not seller:
        return jsonify({"has_seller_account": False, "message": "No seller store account associated with this user."}), 404

    return jsonify({
        "has_seller_account": True,
        "seller": seller.to_dict(),
    }), 200
