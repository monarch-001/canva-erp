import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

type CrStatus = 'pending' | 'ip_approved' | 'approved' | 'implemented' | 'dual_approved' | 'rejected';
type CrTier = 1 | 2 | 3;

interface CrRow {
  id: string;
  cr_number: string;
  wo_number: string;
  change_type: string;
  tier: CrTier;
  status: CrStatus;
  raised_by: string;
  raised_date: string;
  pending_from: string | null;
}

const ALL_STATUSES: CrStatus[] = ['pending', 'ip_approved', 'approved', 'implemented', 'dual_approved', 'rejected'];
const ALL_TIERS: CrTier[] = [1, 2, 3];

function tierPill(tier: CrTier) {
  const cfg =
    tier === 1 ? { label: 'T1', cls: 'bg-[#F3E7CD] text-secondary' } :
    tier === 2 ? { label: 'T2', cls: 'bg-amber-100 text-amber-700' } :
                 { label: 'T3', cls: 'bg-red-100 text-red-600' };
  return <span className={`w-8 h-7 inline-flex items-center justify-center text-xs font-bold rounded-full ${cfg.cls}`}>{cfg.label}</span>;
}

function statusPill(status: CrStatus) {
  switch (status) {
    case 'pending':       return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 uppercase">Pending</span>;
    case 'ip_approved':   return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-700 uppercase">IP Approved</span>;
    case 'approved':      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 uppercase">Approved</span>;
    case 'implemented':   return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 uppercase">Implemented</span>;
    case 'dual_approved': return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 uppercase">Dual Approved</span>;
    case 'rejected':      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-600 uppercase">Rejected</span>;
  }
}

export default function ChangeRequestsList() {
  const navigate = useNavigate();
  const [crs, setCrs] = useState<CrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | CrStatus>('all');
  const [tierFilter, setTierFilter] = useState<'all' | CrTier>('all');
  const [woSearch, setWoSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('All time');

  useEffect(() => {
    fetch('/api/change-requests')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCrs(data.map(d => ({
            id: d.id,
            cr_number: d.cr_number,
            wo_number: d.wo_number || 'WO-CHH-26-001',
            change_type: d.reason?.split(':')[0] || 'Specification Change',
            tier: d.notes?.includes('Minor') ? 1 : d.notes?.includes('Major') ? 3 : 2,
            status: d.status,
            raised_by: d.creator_name || 'Site Manager',
            raised_date: new Date(d.created_at).toLocaleDateString('en-IN'),
            pending_from: d.status === 'pending' ? 'Factory Manager' : null
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = crs.filter(cr => {
    if (statusFilter !== 'all' && cr.status !== statusFilter) return false;
    if (tierFilter !== 'all' && cr.tier !== tierFilter) return false;
    if (woSearch && !cr.wo_number.toLowerCase().includes(woSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex">
      <Sidebar />
      <div className="ml-[220px] flex-1 px-8 py-8">

        {/* Title */}
        <h1 className="text-2xl font-bold text-ink-900 mb-1">Change Requests</h1>
        <p className="text-sm text-ink-500 mb-6">All change requests across every Work Order</p>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | CrStatus)}
            className="px-3 py-1.5 text-sm border border-[#E8E2D9] rounded-full bg-white text-ink-700 focus:outline-none focus:border-secondary"
          >
            <option value="all">Status: All</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>
                {s === 'ip_approved' ? 'IP Approved' :
                 s === 'dual_approved' ? 'Dual Approved' :
                 s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* Tier filter */}
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as CrTier)}
            className="px-3 py-1.5 text-sm border border-[#E8E2D9] rounded-full bg-white text-ink-700 focus:outline-none focus:border-secondary"
          >
            <option value="all">Tier: All</option>
            {ALL_TIERS.map(t => <option key={t} value={t}>Tier {t}</option>)}
          </select>

          {/* WO search */}
          <div className="relative">
            <input
              type="text"
              value={woSearch}
              onChange={e => setWoSearch(e.target.value)}
              placeholder="WO Number: Search"
              className="px-3 py-1.5 text-sm border border-[#E8E2D9] rounded-full bg-white text-ink-700 focus:outline-none focus:border-secondary w-44"
            />
          </div>

          {/* Date range */}
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[#E8E2D9] rounded-full bg-white text-ink-700 focus:outline-none focus:border-secondary"
          >
            {['All time', 'This week', 'This month', 'Last month'].map(d => (
              <option key={d}>{d === 'All time' ? `Date range: ${d}` : d}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E8E2D9] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E2D9]">
                {['CR Number', 'WO Number', 'Change Type', 'Tier', 'Status', 'Raised By', 'Raised Date', 'Pending From'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE3]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-400 italic">Loading change requests…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-400 italic">No change requests found.</td>
                </tr>
              ) : (
                filtered.map(cr => (
                  <tr key={cr.id} className="hover:bg-[#FAF8F5] transition-colors cursor-pointer" onClick={() => navigate(`/change-requests/${cr.id}`)}>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-secondary hover:underline">{cr.cr_number}</span>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-ink-900">{cr.wo_number}</td>
                    <td className="px-4 py-4 text-sm text-ink-600">{cr.change_type}</td>
                    <td className="px-4 py-4">{tierPill(cr.tier)}</td>
                    <td className="px-4 py-4">{statusPill(cr.status)}</td>
                    <td className="px-4 py-4 text-sm text-ink-600">{cr.raised_by}</td>
                    <td className="px-4 py-4 text-sm text-ink-500">{cr.raised_date}</td>
                    <td className="px-4 py-4 text-sm font-semibold">
                      {cr.pending_from
                        ? <span className="text-red-600">{cr.pending_from}</span>
                        : <span className="text-ink-300">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
