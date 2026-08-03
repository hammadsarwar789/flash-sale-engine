from flask import request, jsonify, g
from flask_smorest import Blueprint
from marshmallow import ValidationError
from app.api.decorators import jwt_required, admin_required
from app.customer_support.services.ticket_service import ticket_service
from app.customer_support.schemas.ticket_schema import (
    CreateTicketSchema,
    UpdateStatusSchema,
    ReplyTicketSchema,
)
from app.models.user import User
from app.core.extensions import db

support_ticket_bp = Blueprint(
    "support_tickets",
    "support_tickets",
    url_prefix="/api/v1/support/tickets",
    description="Customer Support Ticket Management & AI Assistance API"
)

create_ticket_schema = CreateTicketSchema()
update_status_schema = UpdateStatusSchema()
reply_ticket_schema = ReplyTicketSchema()


@support_ticket_bp.route("", methods=["POST"])
@jwt_required
def create_ticket():
    """Submit a new customer support ticket with Marshmallow input validation."""
    json_data = request.get_json() or {}
    try:
        data = create_ticket_schema.load(json_data)
    except ValidationError as err:
        return jsonify({"error": "Validation Error", "messages": err.messages}), 400

    try:
        ticket = ticket_service.create_ticket(
            customer_id=g.current_user_id,
            subject=data["subject"].strip(),
            message=data["message"].strip(),
            category=data.get("category", "GENERAL").strip(),
            priority=data.get("priority", "MEDIUM").strip(),
            order_id=data.get("order_id"),
            vendor_id=data.get("vendor_id"),
            attachments=data.get("attachments", [])
        )
    except PermissionError as err:
        return jsonify({"error": "Forbidden", "message": str(err)}), 403

    return jsonify({
        "message": "Support ticket created successfully!",
        "ticket": ticket.to_dict()
    }), 201


@support_ticket_bp.route("", methods=["GET"])
@jwt_required
def list_tickets():
    """Fetch paginated customer support tickets with filters."""
    user = db.session.query(User).filter_by(id=g.current_user_id).first()
    role = user.role if user else "customer"

    status = request.args.get("status")
    priority = request.args.get("priority")
    assigned_agent_id = request.args.get("assigned_agent_id")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))

    result = ticket_service.get_tickets(
        user_id=g.current_user_id,
        user_role=role,
        status=status,
        priority=priority,
        assigned_agent_id=assigned_agent_id,
        page=page,
        per_page=per_page
    )

    return jsonify(result), 200


@support_ticket_bp.route("/<string:ticket_id>", methods=["GET"])
@jwt_required
def get_ticket(ticket_id: str):
    """Fetch details and message thread for a single ticket."""
    user = db.session.query(User).filter_by(id=g.current_user_id).first()
    role = user.role if user else "customer"

    detail = ticket_service.get_ticket_detail(ticket_id=ticket_id, user_id=g.current_user_id, user_role=role)
    if not detail:
        return jsonify({"error": "Not Found", "message": "Ticket not found or access denied."}), 404

    return jsonify(detail), 200


@support_ticket_bp.route("/<string:ticket_id>/reply", methods=["POST"])
@jwt_required
def add_reply(ticket_id: str):
    """Add a message reply to an ongoing ticket thread."""
    user = db.session.query(User).filter_by(id=g.current_user_id).first()
    role = user.role if user else "customer"

    json_data = request.get_json() or {}
    try:
        data = reply_ticket_schema.load(json_data)
    except ValidationError as err:
        return jsonify({"error": "Validation Error", "messages": err.messages}), 400

    detail = ticket_service.get_ticket_detail(ticket_id=ticket_id, user_id=g.current_user_id, user_role=role)
    if not detail:
        return jsonify({"error": "Not Found", "message": "Ticket not found or access denied."}), 404

    sender_type = "AGENT" if role in ["admin", "support_agent", "support_manager"] else "CUSTOMER"
    try:
        msg = ticket_service.add_message(
            ticket_id=ticket_id,
            sender_id=g.current_user_id,
            sender_type=sender_type,
            message=data["message"].strip(),
            attachments=data.get("attachments", [])
        )
    except PermissionError as err:
        return jsonify({"error": "Forbidden", "message": str(err)}), 403

    return jsonify({
        "message": "Reply posted successfully!",
        "ticket_message": msg.to_dict()
    }), 201


