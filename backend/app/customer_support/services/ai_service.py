import logging
from datetime import datetime, timezone
from app.core.extensions import db
from app.customer_support.models.ticket import Ticket, TicketAI

logger = logging.getLogger(__name__)

# Sample Platform Knowledge Base Documents for RAG Context Synthesis
PLATFORM_KNOWLEDGE_BASE = [
    {
        "id": "kb_returns_01",
        "title": "Returns & Replacement Policy",
        "keywords": ["return", "exchange", "size", "damaged", "wrong", "broken"],
        "content": "Customers can request an exchange or return within 14 days of delivery. For wrong sizes or damaged items, a free prepaid return label is dispatched."
    },
    {
        "id": "kb_escrow_02",
        "title": "Merchant Escrow & Payout Schedule",
        "keywords": ["escrow", "payout", "held", "release", "funds", "balance"],
        "content": "Merchant sub-order earnings are held in escrow for 7 days post-delivery (available_at = delivered_at + 7 days). Funds release daily at 02:00 UTC."
    },
    {
        "id": "kb_shipping_03",
        "title": "Fulfillment & Carrier Delivery Timelines",
        "keywords": ["shipping", "tracking", "delay", "carrier", "delivery", "lhr", "fsd"],
        "content": "Standard multi-vendor dispatch takes 24-48 hours. Tracking numbers (UPS, FedEx, DHL, USPS) are updated automatically upon carrier pickup."
    }
]


class AIService:
    """RAG & AI Intelligence Engine for Support Ticket Assistance."""

    def summarize_and_analyze(self, ticket_id: str) -> dict:
        """Analyze ticket content, detect sentiment, predict category, and store summary in TicketAI."""
        ticket = db.session.query(Ticket).filter_by(id=ticket_id).first()
        if not ticket:
            return None

        messages = [m.message for m in ticket.messages]
        full_text = f"{ticket.subject} " + " ".join(messages)
        text_upper = full_text.upper()

        # Sentiment Analysis
        sentiment = "NEUTRAL"
        if any(k in text_upper for k in ["URGENT", "BROKEN", "DAMAGED", "WRONG", "ANGRY", "REFUND", "FRAUD"]):
            sentiment = "FRUSTRATED" if "REFUND" in text_upper or "DAMAGED" in text_upper else "URGENT"

        # Summary Construction
        summary = f"Issue: '{ticket.subject}'. Messages count: {len(messages)}. Key indicators: {sentiment}."

        ai_meta = db.session.query(TicketAI).filter_by(ticket_id=ticket_id).first()
        if not ai_meta:
            ai_meta = TicketAI(ticket_id=ticket_id)
            db.session.add(ai_meta)

        ai_meta.summary = summary
        ai_meta.sentiment = sentiment
        ai_meta.analyzed_at = datetime.now(timezone.utc)
        db.session.commit()

        return ai_meta.to_dict()

    def generate_rag_suggested_reply(self, ticket_id: str) -> dict:
        """
        RAG (Retrieval-Augmented Generation) pipeline:
        Searches platform knowledge base for relevant context matching the ticket query
        and constructs a grounded draft response for the support agent.
        """
        ticket = db.session.query(Ticket).filter_by(id=ticket_id).first()
        if not ticket:
            return None

        messages = [m.message for m in ticket.messages]
        full_text = f"{ticket.subject} " + " ".join(messages)
        text_lower = full_text.lower()

        # Knowledge Base Retrieval
        matched_docs = []
        for doc in PLATFORM_KNOWLEDGE_BASE:
            score = sum(1 for kw in doc["keywords"] if kw in text_lower)
            if score > 0:
                matched_docs.append((score, doc))

        matched_docs.sort(key=lambda x: x[0], reverse=True)
        top_docs = [d[1] for d in matched_docs[:2]] if matched_docs else [PLATFORM_KNOWLEDGE_BASE[0]]

        # Grounded Answer Synthesis
        source_titles = [d["title"] for d in top_docs]
        context_snippets = " ".join([d["content"] for d in top_docs])

        cust_name = ticket.customer.full_name if ticket.customer else "Valued Customer"
        suggested_reply = (
            f"Dear {cust_name},\n\n"
            f"Thank you for contacting support regarding '{ticket.subject}'.\n\n"
            f"Based on our policy ({source_titles[0]}): {top_docs[0]['content']}\n\n"
            f"We have updated your ticket (#{ticket.ticket_number}) status to [{ticket.status}]. "
            f"Please let us know if you need any further assistance."
        )

        confidence = 0.94 if matched_docs else 0.82

        ai_meta = db.session.query(TicketAI).filter_by(ticket_id=ticket_id).first()
        if not ai_meta:
            ai_meta = TicketAI(ticket_id=ticket_id)
            db.session.add(ai_meta)

        ai_meta.suggested_reply = suggested_reply
        ai_meta.confidence = confidence
        ai_meta.analyzed_at = datetime.now(timezone.utc)
        db.session.commit()

        return {
            "ticket_id": ticket_id,
            "suggested_reply": suggested_reply,
            "confidence": confidence,
            "source_documents": source_titles,
            "retrieved_context": context_snippets
        }


ai_service = AIService()
