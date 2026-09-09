import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type POStatus =
  | 'pending_approval'
  | 'pending_2nd_approval'
  | 'approved'
  | 'sent'
  | 'acknowledged'
  | 'partially_received'
  | 'fully_received'
  | 'rejected'
  | 'cancelled';

interface PORow {
  id: string;
  po_number: string;
  vendor: string;
  item_count: number;
  grand_total: number;
  delivery_date: string | null;
  status: POStatus;
}

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function statusPill(s: POStatus) {
  const map: Record<POStatus, { cls: string; label: string }> = {
    pending_approval:    { cls: 'bg-amber-100 text-amber-700', label: 'PENDING APPROVAL' },
    pending_2nd_approval:{ cls: 'bg-violet-100 text-violet-700', label: 'PENDING 2ND APPROVAL' },
    approved:            { cls: 'bg-green-100 text-green-700', label: 'APPROVED' },
    sent:                { cls: 'bg-sky-100 text-sky-700', label: 'SENT' },
    acknowledged:        { cls: 'bg-green-100 text-green-700', label: 'ACKNOWLEDGED' },
    partially_received:  { cls: 'bg-orange-100 text-orange-700', label: 'PARTIALLY RECEIVED' },
    fully_received:      { cls: 'bg-green-100 text-green-700', label: 'FULLY RECEIVED' },
    rejected:            { cls: 'bg-red-100 text-red-700', label: 'REJECTED' },
    cancelled:           { cls: 'bg-gray-100 text-gray-500', label: 'CANCELLED' },
  };
  const { cls, label } = map[s] ?? { cls: 'bg-gray-100 text-gray-500', label: s.toUpperCase() };
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${cls}`}>{label}</span>;
}

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const [pos, setPos] = useState<PORow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/purchase-orders')
      .then(r => r.json())
      .then(data => setPos(Array.isArray(data) ? data : []))
      .catch(() => setPos([]))
      .finally(() => setLoading(false));
  }, []);

  const pendingCount = pos.filter(p => p.status === 'pending_approval' || p.status === 'pending_2nd_approval').length;
  const awaitingDelivery = pos.filter(p => ['approved', 'sent', 'acknowledged', 'partially_received'].includes(p.status)).length;
  const today = new Date();
  const overdueCount = pos.filter(p =>
    p.delivery_date && new Date(p.delivery_date) < today &&
    !['fully_received', 'rejected', 'cancelled'].includes(p.status)
  ).length;

  return (
    <div className="min-h-screen bg-[#F5F2ED] ml-[220px]">
      <div className="px-8 pt-8 pb-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Purchase Orders</h1>
            <p className="text-sm text-ink-400 mt-0.5">Sent to vendors in Hindi via WhatsApp and email</p>
          </div>
          <button
            onClick={() => navigate('/purchase-orders/new')}
            className="px-4 py-2 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors"
          >
            + New PO
          </button>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-[#D5CFC8] rounded-xl px-6 py-5">
            <p className="text-3xl font-black text-amber-500 mb-1">{pendingCount}</p>
            <p className="text-sm text-ink-400">Pending Approval</p>
          </div>
          <div className="bg-white border border-[#D5CFC8] rounded-xl px-6 py-5">
            <p className="text-3xl font-black text-sky-500 mb-1">{awaitingDelivery}</p>
            <p className="text-sm text-ink-400">Awaiting Delivery</p>
          </div>
          <div className="bg-white border border-[#D5CFC8] rounded-xl px-6 py-5">
            <p className="text-3xl font-black text-red-500 mb-1">{overdueCount}</p>
            <p className="text-sm text-ink-400">Overdue</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          {['Status: All', 'Vendor: All', 'Amount range: All', 'Date range: All time'].map(f => (
            <select key={f} className="border border-[#D5CFC8] bg-white text-sm text-ink-700 rounded-lg px-3 py-1.5 focus:outline-none">
              <option>{f} ·</option>
            </select>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#D5CFC8]">
                {['PO Number', 'Vendor', 'Items', 'Total Amount', 'Expected Delivery', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-4 text-xs font-semibold text-ink-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE3]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-sm text-ink-400 text-center">Loading purchase orders…</td>
                </tr>
              ) : pos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-sm text-ink-400 text-center">No purchase orders yet. Click + New PO to create one.</td>
                </tr>
              ) : pos.map(po => (
                <tr key={po.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="px-5 py-4 text-sm font-bold text-[#B8892B]">{po.po_number}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-ink-900">{po.vendor}</td>
                  <td className="px-5 py-4 text-sm text-ink-500">{po.item_count ?? 0}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-ink-900">{fmtINR(Number(po.grand_total))}</td>
                  <td className="px-5 py-4 text-sm text-ink-500">
                    {po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-5 py-4">{statusPill(po.status)}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => navigate(`/purchase-orders/${po.id}`)} className="text-sm text-[#B8892B] font-medium hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
