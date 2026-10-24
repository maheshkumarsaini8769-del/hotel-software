import React, { useCallback, useEffect, useState } from 'react';
import {
  Wrench,
  Plus,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface MaintenanceViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

interface MaintenanceTicket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  blocksRoom: boolean;
  slaDeadline?: string;
  createdAt?: string;
  roomId?: { roomNumber?: string } | null;
  assetId?: { name?: string; assetCode?: string } | null;
}

interface MaintenanceSummary {
  totalTickets: number;
  openTicketsCount: number;
  overdueCount: number;
  resolvedCount: number;
  totalRepairExpenses: number;
  outOfOrderRoomsCount: number;
}

function readHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window === 'undefined') return headers;
  const token =
    window.localStorage.getItem('spicehub_token') || window.localStorage.getItem('token') || '';
  const hotelId =
    window.localStorage.getItem('spicehub_hotel_id') || window.localStorage.getItem('hotelId') || '';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (hotelId) headers['x-hotel-id'] = hotelId;
  return headers;
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const CATEGORIES = [
  'GENERAL',
  'ELECTRICAL',
  'PLUMBING',
  'HVAC',
  'APPLIANCE',
  'FURNITURE',
  'SAFETY',
] as const;

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ isDark = true, onToast }) => {
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('MEDIUM');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('GENERAL');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/maintenance/dashboard`, {
        headers: readHeaders(),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Could not load maintenance tickets (HTTP ${response.status})`);
      }
      setSummary(json.summary || null);
      const open: MaintenanceTicket[] = json.openTickets || [];
      const overdue: MaintenanceTicket[] = json.overdueTickets || [];
      const merged = Array.from(
        new Map([...overdue, ...open].map((ticket) => [String(ticket._id), ticket])).values()
      );
      setTickets(merged);
    } catch (err: any) {
      setSummary(null);
      setTickets([]);
      setError(err?.message || 'Maintenance tickets could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      onToast?.('Enter a title and description for the maintenance ticket.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/maintenance/tickets`, {
        method: 'POST',
        headers: readHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          category,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || 'Could not raise the maintenance ticket.');
      }
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setCategory('GENERAL');
      setShowForm(false);
      onToast?.(`Maintenance ticket ${json.ticket?.ticketNumber || ''} raised.`);
      await loadTickets();
    } catch (err: any) {
      onToast?.(err?.message || 'Could not raise the maintenance ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (ticket: MaintenanceTicket) => {
    try {
      const response = await fetch(`${API_BASE_URL}/maintenance/tickets/${ticket._id}/resolve`, {
        method: 'PUT',
        headers: readHeaders(),
        body: JSON.stringify({ resolutionNotes: 'Resolved from the reception terminal' }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || 'Could not resolve the ticket.');
      }
      onToast?.(`Ticket ${ticket.ticketNumber} marked resolved.`);
      await loadTickets();
    } catch (err: any) {
      onToast?.(err?.message || 'Could not resolve the ticket.');
    }
  };

  const cardClass = isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${cardClass}`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${headingClass}`}>
            <Wrench className="w-5 h-5 text-amber-500" />
            <span>Engineering & Maintenance Desk</span>
          </h2>
          <p className={`text-xs mt-0.5 ${mutedClass}`}>
            Live maintenance tickets with SLA tracking. Raise a ticket and resolve it from the front desk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Raise Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => void loadTickets()}
            disabled={loading}
            className={`p-2 rounded-xl border text-xs font-bold transition disabled:opacity-50 ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Refresh maintenance tickets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadTickets()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className={`p-3 rounded-xl border ${cardClass}`}>
          <span className={`text-[11px] font-bold ${mutedClass}`}>Open Tickets</span>
          <div className="text-xl font-black text-amber-400 font-mono">
            {summary?.openTicketsCount ?? '—'}
          </div>
        </div>
        <div className={`p-3 rounded-xl border ${cardClass}`}>
          <span className={`text-[11px] font-bold ${mutedClass}`}>Overdue SLA</span>
          <div className="text-xl font-black text-rose-400 font-mono">{summary?.overdueCount ?? '—'}</div>
        </div>
        <div className={`p-3 rounded-xl border ${cardClass}`}>
          <span className={`text-[11px] font-bold ${mutedClass}`}>Resolved</span>
          <div className="text-xl font-black text-emerald-400 font-mono">{summary?.resolvedCount ?? '—'}</div>
        </div>
        <div className={`p-3 rounded-xl border ${cardClass}`}>
          <span className={`text-[11px] font-bold ${mutedClass}`}>Rooms Out Of Service</span>
          <div className="text-xl font-black text-blue-400 font-mono">
            {summary?.outOfOrderRoomsCount ?? '—'}
          </div>
        </div>
        <div className={`p-3 rounded-xl border ${cardClass}`}>
          <span className={`text-[11px] font-bold ${mutedClass}`}>Repair Spend</span>
          <div className="text-xl font-black text-white font-mono">
            ₹{Number(summary?.totalRepairExpenses || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className={`p-4 rounded-2xl border space-y-3 ${cardClass}`}>
          <h3 className={`font-black text-xs ${headingClass}`}>Raise Maintenance Ticket</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Issue title, e.g. AC not cooling in Room 305"
              className={`px-3 py-2 rounded-xl border text-xs ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
              required
            />
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as (typeof PRIORITIES)[number])}
              className={`px-3 py-2 rounded-xl border text-xs ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value} priority
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue"
            rows={3}
            className={`w-full px-3 py-2 rounded-xl border text-xs ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
            required
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as (typeof CATEGORIES)[number])}
              className={`px-3 py-2 rounded-xl border text-xs ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-50"
            >
              {submitting ? 'Raising…' : 'Raise Ticket'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b text-[11px] font-black uppercase tracking-wider ${
                isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Issue</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">SLA</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading live maintenance tickets…
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No open maintenance tickets. Raise one from the front desk when needed.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const overdue = ticket.slaDeadline ? new Date(ticket.slaDeadline) < new Date() : false;
                  return (
                    <tr key={ticket._id} className="hover:bg-slate-800/20 transition">
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {ticket.ticketNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{ticket.title}</div>
                        <div className="text-[10px] text-slate-400">{ticket.description}</div>
                      </td>
                      <td className="py-3 px-4">{ticket.category}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            ticket.priority === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : ticket.priority === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">{String(ticket.status || '').replace(/_/g, ' ')}</td>
                      <td className="py-3 px-4">
                        {overdue ? (
                          <span className="flex items-center gap-1 text-rose-300 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3.5 h-3.5" /> On track
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleResolve(ticket)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Resolve
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
