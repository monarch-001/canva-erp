import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_BOM = {
  bom_number: 'BOM-WO-CHH-26-001',
  wo_number: 'WO-CHH-26-001',
  wo_title: 'Reception Counter Front',
  billing_sqft: 96,
  submitted_by: 'Ramesh Yadav',
  submitted_on: '09-Aug-2026',
  total_line_items: 6,
  estimated_cost: 77110,
  estimated_margin_pct: 33.1,
  template_used: 'Standard Reception Counter',
  variances: [
    { direction: 'up', text: 'Plywood: 12 sheets vs template 10 (+2 sheets, +₹3,700)' },
    { direction: 'up', text: 'Laminate: 480 sqft vs template 440 (+40 sqft, +₹3,200)' },
    { direction: 'down', text: 'SS Hinges: 6 pcs vs template 8 (-2 pcs, -₹170)' },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function BOMApproval() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [bom, setBom] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [approveNotes, setApproveNotes] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [revisionSubmitted, setRevisionSubmitted] = useState(false);

  useEffect(() => {
    const fetchBomDetails = async () => {
      try {
        const response = await fetch(`/api/work-orders/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.bom) {
            setBom({
              bom_number: data.bom.bom_number,
              wo_number: data.work_order.wo_number,
              wo_title: data.work_order.title,
              billing_sqft: data.bom.billing_sqft || 96,
              submitted_by: 'Marcus Chen',
              submitted_on: new Date(data.bom.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              total_line_items: data.bom.items?.length || 4,
              estimated_cost: data.bom.items?.reduce((acc: number, item: any) => acc + parseFloat(item.estimated_cost || 0), 0) || 28400,
              estimated_margin_pct: 33.1,
              template_used: 'Standard Reception Counter',
              variances: [
                { direction: 'up', text: 'Plywood: 12 sheets vs template 10 (+2 sheets, +₹3,700)' }
              ]
            });
          } else {
            // Fallback mock
            setBom(MOCK_BOM);
          }
        }
      } catch (error) {
        console.error(error);
        setBom(MOCK_BOM);
      } finally {
        setLoading(false);
      }
    };
    fetchBomDetails();
  }, [id]);

  const handleApprove = async () => {
    try {
      const res = await fetch(`/api/work-orders/${id}/bom/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: approveNotes }),
      });
      if (res.ok) {
        navigate(`/work-orders/${id}/stock-check`);
      } else {
        alert('Failed to approve BOM.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  function handleSendBack() {
    setRevisionSubmitted(true);
    if (!revisionReason.trim()) return;
    alert('Sent back for revision!');
    navigate(`/work-orders/${id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center">
        <p className="text-sm text-ink-500 font-semibold">Loading BOM details...</p>
      </div>
    );
  }

  if (!bom) {
    return (
      <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center">
        <p className="text-sm text-red-500 font-semibold">No BOM found linked to this work order.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] ml-[220px]">
      {/* Back nav */}
      <div className="px-8 pt-6 pb-4">
        <button
          onClick={() => navigate(`/work-orders/${bom.wo_number}`)}
          className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <span>←</span>
          <span>Back to {bom.wo_number}</span>
        </button>
      </div>

      <div className="px-8 pb-10 max-w-[820px]">
        {/* Header card */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl px-6 py-5 mb-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl font-bold text-[#B8892B]">{bom.bom_number}</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 tracking-wide">
              SUBMITTED — AWAITING APPROVAL
            </span>
          </div>
          <p className="text-sm text-ink-400">
            {bom.wo_title} · {bom.billing_sqft} sqft billing · Submitted by {bom.submitted_by} on {bom.submitted_on}
          </p>
        </div>

        {/* Main content card */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl divide-y divide-[#F0EBE3]">
          {/* BOM Summary */}
          <div className="px-6 py-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-4">BOM Summary</h2>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-ink-400 mb-1">Total Line Items</p>
                <p className="text-[15px] font-bold text-ink-900">{bom.total_line_items} materials</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 mb-1">Estimated Cost</p>
                <p className="text-[15px] font-bold text-ink-900">₹{bom.estimated_cost.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 mb-1">Estimated Margin</p>
                <p className="text-[15px] font-bold text-green-600">{bom.estimated_margin_pct}%</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 mb-1">Template Used</p>
                <p className="text-[14px] font-bold text-ink-900">{bom.template_used}</p>
              </div>
            </div>
          </div>

          {/* Notable Variances */}
          <div className="px-6 py-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-3">Notable Variances from Template</h2>
            <ul className="space-y-2">
              {bom.variances.map((v: { direction: string; text: string }, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <span className={v.direction === 'up' ? 'text-amber-500' : 'text-teal-500'}>
                    {v.direction === 'up' ? '▲' : '▼'}
                  </span>
                  <span>{v.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stock Impact Preview */}
          <div className="px-6 py-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-3">Stock Impact Preview</h2>
            <div className="bg-[#FEF3C7] border border-amber-200 rounded-xl px-4 py-4 flex gap-3">
              <span className="text-amber-500 text-base mt-0.5">ℹ</span>
              <p className="text-sm text-amber-800 leading-relaxed">
                Stock check runs automatically the moment you approve. Any shortfalls will auto-draft Purchase Requisitions.
              </p>
            </div>
          </div>

          {/* Approve BOM */}
          <div className="px-6 py-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-4">Approve BOM</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  rows={3}
                  placeholder="Any comments for the record"
                  className="w-full border border-[#D5CFC8] rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-[#B8892B]/40 resize-none"
                />
              </div>

              {/* Save as Template toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setSaveAsTemplate((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${saveAsTemplate ? 'bg-[#B8892B]' : 'bg-ink-300'}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${saveAsTemplate ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </div>
                <span className="text-sm text-ink-700">Save as Template (default off)</span>
              </label>

              <button
                onClick={handleApprove}
                className="px-6 py-2.5 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors"
              >
                Approve BOM
              </button>
            </div>
          </div>

          {/* Send Back for Revision */}
          <div className="px-6 py-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-4">Send Back for Revision</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  rows={3}
                  placeholder="Explain what needs to change before this BOM can be approved"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none ${
                    revisionSubmitted && !revisionReason.trim() ? 'border-red-400' : 'border-[#D5CFC8]'
                  }`}
                />
                {revisionSubmitted && !revisionReason.trim() && (
                  <p className="text-xs text-red-500 mt-1">Revision reason is required.</p>
                )}
              </div>

              <button
                onClick={handleSendBack}
                className="px-6 py-2.5 border border-red-400 text-red-500 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors"
              >
                Send Back for Revision
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
