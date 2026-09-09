import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

const SM_NAV = [
  { to: '/site-manager',            label: 'Dashboard' },
  { to: '/site-manager/work-orders', label: 'My Work Orders' },
  { to: '/change-requests',          label: 'Change Requests' },
  { to: '/settings',                 label: 'Settings' },
];

interface WoCard {
  id: string;
  wo_number: string;
  title: string;
  status: string;
  delivery_committed: string | null;
  days_remaining: number | null;
  days_status: 'ok' | 'warning' | 'overdue' | null;
  awaiting_confirmation: boolean;
  alert?: string;
  pending_action?: string;
}

const MOCK_WOS: WoCard[] = [
  {
    id: 'wo-1',
    wo_number: 'WO-CHH-26-001',
    title: 'Reception Counter',
    status: 'in_production',
    delivery_committed: '25-Aug-26',
    days_remaining: 6,
    days_status: 'ok',
    awaiting_confirmation: false,
  },
  {
    id: 'wo-3',
    wo_number: 'WO-CHH-26-003',
    title: 'Kitchen Counter',
    status: 'partial_material',
    delivery_committed: '28-Aug-26',
    days_remaining: 9,
    days_status: 'warning',
    awaiting_confirmation: false,
    alert: 'Plywood awaited (PO placed)',
  },
  {
    id: 'wo-5',
    wo_number: 'WO-CHH-26-005',
    title: 'Nurses Station Counter',
    status: 'pending_review',
    delivery_committed: null,
    days_remaining: null,
    days_status: null,
    awaiting_confirmation: false,
    pending_action: 'Awaiting Supervisor review',
  },
  {
    id: 'wo-11',
    wo_number: 'WO-CHH-26-011',
    title: 'Display Counter',
    status: 'qc_passed',
    delivery_committed: '18-Aug-26',
    days_remaining: null,
    days_status: null,
    awaiting_confirmation: true,
  },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  supervisor_approved: 'Supervisor Approved',
  approved_pending_bom: 'Approved – Pending BOM',
  bom_approved: 'BOM Approved',
  partial_material: 'Material Pending',
  material_ready: 'Material Ready',
  in_production: 'In Production',
  production_complete: 'Production Complete',
  qc_pending: 'QC Pending',
  qc_passed: 'QC Passed',
  ready_for_dispatch: 'Ready for Dispatch',
  in_transit: 'In Transit',
  delivered_pending_confirmation: 'Delivered',
  delivered_confirmed: 'Delivered',
  invoice_raised: 'Invoice Raised',
  financially_closed: 'Closed',
  cancelled: 'Cancelled',
};

