import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

// ─── Types ────────────────────────────────────────────────────────────────────
type StockStatus = 'available' | 'partial' | 'unavailable';

interface StockRow {
  material: string;
  qty_required: string;
  available: string;
  status: StockStatus;
  action: string;
  action_type: 'reserved' | 'pr_drafted';
  pr_number?: string;
}

interface AutoPR {
  pr_number: string;
  urgent: boolean;
  description: string;
  vendor: string;
  required_by: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_STOCK: StockRow[] = [
  { material: 'Plywood 18mm BWR', qty_required: '12 sheets', available: '18 sheets', status: 'available', action: 'Reserved — 12 sheets', action_type: 'reserved' },
  { material: 'Laminate — Merino Charcoal', qty_required: '480 sqft', available: '220 sqft', status: 'partial', action: 'PR-26-014 drafted — 260 sqft', action_type: 'pr_drafted', pr_number: 'PR-26-014' },
  { material: 'Hardware + Polish', qty_required: '96 sqft', available: '96 sqft', status: 'available', action: 'Reserved — 96 sqft', action_type: 'reserved' },
  { material: 'Edge Tape 2mm', qty_required: '40 metres', available: '40 metres', status: 'available', action: 'Reserved — 40 metres', action_type: 'reserved' },
  { material: 'Fevicol SR 998', qty_required: '4 kg', available: '0 kg', status: 'unavailable', action: 'PR-26-015 drafted — 4 kg', action_type: 'pr_drafted', pr_number: 'PR-26-015' },
  { material: 'SS Hinges — Heavy Duty', qty_required: '6 pcs', available: '20 pcs', status: 'available', action: 'Reserved — 6 pcs', action_type: 'reserved' },
];

const MOCK_PRS: AutoPR[] = [
  { pr_number: 'PR-26-014', urgent: false, description: 'Laminate — Merino Charcoal — 260 sqft', vendor: 'Greenlam Laminates', required_by: '18-Aug-2026' },
  { pr_number: 'PR-26-015', urgent: true, description: 'Fevicol SR 998 — 4 kg', vendor: 'Ramesh Hardware', required_by: '15-Aug-2026' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusPill(s: StockStatus) {
  const map: Record<StockStatus, { cls: string; label: string }> = {
    available: { cls: 'bg-green-100 text-green-700', label: 'Available' },
    partial:   { cls: 'bg-amber-100 text-amber-700', label: 'Partial' },
    unavailable: { cls: 'bg-red-100 text-red-600', label: 'Unavailable' },
  };
  const { cls, label } = map[s];
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StockCheckResult() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const shortCount = MOCK_STOCK.filter((r) => r.status !== 'available').length;
  const availCount = MOCK_STOCK.length - shortCount;

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex">
      <Sidebar />
      <div className="flex-1 ml-[220px]">
        <div className="px-8 pt-8 pb-12 max-w-[940px]">
          {/* Page title */}
          <h1 className="text-2xl font-bold text-ink-900 mb-1">Stock Check Complete</h1>
          <p className="text-sm text-ink-400 mb-6">
            BOM-WO-CHH-26-001 approved — automatic stock check ran within seconds
          </p>

          {/* Outcome banner */}
          <div className="bg-[#FEF3C7] border border-amber-300 rounded-xl px-5 py-4 flex gap-3 mb-6">
            <span className="text-amber-500 text-lg mt-0.5">▲</span>
            <div>
              <p className="text-[15px] font-bold text-amber-800 mb-1">
                Outcome B — Some items short
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                {availCount} of {MOCK_STOCK.length} items available and reserved. {shortCount} item{shortCount !== 1 ? 's' : ''} short —
                Purchase Requisitions auto-drafted. WO status updated to Bom Approved · Pending Material.
              </p>
            </div>
          </div>

          {/* Stock table card */}
          <div className="bg-white border border-[#D5CFC8] rounded-xl p-6 mb-5">
            <h2 className="text-[15px] font-bold text-ink-900 mb-4">Item-by-Item Stock Status</h2>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#D5CFC8]">
                  {['Material', 'Qty Required', 'Available', 'Status', 'Action Taken'].map((h) => (
                    <th key={h} className="pb-2.5 pr-4 text-xs font-semibold text-ink-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3]">
                {MOCK_STOCK.map((row) => (
                  <tr key={row.material} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-3 pr-4 text-sm font-semibold text-ink-900">{row.material}</td>
                    <td className="py-3 pr-4 text-sm text-ink-500">{row.qty_required}</td>
                    <td className="py-3 pr-4 text-sm text-ink-500">{row.available}</td>
                    <td className="py-3 pr-4">{statusPill(row.status)}</td>
                    <td className={`py-3 text-sm font-medium ${row.action_type === 'reserved' ? 'text-green-600' : 'text-[#B8892B]'}`}>
                      {row.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Auto-drafted PRs card */}
          <div className="bg-white border border-[#D5CFC8] rounded-xl p-6 mb-8">
            <h2 className="text-[15px] font-bold text-ink-900 mb-4">Auto-Drafted Purchase Requisitions</h2>
            <div className="space-y-4">
              {MOCK_PRS.map((pr) => (
                <div key={pr.pr_number} className="flex items-start justify-between py-3 border-b border-[#F0EBE3] last:border-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-bold text-[#B8892B]">{pr.pr_number}</span>
                      {pr.urgent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white uppercase tracking-wide">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-500">{pr.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-400 mb-0.5">Vendor: {pr.vendor}</p>
                    <p className="text-sm font-semibold text-ink-900">Required by: {pr.required_by}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/purchase-requisitions')}
              className="mt-4 px-4 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
            >
              View Purchase Requisitions
            </button>
          </div>

          {/* Back to WO */}
          <button
            onClick={() => {
              const parts = window.location.pathname.split('/');
              const woId = parts[2] || id || '';
              navigate(`/work-orders/${woId}`);
            }}
            className="w-40 px-6 py-2.5 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors"
          >
            Back to Work Order
          </button>
        </div>
      </div>
    </div>
  );
}