@support_ticket_bp.route("/<string:ticket_id>/assign", methods=["POST"])
@jwt_required
def assign_ticket_agent(ticket_id: str):
    """Assign a support agent to a ticket (Admin / Support Manager)."""
    user = db.session.query(User).filter_by(id=g.current_user_id).first()
    if not user or user.role not in ["admin", "support_manager", "support_agent"]:
        return jsonify({"error": "Forbidden", "message": "Only support managers or admins can assign tickets."}), 403

    data = request.get_json() or {}
    agent_id = data.get("agent_id") or g.current_user_id

    ticket = ticket_service.assign_agent(ticket_id=ticket_id, agent_id=agent_id)
    if not ticket:
        return jsonify({"error": "Not Found", "message": "Ticket or Agent not found."}), 404

    return jsonify({
        "message": f"Ticket assigned to agent '{ticket.assigned_agent.full_name if ticket.assigned_agent else agent_id}'.",
        "ticket": ticket.to_dict()
    }), 200


@support_ticket_bp.route("/<string:ticket_id>/status", methods=["PUT"])
@jwt_required
def update_status(ticket_id: str):
    """Update ticket status with strict role-gated RBAC enforcement."""
    user = db.session.query(User).filter_by(id=g.current_user_id).first()
    role = user.role if user else "customer"

    json_data = request.get_json() or {}
    try:
        data = update_status_schema.load(json_data)
    except ValidationError as err:
        return jsonify({"error": "Validation Error", "messages": err.messages}), 400

    ticket, err_msg = ticket_service.update_status(ticket_id=ticket_id, new_status=data["status"], user_role=role)
    if err_msg:
        status_code = 403 if "Forbidden" in err_msg else 400
        return jsonify({"error": "Permission Error" if status_code == 403 else "Bad Request", "message": err_msg}), status_code

    return jsonify({
        "message": f"Ticket status updated to '{ticket.status}'.",
        "ticket": ticket.to_dict()
    }), 200


@support_ticket_bp.route("/dashboard/metrics", methods=["GET"])
@jwt_required
def get_dashboard_metrics():
    """Fetch support metrics for agent dashboard."""
    user = db.session.query(User).filter_by(id=g.current_user_id).first()
    if not user or user.role not in ["admin", "support_agent", "support_manager"]:
        return jsonify({"error": "Forbidden", "message": "Access restricted to support staff."}), 403

    metrics = ticket_service.get_dashboard_metrics()
    return jsonify(metrics), 200


@support_ticket_bp.route("/<string:ticket_id>/summarize", methods=["POST"])
@jwt_required
def summarize_ticket(ticket_id: str):
    """Trigger or refresh AI summarization & sentiment detection for a ticket."""
    from app.customer_support.services.ai_service import ai_service
    res = ai_service.summarize_and_analyze(ticket_id)
    if not res:
        return jsonify({"error": "Not Found", "message": "Ticket not found."}), 404

    return jsonify({"message": "AI summarization complete.", "ai_metadata": res}), 200


@support_ticket_bp.route("/<string:ticket_id>/suggest-reply", methods=["POST"])
@jwt_required
def suggest_reply(ticket_id: str):
    """Run RAG pipeline over documentation to construct an AI draft response for the support agent."""
    from app.customer_support.services.ai_service import ai_service
    res = ai_service.generate_rag_suggested_reply(ticket_id)
    if not res:
        return jsonify({"error": "Not Found", "message": "Ticket not found."}), 404

    return jsonify(res), 200
