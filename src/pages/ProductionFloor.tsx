import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

/* ─── Types ───────────────────────────────────────── */
interface Metrics {
  present_carpenters: number;
  total_carpenters: number;
  active_jobs: number;
  completed_today: number;
  in_progress: number;
  not_started: number;
  blocked: number;
}

interface Carpenter {
  carpenter_id: string;
  full_name: string;
  is_present: boolean;
  wo_number?: string;
  task?: string;
  quantity_completed?: number;
  quantity_assigned?: number;
  job_status?: 'in_progress' | 'not_started' | 'blocked' | 'completed' | 'waiting_material';
  alert_tag?: string | null;
}

interface WOStage {
  name: string;
  done: number;
  total: number;
  status: 'done' | 'in_progress' | 'pending';
}

interface WOProgress {
  wo_number: string;
  wo_title: string;
  client?: string;
  delivery_date?: string;
  days_left?: number;
  overall_pct: number;
  completed_qty: number;
  assigned_qty: number;
  stages: WOStage[];
  carpenters_assigned?: string[];
  material_alert?: string | null;
}

/* ─── Carpenter Status Card ────────────────────────── */
function CarpenterCard({ c, onClick }: { c: Carpenter; onClick?: () => void }) {
  const present = c.is_present;
  const hasJob  = present && c.wo_number;

  const cardBg = !present
    ? 'border-border-subtle bg-surface-alt'
    : c.job_status === 'blocked'
    ? 'border-status-cancelled/25 bg-[#fff8f8]'
    : c.job_status === 'waiting_material'
    ? 'border-status-partial-material/30 bg-[#fffbf0]'
    : 'border-status-material-ready/30 bg-[#f0faf7]';

  const pctRaw = hasJob && c.quantity_assigned
    ? (c.quantity_completed ?? 0) / c.quantity_assigned
    : 0;
  const pct = Math.min(100, Math.round(pctRaw * 100));

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 cursor-pointer transition-shadow hover:shadow-md ${cardBg}`}
    >
      {/* Row 1: name + status badge */}
      <div className="flex justify-between items-center mb-1">
        <p className="text-[13px] font-bold text-ink-900">{c.full_name}</p>
        {present ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-status-material-ready">
            <span className="w-1.5 h-1.5 rounded-full bg-status-material-ready" />
            Present
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-ink-400 font-semibold">
            <span className="text-[11px] font-bold">×</span> Absent
          </span>
        )}
      </div>

      {hasJob ? (
        <>
          <p className="text-[11px] font-bold text-[#B8892B] mt-0.5">{c.wo_number}</p>
          <p className="text-[12px] text-ink-700">{c.task}</p>

          {/* Progress bar */}
          {c.quantity_assigned && (
            <div className="mt-3">
              <div className="w-full bg-border-subtle rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-status-material-ready transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-ink-400 mt-1">
                Progress: {c.quantity_completed}/{c.quantity_assigned} units
              </p>
            </div>
          )}

          {c.alert_tag === 'material' && (
            <span className="mt-2 inline-block text-[10px] font-semibold text-[#D97706] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-full">
              Waiting for material
            </span>
          )}
          {c.alert_tag === 'blocked' && (
            <span className="mt-2 inline-block text-[10px] font-semibold text-status-cancelled bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              Issue flagged
            </span>
          )}
        </>
      ) : (
        present && <p className="text-[12px] text-ink-400 mt-1">No job card today</p>
      )}

      {!present && <p className="text-[12px] text-ink-400 mt-1">No job card today</p>}
    </div>
  );
}

/* ─── Stage icon ───────────────────────────────────── */
function StageIcon({ status }: { status: WOStage['status'] }) {
  if (status === 'done')
    return <span className="text-status-qc-passed material-symbols-outlined text-[16px]">check_circle</span>;
  if (status === 'in_progress')
    return <span className="text-[#D97706] material-symbols-outlined text-[16px]">pending</span>;
  return <span className="w-4 h-4 rounded-full border-2 border-border-strong inline-block" />;
}

/* ─── WO Progress Card ─────────────────────────────── */
function WOProgressCard({ wo, onAddJobCard, onViewJobCards }: {
  wo: WOProgress;
  onAddJobCard: () => void;
  onViewJobCards: () => void;
}) {
  const daysLeftClass =
    (wo.days_left ?? 99) <= 3 ? 'bg-[#FEF3C7] text-[#B45309]' :
    (wo.days_left ?? 99) <= 7 ? 'bg-[#DCFCE7] text-[#15803D]' :
    'bg-surface-alt text-ink-500';

  return (
    <div className="bg-white border border-border-subtle rounded-xl shadow-sm p-6">
      {/* Header row */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-[13px] text-[#B8892B]">{wo.wo_number}</span>
          <span className="font-bold text-[14px] text-ink-900">{wo.wo_title}</span>
          {wo.client && (
            <span className="text-[12px] text-ink-400 border-l border-border-subtle pl-3">{wo.client}</span>
          )}
        </div>
        {wo.days_left !== undefined && (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${daysLeftClass}`}>
            {wo.days_left} days left
          </span>
        )}
      </div>

      {wo.delivery_date && (
        <p className="text-[11px] text-ink-400 mb-3">Delivery: {wo.delivery_date}</p>
      )}

      {/* Progress bar */}
      <p className="text-[9px] font-bold uppercase tracking-wider text-ink-400 mb-1">Production Progress</p>
      <div className="flex items-center gap-3 mb-1">
        <div className="flex-1 bg-border-subtle rounded-full h-2">
          <div
            className="h-2 rounded-full bg-[#B8892B] transition-all"
            style={{ width: `${wo.overall_pct}%` }}
          />
        </div>
        <span className="text-[11px] text-ink-500 whitespace-nowrap flex-shrink-0">
          {wo.completed_qty} of {wo.assigned_qty} items complete ({wo.overall_pct}%)
        </span>
      </div>

      {/* Material alert */}
      {wo.material_alert && (
        <div className="my-3 flex items-center gap-2 px-3 py-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[11px] text-[#92400E]">
          <span className="material-symbols-outlined text-[14px] text-[#D97706]">warning</span>
          {wo.material_alert}
        </div>
      )}

      {/* Stage Breakdown */}
      {wo.stages.length > 0 && (
        <div className="mt-3 mb-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2">Stage Breakdown:</p>
          <div className="space-y-1.5">
            {wo.stages.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-[12px]">
                <StageIcon status={s.status} />
                <span className={`font-semibold ${s.status === 'done' ? 'text-ink-700' : s.status === 'in_progress' ? 'text-ink-900 font-bold' : 'text-ink-400'}`}>
                  {s.name}:
                </span>
                <span className={s.status === 'pending' ? 'text-ink-400' : 'text-ink-700'}>
                  {s.status === 'pending'
                    ? `0/${s.total} pending`
                    : s.status === 'done'
                    ? `${s.total}/${s.total} done`
                    : `${s.done}/${s.total} in progress`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {wo.carpenters_assigned && wo.carpenters_assigned.length > 0 && (
        <p className="text-[11px] text-ink-400 mt-2">Assigned: {wo.carpenters_assigned.join(', ')}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border-subtle">
        <button
          onClick={onViewJobCards}
          className="px-4 h-8 rounded-lg border border-border-strong bg-white text-[12px] font-semibold text-ink-700 hover:bg-surface-alt transition-all"
        >
          View Job Cards
        </button>
        <button
          onClick={onAddJobCard}
          className="px-4 h-8 rounded-lg bg-secondary text-white text-[12px] font-bold hover:brightness-110 transition-all flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add Job Card
        </button>
      </div>
    </div>
  );
}

/* ─── Metric Tile ──────────────────────────────────── */
function MetricTile({ value, label, valueClass = 'text-ink-900' }: {
  value: string | number; label: string; valueClass?: string;
}) {
  return (
    <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm">
      <p className={`text-3xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-[11px] text-ink-400 mt-1">{label}</p>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────── */
const STUB_CARPENTERS: Carpenter[] = [
  { carpenter_id: 'c1', full_name: 'Ramesh Kumar',  is_present: true,  wo_number: 'WO-CHH-26-001', task: 'Reception Counter — Assembly',     quantity_completed: 2, quantity_assigned: 3,  job_status: 'in_progress' },
  { carpenter_id: 'c2', full_name: 'Suresh Yadav',  is_present: true,  wo_number: 'WO-B2B-26-001', task: 'Workstation — Cutting',             quantity_completed: 0, quantity_assigned: 10, job_status: 'waiting_material', alert_tag: 'material' },
  { carpenter_id: 'c3', full_name: 'Vikram Singh',  is_present: true,  wo_number: 'WO-CHH-26-001', task: 'Reception Counter — Edge Banding',  quantity_completed: 10, quantity_assigned: 10, job_status: 'completed' },
  { carpenter_id: 'c4', full_name: 'Mohan Singh',   is_present: false },
  { carpenter_id: 'c5', full_name: 'Deepak Verma',  is_present: true,  wo_number: 'WO-D2C-26-005', task: 'Wardrobe — Hardware Fitting',       quantity_completed: 1, quantity_assigned: 1, job_status: 'blocked', alert_tag: 'blocked' },
  { carpenter_id: 'c6', full_name: 'Anil Rawat',    is_present: true,  wo_number: 'WO-CHH-26-004', task: 'Nurses Station — Cutting',          quantity_completed: 3, quantity_assigned: 6, job_status: 'in_progress' },
  { carpenter_id: 'c7', full_name: 'Sanjay Patil',  is_present: true,  wo_number: 'WO-B2B-26-002', task: 'Cabinet — Lamination',              quantity_completed: 4, quantity_assigned: 4, job_status: 'completed' },
  { carpenter_id: 'c8', full_name: 'Rakesh Thapa',  is_present: false },
];

const STUB_WO: WOProgress[] = [
  {
    wo_number: 'WO-CHH-26-001', wo_title: 'Reception Counter', client: 'Starbucks',
    delivery_date: '25-Aug-26', days_left: 3, overall_pct: 50, completed_qty: 5, assigned_qty: 10,
    carpenters_assigned: ['Ramesh', 'Suresh', 'Vikram'],
    stages: [
      { name: 'Cutting',      done: 10, total: 10, status: 'done' },
      { name: 'Edge Banding', done: 10, total: 10, status: 'done' },
      { name: 'Assembly',     done: 5,  total: 10, status: 'in_progress' },
      { name: 'Finishing',    done: 0,  total: 10, status: 'pending' },
      { name: 'Hardware',     done: 0,  total: 10, status: 'pending' },
    ],
  },
  {
    wo_number: 'WO-B2B-26-001', wo_title: 'Office Workstations', client: 'WeWork',
    delivery_date: '28-Aug-26', days_left: 6, overall_pct: 17, completed_qty: 2, assigned_qty: 12,
    carpenters_assigned: ['Suresh', 'Anil'],
    material_alert: '5 items waiting for material (Plywood pending — PO-26-003 due 24-Aug)',
    stages: [
      { name: 'Cutting',  done: 2,  total: 12, status: 'in_progress' },
      { name: 'Assembly', done: 0,  total: 12, status: 'pending' },
      { name: 'Finishing',done: 0,  total: 12, status: 'pending' },
    ],
  },
];

export default function ProductionFloor() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [carpenters, setCarpenters] = useState<Carpenter[]>([]);
  const [woProgress, setWoProgress] = useState<WOProgress[]>([]);
  const [loading, setLoading] = useState(true);

  /* Date nav helpers */
  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };
  const isToday = date === new Date().toISOString().split('T')[0];
  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [mRes, cRes, wRes] = await Promise.all([
          fetch(`/api/production/metrics?date=${date}`),
          fetch(`/api/production/carpenters?date=${date}`),
          fetch(`/api/production/wo-progress?date=${date}`),
        ]);
        if (mRes.ok) setMetrics(await mRes.json());
        if (cRes.ok) setCarpenters(await cRes.json());
        if (wRes.ok) setWoProgress(await wRes.json());
      } catch {
        /* Fallback to stubs */
        setMetrics({ present_carpenters: 6, total_carpenters: 8, active_jobs: 12, completed_today: 3, in_progress: 8, not_started: 1, blocked: 1 });
        setCarpenters(STUB_CARPENTERS);
        setWoProgress(STUB_WO);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date]);

  /* Header actions — date navigation */
  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => shiftDate(-1)}
        className="h-9 px-4 rounded-lg border border-border-subtle bg-white text-[12px] font-semibold text-ink-700 hover:bg-surface-alt transition-all flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[14px]">arrow_back</span> Yesterday
      </button>
      <button
        onClick={() => setDate(new Date().toISOString().split('T')[0])}
        className={`h-9 px-4 rounded-lg text-[12px] font-bold transition-all ${
          isToday ? 'bg-primary text-white shadow-sm' : 'bg-white border border-border-subtle text-ink-700 hover:bg-surface-alt'
        }`}
      >
        Today
      </button>
      <button
        onClick={() => shiftDate(1)}
        className="h-9 px-4 rounded-lg border border-border-subtle bg-white text-[12px] font-semibold text-ink-700 hover:bg-surface-alt transition-all flex items-center gap-1"
      >
        Tomorrow <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col">
        <Header title="Production Floor" subtitle={dateLabel} actions={headerActions} />

        {loading ? (
          <div className="flex-1 flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-border-subtle border-t-secondary" />
          </div>
        ) : (
          <div className="px-8 py-6 space-y-8">

            {/* ── Metric tiles ── */}
            {metrics && (
              <div className="grid grid-cols-6 gap-4">
                <MetricTile
                  value={`${metrics.present_carpenters}/${metrics.total_carpenters}`}
                  label="Carpenters Present"
                />
                <MetricTile value={metrics.active_jobs}    label="Active Job Cards"   />
                <MetricTile value={metrics.completed_today} label="Completed Today"   valueClass="text-status-qc-passed" />
                <MetricTile value={metrics.in_progress}    label="In Progress"        valueClass="text-status-pending-review" />
                <MetricTile value={metrics.not_started}    label="Not Started"        valueClass="text-ink-400" />
                <MetricTile value={metrics.blocked}        label="Blocked / Paused"   valueClass="text-status-cancelled" />
              </div>
            )}

            {/* ── Carpenter Status Board ── */}
            <section>
              <h2 className="text-[15px] font-bold text-ink-900 mb-4">Carpenter Status Board</h2>
              <div className="grid grid-cols-4 gap-4">
                {carpenters.map((c) => (
                  <CarpenterCard
                    key={c.carpenter_id}
                    c={c}
                    onClick={() => c.wo_number && navigate(`/work-orders/${c.wo_number}`)}
                  />
                ))}
              </div>
            </section>

            {/* ── Work Order Progress ── */}
            <section>
              <h2 className="text-[15px] font-bold text-ink-900 mb-4">Work Order Progress</h2>
              <div className="space-y-4">
                {woProgress.map((wo) => (
                  <WOProgressCard
                    key={wo.wo_number}
                    wo={wo}
                    onAddJobCard={() => navigate('/production/job-cards/new')}
                    onViewJobCards={() => navigate(`/work-orders/${wo.wo_number}`)}
                  />
                ))}
              </div>
            </section>

            {/* ── Quick Actions ── */}
            <div className="flex items-center gap-3 pt-2 border-t border-border-subtle">
              <button
                onClick={() => navigate('/production/attendance')}
                className="h-9 px-5 rounded-lg border border-border-subtle bg-white text-[12px] font-semibold text-ink-700 hover:bg-surface-alt transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">event_available</span>
                Mark Attendance
              </button>
              <button
                onClick={() => navigate('/production/job-cards/new')}
                className="h-9 px-5 rounded-lg bg-secondary text-white text-[12px] font-bold hover:brightness-110 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Create Job Card
              </button>
              <button
                onClick={() => navigate('/production/overtime')}
                className="h-9 px-5 rounded-lg border border-border-subtle bg-white text-[12px] font-semibold text-ink-700 hover:bg-surface-alt transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">more_time</span>
                Overtime
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
