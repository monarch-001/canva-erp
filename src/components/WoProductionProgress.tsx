import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface StageRow {
  stage: string;
  done: number;
  in_prog: number;
  pending: number;
  blocked: number;
}

interface CarpenterStatus {
  name: string;
  assignment: string; // e.g. "Assembly (2 units in progress)" or "Unassigned today"
  is_active: boolean;
}

interface MaterialItem {
  name: string;
  status: 'available' | 'pending';
  detail: string;
}

interface ProductionProgress {
  wo_number: string;
  wo_title: string;
  total_units: number;
  complete: number;
  in_progress: number;
  material_wait: number;
  not_started: number;
  stages: StageRow[];
  carpenters: CarpenterStatus[];
  materials: MaterialItem[];
  estimated_hours: number;
  actual_hours: number;
  labour_cost_to_date: number;
  est_total_labour: number;
}

const MOCK_PROGRESS: ProductionProgress = {
  wo_number: 'WO-CHH-26-001',
  wo_title: 'Reception Counter',
  total_units: 10,
  complete: 2,
  in_progress: 2,
  material_wait: 5,
  not_started: 1,
  stages: [
    { stage: 'Cutting',      done: 2, in_prog: 0, pending: 8,  blocked: 0 },
    { stage: 'Edge Banding', done: 2, in_prog: 0, pending: 8,  blocked: 0 },
    { stage: 'Assembly',     done: 0, in_prog: 2, pending: 3,  blocked: 5 },
    { stage: 'Finishing',    done: 0, in_prog: 0, pending: 10, blocked: 0 },
    { stage: 'Hardware',     done: 0, in_prog: 0, pending: 10, blocked: 0 },
  ],
  carpenters: [
    { name: 'Ramesh Kumar', assignment: 'Assembly (2 units in progress)', is_active: true },
    { name: 'Suresh Yadav', assignment: 'Unassigned today',               is_active: false },
  ],
  materials: [
    { name: 'Plywood 18mm',     status: 'available', detail: 'Available (12 sheets)' },
    { name: 'Laminate',         status: 'available', detail: 'Available (48 sqft)' },
    { name: 'Hardware Hinges',  status: 'pending',   detail: 'Pending (PO-26-003, expected 24-Aug-26)' },
    { name: 'Drawer Channels',  status: 'pending',   detail: 'Pending (same PO)' },
  ],
  estimated_hours: 45,
  actual_hours: 18,
  labour_cost_to_date: 4846,
  est_total_labour: 12115,
};

interface WoProductionProgressProps {
  woId: string;
  woNumber: string;
}

