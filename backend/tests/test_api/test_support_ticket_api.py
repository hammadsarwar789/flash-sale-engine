import pytest
from app.models.user import User
from app.core.extensions import db


def test_customer_create_support_ticket(client, user_token):
    """Test customer submitting a new support ticket."""
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "subject": "Wrong size delivered",
        "message": "Hi, I ordered size 43 shoes but received size 41. Please assist.",
        "category": "RETURNS",
        "priority": "HIGH"
    }
    response = client.post("/api/v1/support/tickets", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.get_json()
    assert "ticket" in data
    assert data["ticket"]["subject"] == "Wrong size delivered"
    assert data["ticket"]["category"] == "RETURNS"
    assert data["ticket"]["priority"] == "HIGH"
    assert data["ticket"]["status"] == "OPEN"
    assert data["ticket"]["ticket_number"].startswith("TICK-")


def test_list_support_tickets(client, user_token):
    """Test fetching paginated support tickets."""
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/support/tickets", json={"subject": "Order Query", "message": "Where is my order?"}, headers=headers)

    response = client.get("/api/v1/support/tickets", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert "items" in data
    assert len(data["items"]) >= 1


def test_ticket_detail_and_reply(client, user_token):
    """Test viewing ticket thread detail and posting a reply message."""
    headers = {"Authorization": f"Bearer {user_token}"}
    create_res = client.post("/api/v1/support/tickets", json={"subject": "Damaged Box", "message": "The outer box was torn."}, headers=headers)
    ticket_id = create_res.get_json()["ticket"]["id"]

    # Get Ticket Detail
    detail_res = client.get(f"/api/v1/support/tickets/{ticket_id}", headers=headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.get_json()
    assert detail_data["subject"] == "Damaged Box"
    assert len(detail_data["messages"]) == 1

    # Add Reply
    reply_res = client.post(f"/api/v1/support/tickets/{ticket_id}/reply", json={"message": "Here is an image link of the box."}, headers=headers)
    assert reply_res.status_code == 201
    reply_data = reply_res.get_json()
    assert reply_data["ticket_message"]["message"] == "Here is an image link of the box."


def test_assign_agent_and_update_status(client, user_token, admin_token):
    """Test admin assigning an agent and changing ticket status."""
    headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    create_res = client.post("/api/v1/support/tickets", json={"subject": "Refund Request", "message": "Item arrived broken."}, headers=headers)
    ticket_id = create_res.get_json()["ticket"]["id"]

    # Admin Assign Agent
    assign_res = client.post(f"/api/v1/support/tickets/{ticket_id}/assign", json={}, headers=admin_headers)
    assert assign_res.status_code == 200
    assert assign_res.get_json()["ticket"]["status"] == "IN_PROGRESS"

    # Update Status to RESOLVED
    status_res = client.put(f"/api/v1/support/tickets/{ticket_id}/status", json={"status": "RESOLVED"}, headers=admin_headers)
    assert status_res.status_code == 200
    assert status_res.get_json()["ticket"]["status"] == "RESOLVED"


def test_support_dashboard_metrics(client, admin_token):
    """Test fetching support metrics dashboard."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    metrics_res = client.get("/api/v1/support/tickets/dashboard/metrics", headers=admin_headers)
    assert metrics_res.status_code == 200
    data = metrics_res.get_json()
    assert "open_tickets" in data
    assert "critical_tickets" in data
    assert "sla_compliance_percentage" in data


def test_ai_summarization_and_rag_suggested_reply(client, user_token, admin_token):
    """Test AI summarization & RAG pipeline response generation."""
    headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    create_res = client.post("/api/v1/support/tickets", json={"subject": "Damaged Item Return", "message": "The product arrived broken, I need a replacement exchange."}, headers=headers)
    ticket_id = create_res.get_json()["ticket"]["id"]

    # AI Summarize
    sum_res = client.post(f"/api/v1/support/tickets/{ticket_id}/summarize", json={}, headers=admin_headers)
    assert sum_res.status_code == 200
    assert "ai_metadata" in sum_res.get_json()

    # RAG Suggested Reply
    rag_res = client.post(f"/api/v1/support/tickets/{ticket_id}/suggest-reply", json={}, headers=admin_headers)
    assert rag_res.status_code == 200
    rag_data = rag_res.get_json()
    assert "suggested_reply" in rag_data
    assert "confidence" in rag_data
    assert len(rag_data["source_documents"]) > 0

