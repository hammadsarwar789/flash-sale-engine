import React, { useState, useEffect } from 'react';
import { Eyebrow } from '../components/ui/Eyebrow';
import { useAuth } from '../context/AuthContext';
import { supportApi, SupportTicket, TicketDetail, SupportMetrics } from '../api/support';

export const SupportPortalPage: React.FC = () => {
  const { user } = useAuth();
  const isStaff = user && ['admin', 'manager', 'support_agent', 'support_manager'].includes(user.role);

  const [activeTab, setActiveTab] = useState<'tickets' | 'new-ticket' | 'dashboard'>(isStaff ? 'dashboard' : 'tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<TicketDetail | null>(null);
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Ticket Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Create Ticket Form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('RETURNS');
  const [priority, setPriority] = useState('MEDIUM');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply Form & AI State
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiRagResult, setAiRagResult] = useState<{ suggested_reply: string; confidence: number; source_documents: string[] } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [ticketData, metricsData] = await Promise.all([
        supportApi.getTickets({ status: statusFilter, priority: priorityFilter }),
        isStaff ? supportApi.getMetrics().catch(() => null) : Promise.resolve(null),
      ]);
      setTickets(ticketData.items);
      setMetrics(metricsData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load support data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter]);

  const handleSelectTicket = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setAiRagResult(null);
    try {
      const detail = await supportApi.getTicketDetail(ticketId);
      setSelectedTicketDetail(detail);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch ticket detail.');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      const res = await supportApi.createTicket({ subject, category, priority, message });
      setSuccessMsg(res.message);
      setSubject('');
      setMessage('');
      setActiveTab('tickets');
      if (res.ticket) {
        setTickets(prev => [res.ticket, ...prev.filter(t => t.id !== res.ticket.id)]);
        handleSelectTicket(res.ticket.id);
      }
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyMessage.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsReplying(true);
    try {
      const res = await supportApi.addReply(selectedTicketId, { message: replyMessage });
      setSuccessMsg(res.message);
      setReplyMessage('');
      setAiRagResult(null);
      const detail = await supportApi.getTicketDetail(selectedTicketId);
      setSelectedTicketDetail(detail);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to post reply.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleGenerateAIRagReply = async () => {
    if (!selectedTicketId) return;
    setIsGeneratingAI(true);
    setErrorMsg('');
    try {
      const res = await supportApi.getSuggestedReply(selectedTicketId);
      setAiRagResult(res);
      setReplyMessage(res.suggested_reply);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate AI response draft.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicketId || !user) return;
    try {
      const res = await supportApi.assignAgent(selectedTicketId, user.id);
      setSuccessMsg(res.message);
      const detail = await supportApi.getTicketDetail(selectedTicketId);
      setSelectedTicketDetail(detail);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign ticket.');
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicketId) return;
    try {
      const res = await supportApi.updateStatus(selectedTicketId, newStatus);
      setSuccessMsg(res.message);
      const detail = await supportApi.getTicketDetail(selectedTicketId);
      setSelectedTicketDetail(detail);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update ticket status.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 font-mono text-xs text-ink">
      {/* Page Header */}
      <div className="border-b border-rule pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Eyebrow className="text-ash block mb-1">SERVICE INTELLIGENCE DESK</Eyebrow>
          <h1 className="font-serif text-3xl md:text-4xl text-ink">Customer Support & AI Dispatch</h1>
          <p className="text-ash text-xs mt-1">Real-time ticketing, RAG knowledge retrieval, and SLA response automation.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 bg-paper-sunk border border-rule p-1">
          {isStaff && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 font-semibold transition-colors uppercase cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-ink text-paper' : 'text-ash hover:text-ink'
              }`}
            >
              📊 DASHBOARD
            </button>
          )}
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 font-semibold transition-colors uppercase cursor-pointer ${
              activeTab === 'tickets' ? 'bg-ink text-paper' : 'text-ash hover:text-ink'
            }`}
          >
            📋 TICKETS ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('new-ticket')}
            className={`px-3 py-1.5 font-semibold transition-colors uppercase cursor-pointer ${
              activeTab === 'new-ticket' ? 'bg-ink text-paper' : 'text-ash hover:text-ink'
            }`}
          >
            + NEW TICKET
          </button>
        </div>
      </div>

      {/* Messages Alert */}
      {errorMsg && (
        <div className="p-3 bg-loss/10 border border-loss text-loss font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-gain/10 border border-gain text-gain font-semibold">
          ✓ {successMsg}
        </div>
      )}

      {/* STAFF OPERATIONAL DASHBOARD */}
      {activeTab === 'dashboard' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-rule bg-paper p-4 space-y-1">
              <Eyebrow className="text-ash">OPEN TICKETS</Eyebrow>
              <p className="font-serif text-3xl text-signal font-bold">{metrics.open_tickets}</p>
              <p className="text-[10px] text-ash">Awaiting agent dispatch</p>
            </div>
            <div className="border border-rule bg-paper p-4 space-y-1">
              <Eyebrow className="text-ash">CRITICAL PRIORITY</Eyebrow>
              <p className="font-serif text-3xl text-loss font-bold">{metrics.critical_tickets}</p>
              <p className="text-[10px] text-loss font-semibold">Fraud / urgent escalation</p>
            </div>
            <div className="border border-rule bg-paper p-4 space-y-1">
              <Eyebrow className="text-ash">SLA COMPLIANCE</Eyebrow>
              <p className="font-serif text-3xl text-gain font-bold">{metrics.sla_compliance_percentage}%</p>
              <p className="text-[10px] text-gain font-semibold">Target &gt; 95.0%</p>
            </div>
            <div className="border border-rule bg-paper p-4 space-y-1">
              <Eyebrow className="text-ash">AVG RESPONSE TIME</Eyebrow>
              <p className="font-serif text-3xl text-ink font-bold">{metrics.average_response_time_minutes}m</p>
              <p className="text-[10px] text-ash">Fast resolution speed</p>
            </div>
          </div>
        </div>
      )}

      {/* TICKETS WORKSPACE */}
      {(activeTab === 'tickets' || activeTab === 'dashboard') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Ticket List Queue */}
          <div className="lg:col-span-5 space-y-4">
            <div className="border border-rule bg-paper p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-rule pb-2">
                <h3 className="font-serif text-lg text-ink">Support Queue</h3>
                <div className="flex space-x-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-paper-sunk border border-rule px-2 py-1 text-[11px]"
                  >
                    <option value="">ALL STATUS ▾</option>
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="WAITING_CUSTOMER">WAITING CUST</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-paper-sunk border border-rule px-2 py-1 text-[11px]"
                  >
                    <option value="">ALL PRIORITY ▾</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              {tickets.length === 0 ? (
                <p className="text-ash text-center py-6">No support tickets found.</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTicket(t.id)}
                      className={`border p-3 cursor-pointer transition-colors ${
                        selectedTicketId === t.id
                          ? 'border-ink bg-paper-sunk'
                          : 'border-rule bg-paper hover:bg-paper-sunk/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono font-semibold text-ink">{t.ticket_number}</span>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                              t.priority === 'CRITICAL'
                                ? 'bg-loss text-paper'
                                : t.priority === 'HIGH'
                                ? 'bg-signal/20 text-signal'
                                : 'bg-paper-sunk text-ash border border-rule'
                            }`}
                          >
                            {t.priority}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                              t.status === 'RESOLVED'
                                ? 'bg-gain/20 text-gain'
                                : t.status === 'OPEN'
                                ? 'bg-signal/20 text-signal'
                                : 'bg-paper-sunk text-ink'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      </div>
                      <p className="font-semibold text-ink line-clamp-1">{t.subject}</p>
                      <div className="flex justify-between items-center text-[10px] text-ash mt-2">
                        <span>🏷 {t.category}</span>
                        <span>{new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Ticket Thread & AI Assistant Drawer */}
          <div className="lg:col-span-7 space-y-4">
            {selectedTicketDetail ? (
              <div className="border border-rule bg-paper p-6 space-y-6">
                {/* Header & Controls */}
                <div className="border-b border-rule pb-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-ash">{selectedTicketDetail.ticket_number}</span>
                      <h2 className="font-serif text-2xl text-ink font-semibold">{selectedTicketDetail.subject}</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isStaff && (
                        <button
                          onClick={handleAssignToMe}
                          className="px-2.5 py-1 text-[11px] border border-rule bg-paper-sunk hover:bg-paper font-semibold uppercase"
                        >
                          👤 ASSIGN TO ME
                        </button>
                      )}
                      <select
                        value={selectedTicketDetail.status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        className="bg-paper border border-rule px-2 py-1 text-xs font-semibold"
                      >
                        <option value="OPEN">STATUS: OPEN</option>
                        <option value="IN_PROGRESS">STATUS: IN PROGRESS</option>
                        <option value="WAITING_CUSTOMER">STATUS: WAITING CUST</option>
                        <option value="RESOLVED">STATUS: RESOLVED ✓</option>
                        <option value="CLOSED">STATUS: CLOSED</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-ash">
                    <span>CUSTOMER: <strong className="text-ink">{selectedTicketDetail.customer_name || selectedTicketDetail.customer_email}</strong></span>
                    <span>CATEGORY: <strong className="text-ink">{selectedTicketDetail.category}</strong></span>
                    <span>ASSIGNED: <strong className="text-ink">{selectedTicketDetail.assigned_agent_name || 'UNASSIGNED'}</strong></span>
                  </div>
                </div>

                {/* AI Intelligence Rail */}
                {selectedTicketDetail.ai_metadata && (
                  <div className="border border-signal/40 bg-signal/5 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="font-serif text-sm font-semibold text-signal">🤖 AI Ticket Intelligence</span>
                        <span className="px-2 py-0.5 text-[9px] bg-signal text-paper font-bold uppercase">
                          SENTIMENT: {selectedTicketDetail.ai_metadata.sentiment || 'NEUTRAL'}
                        </span>
                      </div>
                      {isStaff && (
                        <button
                          type="button"
                          onClick={handleGenerateAIRagReply}
                          disabled={isGeneratingAI}
                          className="px-3 py-1 bg-signal text-paper font-semibold hover:bg-signal/90 transition-colors uppercase text-[10px]"
                        >
                          {isGeneratingAI ? 'SYNTHESIZING RAG...' : '⚡ GENERATE AI DRAFT'}
                        </button>
                      )}
                    </div>
                    {selectedTicketDetail.ai_metadata.summary && (
                      <p className="text-ash text-[11px] leading-relaxed">
                        <strong className="text-ink">Summary:</strong> {selectedTicketDetail.ai_metadata.summary}
                      </p>
                    )}

                    {aiRagResult && (
                      <div className="border-t border-signal/20 pt-2 space-y-2 text-[11px]">
                        <p className="text-gain font-semibold">
                          ✓ RAG Synthesis Grounded ({Math.round(aiRagResult.confidence * 100)}% Confidence)
                        </p>
                        <p className="text-ash">Sources: {aiRagResult.source_documents.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Thread */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                  {selectedTicketDetail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-4 border text-xs space-y-1 ${
                        m.sender_type === 'CUSTOMER'
                          ? 'border-rule bg-paper-sunk'
                          : 'border-ink bg-paper'
                      }`}
                    >
                      <div className="flex justify-between items-center font-mono text-[10px] text-ash">
                        <span className="font-semibold text-ink">
                          {m.sender_type === 'CUSTOMER' ? '👤 CUSTOMER' : '🛡️ SUPPORT AGENT'} — {m.sender_name || m.sender_type}
                        </span>
                        <span>{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-ink mt-2">{m.message}</p>
                    </div>
                  ))}
                </div>

                {/* Response Entry Box */}
                {['CLOSED', 'RESOLVED'].includes(selectedTicketDetail.status) ? (
                  <div className="border border-rule bg-paper-sunk p-4 text-center text-ash space-y-1">
                    <p className="font-semibold text-ink">🔒 TICKET IS {selectedTicketDetail.status}</p>
                    <p className="text-[11px]">New replies are disabled for resolved or closed tickets. Please open a new ticket if you need further assistance.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="border-t border-rule pt-4 space-y-3">
                    <textarea
                      rows={4}
                      required
                      placeholder="Type your official support response here..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="w-full bg-paper border border-rule px-3 py-2 text-ink focus:outline-none resize-none font-mono text-xs"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-ash text-[11px]">Pressing send notifies the user via email.</span>
                      <button
                        type="submit"
                        disabled={isReplying || !replyMessage.trim()}
                        className="px-6 py-2 bg-ink text-paper font-semibold hover:bg-graphite transition-colors uppercase cursor-pointer"
                      >
                        {isReplying ? 'SENDING...' : 'SEND RESPONSE →'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="border border-rule bg-paper p-12 text-center text-ash space-y-2">
                <p className="font-serif text-xl text-ink">No Ticket Selected</p>
                <p className="text-xs">Click on any ticket in the queue on the left to view the thread, RAG AI drafts, and post replies.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW TICKET FORM */}
      {activeTab === 'new-ticket' && (
        <form onSubmit={handleCreateTicket} className="border border-rule bg-paper p-6 space-y-6 max-w-2xl mx-auto">
          <div className="border-b border-rule pb-3">
            <h3 className="font-serif text-2xl text-ink">Open Customer Support Ticket</h3>
            <p className="text-ash text-xs">Submit your issue for immediate review by our support team.</p>
          </div>

          <div className="space-y-4">
            <div>
              <Eyebrow className="text-ash block mb-1">ISSUE SUBJECT *</Eyebrow>
              <input
                type="text"
                required
                placeholder="e.g. Wrong shoe size received in Order #8812"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-paper border border-rule px-3 py-2 text-ink"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Eyebrow className="text-ash block mb-1">CATEGORY *</Eyebrow>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-paper border border-rule px-3 py-2 text-ink"
                >
                  <option value="RETURNS">RETURNS & EXCHANGES</option>
                  <option value="SHIPPING">SHIPPING & TRACKING</option>
                  <option value="PAYMENT">PAYMENT & REFUNDS</option>
                  <option value="WARRANTY">WARRANTY & CLAIMS</option>
                  <option value="GENERAL">GENERAL INQUIRY</option>
                </select>
              </div>
              <div>
                <Eyebrow className="text-ash block mb-1">PRIORITY LEVEL *</Eyebrow>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-paper border border-rule px-3 py-2 text-ink"
                >
                  <option value="LOW">LOW — General Query</option>
                  <option value="MEDIUM">MEDIUM — Standard Issue</option>
                  <option value="HIGH">HIGH — Urgent Order Issue</option>
                  <option value="CRITICAL">CRITICAL — Fraud / Payment Problem</option>
                </select>
              </div>
            </div>

            <div>
              <Eyebrow className="text-ash block mb-1">DETAILED DESCRIPTION *</Eyebrow>
              <textarea
                rows={5}
                required
                placeholder="Please describe what happened, including any order numbers, item names, or sizes..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-paper border border-rule px-3 py-2 text-ink resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 border-t border-rule pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className="px-4 py-2 border border-rule text-ash hover:text-ink uppercase"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-ink text-paper font-semibold hover:bg-graphite uppercase cursor-pointer"
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT TICKET →'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
