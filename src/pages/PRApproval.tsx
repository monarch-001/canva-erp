import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function PRApproval() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [pr, setPr] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitted, setRejectSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPR = async () => {
      try {
        const res = await fetch(`/api/purchase-requisitions/${id}`);
        if (res.ok) {
          const data = await res.json();
          setPr(data);
        } else {
          setPr(null);
        }
      } catch {
        setPr(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPR();
  }, [id]);

  async function handleApprove() {
    setSaving(true);
    try {
      const res = await fetch(`/api/purchase-requisitions/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (res.ok) {
        navigate('/purchase-requisitions');
      } else {
        alert('Failed to approve PR.');
      }
    } catch {
      alert('Network error — could not approve PR.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    setRejectSubmitted(true);
    if (!rejectReason.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/purchase-requisitions/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes: rejectReason }),
      });
      if (res.ok) {
        navigate('/purchase-requisitions');
      } else {
        alert('Failed to reject PR.');
      }
    } catch {
      alert('Network error — could not reject PR.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center ml-[220px]">
        <p className="text-sm text-ink-500 font-semibold">Loading PR details…</p>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center ml-[220px]">
        <p className="text-sm text-red-500 font-semibold">PR not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] ml-[220px]">
      {/* Back nav */}
      <div className="px-8 pt-6 pb-4">
        <button
          onClick={() => navigate('/purchase-requisitions')}
          className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <span>←</span> Back to Purchase Requisitions
        </button>
      </div>

      <div className="px-8 pb-10 max-w-[820px]">
        {/* URGENT SLA banner */}
        {pr.urgency === 'urgent' && (
          <div className="bg-red-500 rounded-xl px-5 py-4 mb-5 flex gap-3 items-start">
            <span className="text-white text-lg mt-0.5">⏱</span>
            <div>
              <p className="text-[15px] font-bold text-white mb-0.5">URGENT — Required within 2 days</p>
              <p className="text-sm text-red-100">
                Required by: {pr.required_by ? new Date(pr.required_by).toLocaleDateString('en-IN') : '—'}
              </p>
            </div>
          </div>
        )}

        {/* PR header card */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl px-6 py-5 mb-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl font-bold text-[#B8892B]">{pr.pr_number}</span>
            {pr.urgency === 'urgent' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white uppercase">URGENT</span>
            )}
            <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 uppercase">{pr.status}</span>
          </div>
          <p className="text-sm text-ink-400">
            {pr.material} · {pr.qty} {pr.unit} · Raised by {pr.raised_by || 'System'} · {new Date(pr.created_at).toLocaleDateString('en-IN')}
          </p>
        </div>

        {/* Details + actions card */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl divide-y divide-[#F0EBE3]">
          {/* Key details */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-ink-400 mb-1">Quantity Required</p>
                <p className="text-[15px] font-bold text-ink-900">{pr.qty}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 mb-1">Required By</p>
                <p className="text-[15px] font-bold text-ink-900">{pr.required_by}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 mb-1">Linked Work Order</p>
                <p className="text-[15px] font-bold text-ink-900">{pr.wo}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 mb-1">Preferred Vendor</p>
                <p className="text-[15px] font-bold text-ink-900">{pr.preferred_vendor}</p>
              </div>
            </div>
          </div>

          {/* Why raised */}
          <div className="px-6 py-6">
            <p className="text-xs font-semibold text-ink-700 mb-2">Why this was raised</p>
            <p className="text-sm text-ink-500 leading-relaxed">{pr.notes || 'No notes provided.'}</p>
          </div>

          {/* Approve PR */}
          <div className="px-6 py-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-1">Approve PR</h2>
            <p className="text-sm text-ink-400 mb-4">
              Approving lets the Supervisor raise a Purchase Order against this requisition.
            </p>
            <button
              onClick={handleApprove}
              disabled={saving}
              className="px-6 py-2.5 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Approve PR'}
            </button>
          </div>

          {/* Reject PR */}
          <div className="px-6 py-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-4">Reject PR</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this PR cannot be approved as-is"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none ${
                    rejectSubmitted && !rejectReason.trim() ? 'border-red-400' : 'border-[#D5CFC8]'
                  }`}
                />
                {rejectSubmitted && !rejectReason.trim() && (
                  <p className="text-xs text-red-500 mt-1">Rejection reason is required.</p>
                )}
              </div>
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-6 py-2.5 border border-red-400 text-red-500 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Reject PR'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
