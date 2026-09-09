import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WORK_ORDERS = [
  'WO-CHH-26-001 — Reception Counter Front',
  'WO-CHH-26-002 — Modular Wardrobe Set',
  'WO-B2B-26-001 — Executive Workstations x6',
  'WO-B2B-26-002 — Conference Table',
];

const VENDORS = ['Greenlam Laminates', 'Ramesh Hardware', 'Centuryply', 'Hafele India', 'Asian Paints'];
const UNITS = ['sheets', 'sqft', 'metres', 'kg', 'litres', 'pcs', 'Lot'];

// Simulate urgency: date within 2 days = urgent
function isUrgent(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const d = new Date(
    parseInt(parts[2]),
    monthMap[parts[1]] ?? 0,
    parseInt(parts[0])
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 2;
}

export default function PRCreate() {
  const navigate = useNavigate();

  const [material, setMaterial] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('sheets');
  const [vendor, setVendor] = useState('');
  const [isGeneralStock, setIsGeneralStock] = useState(false);
  const [workOrder, setWorkOrder] = useState(WORK_ORDERS[0]);
  const [requiredBy, setRequiredBy] = useState('15-Aug-2026');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const urgent = isUrgent(requiredBy);

  async function handleSubmit() {
    setSubmitted(true);
    if (!material.trim() || !qty.trim() || !requiredBy.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/purchase-requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: material.trim(),
          qty: parseFloat(qty),
          unit,
          vendor: vendor || null,
          work_order_id: null, // resolved server-side via wo_number if needed
          is_general_stock: isGeneralStock,
          required_by: requiredBy,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        navigate('/purchase-requisitions');
      } else {
        const err = await res.json();
        alert(`Failed to submit PR: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error — could not submit PR.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputBase = 'w-full border rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-[#B8892B]/40 transition-colors';
  const inputNormal = `${inputBase} border-[#D5CFC8] bg-white`;
  const inputErr = `${inputBase} border-red-400 bg-white`;

  return (
    <div className="min-h-screen bg-[#F5F2ED] ml-[220px] pb-24">
      {/* Back nav */}
      <div className="px-8 pt-6 pb-2">
        <button
          onClick={() => navigate('/purchase-requisitions')}
          className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <span>←</span> Back to Purchase Requisitions
        </button>
      </div>

      {/* Title */}
      <div className="px-8 mb-6">
        <h1 className="text-2xl font-bold text-ink-900">New Purchase Requisition</h1>
        <p className="text-sm text-ink-400 mt-0.5">Every material purchase must start with an approved PR.</p>
      </div>

      <div className="px-8 space-y-5 max-w-[760px]">
        {/* ── Material & Quantity ──────────────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <h2 className="text-[14px] font-bold text-ink-900 mb-4">Material &amp; Quantity</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                Material <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder='🔍 Search Material Master — e.g. "Plywood 18mm"'
                className={submitted && !material.trim() ? inputErr : inputNormal}
              />
              <p className="text-xs text-ink-400 mt-1">
                If not found, add free text with a note to add it to Material Master
              </p>
              {submitted && !material.trim() && <p className="text-xs text-red-500 mt-1">Material is required.</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  Quantity Required <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="20"
                  className={submitted && !qty.trim() ? inputErr : inputNormal}
                />
                {submitted && !qty.trim() && <p className="text-xs text-red-500 mt-1">Required.</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={inputNormal}
                >
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  Preferred Vendor
                </label>
                <select
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className={inputNormal}
                >
                  <option value="">— Select vendor —</option>
                  {VENDORS.map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Linked Work Order ────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <h2 className="text-[14px] font-bold text-ink-900 mb-4">Linked Work Order</h2>
          <label className="flex items-center justify-between mb-4">
            <span className="text-sm text-ink-700">This is general stock — not WO specific</span>
            <div
              onClick={() => setIsGeneralStock((v) => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${isGeneralStock ? 'bg-[#B8892B]' : 'bg-ink-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isGeneralStock ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>
          {!isGeneralStock && (
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Work Order</label>
              <select
                value={workOrder}
                onChange={(e) => setWorkOrder(e.target.value)}
                className={inputNormal}
              >
                {WORK_ORDERS.map((w) => <option key={w}>{w}</option>)}
              </select>
              <p className="text-xs text-ink-400 mt-1">Optional — leave blank for general stock (toggle above)</p>
            </div>
          )}
        </div>

        {/* ── Timing & Urgency ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <h2 className="text-[14px] font-bold text-ink-900 mb-4">Timing &amp; Urgency</h2>
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">
              Required By Date <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={requiredBy}
              onChange={(e) => setRequiredBy(e.target.value)}
              placeholder="e.g. 15-Aug-2026"
              className={submitted && !requiredBy.trim() ? inputErr : inputNormal}
            />
            <p className="text-xs text-ink-400 mt-1">When do you need this material?</p>
            {submitted && !requiredBy.trim() && <p className="text-xs text-red-500 mt-1">Required.</p>}
          </div>
        </div>

        {/* Urgent banner */}
        {urgent && (
          <div className="bg-red-50 border border-red-300 rounded-xl px-5 py-4 flex gap-3">
            <span className="text-red-500 text-base mt-0.5">▲</span>
            <div>
              <p className="text-[14px] font-bold text-red-700 mb-0.5">This will be marked URGENT</p>
              <p className="text-sm text-red-600">
                Required date is less than 2 days away. FM gets a WhatsApp notification immediately with a 30-minute approval SLA.
              </p>
            </div>
          </div>
        )}

        {/* ── Notes ────────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <h2 className="text-[14px] font-bold text-ink-900 mb-4">Notes</h2>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional context for the approver"
              className={`${inputNormal} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white border-t border-[#D5CFC8] px-8 py-4 flex items-center justify-between z-40">
        <p className="text-xs text-ink-400">FM will be notified immediately upon submission</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/purchase-requisitions')}
            className="px-5 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
