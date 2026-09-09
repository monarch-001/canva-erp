import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

// ─── Types ────────────────────────────────────────────────────────────────────
type PRStatus = 'submitted' | 'approved' | 'po_raised' | 'rejected';
type PRUrgency = 'urgent' | 'normal';

interface PRRow {
  id: string;
  pr_number: string;
  material: string;
  wo_reference: string;
  qty: string;
  required_by: string;
  urgency: PRUrgency;
  status: PRStatus;
  raised_by: string;
  highlight?: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_PRS: PRRow[] = [
  { id: 'pr18', pr_number: 'PR-26-018', material: 'Fevicol SR 998', wo_reference: 'WO-CHH-26-001', qty: '4 kg', required_by: '15-Aug-26', urgency: 'urgent', status: 'submitted', raised_by: 'System (BOM)', highlight: true },
  { id: 'pr17', pr_number: 'PR-26-017', material: 'Laminate — Merino Charcoal', wo_reference: 'WO-CHH-26-001', qty: '260 sqft', required_by: '18-Aug-26', urgency: 'normal', status: 'submitted', raised_by: 'System (BOM)', highlight: true },
  { id: 'pr16', pr_number: 'PR-26-016', material: 'Plywood 18mm BWR', wo_reference: 'WO-B2B-26-001', qty: '20 sheets', required_by: '20-Aug-26', urgency: 'normal', status: 'approved', raised_by: 'Ramesh Yadav' },
  { id: 'pr15', pr_number: 'PR-26-015', material: 'Edge Tape 2mm', wo_reference: 'General Stock', qty: '100 metres', required_by: '22-Aug-26', urgency: 'normal', status: 'approved', raised_by: 'Suresh Yadav' },
  { id: 'pr14', pr_number: 'PR-26-014', material: 'SS Hinges — Heavy Duty', wo_reference: 'WO-CHH-26-005', qty: '24 pcs', required_by: '14-Aug-26', urgency: 'urgent', status: 'approved', raised_by: 'Ramesh Yadav' },
  { id: 'pr13', pr_number: 'PR-26-013', material: 'PU Polish', wo_reference: 'WO-B2B-26-002', qty: '12 litres', required_by: '25-Aug-26', urgency: 'normal', status: 'po_raised', raised_by: 'Suresh Yadav' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusPill(s: PRStatus) {
  const map: Record<PRStatus, { cls: string; label: string }> = {
    submitted: { cls: 'bg-sky-100 text-sky-700', label: 'SUBMITTED' },
    approved:  { cls: 'bg-green-100 text-green-700', label: 'APPROVED' },
    po_raised: { cls: 'bg-teal-100 text-teal-700', label: 'PO RAISED' },
    rejected:  { cls: 'bg-red-100 text-red-600', label: 'REJECTED' },
  };
  const { cls, label } = map[s];
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{label}</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PurchaseRequisitionList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');

  const pendingCount = MOCK_PRS.filter((p) => p.status === 'submitted').length;
  const approvedNoPO = MOCK_PRS.filter((p) => p.status === 'approved').length;
  const urgentCount = MOCK_PRS.filter((p) => p.urgency === 'urgent').length;

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex">
      <Sidebar />
      <div className="flex-1 ml-[220px]">
      <div className="px-8 pt-8 pb-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Purchase Requisitions</h1>
            <p className="text-sm text-ink-400 mt-0.5">
              Every material purchase starts here — PR → PO → GRN
            </p>
          </div>
          <button
            onClick={() => navigate('/purchase-requisitions/new')}
            className="px-4 py-2 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors"
          >
            + New PR
          </button>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-[#D5CFC8] rounded-xl px-6 py-5">
            <p className="text-3xl font-black text-amber-500 mb-1">{pendingCount}</p>
            <p className="text-sm text-ink-400">Pending Approval</p>
          </div>
          <div className="bg-white border border-[#D5CFC8] rounded-xl px-6 py-5">
            <p className="text-3xl font-black text-sky-500 mb-1">{approvedNoPO}</p>
            <p className="text-sm text-ink-400">Approved (PO not raised)</p>
          </div>
          <div className="bg-white border border-[#D5CFC8] rounded-xl px-6 py-5">
            <p className="text-3xl font-black text-red-500 mb-1">{urgentCount}</p>
            <p className="text-sm text-ink-400">Urgent PRs</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          {[
            { label: 'Status', value: statusFilter, setter: setStatusFilter, options: ['All', 'Submitted', 'Approved', 'PO Raised', 'Rejected'] },
            { label: 'Urgency', value: urgencyFilter, setter: setUrgencyFilter, options: ['All', 'Urgent', 'Normal'] },
          ].map((f) => (
            <select
              key={f.label}
              value={f.value}
              onChange={(e) => f.setter(e.target.value)}
              className="border border-[#D5CFC8] bg-white text-sm text-ink-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B8892B]/30"
            >
              {f.options.map((o) => (
                <option key={o}>{f.label}: {o} ·</option>
              ))}
            </select>
          ))}
          <select className="border border-[#D5CFC8] bg-white text-sm text-ink-700 rounded-lg px-3 py-1.5 focus:outline-none">
            <option>WO Number: All ·</option>
          </select>
          <select className="border border-[#D5CFC8] bg-white text-sm text-ink-700 rounded-lg px-3 py-1.5 focus:outline-none">
            <option>Date range: All time ·</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#D5CFC8]">
                {['PR Number', 'Material', 'WO Reference', 'Qty', 'Required By', 'Urgency', 'Status', 'Raised By', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-4 text-xs font-semibold text-ink-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE3]">
              {MOCK_PRS.map((pr) => (
                <tr
                  key={pr.id}
                  className={`transition-colors ${pr.highlight ? 'bg-[#FEF8EC] hover:bg-[#FDF3DC]' : 'hover:bg-[#FAF8F5]'}`}
                >
                  <td className="px-5 py-4 text-sm font-bold text-[#B8892B]">{pr.pr_number}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-ink-900">{pr.material}</td>
                  <td className="px-5 py-4 text-sm text-ink-500">{pr.wo_reference}</td>
                  <td className="px-5 py-4 text-sm text-ink-700">{pr.qty}</td>
                  <td className="px-5 py-4 text-sm text-ink-700">{pr.required_by}</td>
                  <td className="px-5 py-4">
                    {pr.urgency === 'urgent' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500 text-white uppercase">URGENT</span>
                    ) : (
                      <span className="text-sm text-ink-400">Normal</span>
                    )}
                  </td>
                  <td className="px-5 py-4">{statusPill(pr.status)}</td>
                  <td className="px-5 py-4 text-sm text-ink-500">{pr.raised_by}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => navigate(`/purchase-requisitions/${pr.id}`)}
                      className="text-sm text-[#B8892B] font-medium hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
