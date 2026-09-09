import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
type DeliveryTerms = 'ex_works' | 'delivered' | 'door_delivery';

interface POLineItem {
  id: string;
  material: string;
  hsn: string;
  for_ref: string;
  qty: number;
  unit: string;
  rate: number;
  discount_pct: number;
  gst_pct: number;
}

// ─── Mock vendor ──────────────────────────────────────────────────────────────
const MOCK_VENDOR = {
  name: 'Greenlam Laminates',
  gstin: '06AABCG1234F1Z5',
  credit_days: 30,
  phone: '+91 98110 22334',
  open_pos: '2 open POs with this vendor — PO-26-009 (Fully Received), PO-26-013 (Sent)',
};

const ABOVE_THRESHOLD = 50000;
let nextLineId = 10;

function calcLine(l: POLineItem) {
  const discounted = l.rate * (1 - l.discount_pct / 100);
  const taxable = l.qty * discounted;
  const gst = taxable * (l.gst_pct / 100);
  return { taxable: Math.round(taxable), gst: Math.round(gst), total: Math.round(taxable + gst) };
}

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function POCreate() {
  const navigate = useNavigate();
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorSelected] = useState(true); // pre-selected for demo
  const [submitted, setSubmitted] = useState(false);

  const [lines, setLines] = useState<POLineItem[]>([
    { id: '1', material: 'Laminate — Merino Charcoal', hsn: '4412', for_ref: 'For WO-CHH-26-001', qty: 260, unit: 'sqft', rate: 80, discount_pct: 0, gst_pct: 18 },
    { id: '2', material: 'Laminate — Ivory White', hsn: '4412', for_ref: 'For General Stock', qty: 540, unit: 'sqft', rate: 80, discount_pct: 2, gst_pct: 18 },
  ]);

  const [deliveryDate, setDeliveryDate] = useState('18-Aug-2026');
  const [deliveryAddress, setDeliveryAddress] = useState('Canva Concepts Factory, Sector 34, Gurugram, Haryana');
  const [interState, setInterState] = useState(false);
  const [deliveryTerms, setDeliveryTerms] = useState<DeliveryTerms>('ex_works');
  const [advanceRequired, setAdvanceRequired] = useState(false);
  const [vendorNotes, setVendorNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  function updateLine(id: string, field: keyof POLineItem, val: string | number) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));
  }

  function removeLine(id: string) {
    setLines(prev => prev.filter(l => l.id !== id));
  }

  function addLine() {
    setLines(prev => [...prev, {
      id: String(++nextLineId), material: '', hsn: '', for_ref: '',
      qty: 0, unit: 'sqft', rate: 0, discount_pct: 0, gst_pct: 18,
    }]);
  }

  // Summary calcs
  const lineCalcs = lines.map(calcLine);
  const subtotal = lineCalcs.reduce((s, c) => s + c.taxable, 0);
  const totalGst = lineCalcs.reduce((s, c) => s + c.gst, 0);
  const grandTotal = subtotal + totalGst;
  const exceedsThreshold = grandTotal > ABOVE_THRESHOLD;

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitted(true);
    if (!deliveryDate.trim() || lines.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: MOCK_VENDOR.name,
          vendor_gstin: MOCK_VENDOR.gstin,
          vendor_phone: MOCK_VENDOR.phone,
          delivery_date: deliveryDate,
          delivery_address: deliveryAddress,
          delivery_terms: deliveryTerms,
          is_inter_state: interState,
          advance_required: advanceRequired,
          vendor_notes: vendorNotes || null,
          internal_notes: internalNotes || null,
          lines: lines.map(l => ({
            material: l.material,
            hsn: l.hsn,
            for_ref: l.for_ref,
            qty: l.qty,
            unit: l.unit,
            rate: l.rate,
            discount_pct: l.discount_pct,
            gst_pct: l.gst_pct,
          })),
        }),
      });
      if (res.ok) {
        navigate('/purchase-orders');
      } else {
        const err = await res.json();
        alert(`Failed to create PO: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error — could not create PO.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputBase = 'border border-[#D5CFC8] rounded-lg px-3 py-2 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-[#B8892B]/40 bg-white';

  return (
    <div className="min-h-screen bg-[#F5F2ED] ml-[220px] pb-24">
      {/* Back nav */}
      <div className="px-8 pt-6 pb-2">
        <button onClick={() => navigate('/purchase-orders')} className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors">
          <span>←</span> Back to Purchase Orders
        </button>
      </div>

      <div className="px-8 mb-6">
        <h1 className="text-2xl font-bold text-ink-900">New Purchase Order</h1>
        <p className="text-sm text-ink-400 mt-0.5">No PO can be raised to a vendor not in Vendor Master.</p>
      </div>

      <div className="px-8 space-y-5 max-w-[900px]">
        {/* ── Step 1: Vendor ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-[#B8892B] text-white text-sm font-bold flex items-center justify-center">1</span>
            <h2 className="text-[15px] font-bold text-ink-900">Select Vendor</h2>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Vendor <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={vendorSearch}
              onChange={e => setVendorSearch(e.target.value)}
              placeholder='🔍 Search Vendor Master — e.g. "Greenlam"'
              className={`w-full ${inputBase}`}
            />
          </div>

          {vendorSelected && (
            <div className="bg-[#FAF8F5] border border-[#D5CFC8] rounded-xl p-4">
              <div className="grid grid-cols-4 gap-4 mb-2">
                <div>
                  <p className="text-xs text-ink-400 mb-0.5">Vendor Name</p>
                  <p className="text-[14px] font-bold text-ink-900">{MOCK_VENDOR.name}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400 mb-0.5">GSTIN</p>
                  <p className="text-[13px] font-semibold text-ink-700">{MOCK_VENDOR.gstin}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400 mb-0.5">Credit Days</p>
                  <p className="text-[14px] font-bold text-ink-900">{MOCK_VENDOR.credit_days} days</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400 mb-0.5">Phone</p>
                  <p className="text-[13px] font-semibold text-ink-700">{MOCK_VENDOR.phone}</p>
                </div>
              </div>
              <p className="text-xs text-ink-400">{MOCK_VENDOR.open_pos}</p>
            </div>
          )}
        </div>

        {/* ── Step 2: Add Items ────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="w-7 h-7 rounded-full bg-[#B8892B] text-white text-sm font-bold flex items-center justify-center">2</span>
            <h2 className="text-[15px] font-bold text-ink-900">Add Items</h2>
          </div>
          <p className="text-xs text-ink-400 mb-4 ml-10">
            From approved PRs or manual entry — items for the same vendor are consolidated onto one PO.
          </p>

          <div className="flex gap-3 mb-5">
            <button
              onClick={() => navigate('/purchase-requisitions')}
              className="px-4 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
              title="View approved PRs to reference materials"
            >
              + View Approved PRs
            </button>
            <button onClick={addLine} className="px-4 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors">
              + Add Item Manually
            </button>
          </div>

          <div className="space-y-4">
            {lines.map((line) => {
              const c = calcLine(line);
              return (
                <div key={line.id} className="border border-[#D5CFC8] rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <input
                        type="text"
                        value={line.material}
                        onChange={e => updateLine(line.id, 'material', e.target.value)}
                        className="text-[14px] font-bold text-ink-900 bg-transparent focus:outline-none focus:border-b focus:border-[#B8892B] w-64"
                      />
                      <p className="text-xs text-ink-400 mt-0.5">HSN: {line.hsn} · {line.for_ref}</p>
                    </div>
                    <button onClick={() => removeLine(line.id)} className="text-xs text-ink-400 hover:text-red-500 transition-colors">× Remove</button>
                  </div>

                  <div className="grid grid-cols-5 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] text-ink-400 mb-1">Qty</label>
                      <input type="number" value={line.qty} onChange={e => updateLine(line.id, 'qty', parseFloat(e.target.value) || 0)} className={`w-full ${inputBase} py-1.5`} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-400 mb-1">Unit</label>
                      <input type="text" value={line.unit} onChange={e => updateLine(line.id, 'unit', e.target.value)} className={`w-full ${inputBase} py-1.5`} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-400 mb-1">Rate (₹) <span className="text-red-500">*</span></label>
                      <input type="number" value={line.rate} onChange={e => updateLine(line.id, 'rate', parseFloat(e.target.value) || 0)} className={`w-full ${inputBase} py-1.5`} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-400 mb-1">Discount %</label>
                      <input type="number" value={line.discount_pct} onChange={e => updateLine(line.id, 'discount_pct', parseFloat(e.target.value) || 0)} className={`w-full ${inputBase} py-1.5`} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-400 mb-1">GST %</label>
                      <input type="number" value={line.gst_pct} onChange={e => updateLine(line.id, 'gst_pct', parseFloat(e.target.value) || 0)} className={`w-full ${inputBase} py-1.5`} />
                    </div>
                  </div>

                  <div className="flex gap-6 text-xs text-ink-500">
                    <span>Taxable Amount <span className="font-semibold text-ink-900">{fmtINR(c.taxable)}</span></span>
                    <span>GST Amount <span className="font-semibold text-ink-900">{fmtINR(c.gst)}</span></span>
                    <span>Line Total <span className="font-semibold text-ink-900">{fmtINR(c.total)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Step 3: PO Details ───────────────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-[#B8892B] text-white text-sm font-bold flex items-center justify-center">3</span>
            <h2 className="text-[15px] font-bold text-ink-900">PO Details</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Expected Delivery Date <span className="text-red-500">*</span></label>
              <input type="text" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={`w-full ${inputBase} ${submitted && !deliveryDate.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`} placeholder="e.g. 18-Aug-2026" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Delivery Address</label>
              <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className={`w-full ${inputBase}`} />
            </div>
          </div>

          {/* Inter-State toggle */}
          <label className="flex items-center justify-between mb-4">
            <span className="text-sm text-ink-700">Inter-State Supply (drives IGST vs CGST+SGST)</span>
            <div onClick={() => setInterState(v => !v)} className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${interState ? 'bg-[#B8892B]' : 'bg-ink-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${interState ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>

          {/* Delivery Terms */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink-700 mb-2">Delivery Terms <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { val: 'ex_works', label: 'Ex-Works', desc: 'We arrange transport' },
                { val: 'delivered', label: 'Delivered', desc: 'Vendor delivers to factory' },
                { val: 'door_delivery', label: 'Door Delivery', desc: 'Vendor delivers to site' },
              ] as const).map(opt => (
                <label key={opt.val} className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${deliveryTerms === opt.val ? 'border-[#B8892B] bg-[#F3E7CD]' : 'border-[#D5CFC8] bg-white hover:bg-[#F5F2ED]'}`}>
                  <input type="radio" name="delivery_terms" value={opt.val} checked={deliveryTerms === opt.val} onChange={() => setDeliveryTerms(opt.val)} className="accent-[#B8892B] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{opt.label}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advance toggle */}
          <label className="flex items-center justify-between mb-4">
            <span className="text-sm text-ink-700">Advance Required</span>
            <div onClick={() => setAdvanceRequired(v => !v)} className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${advanceRequired ? 'bg-[#B8892B]' : 'bg-ink-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${advanceRequired ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Notes for Vendor</label>
              <textarea value={vendorNotes} onChange={e => setVendorNotes(e.target.value)} rows={2} placeholder="Appears on the PO PDF sent to vendor" className={`w-full ${inputBase} resize-none`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Internal Notes</label>
              <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2} placeholder="Never shown on PO PDF" className={`w-full ${inputBase} resize-none`} />
            </div>
          </div>
        </div>

        {/* ── Step 4: Summary ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-[#B8892B] text-white text-sm font-bold flex items-center justify-center">4</span>
            <h2 className="text-[15px] font-bold text-ink-900">PO Summary</h2>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-ink-500">
              <span>Items</span>
              <span>{lines.length} line item{lines.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between text-sm text-ink-500">
              <span>Subtotal (ex-GST)</span>
              <span>{fmtINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-ink-500">
              <span>{interState ? 'IGST (18%)' : 'CGST (9%) + SGST (9%)'}</span>
              <span>{fmtINR(totalGst)}</span>
            </div>
            <div className="flex justify-between text-[15px] font-bold text-ink-900 pt-2 border-t border-[#D5CFC8]">
              <span>TOTAL</span>
              <span className="text-[#B8892B]">{fmtINR(grandTotal)}</span>
            </div>
          </div>

          {exceedsThreshold && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex gap-2">
              <span className="text-violet-500 text-sm mt-0.5">▲</span>
              <div>
                <p className="text-sm font-bold text-violet-700">Above ₹50,000 — requires FM + Super Admin approval</p>
                <p className="text-xs text-violet-600 mt-0.5">Both must approve within 4 hours. Super Admin is notified automatically once FM approves.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white border-t border-[#D5CFC8] px-8 py-4 flex items-center justify-between z-40">
        <p className="text-xs text-ink-400">One PO per vendor per order cycle — items consolidated automatically</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/purchase-orders')} className="px-5 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors">
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
