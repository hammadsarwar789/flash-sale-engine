from flask import request, jsonify, g
from flask_smorest import Blueprint
from app.core.authorization import require_permission
from app.services.multi_outlet_service import MultiOutletService

outlet_inventory_bp = Blueprint("outlet_inventory", "outlet_inventory", url_prefix="/api/v1/outlets", description="Multi-Outlet Inventory Management & Transfers")


@outlet_inventory_bp.route("/<string:outlet_id>/inventory", methods=["GET"])
@require_permission("outlet:stock:read", scope_param="outlet_id")
def get_outlet_inventory(outlet_id: str):
    """Fetch stock inventory for specified store/outlet."""
    items = MultiOutletService.get_outlet_inventory(outlet_id)
    return jsonify([i.to_dict() for i in items]), 200


@outlet_inventory_bp.route("/<string:outlet_id>/inventory/adjust", methods=["POST"])
@require_permission("outlet:stock:adjust", scope_param="outlet_id")
def adjust_stock(outlet_id: str):
    """Adjust stock quantity for a product SKU in an outlet."""
    data = request.get_json() or {}
    product_sku = data.get("product_sku")
    quantity_delta = data.get("quantity_delta", 0)
    reorder_level = data.get("reorder_level")

    if not product_sku:
        return jsonify({"error": "Bad Request", "message": "Field 'product_sku' is required."}), 400

    success, message, result = MultiOutletService.adjust_stock(
        outlet_id=outlet_id,
        product_sku=product_sku,
        quantity_delta=quantity_delta,
        reorder_level=reorder_level,
    )

    if not success:
        return jsonify({"error": "Bad Request", "message": message}), 400

    return jsonify({"message": message, "inventory": result}), 200


@outlet_inventory_bp.route("/inventory/transfer", methods=["POST"])
@require_permission("outlet:stock:transfer")
def transfer_stock():
    """Transfer stock between two outlets."""
    data = request.get_json() or {}
    source_outlet_id = data.get("source_outlet_id")
    target_outlet_id = data.get("target_outlet_id")
    product_sku = data.get("product_sku")
    quantity = data.get("quantity", 0)

    if not source_outlet_id or not target_outlet_id or not product_sku or quantity <= 0:
        return jsonify({
            "error": "Bad Request",
            "message": "Fields 'source_outlet_id', 'target_outlet_id', 'product_sku', and positive 'quantity' are required."
        }), 400

    # Non-enterprise admins must be scoped to source outlet
    if not g.is_enterprise_admin and source_outlet_id not in g.assigned_outlets:
        return jsonify({
            "error": "Forbidden Scope Access",
            "message": f"User does not have authorization scope for source outlet '{source_outlet_id}'."
        }), 403

    success, message, result = MultiOutletService.transfer_stock(
        source_outlet_id=source_outlet_id,
        target_outlet_id=target_outlet_id,
        product_sku=product_sku,
        quantity=quantity,
    )

    if not success:
        return jsonify({"error": "Bad Request", "message": message}), 400

    return jsonify({"message": message, "result": result}), 200
