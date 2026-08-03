import { apiFetch } from './client';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  vendor_id?: string;
  order_id?: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  message_count: number;
  ai_metadata?: {
    summary?: string;
    sentiment?: string;
    suggested_reply?: string;
    confidence?: number;
    predicted_category?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name?: string;
  sender_type: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  message: string;
  attachments?: string[];
  created_at: string;
}

export interface TicketDetail extends SupportTicket {
  messages: TicketMessage[];
}

export interface SupportMetrics {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  waiting_customer_tickets: number;
  resolved_tickets: number;
  critical_tickets: number;
  sla_compliance_percentage: number;
  average_response_time_minutes: number;
}

export const supportApi = {
  async createTicket(data: {
    subject: string;
    message: string;
    category?: string;
    priority?: string;
    order_id?: string;
    vendor_id?: string;
    attachments?: string[];
  }): Promise<{ message: string; ticket: SupportTicket }> {
    return apiFetch<{ message: string; ticket: SupportTicket }>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTickets(params: {
    status?: string;
    priority?: string;
    assigned_agent_id?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<{ items: SupportTicket[]; total: number; page: number; pages: number }> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.priority) query.append('priority', params.priority);
    if (params.assigned_agent_id) query.append('assigned_agent_id', params.assigned_agent_id);
    if (params.page) query.append('page', params.page.toString());
    if (params.per_page) query.append('per_page', params.per_page.toString());

    return apiFetch<{ items: SupportTicket[]; total: number; page: number; pages: number }>(`/support/tickets?${query.toString()}`);
  },

  async getTicketDetail(ticketId: string): Promise<TicketDetail> {
    return apiFetch<TicketDetail>(`/support/tickets/${ticketId}`);
  },

  async addReply(ticketId: string, data: { message: string; attachments?: string[] }): Promise<{ message: string; ticket_message: TicketMessage }> {
    return apiFetch<{ message: string; ticket_message: TicketMessage }>(`/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async assignAgent(ticketId: string, agentId?: string): Promise<{ message: string; ticket: SupportTicket }> {
    return apiFetch<{ message: string; ticket: SupportTicket }>(`/support/tickets/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId }),
    });
  },

  async updateStatus(ticketId: string, status: string): Promise<{ message: string; ticket: SupportTicket }> {
    return apiFetch<{ message: string; ticket: SupportTicket }>(`/support/tickets/${ticketId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async getMetrics(): Promise<SupportMetrics> {
    return apiFetch<SupportMetrics>('/support/tickets/dashboard/metrics');
  },

  async summarizeTicket(ticketId: string): Promise<{ message: string; ai_metadata: any }> {
    return apiFetch<{ message: string; ai_metadata: any }>(`/support/tickets/${ticketId}/summarize`, {
      method: 'POST',
    });
  },

  async getSuggestedReply(ticketId: string): Promise<{
    suggested_reply: string;
    confidence: number;
    source_documents: string[];
    retrieved_context: string;
  }> {
    return apiFetch<{
      suggested_reply: string;
      confidence: number;
      source_documents: string[];
      retrieved_context: string;
    }>(`/support/tickets/${ticketId}/suggest-reply`, {
      method: 'POST',
    });
  },
};
