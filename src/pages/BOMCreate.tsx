import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
type StockStatus = 'unchecked' | 'in_stock' | 'shortage';

interface BomLine {
  id: string;
  material: string;
  category: string;
  qty_req: number;
  unit: string;
  tmpl_qty: number | null;
  est_rate: number;
  stock: StockStatus;
}

interface BomTemplate {
  id: string;
  name: string;
  type: string;
  base_dims: string;
  used_count: number;
  last_used: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const WO_INFO = {
  wo_number: 'WO-CHH-26-001',
  title: 'Reception Counter Front',
  bom_number: 'BOM-WO-CHH-26-001',
  dimensions: '2400 × 1100 × 600mm',
  production_qty: 2,
  billing_sqft_per_unit: 48,
  total_billing_sqft: 96,
  rate_per_sqft: 1200,
};

const TEMPLATES: BomTemplate[] = [
  { id: 't1', name: 'Standard Reception Counter', type: 'Counter', base_dims: '1800×900×600mm', used_count: 6, last_used: '03-Aug-26' },
  { id: 't2', name: 'Premium Counter — Laminate Top', type: 'Counter', base_dims: '2000×1000×600mm', used_count: 3, last_used: '28-Jun-26' },
  { id: 't3', name: 'Compact Counter — Budget', type: 'Counter', base_dims: '1500×850×550mm', used_count: 9, last_used: '10-Aug-26' },
];

const INITIAL_LINES: BomLine[] = [
  { id: '1', material: 'Plywood 18mm BWR', category: 'plywood', qty_req: 12, unit: 'sheets', tmpl_qty: 10, est_rate: 1850, stock: 'unchecked' },
  { id: '2', material: 'Laminate — Merino Charcoal', category: 'laminate', qty_req: 480, unit: 'sqft', tmpl_qty: 440, est_rate: 80, stock: 'unchecked' },
  { id: '3', material: 'Hardware + Polish', category: 'hardware', qty_req: 96, unit: 'sqft', tmpl_qty: 96, est_rate: 150, stock: 'unchecked' },
  { id: '4', material: 'Edge Tape 2mm', category: 'edge tape', qty_req: 40, unit: 'metres', tmpl_qty: 36, est_rate: 18, stock: 'unchecked' },
  { id: '5', material: 'Fevicol SR 998', category: 'adhesive', qty_req: 4, unit: 'kg', tmpl_qty: 4, est_rate: 220, stock: 'unchecked' },
  { id: '6', material: 'SS Hinges — Heavy Duty', category: 'hardware', qty_req: 6, unit: 'pcs', tmpl_qty: 8, est_rate: 65, stock: 'unchecked' },
];

const HEALTHY_MARGIN_PCT = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

function variance(line: BomLine): { label: string; color: string } {
  if (line.tmpl_qty === null) return { label: '—', color: 'text-ink-400' };
  const diff = line.qty_req - line.tmpl_qty;
  if (diff === 0) return { label: 'No change', color: 'text-ink-400' };
  if (diff > 0) return { label: `+${diff} ${line.unit}`, color: 'text-amber-600' };
  return { label: `${diff} ${line.unit}`, color: 'text-teal-600' };
}

let nextId = 100;

// ─── Component ────────────────────────────────────────────────────────────────
export default function BOMCreate() {
  const navigate = useNavigate();
  const [templateSearch, setTemplateSearch] = useState('');
  const [loadedTemplate, setLoadedTemplate] = useState<string | null>(null);
  const [lines, setLines] = useState<BomLine[]>(INITIAL_LINES);
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);

  const filteredTemplates = TEMPLATES.filter(
    (t) =>
      templateSearch === '' ||
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.type.toLowerCase().includes(templateSearch.toLowerCase())
  );

  function handleLoadTemplate(t: BomTemplate) {
    setLoadedTemplate(t.name);
  }

