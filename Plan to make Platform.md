# 🤖 Customer Support & AI Augmentation Service — Implementation Guide

## Executive Summary & System Integration
This document details the architectural integration, data schema extensions, API specifications, and phased deployment workflow for the **Customer Support & AI Support Ticket Service** added to the existing multi-vendor marketplace platform.

The Customer Support Service leverages the existing microservices/modular monolith infrastructure—specifically reusing **Flask / PostgreSQL** for persistent storage, **Redis & Celery** for asynchronous event processing, **RBAC** for role enforcement, and **Swagger/OpenAPI** for API documentation.

```
                              ┌────────────────────────────────────────┐
                              │            API Gateway / Router        │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       App Core (Flask API Engine)                                      │
│                                                                                                        │
│   ┌────────────────────┐      ┌────────────────────┐      ┌────────────────────┐      ┌────────────┐   │
│   │   Auth & RBAC      │      │   Order Engine     │      │   Vendor Service   │      │ Users      │   │
│   └─────────┬──────────┘      └─────────┬──────────┘      └─────────┬──────────┘      └─────┬──────┘   │
│             │                           │                           │                       │          │
│             └───────────────────────────┴─────────────┬─────────────┴───────────────────────┘          │
│                                                       │                                                │
│                                                       ▼                                                │
│                                 ┌───────────────────────────────────────────┐                          │
│                                 │      backend/app/api/v1/support.py        │                          │
│                                 └─────────────────────┬─────────────────────┘                          │
└───────────────────────────────────────────────────────┼────────────────────────────────────────────────┘
                                                        │
                                                        ▼
                                   ┌────────────────────────────────────────┐
                                   │  backend/app/services/ticket_service   │
                                   └────────────────────┬───────────────────┘
                                                        │
                                 ┌──────────────────────┴──────────────────────┐
                                 │                                             │
                                 ▼                                             ▼
                     ┌───────────────────────┐                     ┌───────────────────────┐
                     │  PostgreSQL Database  │                     │      Redis Broker     │
                     │  (Tickets, Messages,  │                     └───────────┬───────────┘
                     │     AI Metadata)      │                                 │
                     └───────────────────────┘                                 ▼
                                                                   ┌───────────────────────┐
                                                                   │     Celery Workers    │
                                                                   │ (ai_tasks.py & Mail)  │
                                                                   └───────────┬───────────┘
                                                                               │
                                                    ┌──────────────────────────┴──────────────────────────┐
                                                    │                                                     │
                                                    ▼                                                     ▼
                                     ┌─────────────────────────────┐                       ┌─────────────────────────────┐
                                     │  LLM / Vector Store (RAG)   │                       │      Email Provider (SMTP)  │
                                     └─────────────────────────────┘                       └─────────────────────────────┘
```

---

## 📁 File Structure & Module Layout

The support module integrates into the primary codebase under `backend/app/`:

```text
backend/
└── app/
    ├── api/
    │   └── v1/
    │       └── support.py          # REST endpoints for tickets, replies, and dashboards
    ├── models/
    │   ├── ticket.py               # Ticket and TicketAI SQLAlchemy models
    │   └── ticket_message.py       # TicketMessage SQLAlchemy model
    ├── services/
    │   ├── ai_service.py           # LLM interactions, RAG retrieval, sentiment & priority scoring
    │   └── ticket_service.py       # Business logic for ticket lifecycle & agent assignment
    └── workers/
        └── ai_tasks.py             # Asynchronous Celery tasks for background AI processing
```

---

## 💾 Database Schemas & Data Layer Design

### 1. `tickets` Table Definition
```sql
CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(32) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    priority ticket_priority NOT NULL DEFAULT 'MEDIUM',
    status ticket_status NOT NULL DEFAULT 'OPEN',
    category VARCHAR(64) NOT NULL,
    assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_vendor ON tickets(vendor_id);
CREATE INDEX idx_tickets_status_priority ON tickets(status, priority);
```

### 2. `ticket_messages` Table Definition
```sql
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('CUSTOMER', 'AGENT', 'SYSTEM')),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_ticket ON ticket_messages(ticket_id, created_at ASC);
```

