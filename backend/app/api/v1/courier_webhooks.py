import logging
from flask import Blueprint, request, jsonify
from app.core.extensions import db
from app.models.return_request import ReturnRequest
from app.models.outbox import OutboxEvent

logger = logging.getLogger(__name__)

courier_webhook_bp = Blueprint("courier_webhook", __name__, url_prefix="/api/v1/webhooks/courier")


@courier_webhook_bp.route("/update", methods=["POST"])
def handle_courier_status_update():
    """
    Idempotent HTTP webhook endpoint handling asynchronous logistics courier tracking updates.
    Maps carrier events (PICKED_UP -> IN_TRANSIT, DELIVERED_TO_WAREHOUSE -> ARRIVED_AT_WAREHOUSE)
    and writes OutboxEvent records for real-time customer notifications.
    """
    payload = request.get_json() or {}
    ticket_id = payload.get("courier_ticket_id")
    event_status = payload.get("status")  # e.g., 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED_TO_WAREHOUSE'

    if not ticket_id:
        return jsonify({"error": "Missing courier_ticket_id"}), 400

    # 1. Fetch Return Request by courier ticket ID
    return_req = db.session.query(ReturnRequest).filter_by(courier_ticket_id=ticket_id).first()
    if not return_req:
        return jsonify({"error": "Invalid ticket ID", "message": f"No return request found for ticket '{ticket_id}'"}), 404

    # 2. Idempotent State Transition Mapping
    status_mapping = {
        "PICKED_UP": "IN_TRANSIT",
        "IN_TRANSIT": "IN_TRANSIT",
        "DELIVERED_TO_WAREHOUSE": "ARRIVED_AT_WAREHOUSE"
    }

    new_status = status_mapping.get(event_status)
    if new_status and return_req.status != new_status:
        return_req.status = new_status

        # 3. Write Outbox Event for Real-Time Notification & Async Dispatch
        outbox = OutboxEvent(
            aggregate_type="RETURN_REQUEST",
            aggregate_id=return_req.id,
            event_type=f"return.status_{new_status.lower()}",
            payload={
                "return_id": return_req.id,
                "order_id": return_req.order_id,
                "courier_ticket_id": ticket_id,
                "status": new_status
            }
        )
        db.session.add(outbox)
        db.session.commit()
        logger.info(f"[COURIER-WEBHOOK] Return ID '{return_req.id}' updated to status '{new_status}' via ticket '{ticket_id}'")

    return jsonify({
        "message": "Webhook processed successfully",
        "return_id": return_req.id,
        "status": return_req.status
    }), 200
