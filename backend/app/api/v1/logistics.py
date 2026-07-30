from flask import request, jsonify, g
from flask_smorest import Blueprint
from app.core.extensions import db
from app.api.decorators import jwt_required, admin_required
from app.models.logistics import Carrier, Shipment
from app.models.sub_order import SubOrder

logistics_bp = Blueprint("logistics", "logistics", url_prefix="/api/v1/logistics", description="Logistics, Dispatch & Waybill Tracking")


@logistics_bp.route("/carriers", methods=["GET"])
def list_carriers():
    """Retrieve list of active 3PL logistics carriers."""
    carriers = db.session.query(Carrier).filter_by(is_active=True).all()
    if not carriers:
        # Seed default carriers if database table is empty
        default_carriers = [
            Carrier(id="car_fedex", name="FedEx Express", api_identifier="fedex"),
            Carrier(id="car_dhl", name="DHL Worldwide", api_identifier="dhl"),
            Carrier(id="car_leopards", name="Leopards Courier", api_identifier="leopards"),
            Carrier(id="car_tcs", name="TCS Express", api_identifier="tcs"),
        ]
        for c in default_carriers:
            db.session.add(c)
        db.session.commit()
        carriers = default_carriers

    return jsonify([c.to_dict() for c in carriers]), 200


@logistics_bp.route("/shipments", methods=["POST"])
@jwt_required
def create_shipment():
    """Create dispatch shipment and assign tracking number to a vendor sub-order."""
    data = request.get_json() or {}
    sub_order_id = data.get("sub_order_id")
    carrier_id = data.get("carrier_id")
    tracking_number = data.get("tracking_number")

    if not sub_order_id:
        return jsonify({"error": "Bad Request", "message": "sub_order_id is required."}), 400

    sub_order = db.session.query(SubOrder).filter_by(id=sub_order_id).first()
    if not sub_order:
        return jsonify({"error": "Not Found", "message": f"Sub-order '{sub_order_id}' not found."}), 404

    if not tracking_number:
        tracking_number = f"TRK-{sub_order.id[:8].upper()}-WAYBILL"

    shipment = Shipment(
        sub_order_id=sub_order.id,
        carrier_id=carrier_id,
        tracking_number=tracking_number,
        status="LABEL_CREATED",
    )
    db.session.add(shipment)
    db.session.flush()

    sub_order.shipment_id = shipment.id
    sub_order.status = "SHIPPED"
    db.session.commit()

    return jsonify({
        "message": "Shipment label created and sub-order dispatched successfully!",
        "shipment": shipment.to_dict(),
        "sub_order": sub_order.to_dict(),
    }), 201


@logistics_bp.route("/shipments/<string:shipment_id>", methods=["PATCH"])
@jwt_required
def update_shipment_status(shipment_id: str):
    """Update shipment tracking status (LABEL_CREATED, PICKED_UP, IN_TRANSIT, DELIVERED) and PoD."""
    data = request.get_json() or {}
    status = data.get("status", "").upper()
    proof_url = data.get("proof_of_delivery_url")

    shipment = db.session.query(Shipment).filter_by(id=shipment_id).first()
    if not shipment:
        return jsonify({"error": "Not Found", "message": f"Shipment '{shipment_id}' not found."}), 404

    if status in ["LABEL_CREATED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED"]:
        shipment.status = status
        if shipment.sub_order:
            if status == "DELIVERED":
                shipment.sub_order.status = "DELIVERED"
                try:
                    from app.services.escrow_engine import set_sub_order_delivery_escrow
                    set_sub_order_delivery_escrow(shipment.sub_order_id)
                except Exception:
                    pass

    if proof_url:
        shipment.proof_of_delivery_url = proof_url

    db.session.commit()
    return jsonify({"message": f"Shipment '{shipment_id}' updated to '{shipment.status}'.", "shipment": shipment.to_dict()}), 200