export default function WoProductionProgress({ woId, woNumber }: WoProductionProgressProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<ProductionProgress | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/work-orders/${woId}/production-progress`);
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch {
        setData({ ...MOCK_PROGRESS, wo_number: woNumber });
      }
    }
    load();
  }, [woId, woNumber]);

  if (!data) return null;

  const total = data.total_units || 1;
  const completePct     = Math.round((data.complete      / total) * 100);
  const inProgPct       = Math.round((data.in_progress   / total) * 100);
  const matWaitPct      = Math.round((data.material_wait / total) * 100);
  const notStartedPct   = 100 - completePct - inProgPct - matWaitPct;

  function fmt(n: number) {
    return new Intl.NumberFormat('en-IN').format(n);
  }

  return (
    <div className="bg-white border border-border-subtle rounded-xl p-6 space-y-6">

      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-primary">
          {data.wo_number}
          <span className="text-ink-400 font-normal mx-2">|</span>
          {data.wo_title}
        </h3>
        <p className="text-xs text-ink-500 mt-0.5">Total Units: {data.total_units}</p>
      </div>

      {/* Multi-segment progress bar */}
      <div>
        <div className="w-full h-3 rounded-full overflow-hidden flex">
          {completePct > 0   && <div style={{ width: `${completePct}%`,   backgroundColor: '#16A34A' }} />}
          {inProgPct > 0     && <div style={{ width: `${inProgPct}%`,     backgroundColor: '#2563EB' }} />}
          {matWaitPct > 0    && <div style={{ width: `${matWaitPct}%`,    backgroundColor: '#EA580C' }} />}
          {notStartedPct > 0 && <div style={{ width: `${notStartedPct}%`, backgroundColor: '#D3CCBC' }} />}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-ink-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#16A34A' }} />
            <span className="font-medium text-green-700">✓ Complete:</span>
            {data.complete} ({completePct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#2563EB' }} />
            <span className="font-medium text-blue-700">▶ In Progress:</span>
            {data.in_progress} ({inProgPct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#EA580C' }} />
            <span className="font-medium text-orange-700">⬛ Material Wait:</span>
            {data.material_wait} ({matWaitPct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#D3CCBC' }} />
            <span className="font-medium text-ink-500">○ Not Started:</span>
            {data.not_started} ({notStartedPct}%)
          </span>
        </div>
      </div>

      <hr className="border-border-subtle" />

      {/* Stage Summary */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-3">Stage Summary</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-400 uppercase tracking-wider border-b border-border-subtle">
              <th className="text-left font-semibold py-2 pr-4">Stage</th>
              <th className="text-left font-semibold py-2 pr-4">Done</th>
              <th className="text-left font-semibold py-2 pr-4">In Prog</th>
              <th className="text-left font-semibold py-2 pr-4">Pending</th>
              <th className="text-left font-semibold py-2">Blocked</th>
            </tr>
          </thead>
          <tbody>
            {data.stages.map(row => (
              <tr key={row.stage} className="border-b border-border-subtle last:border-0">
                <td className="py-3 pr-4 text-ink-700 font-medium">{row.stage}</td>
                <td className="py-3 pr-4 font-semibold" style={{ color: row.done > 0 ? '#16A34A' : '#A79E8E' }}>
                  {row.done}
                </td>
                <td className="py-3 pr-4 font-semibold" style={{ color: row.in_prog > 0 ? '#D97706' : '#A79E8E' }}>
                  {row.in_prog}
                </td>
                <td className="py-3 pr-4 text-ink-700">{row.pending}</td>
                <td className="py-3">
                  {row.blocked > 0 ? (
                    <span className="font-semibold text-red-600 flex items-center gap-1">
                      {row.blocked}
                      <span className="text-xs">▲</span>
                    </span>
                  ) : (
                    <span className="text-ink-400">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr className="border-border-subtle" />

      {/* Assigned Carpenters */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-2">Assigned Carpenters</h4>
        <div className="space-y-1.5">
          {data.carpenters.map(c => (
            <p key={c.name} className="text-sm text-ink-600">
              <span className="font-medium text-ink-700">{c.name}</span>
              {' — '}
              <span className={c.is_active ? 'text-ink-600' : 'text-ink-400 italic'}>{c.assignment}</span>
            </p>
          ))}
        </div>
      </div>

      <hr className="border-border-subtle" />

      {/* Material Status */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-2">Material Status</h4>
        <div className="space-y-2">
          {data.materials.map(m => (
            <div key={m.name} className="flex items-baseline gap-2 text-sm">
              {m.status === 'available' ? (
                <span className="text-green-600 flex-shrink-0">✓</span>
              ) : (
                <span className="text-amber-500 flex-shrink-0">⚠</span>
              )}
              <span className="font-medium text-ink-700 min-w-[140px]">{m.name}:</span>
              <span className={m.status === 'available' ? 'text-green-700' : 'text-amber-700'}>
                {m.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-border-subtle" />

      {/* Time Tracking */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-3">Time Tracking</h4>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-ink-400 mb-1">Estimated</p>
            <p className="text-sm font-bold text-ink-700">{data.estimated_hours} hours total</p>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-1">Actual so far</p>
            <p className="text-sm font-bold text-ink-700">{data.actual_hours} hours</p>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-1">Labour cost to date</p>
            <p className="text-sm font-bold text-ink-700">₹{fmt(data.labour_cost_to_date)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-1">Est. total labour</p>
            <p className="text-sm font-bold text-ink-700">₹{fmt(data.est_total_labour)}</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div>
        <button
          onClick={() => navigate(`/production?wo=${woId}`)}
          className="px-5 py-2.5 border border-secondary text-secondary text-sm font-semibold rounded-lg hover:bg-gold-light transition"
        >
          View All Job Cards for this WO
        </button>
      </div>
    </div>
  );
}
