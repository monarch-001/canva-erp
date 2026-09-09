import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import FMApprovalModal from '../components/FMApprovalModal';
import type { OtRequestDetail } from '../components/FMApprovalModal';

interface OtRequest {
  id: string;
  otr_number: string;
  carpenter_name: string;
  when_label: string;
  hours: number;
  wo_number: string;
  wo_task: string;
  reason: string;
  work_description: string;
  date_label: string;
  time_label: string;
  job_card: string;
  type: string;
  est_cost: number;
  carpenter_ot_this_month: number;
  ot_cap: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface CarpenterStatus {
  name: string;
  hours_used: number;
  cap: number;
  status: 'ok' | 'near_cap' | 'capped' | 'override';
}

interface OtHistoryRow {
  id: string;
  otr_number: string;
  carpenter: string;
  date: string;
  type: string;
  hours: number;
  cost: number;
  status: 'completed' | 'rejected' | 'approved' | 'pending';
}

const MOCK_PENDING: OtRequest[] = [
  {
    id: 'r1', otr_number: 'OTR-26-001', carpenter_name: 'Ramesh Kumar',
    when_label: 'Today — 6:00 PM to 9:00 PM (3 hours)', hours: 3,
    wo_number: 'WO-CHH-26-001', wo_task: 'Assembly work', job_card: 'JC-230826-001',
    reason: 'Behind schedule, delivery tomorrow',
    work_description: 'Complete base frame assembly for reception counter.',
    date_label: '10-Aug-2026 (Monday)', time_label: '6:00 PM to 9:00 PM',
    type: 'Daily OT', est_cost: 300, carpenter_ot_this_month: 18, ot_cap: 26, status: 'pending',
  },
  {
    id: 'r2', otr_number: 'OTR-26-002', carpenter_name: 'Suresh Yadav',
    when_label: 'Today — 6:00 PM to 8:00 PM (2 hours)', hours: 2,
    wo_number: 'WO-B2B-28-001', wo_task: 'Finishing touches before dispatch', job_card: 'JC-230826-003',
    reason: 'Client walkthrough scheduled early tomorrow',
    work_description: 'Final polish and touch-up on cabinet surfaces.',
    date_label: '10-Aug-2026 (Monday)', time_label: '6:00 PM to 8:00 PM',
    type: 'Daily OT', est_cost: 200, carpenter_ot_this_month: 24, ot_cap: 26, status: 'pending',
  },
  {
    id: 'r3', otr_number: 'OTR-26-003', carpenter_name: 'Mohan Lal',
    when_label: 'Tomorrow (Sunday) — Full shift (9 hours)', hours: 9,
    wo_number: 'WO-CHH-26-005', wo_task: 'Weekend work — hospital fitout deadline', job_card: 'JC-230826-014',
    reason: 'Client delivery moved up, needs weekend push to stay on schedule for hospital fitout deadline.',
    work_description: 'Complete hardware fitting and final QC prep for 4 remaining cabinet units.',
    date_label: '11-Aug-2026 (Sunday)', time_label: 'Full shift — 9:00 AM to 6:00 PM',
    type: 'Weekend Work', est_cost: 900, carpenter_ot_this_month: 5, ot_cap: 26, status: 'pending',
  },
  {
    id: 'r4', otr_number: 'OTR-26-004', carpenter_name: 'Deepak Verma',
    when_label: 'Sunday — Full shift (9 hours)', hours: 9,
    wo_number: 'WO-CHH-26-005', wo_task: 'Weekend work — hospital fitout', job_card: 'JC-230826-014',
    reason: 'Client delivery moved up, needs weekend push to stay on schedule for hospital fitout deadline.',
    work_description: 'Complete hardware fitting and final QC prep for 4 remaining cabinet units.',
    date_label: '10-Aug-2026 (Sunday)', time_label: 'Full shift — 9:00 AM to 6:00 PM',
    type: 'Weekend Work Request', est_cost: 900, carpenter_ot_this_month: 19, ot_cap: 26, status: 'pending',
  },
];

const MOCK_CARPENTERS: CarpenterStatus[] = [
  { name: 'Ramesh Kumar', hours_used: 18, cap: 26, status: 'ok' },
  { name: 'Suresh Yadav', hours_used: 24, cap: 26, status: 'near_cap' },
  { name: 'Vikram Singh', hours_used: 26, cap: 26, status: 'capped' },
  { name: 'Mohan Lal',   hours_used: 5,  cap: 26, status: 'ok' },
  { name: 'Deepak Verma', hours_used: 29, cap: 26, status: 'override' },
];

const MOCK_HISTORY: OtHistoryRow[] = [
  { id: 'h1', otr_number: 'OTR-25-098', carpenter: 'Ramesh Kumar', date: '15-Aug-2026', type: 'Daily OT',     hours: 3, cost: 300, status: 'completed' },
  { id: 'h2', otr_number: 'OTR-25-095', carpenter: 'Suresh Yadav', date: '12-Aug-2026', type: 'Daily OT',     hours: 2, cost: 200, status: 'completed' },
  { id: 'h3', otr_number: 'OTR-25-091', carpenter: 'Mohan Lal',    date: '09-Aug-2026', type: 'Weekend Work', hours: 9, cost: 900, status: 'completed' },
  { id: 'h4', otr_number: 'OTR-25-087', carpenter: 'Vikram Singh', date: '05-Aug-2026', type: 'Daily OT',     hours: 3, cost: 300, status: 'rejected' },
  { id: 'h5', otr_number: 'OTR-25-082', carpenter: 'Anil Rawat',   date: '02-Aug-2026', type: 'Holiday Work', hours: 6, cost: 600, status: 'completed' },
];

function carpenterBarColor(status: CarpenterStatus['status']): string {
  switch (status) {
    case 'ok':       return '#16A34A';
    case 'near_cap': return '#D97706';
    case 'capped':   return '#DC2626';
    case 'override': return '#2563EB';
    default:         return '#16A34A';
  }
}

function carpenterStatusPill(status: CarpenterStatus['status']) {
  switch (status) {
    case 'ok':       return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />OK</span>;
    case 'near_cap': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">▲ Near Cap</span>;
    case 'capped':   return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />CAPPED</span>;
    case 'override': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">◆ Override Applied</span>;
  }
}

function hoursLeftColor(status: CarpenterStatus['status']): string {
  switch (status) {
    case 'ok':       return 'text-green-600';
    case 'near_cap': return 'text-amber-600';
    case 'capped':
    case 'override': return 'text-red-600';
    default:         return 'text-ink-700';
  }
}

function historyStatusPill(status: OtHistoryRow['status']) {
  switch (status) {
    case 'completed': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Completed</span>;
    case 'rejected':  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Rejected</span>;
    case 'approved':  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Approved</span>;
    case 'pending':   return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pending</span>;
  }
}

function requestToDetail(req: OtRequest): OtRequestDetail {
  return {
    otrNumber: req.otr_number,
    carpenterName: req.carpenter_name,
    type: req.type,
    date: req.date_label,
    time: req.time_label,
    hoursRequested: req.hours,
    workOrder: req.wo_number,
    jobCard: req.job_card,
    reason: req.reason,
    workDescription: req.work_description,
    carpenterOtThisMonth: req.carpenter_ot_this_month,
    otCap: req.ot_cap,
  };
}

export default function OvertimeManagement() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<OtRequest[]>([]);
  const [carpenters, setCarpenters] = useState<CarpenterStatus[]>([]);
  const [history, setHistory] = useState<OtHistoryRow[]>([]);
  const [period, setPeriod] = useState('This Month');
  const [carpFilter, setCarpFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [approvalModalReq, setApprovalModalReq] = useState<OtRequest | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [pRes, cRes, hRes] = await Promise.all([
          fetch('/api/ot/pending'),
          fetch('/api/ot/carpenter-status'),
          fetch('/api/ot/history'),
        ]);
        if (pRes.ok) setPending(await pRes.json()); else throw new Error();
        if (cRes.ok) setCarpenters(await cRes.json()); else throw new Error();
        if (hRes.ok) setHistory(await hRes.json()); else throw new Error();
      } catch {
        setPending(MOCK_PENDING);
        setCarpenters(MOCK_CARPENTERS);
        setHistory(MOCK_HISTORY);
      }
    }
    load();
  }, []);

  function handleApproveClick(req: OtRequest) {
    const wouldExceed = req.carpenter_ot_this_month + req.hours > req.ot_cap;
    if (wouldExceed) {
      // Open FM override modal
      setApprovalModalReq(req);
    } else {
      // Direct approve
      doApprove(req.id);
    }
  }

  async function doApprove(id: string) {
    try { await fetch(`/api/ot/${id}/approve`, { method: 'POST' }); } catch { /* */ }
    setPending(prev => prev.filter(r => r.id !== id));
  }

  async function handleReject(id: string) {
    try { await fetch(`/api/ot/${id}/reject`, { method: 'POST' }); } catch { /* */ }
    setPending(prev => prev.filter(r => r.id !== id));
    setApprovalModalReq(null);
  }

  function handleModalApprove(otrNumber: string, _hoursApproved: number, _overrideReason?: string) {
    const req = pending.find(r => r.otr_number === otrNumber);
    if (req) doApprove(req.id);
    setApprovalModalReq(null);
  }

  const pendingCount = pending.length;
  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const filteredHistory = history.filter(h => {
    if (carpFilter   !== 'All' && h.carpenter !== carpFilter) return false;
    if (statusFilter !== 'All' && h.status    !== statusFilter.toLowerCase()) return false;
    if (typeFilter   !== 'All' && h.type      !== typeFilter) return false;
    return true;
  });

  const uniqueCarpenters = [...new Set(history.map(h => h.carpenter))];
  const uniqueTypes = [...new Set(history.map(h => h.type))];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        <Header
          title="Overtime Management"
          subtitle="₹100/hour flat rate · Monthly cap 26 hours per carpenter"
          actions={
            <div className="flex items-center gap-3">
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="border border-border-strong rounded-lg px-3 py-2 text-sm text-ink-700 bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option>This Month</option>
                <option>Last Month</option>
                <option>This Quarter</option>
              </select>
              <button
                onClick={() => navigate('/production/overtime/new')}
                className="px-4 py-2 bg-secondary text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
              >
                + Submit OT Request
              </button>
            </div>
          }
        />

        <main className="flex-1 px-8 py-6 space-y-5">

          {/* Pending Approvals */}
          <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-3">
              <h2 className="text-base font-bold text-primary">Pending Approvals</h2>
              {pendingCount > 0 && (
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <p className="px-6 py-8 text-sm text-ink-400 italic text-center">No pending OT approvals.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {pending.map(req => {
                  const wouldExceed = req.carpenter_ot_this_month + req.hours > req.ot_cap;
                  return (
                    <div key={req.id} className={`px-6 py-5 border-l-4 ${wouldExceed ? 'border-red-500 bg-red-50/20' : 'border-amber-400 bg-amber-50/30'}`}>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-secondary">{req.otr_number}</span>
                          <span className="text-ink-300">|</span>
                          <span className="text-sm font-semibold text-ink-900">{req.carpenter_name}</span>
                          {wouldExceed && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Cap Exceeded</span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-ink-600 flex-shrink-0">Est. Cost: ₹{req.est_cost}</span>
                      </div>
                      <p className="text-sm text-ink-600 mb-1">{req.when_label}</p>
                      <p className="text-sm text-ink-600 mb-1">WO: <span className="font-medium text-ink-700">{req.wo_number} — {req.wo_task}</span></p>
                      <p className="text-sm text-ink-500 mb-3">Reason: {req.reason}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveClick(req)}
                          className={`px-4 py-1.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition ${
                            wouldExceed ? 'bg-red-600' : 'bg-secondary'
                          }`}
                        >
                          {wouldExceed ? 'Review & Override' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="px-4 py-1.5 border border-border-strong text-ink-700 text-sm font-medium rounded-lg hover:bg-surface-alt transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Carpenter OT Status */}
          <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h2 className="text-base font-bold text-primary">Carpenter OT Status — {monthLabel}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {['Carpenter', 'Hours Used', 'Hours Left', 'Cap', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {carpenters.map(c => {
                    const pct = Math.min((c.hours_used / c.cap) * 100, 100);
                    const hoursLeft = Math.max(c.cap - c.hours_used, 0);
                    return (
                      <tr key={c.name}>
                        <td className="px-6 py-4 text-sm font-semibold text-ink-700">{c.name}</td>
                        <td className="px-6 py-4 min-w-[220px]">
                          <div className="w-full h-2 bg-border-subtle rounded-full mb-1">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: carpenterBarColor(c.status) }}
                            />
                          </div>
                          <p className="text-xs text-ink-400">{c.hours_used} / {c.cap} hrs used</p>
                        </td>
                        <td className={`px-6 py-4 text-sm font-bold ${hoursLeftColor(c.status)}`}>
                          {hoursLeft} hrs
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-600">{c.cap}</td>
                        <td className="px-6 py-4">{carpenterStatusPill(c.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* OT History */}
          <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h2 className="text-base font-bold text-primary">OT History — This Month</h2>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-border-subtle flex-wrap">
              <select
                value={carpFilter}
                onChange={e => setCarpFilter(e.target.value)}
                className="border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-ink-700 bg-white focus:outline-none"
              >
                <option value="All">Carpenter: All</option>
                {uniqueCarpenters.map(c => <option key={c}>{c}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-ink-700 bg-white focus:outline-none"
              >
                {['All', 'Completed', 'Rejected', 'Approved', 'Pending'].map(s => (
                  <option key={s} value={s}>Status: {s}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-ink-700 bg-white focus:outline-none"
              >
                <option value="All">Type: All</option>
                {uniqueTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-alt">
                    {['OTR No.', 'Carpenter', 'Date', 'Type', 'Hours', 'Cost', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-sm text-ink-400 italic text-center">No records found.</td>
                    </tr>
                  ) : (
                    filteredHistory.map(row => (
                      <tr key={row.id} className="hover:bg-surface-alt transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-secondary">{row.otr_number}</td>
                        <td className="px-6 py-4 text-sm text-ink-700">{row.carpenter}</td>
                        <td className="px-6 py-4 text-sm text-ink-600">{row.date}</td>
                        <td className="px-6 py-4 text-sm text-ink-600">{row.type}</td>
                        <td className="px-6 py-4 text-sm text-ink-700 font-medium">{row.hours} hrs</td>
                        <td className="px-6 py-4 text-sm text-ink-700 font-medium">₹{row.cost}</td>
                        <td className="px-6 py-4">{historyStatusPill(row.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* FM Approval Modal */}
      <FMApprovalModal
        open={approvalModalReq !== null}
        request={approvalModalReq ? requestToDetail(approvalModalReq) : null}
        onClose={() => setApprovalModalReq(null)}
        onReject={otrNumber => {
          const req = pending.find(r => r.otr_number === otrNumber);
          if (req) handleReject(req.id);
        }}
        onApprove={handleModalApprove}
      />
    </div>
  );
}
