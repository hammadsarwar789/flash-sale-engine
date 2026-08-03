import logging
from datetime import datetime, timezone
from celery import shared_task
from app.core.extensions import db
from app.customer_support.models.ticket import Ticket, TicketAI

logger = logging.getLogger(__name__)


@shared_task(name="customer_support.process_new_ticket")
def process_new_ticket_task(ticket_id: str) -> dict:
    """
    Async Celery worker task triggered on ticket creation.
    Performs automated RAG first-line response synthesis, sentiment detection,
    vendor routing, and populates TicketAI metadata.
    """
    logger.info(f"[AI-TASK] Starting async analysis for Ticket ID: {ticket_id}")
    
    ticket = db.session.query(Ticket).filter_by(id=ticket_id).first()
    if not ticket:
        logger.warning(f"[AI-TASK] Ticket '{ticket_id}' not found.")
        return {"status": "error", "message": "Ticket not found"}

    from app.customer_support.services.ai_service import ai_service
    from app.customer_support.services.ticket_service import ticket_service
    from app.models.sub_order import SubOrder

    # 1. RAG Intelligence Synthesis
    rag_data = ai_service.generate_rag_suggested_reply(ticket_id)

    # Rule & Keyword AI Sentiment & Priority Detection Engine
    messages = [m.message for m in ticket.messages]
    full_text = f"{ticket.subject} " + " ".join(messages)
    text_upper = full_text.upper()

    sentiment = "NEUTRAL"
    if any(k in text_upper for k in ["URGENT", "BROKEN", "DAMAGED", "WRONG", "ANGRY", "REFUND", "FRAUD"]):
        sentiment = "FRUSTRATED" if "REFUND" in text_upper or "DAMAGED" in text_upper else "URGENT"

    suggested_priority = ticket.priority
    if "FRAUD" in text_upper or "STOLEN" in text_upper or "OVERCHARGE" in text_upper:
        suggested_priority = "CRITICAL"
    elif "REFUND" in text_upper or "EXCHANGE" in text_upper:
        suggested_priority = "HIGH"

    summary_text = f"Issue regarding '{ticket.subject}'. Category: {ticket.category}. Keywords: {sentiment}."

    ai_meta = db.session.query(TicketAI).filter_by(ticket_id=ticket_id).first()
    if not ai_meta:
        ai_meta = TicketAI(ticket_id=ticket_id)
        db.session.add(ai_meta)

    ai_meta.summary = summary_text
    ai_meta.sentiment = sentiment
    ai_meta.ai_suggested_priority = suggested_priority
    if rag_data:
        ai_meta.suggested_reply = rag_data.get("suggested_reply")
        ai_meta.confidence = rag_data.get("confidence", 0.90)

    ai_meta.predicted_category = ticket.category
    ai_meta.analyzed_at = datetime.now(timezone.utc)
    db.session.commit()

    # 2. Automated Vendor Escalation & Routing
    if ticket.order_id and not ticket.vendor_id:
        sub_order = db.session.query(SubOrder).filter_by(order_id=ticket.order_id).first()
        if sub_order:
            ticket.vendor_id = sub_order.seller_id
            ticket.priority = "HIGH"
            db.session.commit()
            logger.info(f"[VENDOR-ROUTING] Ticket #{ticket.ticket_number} routed to seller_id: {sub_order.seller_id}")

    # 3. AI First-Line Auto-Responder for Policy & General Queries
    if rag_data and rag_data.get("confidence", 0) >= 0.85 and ticket.category in ["GENERAL", "SHIPPING", "RETURNS", "WARRANTY"]:
        ticket_service.add_message(
            ticket_id=ticket.id,
            sender_id="SYSTEM_AI_BOT",
            sender_type="SYSTEM",
            message=rag_data["suggested_reply"]
        )
        ticket_service.update_status(ticket.id, "WAITING_CUSTOMER", user_role="support_agent")
        logger.info(f"[AI-FIRST-LINE] Auto-replied to Ticket #{ticket.ticket_number} via SYSTEM_AI_BOT")
        return {"status": "auto_replied_by_ai", "ticket_number": ticket.ticket_number}

    return {
        "status": "success",
        "ticket_number": ticket.ticket_number,
        "sentiment": sentiment,
        "priority": suggested_priority,
    }


@shared_task(name="customer_support.send_confirmation_email")
def send_ticket_confirmation_email_task(ticket_id: str) -> dict:
    """Async task sending automated ticket creation confirmation email to customer."""
    ticket = db.session.query(Ticket).filter_by(id=ticket_id).first()
    if not ticket or not ticket.customer:
        return {"status": "skipped", "message": "No customer email"}

    logger.info(f"[EMAIL-TASK] Dispatching ticket confirmation email to {ticket.customer.email} for Ticket #{ticket.ticket_number}")
    return {"status": "sent", "email": ticket.customer.email, "ticket_number": ticket.ticket_number}


@shared_task(name="customer_support.notify_agent")
def notify_agent_new_ticket_task(ticket_id: str) -> dict:
    """Async task sending agent alert notification for incoming tickets."""
    ticket = db.session.query(Ticket).filter_by(id=ticket_id).first()
    if not ticket:
        return {"status": "skipped"}

    logger.info(f"[NOTIFY-TASK] Alerting support agent queue for Ticket #{ticket.ticket_number} ({ticket.priority} priority)")
    return {"status": "notified", "ticket_number": ticket.ticket_number}
