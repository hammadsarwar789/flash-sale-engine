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


# --- Vendor Sub-Orders & Fulfillment Queue ---

@vendor_bp.route("/sub-orders", methods=["GET"])
@jwt_required
def list_vendor_sub_orders():
    """Retrieve sub-orders assigned to current merchant store for order fulfillment."""
    from app.models.sub_order import SubOrder
    user_id = g.current_user_id
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()

    if not seller:
        staff_entry = db.session.query(SellerStaff).filter_by(user_id=user_id).first()
        if staff_entry:
            seller = staff_entry.seller

    if not seller:
        return jsonify({"error": "Forbidden", "message": "You must be an approved merchant owner or staff to view sub-orders."}), 403

    status_filter = request.args.get("status", "").upper()
    query = db.session.query(SubOrder).filter_by(seller_id=seller.id)
    if status_filter:
        query = query.filter_by(status=status_filter)

    sub_orders = query.order_by(SubOrder.created_at.desc()).all()
    return jsonify([so.to_dict() for so in sub_orders]), 200


@vendor_bp.route("/sub-orders/<string:sub_order_id>/status", methods=["PATCH"])
@jwt_required
def update_vendor_sub_order_status(sub_order_id: str):
    """Update fulfillment status of a vendor sub-order (e.g. PACKED, SHIPPED, DELIVERED)."""
    from app.models.sub_order import SubOrder
    user_id = g.current_user_id
    data = request.get_json() or {}
    new_status = data.get("status", "").upper()

    if new_status not in ["PENDING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]:
        return jsonify({"error": "Bad Request", "message": "Invalid sub-order status."}), 400

    sub_order = db.session.query(SubOrder).filter_by(id=sub_order_id).first()
    if not sub_order:
        return jsonify({"error": "Not Found", "message": f"Sub-order '{sub_order_id}' not found."}), 404

    # Verify authorization
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()
    is_owner_or_staff = (seller and seller.id == sub_order.seller_id)
    if not is_owner_or_staff:
        staff_entry = db.session.query(SellerStaff).filter_by(user_id=user_id, seller_id=sub_order.seller_id).first()
        is_owner_or_staff = bool(staff_entry)

    user = db.session.query(User).filter_by(id=user_id).first()
    if not is_owner_or_staff and (not user or user.role != "admin"):
        return jsonify({"error": "Forbidden", "message": "You are not authorized to update this sub-order."}), 403

    sub_order.status = new_status
    db.session.commit()

    if new_status == "DELIVERED":
        try:
            from app.services.escrow_engine import set_sub_order_delivery_escrow
            set_sub_order_delivery_escrow(sub_order_id)
        except Exception as escrow_err:
            pass

    return jsonify({"message": f"Sub-order status updated to '{new_status}'.", "sub_order": sub_order.to_dict()}), 200


# --- Merchant Financial Ledger & Payout Requests ---

@vendor_bp.route("/finance", methods=["GET"])
@jwt_required
def get_vendor_finance():
    """Retrieve financial ledger telemetry, escrow held balances, and payout request history."""
    from sqlalchemy import func
    from app.models.financials import LedgerEntry, PayoutRequest
    from app.services.escrow_engine import release_matured_escrow

    # Auto-release any matured escrow entries whose return window has passed
    try:
        release_matured_escrow()
    except Exception as err:
        logger.warning(f"On-demand escrow release warning: {err}")

    user_id = g.current_user_id
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()

    if not seller:
        staff_entry = db.session.query(SellerStaff).filter_by(user_id=user_id).first()
        if staff_entry:
            seller = staff_entry.seller

    if not seller:
        return jsonify({"error": "Forbidden", "message": "You must be an approved merchant owner to access financial ledger."}), 403

    # Calculate balances
    held_res = db.session.query(func.coalesce(func.sum(LedgerEntry.amount), 0.00)).filter(
        LedgerEntry.seller_id == seller.id,
        LedgerEntry.entry_type == "ESCROW_HOLD",
        LedgerEntry.status == "HELD"
    ).scalar()

    released_res = db.session.query(func.coalesce(func.sum(LedgerEntry.amount), 0.00)).filter(
        LedgerEntry.seller_id == seller.id,
        LedgerEntry.entry_type == "ESCROW_RELEASE",
        LedgerEntry.status == "RELEASED"
    ).scalar()

    paid_res = db.session.query(func.coalesce(func.sum(PayoutRequest.amount), 0.00)).filter(
        PayoutRequest.seller_id == seller.id,
        PayoutRequest.status == "PAID"
    ).scalar()

    pending_payouts_res = db.session.query(func.coalesce(func.sum(PayoutRequest.amount), 0.00)).filter(
        PayoutRequest.seller_id == seller.id,
        PayoutRequest.status.in_(["REQUESTED", "PROCESSING"])
    ).scalar()

    escrow_held_balance = float(held_res)
    available_payout_balance = max(0.00, round(float(released_res) - float(paid_res) - float(pending_payouts_res), 2))

    ledger = db.session.query(LedgerEntry).filter_by(seller_id=seller.id).order_by(LedgerEntry.created_at.desc()).limit(20).all()
    payouts = db.session.query(PayoutRequest).filter_by(seller_id=seller.id).order_by(PayoutRequest.requested_at.desc()).limit(10).all()

    return jsonify({
        "seller_id": seller.id,
        "store_name": seller.store_name,
        "commission_rate": float(seller.commission_rate),
        "escrow_held_balance": escrow_held_balance,
        "available_payout_balance": available_payout_balance,
        "total_payouts_processed": float(paid_res),
        "pending_payouts_requested": float(pending_payouts_res),
        "ledger": [entry.to_dict() for entry in ledger],
        "payout_requests": [p.to_dict() for p in payouts],
    }), 200


@vendor_bp.route("/payouts", methods=["POST"])
@jwt_required
def request_vendor_payout():
    """Submit a payout withdrawal request for released escrow balance."""
    from sqlalchemy import func
    from app.models.financials import LedgerEntry, PayoutRequest
    from app.services.escrow_engine import release_matured_escrow

    # Auto-release any matured escrow entries before checking payout balance
    try:
        release_matured_escrow()
    except Exception as err:
        logger.warning(f"On-demand escrow release warning in payout request: {err}")

    user_id = g.current_user_id
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()

    if not seller:
        return jsonify({"error": "Forbidden", "message": "Only merchant store owners can request payouts."}), 403

    data = request.get_json() or {}
    try:
        amount = round(float(data.get("amount", 0)), 2)
    except (ValueError, TypeError):
        return jsonify({"error": "Bad Request", "message": "Invalid payout amount."}), 400

    if amount <= 0:
        return jsonify({"error": "Bad Request", "message": "Payout request amount must be greater than 0."}), 400

    released_res = db.session.query(func.coalesce(func.sum(LedgerEntry.amount), 0.00)).filter(
        LedgerEntry.seller_id == seller.id,
        LedgerEntry.entry_type == "ESCROW_RELEASE",
        LedgerEntry.status == "RELEASED"
    ).scalar()

    paid_res = db.session.query(func.coalesce(func.sum(PayoutRequest.amount), 0.00)).filter(
        PayoutRequest.seller_id == seller.id,
        PayoutRequest.status == "PAID"
    ).scalar()

    pending_payouts_res = db.session.query(func.coalesce(func.sum(PayoutRequest.amount), 0.00)).filter(
        PayoutRequest.seller_id == seller.id,
        PayoutRequest.status.in_(["REQUESTED", "PROCESSING"])
    ).scalar()

    available_balance = max(0.00, round(float(released_res) - float(paid_res) - float(pending_payouts_res), 2))

    if amount > available_balance:
        return jsonify({
            "error": "Conflict",
            "message": f"Requested amount (${amount:.2f}) exceeds available released payout balance (${available_balance:.2f})."
        }), 409

    payout = PayoutRequest(seller_id=seller.id, amount=amount, status="REQUESTED")
    db.session.add(payout)
    db.session.commit()

    return jsonify({
        "message": f"Payout withdrawal request for ${amount:.2f} submitted successfully!",
        "payout_request": payout.to_dict(),
    }), 201


# --- Merchant Product Catalog Management ---

@vendor_bp.route("/products", methods=["GET"])
@jwt_required
def list_vendor_products():
    """List products created by and assigned to current seller store."""
    from app.models.product import Product
    user_id = g.current_user_id
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()
    if not seller:
        staff_entry = db.session.query(SellerStaff).filter_by(user_id=user_id).first()
        if staff_entry:
            seller = staff_entry.seller

    if not seller:
        return jsonify({"error": "Forbidden", "message": "Only approved merchants can access product catalog."}), 403

    products = db.session.query(Product).filter_by(seller_id=seller.id).order_by(Product.created_at.desc()).all()
    return jsonify([p.to_dict() for p in products]), 200


@vendor_bp.route("/products", methods=["POST"])
@jwt_required
def create_vendor_product():
    """Create a new product with optional variants and discount percentage assigned to current merchant."""
    from app.models.product import Product
    from app.models.product_variant import ProductVariant
    from app.core.extensions import redis_client
    user_id = g.current_user_id
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()
    if not seller:
        return jsonify({"error": "Forbidden", "message": "Only approved merchant store owners can list new products."}), 403

    if seller.status != "APPROVED":
        return jsonify({"error": "Forbidden", "message": f"Merchant store account is currently '{seller.status}'. Store must be APPROVED."}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    sku = data.get("sku", "").strip().upper()
    variants_data = data.get("variants", [])
    try:
        price = float(data.get("price", 0))
        total_stock = int(data.get("total_stock", 0))
        discount_pct = float(data.get("discount_percentage", 0.0))
    except (ValueError, TypeError):
        return jsonify({"error": "Bad Request", "message": "Invalid price, stock, or discount values."}), 400

    if not name or not sku or price <= 0:
        return jsonify({"error": "Bad Request", "message": "Name, SKU, and positive Price are required."}), 400

    existing = db.session.query(Product).filter_by(sku=sku).first()
    if existing:
        return jsonify({"error": "Conflict", "message": f"Product with SKU '{sku}' already exists."}), 409

    product = Product(
        seller_id=seller.id,
        vendor_id=user_id,
        name=name,
        sku=sku,
        description=data.get("description", ""),
        category_id=data.get("category_id"),
        price=price,
        discount_percentage=discount_pct,
        total_stock=total_stock,
        available_stock=total_stock,
        images=data.get("images", []),
        is_active=True,
    )
    db.session.add(product)
    db.session.flush()

    for var_data in variants_data:
        var_sku = var_data.get("sku", f"{sku}-{len(product.variants) + 1}").upper()
        var_name = var_data.get("name", f"{name} Variant")
        var_price = float(var_data.get("price", price))
        var_stock = int(var_data.get("total_stock", total_stock))

        variant = ProductVariant(
            product_id=product.id,
            sku=var_sku,
            name=var_name,
            size=var_data.get("size"),
            color=var_data.get("color"),
            price=var_price,
            total_stock=var_stock,
            available_stock=var_stock,
        )
        db.session.add(variant)

    try:
        redis_client.set(f"product:{product.id}:stock", total_stock)
    except Exception:
        pass

    db.session.commit()
    return jsonify({"message": f"Product '{name}' created successfully with {len(variants_data)} variants!", "product": product.to_dict()}), 201


@vendor_bp.route("/products/<string:product_id>", methods=["PUT", "PATCH"])
@jwt_required
def update_vendor_product(product_id: str):
    """Update seller's own product details and discount percentage."""
    from app.models.product import Product
    from app.core.extensions import redis_client
    from app.api.v1.products import save_uploaded_image
    user_id = g.current_user_id
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()
    if not seller:
        return jsonify({"error": "Forbidden", "detail": "Access denied.", "message": "Access denied."}), 403

    product = db.session.query(Product).filter_by(id=product_id, seller_id=seller.id).first()
    if not product:
        return jsonify({"error": "Not Found", "detail": "Product not found or not owned by your seller store.", "message": "Product not found or not owned by your seller store."}), 404

    if request.is_json:
        data = request.get_json() or {}
    elif request.content_type and "multipart/form-data" in request.content_type:
        data = dict(request.form)
        image_file = request.files.get("image") or request.files.get("file")
        if image_file and image_file.filename:
            saved_url = save_uploaded_image(image_file)
            if saved_url:
                data["image_url"] = saved_url
    else:
        data = request.get_json(silent=True) or dict(request.form) or {}

    if "name" in data:
        product.name = data["name"]
    if "description" in data:
        product.description = data["description"]
    if "price" in data and data["price"] is not None:
        try:
            product.price = float(data["price"])
        except (ValueError, TypeError):
            pass
    if "discount_percentage" in data and data["discount_percentage"] is not None:
        try:
            product.discount_percentage = float(data["discount_percentage"])
        except (ValueError, TypeError):
            pass
    if "category_id" in data:
        product.category_id = data["category_id"]
    if "images" in data or "image_url" in data or "primary_image_url" in data:
        from app.models.product_image import ProductImage
        raw_images = data.get("images")
        primary_url = data.get("primary_image_url") or data.get("image_url")

        if raw_images == [] or (raw_images is None and primary_url is None and "images" in data):
            db.session.query(ProductImage).filter_by(product_id=product.id).delete()
            product.image_url = None
        elif raw_images is not None or primary_url is not None:
            db.session.query(ProductImage).filter_by(product_id=product.id).delete()
            order_idx = 0
            seen_urls = set()

            if primary_url and primary_url not in seen_urls:
                pi = ProductImage(
                    product_id=product.id,
                    image_url=primary_url,
                    is_primary=True,
                    display_order=order_idx,
                )
                db.session.add(pi)
                seen_urls.add(primary_url)
                order_idx += 1

            if raw_images and isinstance(raw_images, list):
                for img_item in raw_images:
                    url = img_item.get("image_url") if isinstance(img_item, dict) else str(img_item)
                    if url and url not in seen_urls:
                        is_prim = bool(img_item.get("is_primary")) if isinstance(img_item, dict) else (order_idx == 0)
                        pi = ProductImage(
                            product_id=product.id,
                            image_url=url,
                            is_primary=is_prim,
                            display_order=img_item.get("display_order", order_idx) if isinstance(img_item, dict) else order_idx,
                        )
                        db.session.add(pi)
                        seen_urls.add(url)
                        order_idx += 1

            product.image_url = primary_url or (list(seen_urls)[0] if seen_urls else None)

    if "total_stock" in data and data["total_stock"] is not None:
        try:
            new_stock = int(data["total_stock"])
            diff = new_stock - (product.total_stock or 0)
            product.total_stock = new_stock
            product.available_stock = max(0, (product.available_stock or 0) + diff)
            try:
                redis_client.set(f"product:{product.id}:stock", product.available_stock)
            except Exception:
                pass
        except (ValueError, TypeError):
            pass

    db.session.commit()
    return jsonify({
        "message": "Product updated successfully.",
        "detail": "Product updated successfully.",
        "product": product.to_dict()
    }), 200


@vendor_bp.route("/products/<string:product_id>/variants", methods=["POST"])
@jwt_required
def create_vendor_product_variant(product_id: str):
    """Add a new product SKU variant (Size, Color, Price, Stock) to seller's product."""
    from app.models.product import Product
    from app.models.product_variant import ProductVariant
    user_id = g.current_user_id
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()
    if not seller:
        return jsonify({"error": "Forbidden", "message": "Access denied."}), 403

    product = db.session.query(Product).filter_by(id=product_id, seller_id=seller.id).first()
    if not product:
        return jsonify({"error": "Not Found", "message": "Product not found or not owned by your store."}), 404

    data = request.get_json() or {}
    var_sku = data.get("sku", "").strip().upper()
    var_name = data.get("name", "").strip()
    try:
        var_price = float(data.get("price", product.price))
        var_stock = int(data.get("total_stock", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Bad Request", "message": "Invalid variant price or stock."}), 400

    if not var_sku or not var_name:
        return jsonify({"error": "Bad Request", "message": "Variant SKU and Name are required."}), 400

    existing = db.session.query(ProductVariant).filter_by(sku=var_sku).first()
    if existing:
        return jsonify({"error": "Conflict", "message": f"Variant SKU '{var_sku}' already exists."}), 409

    variant = ProductVariant(
        product_id=product.id,
        sku=var_sku,
        name=var_name,
        size=data.get("size"),
        color=data.get("color"),
        price=var_price,
        total_stock=var_stock,
        available_stock=var_stock,
    )
    db.session.add(variant)
    db.session.commit()

    return jsonify({"message": f"Variant '{var_name}' added successfully!", "variant": variant.to_dict()}), 201


@vendor_bp.route("/products/<string:product_id>/variants/<string:variant_id>", methods=["DELETE"])
@jwt_required
def delete_vendor_product_variant(product_id: str, variant_id: str):
    """Remove a variant from seller's product."""
    from app.models.product import Product
    from app.models.product_variant import ProductVariant
    user_id = g.current_user_id
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()
    if not seller:
        return jsonify({"error": "Forbidden", "message": "Access denied."}), 403

    product = db.session.query(Product).filter_by(id=product_id, seller_id=seller.id).first()
    if not product:
        return jsonify({"error": "Not Found", "message": "Product not found."}), 404

    variant = db.session.query(ProductVariant).filter_by(id=variant_id, product_id=product.id).first()
    if not variant:
        return jsonify({"error": "Not Found", "message": "Variant not found."}), 404

    db.session.delete(variant)
    db.session.commit()
    return jsonify({"message": f"Variant '{variant.name}' deleted."}), 200


@vendor_bp.route("/products/<string:product_id>", methods=["DELETE"])
@jwt_required
def delete_vendor_product(product_id: str):
    """Deactivate product owned by seller."""
    from app.models.product import Product
    user_id = g.current_user_id
    seller = db.session.query(Seller).filter_by(owner_user_id=user_id).first()
    if not seller:
        return jsonify({"error": "Forbidden", "message": "Access denied."}), 403

    product = db.session.query(Product).filter_by(id=product_id, seller_id=seller.id).first()
    if not product:
        return jsonify({"error": "Not Found", "message": "Product not found or not owned by your store."}), 404

    product.is_active = False
    db.session.commit()
    return jsonify({"message": f"Product '{product.name}' deactivated."}), 200


