import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

// ─── Types ────────────────────────────────────────────────────────────────────
type TemplateStatus = 'active' | 'archived';

interface BomTemplate {
  id: string;
  name: string;
  furniture: string;
  base_dims: string;
  items: number;
  used: number;
  last_used: string;
  created_by: string;
  status: TemplateStatus;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_TEMPLATES: BomTemplate[] = [
  { id: 't1', name: 'Standard Reception Counter', furniture: 'Counter', base_dims: '1800×900×600mm', items: 6, used: 6, last_used: '03-Aug-26', created_by: 'Gaurav Raj', status: 'active' },
  { id: 't2', name: 'Premium Counter — Laminate Top', furniture: 'Counter', base_dims: '2000×1000×600mm', items: 7, used: 3, last_used: '28-Jul-26', created_by: 'Gaurav Raj', status: 'active' },
  { id: 't3', name: 'Compact Counter — Budget', furniture: 'Counter', base_dims: '1500×850×550mm', items: 5, used: 9, last_used: '10-Aug-26', created_by: 'Ramesh Yadav', status: 'active' },
  { id: 't4', name: 'Executive Workstation — L-Shape', furniture: 'Workstation', base_dims: '1800×750×1600mm', items: 8, used: 14, last_used: '09-Aug-26', created_by: 'Gaurav Raj', status: 'active' },
  { id: 't5', name: '3-Door Wardrobe — Legacy', furniture: 'Storage Unit', base_dims: '1800×2100×600mm', items: 9, used: 2, last_used: '15-Jun-26', created_by: 'Gaurav Raj', status: 'archived' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function BOMTemplates() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex">
      <Sidebar />
      <div className="flex-1 ml-[220px]">
      <div className="px-8 pt-8 pb-10">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">BOM Templates</h1>
            <p className="text-sm text-ink-400 mt-0.5">
              FM only — supervisors reuse these when creating a BOM
            </p>
          </div>
          <button
            onClick={() => navigate('/bom/new')}
            className="px-4 py-2 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors"
          >
            + New Template
          </button>
        </div>

        {/* Table card */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl overflow-hidden mb-4">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#D5CFC8]">
                {['Template Name', 'Furniture', 'Base Dimensions', 'Items', 'Used', 'Last Used', 'Created By', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-4 text-xs font-semibold text-ink-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE3]">
              {MOCK_TEMPLATES.map((t) => (
                <tr key={t.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="px-5 py-4 text-sm font-bold text-ink-900">{t.name}</td>
                  <td className="px-5 py-4 text-sm text-ink-500">{t.furniture}</td>
                  <td className="px-5 py-4 text-sm text-ink-500">{t.base_dims}</td>
                  <td className="px-5 py-4 text-sm text-ink-700">{t.items}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#B8892B]">{t.used}</td>
                  <td className="px-5 py-4 text-sm text-ink-500">{t.last_used}</td>
                  <td className="px-5 py-4 text-sm text-ink-500">{t.created_by}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        t.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-ink-100 text-ink-500'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {t.status === 'active' ? (
                      <span className="flex gap-2">
                        <button onClick={() => navigate(`/bom/${t.id}/edit`)} className="text-[#B8892B] hover:underline font-medium">View</button>
                        <span className="text-ink-300">|</span>
                        <button onClick={() => navigate(`/bom/${t.id}/edit`)} className="text-[#B8892B] hover:underline font-medium">Edit</button>
                        <span className="text-ink-300">|</span>
                        <button onClick={() => confirm(`Archive template ${t.name}?`)} className="text-[#B8892B] hover:underline font-medium">Archive</button>
                      </span>
                    ) : (
                      <span className="flex gap-2">
                        <button onClick={() => navigate(`/bom/${t.id}/edit`)} className="text-[#B8892B] hover:underline font-medium">View</button>
                        <span className="text-ink-300">|</span>
                        <button onClick={() => navigate(`/bom/new?duplicate=${t.id}`)} className="text-[#B8892B] hover:underline font-medium">Duplicate</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="flex items-start gap-2 text-sm text-ink-400">
          <span>ℹ</span>
          <span>Editing a template does not affect existing Work Order BOMs that already loaded from it — only future uses.</span>
        </div>
      </div>
      </div>
    </div>
  );
}