const STATUS_PILL: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_review: 'bg-blue-100 text-blue-700',
  supervisor_approved: 'bg-indigo-100 text-indigo-700',
  approved_pending_bom: 'bg-violet-100 text-violet-700',
  bom_approved: 'bg-cyan-100 text-cyan-700',
  partial_material: 'bg-amber-100 text-amber-700',
  material_ready: 'bg-teal-100 text-teal-700',
  in_production: 'bg-orange-100 text-orange-700',
  production_complete: 'bg-lime-100 text-lime-700',
  qc_pending: 'bg-yellow-100 text-yellow-700',
  qc_passed: 'bg-green-100 text-green-700',
  ready_for_dispatch: 'bg-sky-100 text-sky-700',
  in_transit: 'bg-blue-100 text-blue-700',
  delivered_pending_confirmation: 'bg-teal-100 text-teal-700',
  delivered_confirmed: 'bg-green-100 text-green-700',
  invoice_raised: 'bg-purple-100 text-purple-700',
  financially_closed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SiteManagerDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [workOrders, setWorkOrders] = useState<WoCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/site-manager/work-orders');
        if (!res.ok) throw new Error();
        setWorkOrders(await res.json());
      } catch {
        setWorkOrders(MOCK_WOS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Site Manager Sidebar ─────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 h-full w-[220px] bg-primary flex flex-col z-50">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-6 flex-shrink-0">
          <div className="w-8 h-8 rounded-md bg-secondary flex-shrink-0" />
          <div>
            <p className="text-white font-bold text-[13px] leading-tight">Canva Concepts</p>
            <p className="text-white/50 text-[10px] leading-tight">Factory ERP</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-[1px]">
          {SM_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/site-manager'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-[5px] h-[5px] rounded-full flex-shrink-0 transition-colors ${
                      isActive ? 'bg-secondary' : 'bg-white/20'
                    }`}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 pb-5 text-white/40 text-[10px]">
          <p className="font-medium text-white/60">{user?.name ?? 'Site Manager'}</p>
          <p>Site Manager</p>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="ml-[220px] flex-1 px-8 py-8">

        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">{greeting()}, {displayName}</h1>
            <p className="text-sm text-ink-500 mt-1">
              Here's the status of your Work Orders — {todayLabel()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/change-requests/new')}
              className="px-4 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded-lg hover:bg-surface-alt transition"
            >
              Raise Change Request
            </button>
            <button
              onClick={() => navigate('/work-orders/new')}
              className="px-4 py-2 bg-secondary text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
            >
              + Raise New Work Order
            </button>
          </div>
        </div>

        {/* My Work Orders */}
        <h2 className="text-lg font-bold text-primary mb-4">My Work Orders</h2>

        {loading ? (
          <p className="text-sm text-ink-400">Loading…</p>
        ) : workOrders.length === 0 ? (
          <div className="bg-surface-card border border-border-subtle rounded-xl p-10 text-center">
            <p className="text-ink-400 text-sm">No active work orders.</p>
            <button
              onClick={() => navigate('/work-orders/new')}
              className="mt-4 px-5 py-2 bg-secondary text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
            >
              + Raise New Work Order
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {workOrders.map(wo => (
              <div
                key={wo.id}
                onClick={() => navigate(`/work-orders/${wo.id}`)}
                className="bg-surface-card border border-border-subtle rounded-xl p-5 cursor-pointer hover:border-border-strong hover:shadow-sm transition group"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4">
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="text-secondary font-bold text-base">{wo.wo_number}</span>
                      <span className="text-ink-400">|</span>
                      <span className="text-base font-semibold text-primary">{wo.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-500 font-medium">Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${STATUS_PILL[wo.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[wo.status] ?? wo.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Right: delivery info */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-ink-400 mb-1">
                      Delivery committed:{' '}
                      <span className="text-ink-700 font-medium">
                        {wo.delivery_committed ?? 'Not yet committed'}
                      </span>
                    </p>

                    {/* Days remaining badge */}
                    {wo.days_remaining !== null && wo.days_status && (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        wo.days_status === 'ok'      ? 'bg-green-100 text-green-700' :
                        wo.days_status === 'warning' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {wo.days_remaining} days remaining
                        {wo.days_status === 'ok' && ' ✓'}
                      </span>
                    )}

                    {/* Awaiting confirmation */}
                    {wo.awaiting_confirmation && (
                      <span className="inline-flex items-center text-xs font-semibold text-teal-700">
                        Delivered — awaiting your confirmation
                      </span>
                    )}

                    {/* Pending action */}
                    {wo.pending_action && !wo.awaiting_confirmation && wo.days_remaining === null && (
                      <span className="inline-flex items-center text-xs font-semibold text-amber-600">
                        {wo.pending_action}
                      </span>
                    )}
                  </div>
                </div>

                {/* Alert banner */}
                {wo.alert && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    <span>⚠</span>
                    <span>{wo.alert}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer info note */}
        <p className="mt-8 text-xs text-ink-400 flex items-start gap-1.5">
          <span className="flex-shrink-0 mt-0.5">ℹ</span>
          <span>No production details, costs, or financials are shown here — only what's needed to track your own Work Orders.</span>
        </p>
      </main>
    </div>
  );
}
