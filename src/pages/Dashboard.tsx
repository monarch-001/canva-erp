import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { getCurrentUser } from '../utils/auth';

/* ─── Types ─────────────────────────────────────────────── */
interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  ref_link: string;
}

interface PendingAction {
  id: string;
  icon: string;           // emoji or icon name
  title: string;
  subtitle: string;
  actionLabel: string;
  route?: string;
}

interface CarpenterCard {
  id: string;
  name: string;
  status: 'present' | 'absent';
  woNumber?: string;
  task?: string;
  progress?: number;
  progressMax?: number;
  alert?: string;
}

/* ─── Sub-components ─────────────────────────────────────── */

/** Single stat tile used in FM dashboard */
function StatTile({ label, value, note, valueClass = 'text-ink-900' }: {
  label: string; value: string; note?: string; valueClass?: string;
}) {
  return (
    <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm">
      <p className="text-[11px] text-ink-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
      {note && <span className="text-[10px] font-semibold text-ink-400 mt-0.5 block">{note}</span>}
    </div>
  );
}

/** Carpenter production card matching screen 17 */
function CarpenterProductionCard({ c }: { c: CarpenterCard }) {
  const statusClass = c.status === 'present'
    ? 'border-status-material-ready/30 bg-[#f0faf7]'
    : c.alert ? 'border-status-error/20 bg-[#fff5f5]'
    : 'border-border-subtle bg-surface-alt';

  const progressPct = c.progress && c.progressMax
    ? Math.round((c.progress / c.progressMax) * 100)
    : 0;

  return (
    <div className={`rounded-xl border p-4 ${statusClass}`}>
      <div className="flex justify-between items-center mb-1">
        <p className="text-[13px] font-bold text-ink-900">{c.name}</p>
        {c.status === 'present' ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-status-material-ready">
            <span className="w-2 h-2 rounded-full bg-status-material-ready inline-block" />
            Present
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-400">
            <span className="text-[11px]">×</span> Absent
          </span>
        )}
      </div>

      {c.woNumber && (
        <p className="text-[11px] font-bold text-[#B8892B] mb-0.5">{c.woNumber}</p>
      )}
      {c.task && <p className="text-[12px] text-ink-700">{c.task}</p>}

      {c.status === 'absent' && !c.woNumber && (
        <p className="text-[12px] text-ink-400 mt-1">No task today</p>
      )}

      {c.progress !== undefined && c.progressMax !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-border-subtle rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-status-material-ready"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-ink-500 mt-1">{c.progress}/{c.progressMax} units</p>
        </div>
      )}

      {c.alert === 'material' && (
        <span className="mt-2 inline-block text-[10px] font-semibold text-[#D97706] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-full">
          Waiting for material
        </span>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState({
    mtd_revenue: '₹0', receivables: '₹0', payables: '₹0', bank_balance: '₹42,10,000'
  });
  const [managerAlerts, setManagerAlerts] = useState<AlertItem[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [carpenters, setCarpenters] = useState<CarpenterCard[]>([]);

  const todayLong = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  /* ── Friendly greeting ── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/dashboard?role=${user.role}`);
        if (response.ok) {
          const data = await response.json();
          if (user.role === 'factory_manager') {
            setFinancialData({
              mtd_revenue: data.mtd_revenue,
              receivables: data.receivables,
              payables: data.payables,
              bank_balance: data.bank_balance
            });
            setManagerAlerts(data.alerts || []);
          } else if (user.role === 'supervisor') {
            /* Map API data to structured pending-actions + carpenter cards.
               Fall back to realistic stubs if the API shape differs. */
            setPendingActions(data.actions?.map((a: any) => ({
              id: a.id,
              icon: '📋',
              title: a.task,
              subtitle: a.duration,
              actionLabel: 'View',
              route: a.route
            })) || [
              { id: '1', icon: '📋', title: 'BOM Review — WO-CHH-26-005', subtitle: 'Submitted by you, awaiting FM approval', actionLabel: 'View BOM', route: '/bom' },
              { id: '2', icon: '⏱️', title: 'OT Request Not Submitted', subtitle: 'Ramesh Kumar worked 11 hrs yesterday — submit OT request', actionLabel: 'Submit OT' },
              { id: '3', icon: '📝', title: 'EOD Updates Pending', subtitle: "2 carpenters haven't submitted today's EOD update", actionLabel: 'View Job Cards', route: '/production' },
              { id: '4', icon: '📦', title: 'GRN Inspection Due', subtitle: 'Delivery from Greenlam arrived 2 hours ago', actionLabel: 'Inspect GRN' },
            ]);
            setCarpenters(data.carpenters || [
              { id: '1', name: 'Ramesh Kumar', status: 'present', woNumber: 'WO-CHH-26-001', task: 'Reception Counter — Assembly', progress: 2, progressMax: 3 },
              { id: '2', name: 'Suresh Yadav',  status: 'present', woNumber: 'WO-B2B-26-001', task: 'Workstation — Cutting', alert: 'material' },
              { id: '3', name: 'Vikram Singh',  status: 'absent' },
              { id: '4', name: 'Mohan Lal',    status: 'present', woNumber: 'WO-CHH-26-001', task: 'Reception Counter — Edge Banding', progress: 3, progressMax: 5 },
            ]);
          }
        }
      } catch {
        /* Fallback to stubs if API is unavailable */
        if (user.role === 'supervisor') {
          setPendingActions([
            { id: '1', icon: '📋', title: 'BOM Review — WO-CHH-26-005', subtitle: 'Submitted by you, awaiting FM approval', actionLabel: 'View BOM', route: '/bom' },
            { id: '2', icon: '⏱️', title: 'OT Request Not Submitted', subtitle: 'Ramesh Kumar worked 11 hrs yesterday — submit OT request', actionLabel: 'Submit OT' },
            { id: '3', icon: '📝', title: 'EOD Updates Pending', subtitle: "2 carpenters haven't submitted today's EOD update", actionLabel: 'View Job Cards', route: '/production' },
            { id: '4', icon: '📦', title: 'GRN Inspection Due', subtitle: 'Delivery from Greenlam arrived 2 hours ago', actionLabel: 'Inspect GRN' },
          ]);
          setCarpenters([
            { id: '1', name: 'Ramesh Kumar', status: 'present', woNumber: 'WO-CHH-26-001', task: 'Reception Counter — Assembly', progress: 2, progressMax: 3 },
            { id: '2', name: 'Suresh Yadav',  status: 'present', woNumber: 'WO-B2B-26-001', task: 'Workstation — Cutting', alert: 'material' },
            { id: '3', name: 'Vikram Singh',  status: 'absent' },
            { id: '4', name: 'Mohan Lal',    status: 'present', woNumber: 'WO-CHH-26-001', task: 'Reception Counter — Edge Banding', progress: 3, progressMax: 5 },
          ]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user.role]);

  /* ─────────────── Render ─────────────── */
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] flex-1 min-h-screen flex flex-col">
        <Header
          title={`${greeting}, ${user.name.split(' ')[0]}`}
          subtitle={todayLong}
        />

        {loading ? (
          <div className="flex-grow flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-border-subtle border-t-secondary" />
          </div>
        ) : (
          <div className="px-8 py-6 space-y-6 max-w-[1200px]">

            {/* ══ FACTORY MANAGER VIEW ══ */}
            {user.role === 'factory_manager' && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <StatTile label="MTD Revenue"       value={financialData.mtd_revenue}  note="↑ 12% vs last month"     valueClass="text-status-qc-passed" />
                  <StatTile label="Receivables Aging" value={financialData.receivables}  note="Within 30-day bucket"    valueClass="text-status-partial-material" />
                  <StatTile label="Payables Due"      value={financialData.payables}     note="Due this Friday"         valueClass="text-status-cancelled" />
                  <StatTile label="Liquid Cash"       value={financialData.bank_balance} note="HDFC bank accounts"      />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Alerts */}
                  <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-[13px] text-ink-900 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-status-error text-[18px]">notifications_active</span>
                      Critical In-Floor Alerts
                    </h3>
                    <div className="space-y-2">
                      {managerAlerts.map((alert) => {
                        const isError = alert.type === 'critical';
                        const isWarn  = alert.type === 'warning';
                        return (
                          <div
                            key={alert.id}
                            className={`p-3 rounded-lg border flex gap-2 items-center text-[12px] font-semibold ${
                              isError ? 'bg-red-50 border-red-200 text-red-700' :
                              isWarn  ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                        'bg-surface-alt border-border-subtle text-ink-700'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isError ? 'cancel' : isWarn ? 'warning' : 'info'}
                            </span>
                            <span className="flex-1">{alert.message}</span>
                            <button className="text-[10px] underline uppercase opacity-70 hover:opacity-100">Resolve</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Production snapshot */}
                  <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col">
                    <h3 className="font-bold text-[13px] text-ink-900 mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">precision_manufacturing</span>
                      Production Snapshot
                    </h3>
                    <p className="text-[12px] text-ink-500 leading-relaxed flex-1">
                      Currently loading 3 active Job Cards across 4 present floor technicians.
                      Current Plant capacity load is at 68%.
                    </p>
                    <button
                      onClick={() => navigate('/production')}
                      className="mt-5 w-full py-2.5 bg-primary text-white rounded-lg font-bold text-[12px] hover:opacity-90 transition-all"
                    >
                      Open Production Floor Panel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══ SUPERVISOR VIEW — matches Figma screen 17 ══ */}
            {user.role === 'supervisor' && (
              <div className="space-y-6">

                {/* Pending Actions */}
                <div className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-border-subtle">
                    <h2 className="font-bold text-[14px] text-ink-900">Pending Actions</h2>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {pendingActions.map((action) => (
                      <div key={action.id} className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-full bg-surface-alt border border-border-subtle flex items-center justify-center text-base flex-shrink-0">
                          {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink-900">{action.title}</p>
                          <p className="text-[11px] text-ink-500 mt-0.5">{action.subtitle}</p>
                        </div>
                        <button
                          onClick={() => action.route && navigate(action.route)}
                          className="flex-shrink-0 px-4 h-8 rounded-lg border border-border-subtle bg-white text-[12px] font-semibold text-ink-700 hover:bg-surface-alt transition-all"
                        >
                          {action.actionLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Today's Production — carpenter cards */}
                <div className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-border-subtle">
                    <h2 className="font-bold text-[14px] text-ink-900">Today's Production</h2>
                  </div>
                  <div className="p-6 grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {carpenters.map((c) => (
                      <CarpenterProductionCard key={c.id} c={c} />
                    ))}
                  </div>
                </div>

                {/* Today's Schedule — 3-col */}
                <div className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-border-subtle">
                    <h2 className="font-bold text-[14px] text-ink-900">Today's Schedule</h2>
                  </div>
                  <div className="p-6 grid grid-cols-3 gap-6 text-[12px]">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2">WOs Needing Action Today</p>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-status-pending-review mt-1 flex-shrink-0" />
                          WO-CHH-26-001 — continue Assembly
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-status-partial-material mt-1 flex-shrink-0" />
                          WO-B2B-26-001 — cutting blocked, follow up material
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2">Deliveries to Prepare</p>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-base leading-none">🚛</span>
                          WO-CHH-26-002 — dispatch today
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-base leading-none">🚛</span>
                          WO-B2B-26-001 — dispatch tomorrow
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2">Materials Expected</p>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-base leading-none">📦</span>
                          PO-26-003 — Greenlam Plywood, today
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-base leading-none">📦</span>
                          PO-26-004 — Hinges, tomorrow
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-border-subtle">
                    <h2 className="font-bold text-[14px] text-ink-900">Quick Actions</h2>
                  </div>
                  <div className="p-6 grid grid-cols-4 gap-4">
                    {[
                      { icon: '✓', label: 'Mark Attendance', route: '/production/attendance', bg: 'bg-[#F3E7CD]', fg: 'text-[#B8892B]' },
                      { icon: '+', label: 'Create Job Card', route: '/production/job-cards/new', bg: 'bg-[#B8892B]', fg: 'text-white' },
                      { icon: '📦', label: 'Record GRN', bg: 'bg-[#EFF6FF]', fg: 'text-[#2563EB]' },
                      { icon: '⏱', label: 'Submit OT Request', bg: 'bg-[#F0FDF4]', fg: 'text-[#16A34A]' },
                    ].map((q) => (
                      <button
                        key={q.label}
                        onClick={() => q.route && navigate(q.route)}
                        className="flex flex-col items-center gap-3 p-5 rounded-xl border border-border-subtle hover:bg-surface-alt transition-all"
                      >
                        <span className={`w-11 h-11 rounded-full ${q.bg} ${q.fg} flex items-center justify-center text-xl font-bold`}>
                          {q.icon}
                        </span>
                        <span className="text-[12px] font-semibold text-ink-700">{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gold-light/40 border border-[#B8892B]/20 rounded-xl text-[11px] text-ink-500">
                  <span className="text-base">ℹ️</span>
                  This dashboard shows no financial data — revenue, costs, and margins are visible to the Factory Manager only.
                </div>
              </div>
            )}

            {/* ══ SITE MANAGER VIEW ══ */}
            {user.role === 'site_manager' && (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[13px] text-ink-900 mb-4">My Active Work Orders</h3>
                  <p className="text-[12px] text-ink-500 italic">No active work orders.</p>
                </div>
                <div className="col-span-4 bg-white border border-border-subtle rounded-xl p-6 shadow-sm space-y-3">
                  <h3 className="font-bold text-[13px] text-ink-900 mb-2">Quick Actions</h3>
                  <button
                    onClick={() => navigate('/work-orders/new')}
                    className="w-full py-2.5 bg-primary text-white rounded-lg font-bold text-[12px] hover:opacity-90 transition-all"
                  >
                    Raise New Work Order
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
