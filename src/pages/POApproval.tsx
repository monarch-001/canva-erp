import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SendPOModal from '../components/SendPOModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

function calcLine(item: any) {
  const taxable = Number(item.taxable_amount ?? item.qty * item.rate);
  const gst = Number(item.gst_amount ?? taxable * (item.gst_pct / 100));
  return { taxable, gst, total: Number(item.total_amount ?? taxable + gst) };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function POApproval() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [po, setPo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/purchase-orders/${id}`)
      .then(r => r.json())
      .then(data => setPo(data.error ? null : data))
      .catch(() => setPo(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: string, notes?: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) {
        navigate('/purchase-orders');
      } else {
        alert(`Failed to update PO: ${(await res.json()).error}`);
      }
    } catch {
      alert('Network error — could not update PO.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center ml-[220px]">
        <p className="text-sm text-ink-500 font-semibold">Loading PO details…</p>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center ml-[220px]">
        <p className="text-sm text-red-500 font-semibold">PO not found.</p>
      </div>
    );
  }

  const grandTotal = (po.items || []).reduce((sum: number, item: any) => sum + calcLine(item).total, 0) || Number(po.grand_total);

  return (
    <div className="min-h-screen bg-[#F5F2ED] ml-[220px]">
      {/* Back nav */}
      <div className="px-8 pt-6 pb-2">
        <button
          onClick={() => navigate('/purchase-orders')}
          className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <span>←</span>
          <span>Back to Purchase Orders</span>
        </button>
      </div>

      {/* Header card */}
      <div className="mx-8 mb-5 bg-white border border-[#D5CFC8] rounded-xl px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl font-bold text-[#B8892B]">{po.po_number}</span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-violet-100 text-violet-700">
            PENDING 2ND APPROVAL
          </span>
        </div>
        <p className="text-sm text-ink-400">
          {po.vendor} · {fmtINR(grandTotal)} total · Above ₹50,000 threshold — requires FM + Super Admin
        </p>
      </div>

      {/* Approval Progress */}
      <div className="mx-8 mb-5 bg-white border border-[#D5CFC8] rounded-xl px-6 py-5">
        <h2 className="text-base font-bold text-ink-900 mb-4">Approval Progress</h2>
        <div className="flex items-center gap-4">
          {/* FM card — approved */}
          <div className="flex-1 border border-green-300 bg-green-50 rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-bold text-ink-900">Factory Manager</span>
            </div>
            <p className="text-sm text-ink-700 font-medium">{po.fm_approver}</p>
            <p className="text-xs text-ink-400 mt-0.5">{po.fm_approved_at ?? '—'}</p>
          </div>

          {/* Arrow */}
          <span className="text-ink-300 text-lg">→</span>

          {/* Super Admin card — awaiting */}
          <div className="flex-1 border border-amber-300 bg-[#FEF8EC] rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <span className="text-sm font-bold text-ink-900">Super Admin</span>
            </div>
            <p className="text-sm text-ink-700 font-medium">Awaiting review</p>
            <p className="text-xs text-ink-400 mt-0.5">
              {po.status === 'approved' ? `Approved ${po.admin_approved_at ? new Date(po.admin_approved_at).toLocaleDateString('en-IN') : ''}` : 'Pending approval'}
            </p>
          </div>
        </div>
      </div>

      {/* Vendor Details + Items + Total + Approval actions */}
      <div className="mx-8 mb-10 bg-white border border-[#D5CFC8] rounded-xl px-6 py-5">
        {/* Vendor Details */}
        <h2 className="text-base font-bold text-ink-900 mb-4">Vendor Details</h2>
        <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b border-[#D5CFC8]">
          <div>
            <p className="text-xs text-ink-400 mb-0.5">Vendor</p>
            <p className="text-sm font-bold text-ink-900">{po.vendor}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-0.5">GSTIN</p>
            <p className="text-sm font-bold text-ink-900">{po.vendor_gstin ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-0.5">Expected Delivery</p>
            <p className="text-sm font-bold text-ink-900">
              {po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-0.5">Delivery Terms</p>
            <p className="text-sm font-bold text-ink-900">{po.delivery_terms ?? '—'}</p>
          </div>
        </div>

        {/* Items */}
        <h2 className="text-base font-bold text-ink-900 mb-3">Items</h2>
        <div className="mb-1">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1.2fr_0.8fr_0.6fr_1fr_1fr] gap-3 pb-2 border-b border-[#D5CFC8]">
            {['Material', 'WO Ref', 'Qty', 'Rate', 'GST', 'Total'].map((h) => (
              <span key={h} className="text-xs text-ink-400 font-medium">{h}</span>
            ))}
          </div>

          {/* Rows */}
          {(po.items || []).map((item: any, idx: number) => {
            const { gst, total } = calcLine(item);
            return (
              <div
                key={idx}
                className="grid grid-cols-[2fr_1.2fr_0.8fr_0.6fr_1fr_1fr] gap-3 py-4 border-b border-[#D5CFC8]"
              >
                <span className="text-sm font-semibold text-ink-900">{item.material}</span>
                <span className="text-sm text-ink-500">{item.work_order_ref ?? item.wo ?? '—'}</span>
                <span className="text-sm text-ink-700">{item.qty} {item.unit}</span>
                <span className="text-sm text-ink-700">₹{item.rate}</span>
                <span className="text-sm text-ink-500">
                  {fmtINR(gst)} ({item.gst_pct}%)
                </span>
                <span className="text-sm font-semibold text-[#B8892B]">{fmtINR(total)}</span>
              </div>
            );
          })}

          {/* Grand total */}
          <div className="flex justify-between items-center pt-4 pb-6">
            <span className="text-sm font-bold text-ink-900">TOTAL (inc-GST)</span>
            <span className="text-lg font-bold text-[#B8892B]">{fmtINR(grandTotal)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#D5CFC8] mb-5" />

        {/* Approval actions */}
        <h2 className="text-base font-bold text-ink-900 mb-1">Approval Actions</h2>
        <p className="text-sm text-ink-400 mb-5">
          Approve this PO to allow sending to vendor, or reject to send back for revision.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => updateStatus('approved')}
            disabled={saving}
            className="px-5 py-2.5 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Approve PO'}
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            disabled={saving}
            className="px-5 py-2.5 border border-[#D5CFC8] text-ink-700 text-sm font-semibold rounded-lg hover:bg-[#F5F2ED] transition-colors disabled:opacity-60"
          >
            Send to Vendor
          </button>
          <button
            onClick={() => {
              const reason = prompt('Enter rejection reason:');
              if (reason) updateStatus('rejected', reason);
            }}
            disabled={saving}
            className="px-5 py-2.5 border border-red-400 text-red-500 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            Reject PO
          </button>
        </div>
      </div>

      {/* Send PO Modal */}
      {showSendModal && (
        <SendPOModal
          poNumber={po.po_number}
          vendorName={po.vendor}
          totalAmount={fmtINR(grandTotal)}
          deliveryDate={po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('en-IN') : '—'}
          onClose={() => setShowSendModal(false)}
          onSend={(_data) => {
            setShowSendModal(false);
            updateStatus('sent');
          }}
        />
      )}
    </div>
  );
}