### 3. `ticket_ai` Table Definition
```sql
CREATE TABLE ticket_ai (
    ticket_id UUID PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    sentiment VARCHAR(32) NOT NULL,
    suggested_reply TEXT,
    confidence NUMERIC(3, 2) CHECK (confidence >= 0.00 AND confidence <= 1.00),
    predicted_category VARCHAR(64),
    duplicate_cluster_id UUID,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔄 Architectural Workflow & Data Flow Sequence

1. **Ticket Ingestion**: Customer submits a ticket via `POST /api/v1/tickets`.
2. **Persistence**: `ticket_service.py` writes records to `tickets` and `ticket_messages`.
3. **Event Dispatch**: Event `ticket.created` is published to Redis queue.
4. **Asynchronous Execution**: Celery worker picks up task in `workers/ai_tasks.py`.
5. **LLM Analysis & Embeddings**:
   * Executes sentiment detection, priority scoring, tag extraction, and summarization using `ai_service.py`.
   * Embeds ticket text and checks Vector DB for potential duplicate clusters.
6. **Persistence & Notification**:
   * Results committed to `ticket_ai` table and `tickets` table (updating priority/category).
   * Support agent receives live dashboard update.
   * Confirmation email dispatched to customer.

---

## 🔌 API Specifications

### Core Support Endpoints

#### `POST /api/v1/tickets`
* **Summary**: Create a new customer support ticket.
* **Request Body**:
  ```json
  {
    "order_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "vendor_id": "4a0c812d-1111-4444-8888-000000000000",
    "subject": "Wrong shoe size delivered",
    "message": "Hi, I received size 41 instead of 43. Need exchange before Friday."
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "ticket_id": "c39e2e1e-4f01-4b71-88bc-2f92f15f0111",
    "ticket_number": "TICK-2026-08912",
    "status": "OPEN",
    "priority": "MEDIUM"
  }
  ```

#### `GET /api/v1/tickets`
* **Summary**: Fetch paginated tickets with filter parameters (`status`, `priority`, `assigned_agent_id`, `vendor_id`).

#### `POST /api/v1/tickets/{id}/reply`
* **Summary**: Add a customer or support agent reply to an ongoing ticket.

#### `POST /api/v1/tickets/{id}/assign`
* **Summary**: Assign a support agent to a ticket.

### AI Augmentation Endpoints

#### `POST /api/v1/tickets/{id}/summarize`
* **Summary**: Trigger or refresh AI summarization and sentiment analysis.

#### `POST /api/v1/tickets/{id}/suggest-reply`
* **Summary**: Run RAG pipeline over knowledge base documentation to generate an AI draft response for the agent.
* **Response (200 OK)**:
  ```json
  {
    "suggested_reply": "We apologize for the inconvenience. We've verified your order #9b1deb4d and initiated an exchange. A prepaid label has been sent to your email.",
    "confidence": 0.94,
    "source_documents": ["policy_returns_v2.md", "vendor_fulfillment_rules.md"]
  }
  ```

#### `GET /api/v1/dashboard/support`
* **Summary**: Operational support metrics (open tickets, critical tickets, SLA %, CSAT score).

---

## 🛡️ Role-Based Access Control (RBAC) Matrix Integration

The existing RBAC engine is extended with 4 dedicated roles:

| Role | Operational Scope & Permissions |
| :--- | :--- |
| **Customer** | Create tickets; view and reply to self-owned tickets. |
| **Support Agent** | Read assigned tickets; update status/priority; post replies; generate AI responses. |
| **Support Manager** | Reassign tickets; override automated classifications; access team metrics & dashboards. |
| **AI Reviewer / QA Analyst** | Audit AI-generated responses; refine prompt templates; score RAG accuracy. |

---

## 🚀 Phased 4-Sprint Implementation Plan

### Phase 1: Core Ticket Management (Sprint 1)
* DB migrations for `tickets` and `ticket_messages` tables.
* Implement `models/ticket.py` and `models/ticket_message.py`.
* Implement `services/ticket_service.py` for CRUD lifecycle and assignments.
* Implement REST endpoints in `api/v1/support.py` protected by RBAC middleware.

### Phase 2: Asynchronous Event Engine & Email Service (Sprint 2)
* Configure Celery task handlers in `workers/ai_tasks.py`.
* Establish Redis message triggers on ticket lifecycle events.
* Integrate email worker (SMTP/SES) for confirmation emails and agent notifications.

### Phase 3: AI Intelligence Suite (Sprint 3)
* Implement `services/ai_service.py` using LLM SDKs (OpenAI / Anthropic).
* Build automated sentiment extraction, priority scoring, auto-tagging, and summarization tasks.
* Store AI inferences inside `ticket_ai` table.
* Implement duplicate ticket detection via vector similarity.

### Phase 4: Knowledge Base RAG & Support Dashboard (Sprint 4)
* Setup vector store ingestion pipeline for system documentation, FAQs, and vendor policies.
* Implement context-retrieval RAG chain for AI draft response synthesis.
* Build support analytics dashboard (`/dashboard/support`).
* Implement SLA breach alerting routines.

---

## 🧪 Verification & Testing Strategy

1. **Unit Tests**: Test logic in `ticket_service.py` and prompt formatters in `ai_service.py` using `pytest`.
2. **Integration Tests**: Verify end-to-end HTTP pipeline from ticket submission to DB persistence and status updates.
3. **Worker Tests**: Utilize `CELERY_TASK_ALWAYS_EAGER = True` during automated unit test runs to validate asynchronous workflows deterministically.
4. **Mocking External APIs**: Use HTTP mock adapters for LLM provider API calls to maintain fast execution during CI/CD runs.