  function updateLine(id: string, field: keyof BomLine, value: string | number) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: String(++nextId), material: '', category: '', qty_req: 0, unit: '', tmpl_qty: null, est_rate: 0, stock: 'unchecked' },
    ]);
  }

  // Cost calculations
  const materialCostEst = lines
    .filter((l) => ['plywood', 'laminate', 'edge tape', 'adhesive'].includes(l.category))
    .reduce((s, l) => s + l.qty_req * l.est_rate, 0);
  const totalBomCostEst = lines.reduce((s, l) => s + l.qty_req * l.est_rate, 0);
  const revenueEst = WO_INFO.total_billing_sqft * WO_INFO.rate_per_sqft;
  const grossMarginPct = totalBomCostEst > 0
    ? ((revenueEst - totalBomCostEst) / revenueEst) * 100
    : 0;
  const aboveThreshold = grossMarginPct >= HEALTHY_MARGIN_PCT;

  return (
    <div className="min-h-screen bg-[#F5F2ED] ml-[220px] pb-24">
      {/* Back nav */}
      <div className="px-8 pt-6 pb-2">
        <button
          onClick={() => navigate(`/work-orders/${WO_INFO.wo_number}`)}
          className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <span>←</span>
          <span>Back to {WO_INFO.wo_number}</span>
        </button>
      </div>

      {/* Page title */}
      <div className="px-8 mb-5">
        <h1 className="text-2xl font-bold text-ink-900">Bill of Materials</h1>
        <p className="text-sm text-ink-400 mt-0.5">
          {WO_INFO.wo_number} — {WO_INFO.title} · {WO_INFO.bom_number}
        </p>
      </div>

      <div className="px-8 space-y-5">
        {/* ── Section 1: Dimensions ──────────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <h2 className="text-[13px] font-bold text-ink-700 mb-4">Dimensions &amp; Billing Sqft</h2>
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Dimensions (from WO)', value: WO_INFO.dimensions },
              { label: 'Production Qty', value: `${WO_INFO.production_qty} units` },
              { label: 'Billing Sqft (per unit)', value: `${WO_INFO.billing_sqft_per_unit} sqft` },
              { label: 'Total Billing Sqft', value: `${WO_INFO.total_billing_sqft} sqft` },
            ].map((d) => (
              <div key={d.label}>
                <p className="text-xs text-ink-400 mb-1">{d.label}</p>
                <p className="text-[15px] font-bold text-ink-900">{d.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 2: Load Template ───────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <h2 className="text-[13px] font-bold text-ink-700 mb-1">Load Template BOM</h2>
          <p className="text-xs text-ink-400 mb-4">
            Search by furniture type or template name — reduces manual calculation time.
          </p>

          {/* Search */}
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 text-sm">🔍</span>
            <input
              type="text"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder='Search templates — e.g. "Counter", "Reception"'
              className="w-full border border-[#D5CFC8] rounded-lg pl-9 pr-3 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-[#B8892B]/40"
            />
          </div>

          {/* Template cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {filteredTemplates.map((t) => (
              <div key={t.id} className="border border-[#D5CFC8] rounded-xl p-4">
                <p className="text-[13px] font-bold text-ink-900 mb-1">{t.name}</p>
                <p className="text-xs text-ink-400 mb-0.5">
                  Furniture: {t.type} | Base: {t.base_dims}
                </p>
                <p className="text-xs text-ink-400 mb-3">
                  Used {t.used_count} times | Last used: {t.last_used}
                </p>
                <button
                  onClick={() => handleLoadTemplate(t)}
                  className="w-full border border-[#D5CFC8] text-ink-700 text-xs font-medium py-1.5 rounded-lg hover:bg-[#F5F2ED] transition-colors"
                >
                  Load This Template
                </button>
              </div>
            ))}
          </div>

          {/* Success banner */}
          {loadedTemplate && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              ✓ Loaded "{loadedTemplate}" — quantities auto-calculated for {WO_INFO.total_billing_sqft} sqft.
              Review deltas below before submitting.
            </div>
          )}
        </div>

        {/* ── Section 3: BOM Line Items ──────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <h2 className="text-[13px] font-bold text-ink-700 mb-1">BOM Line Items</h2>
          <p className="text-xs text-ink-400 mb-4">
            Default lines (Plywood, Laminate, Hardware) are auto-calculated. Add more as needed.
          </p>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#D5CFC8]">
                  {['Material', 'Category', 'Qty Req.', 'Unit', 'Tmpl Qty', 'Variance', 'Est. Rate', 'Est. Cost', 'Stock', ''].map((h) => (
                    <th key={h} className="pb-2 pr-4 text-[11px] font-semibold text-ink-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3]">
                {lines.map((line) => {
                  const v = variance(line);
                  const estCost = line.qty_req * line.est_rate;
                  return (
                    <tr key={line.id} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Material */}
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={line.material}
                          onChange={(e) => updateLine(line.id, 'material', e.target.value)}
                          className="text-[13px] font-semibold text-ink-900 bg-transparent w-44 focus:outline-none focus:border-b focus:border-[#B8892B]"
                        />
                      </td>
                      {/* Category */}
                      <td className="py-3 pr-4 text-[12px] text-ink-400">{line.category}</td>
                      {/* Qty Req */}
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          value={line.qty_req}
                          onChange={(e) => updateLine(line.id, 'qty_req', parseFloat(e.target.value) || 0)}
                          className="text-[13px] font-semibold text-ink-900 bg-transparent w-16 focus:outline-none focus:border-b focus:border-[#B8892B]"
                        />
                      </td>
                      {/* Unit */}
                      <td className="py-3 pr-4 text-[12px] text-ink-500">{line.unit}</td>
                      {/* Tmpl Qty */}
                      <td className="py-3 pr-4 text-[12px] text-ink-400">
                        {line.tmpl_qty ?? '—'}
                      </td>
                      {/* Variance */}
                      <td className={`py-3 pr-4 text-[12px] font-semibold ${v.color}`}>{v.label}</td>
                      {/* Est. Rate */}
                      <td className="py-3 pr-4 text-[12px] text-ink-700">
                        {fmtINR(line.est_rate)}
                      </td>
                      {/* Est. Cost */}
                      <td className="py-3 pr-4 text-[13px] font-bold text-[#B8892B]">
                        {fmtINR(estCost)}
                      </td>
                      {/* Stock */}
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 text-[11px] rounded-full bg-ink-100 text-ink-500 font-medium capitalize">
                          {line.stock === 'unchecked' ? 'Unchecked' : line.stock === 'in_stock' ? 'In Stock' : 'Shortage'}
                        </span>
                      </td>
                      {/* Remove */}
                      <td className="py-3">
                        <button
                          onClick={() => removeLine(line.id)}
                          className="text-[11px] text-ink-400 hover:text-red-500 transition-colors"
                        >
                          × Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Material */}
          <button
            onClick={addLine}
            className="mt-4 px-4 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
          >
            + Add Material
          </button>
        </div>

        {/* ── Section 4: Cost Summary ────────────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <h2 className="text-[13px] font-bold text-ink-700 mb-4">Cost Summary</h2>

          {/* Column headers */}
          <div className="grid grid-cols-4 gap-4 mb-3">
            <div />
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">Estimated</p>
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">Committed</p>
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">Actual</p>
          </div>

          {/* Rows */}
          {[
            {
              label: 'Material Cost',
              est: `${fmtINR(materialCostEst)} (Material line)`,
              committed: fmtINR(0),
              actual: fmtINR(0),
            },
            {
              label: 'Total BOM Cost',
              est: fmtINR(totalBomCostEst),
              committed: fmtINR(0),
              actual: fmtINR(0),
            },
            {
              label: 'Revenue (est.)',
              est: `${fmtINR(revenueEst)} (${WO_INFO.total_billing_sqft} sqft × ${fmtINR(WO_INFO.rate_per_sqft)})`,
              committed: '—',
              actual: '—',
            },
            {
              label: 'Gross Margin',
              est: `${grossMarginPct.toFixed(1)}%`,
              estColor: aboveThreshold ? 'text-green-600' : 'text-red-500',
              committed: '—',
              actual: '—',
            },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-4 gap-4 py-3 border-t border-[#F0EBE3]">
              <p className="text-[13px] font-semibold text-ink-900">{row.label}</p>
              <p className={`text-[13px] font-semibold ${(row as any).estColor || 'text-ink-900'}`}>
                {row.est}
              </p>
              <p className="text-[13px] font-semibold text-sky-500">{row.committed}</p>
              <p className="text-[13px] font-semibold text-green-500">{row.actual}</p>
            </div>
          ))}

          {/* Margin banner */}
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
            aboveThreshold
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {aboveThreshold ? '✓' : '⚠'} {grossMarginPct.toFixed(1)}% estimated gross margin —{' '}
            {aboveThreshold
              ? `above the ${HEALTHY_MARGIN_PCT}% healthy threshold.`
              : `below the ${HEALTHY_MARGIN_PCT}% healthy threshold.`}
          </div>
        </div>

        {/* ── Section 5: Save as Template ───────────────────────────────────── */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl p-6">
          <h2 className="text-[13px] font-bold text-ink-700 mb-4">Save as Template — FM Only</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setSaveAsTemplate((v) => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative ${saveAsTemplate ? 'bg-[#B8892B]' : 'bg-ink-300'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${saveAsTemplate ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </div>
            <span className="text-sm text-ink-700">Save this BOM as a template for future use</span>
          </label>
        </div>
      </div>

      {/* ── Sticky footer ──────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white border-t border-[#D5CFC8] px-8 py-4 flex items-center justify-between z-40">
        <p className="text-xs text-ink-400">
          Every quantity should be reviewed before submitting for FM approval
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={() => alert('BOM submitted for FM approval!')}
            className="px-5 py-2 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors"
          >
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}
