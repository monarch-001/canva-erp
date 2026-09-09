import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';
import Sidebar from '../components/Sidebar';

type Severity = 'critical' | 'high' | 'informational';

interface AlertAction {
  label: string;
  primary?: boolean;
  onClick?: () => void;
}

interface Alert {
  id: string;
  severity: Severity;
  icon: string;
  iconBg: string;
  title: string;
  body: string;
  actions: AlertAction[];
}

const MOCK_ALERTS: Alert[] = [
  // CRITICAL
  {
    id: 'a1', severity: 'critical',
    icon: '!', iconBg: 'bg-red-600 text-white',
    title: 'WO-CHH-26-001 BLOCKED — Plywood not received',
    body: 'Expected: PO-26-003 due yesterday.',
    actions: [{ label: 'Contact Vendor', primary: true }, { label: 'View WO' }],
  },
  {
    id: 'a2', severity: 'critical',
    icon: '⚙', iconBg: 'bg-red-100 text-red-600',
    title: 'Machine breakdown — Edge banding machine',
    body: 'Flagged as breakdown by Ramesh Kumar.',
    actions: [{ label: 'View Issue', primary: true }, { label: 'Call Mechanic' }],
  },
  {
    id: 'a3', severity: 'critical',
    icon: '₹', iconBg: 'bg-red-100 text-red-600',
    title: 'INV-B2B-26-001 overdue 38 days',
    body: 'WeWork | ₹84,000 outstanding.',
    actions: [{ label: 'Send Reminder', primary: true }, { label: 'Call Client' }, { label: 'View Invoice' }],
  },
  // HIGH PRIORITY
  {
    id: 'a4', severity: 'high',
    icon: '⏱', iconBg: 'bg-amber-100 text-amber-600',
    title: 'OT Approval Pending — OTR-26-005',
    body: 'Ramesh Kumar · 3 hours today for WO-CHH-26-001.',
    actions: [{ label: 'Approve', primary: true }, { label: 'Reject' }],
  },
  {
    id: 'a5', severity: 'high',
    icon: '📋', iconBg: 'bg-amber-100 text-amber-600',
    title: 'PO-26-008 pending approval',
    body: 'Greenlam Laminates ₹43,500 · Raised by Gaurav · Required by 22-Aug.',
    actions: [{ label: 'Approve', primary: true }, { label: 'View PO' }],
  },
  {
    id: 'a6', severity: 'high',
    icon: '✓', iconBg: 'bg-amber-100 text-amber-600',
    title: 'WO-CHH-26-003 passed QC — dispatch approval needed',
    body: 'Ready to dispatch.',
    actions: [{ label: 'Approve Dispatch', primary: true }, { label: 'View QC Record' }],
  },
  {
    id: 'a7', severity: 'high',
    icon: '🚚', iconBg: 'bg-amber-100 text-amber-600',
    title: 'WO-B2B-26-001 delivery due tomorrow (20-Aug)',
    body: 'Status: QC Passed. Create challan?',
    actions: [{ label: 'Create Challan', primary: true }, { label: 'View WO' }],
  },
  // INFORMATIONAL
  {
    id: 'a8', severity: 'informational',
    icon: '📄', iconBg: 'bg-blue-100 text-blue-600',
    title: 'BOM submitted for WO-CHH-26-005',
    body: 'Submitted by Gaurav.',
    actions: [{ label: 'Review BOM', primary: true }],
  },
  {
    id: 'a9', severity: 'informational',
    icon: '📦', iconBg: 'bg-blue-100 text-blue-600',
    title: 'Low stock — Edge tape (MAT-EDT-001)',
    body: '2 rolls remaining · Reorder level: 5 rolls.',
    actions: [{ label: 'Raise PR', primary: true }],
  },
];

const SEVERITY_CONFIG = {
  critical: {
    label: '● CRITICAL',
    labelColor: 'text-red-600',
    cardBorder: 'border-red-200',
    leftBar: 'bg-red-500',
    btnPrimary: 'bg-red-600 hover:bg-red-700 text-white',
  },
  high: {
    label: '▲ HIGH PRIORITY',
    labelColor: 'text-amber-600',
    cardBorder: 'border-amber-200',
    leftBar: 'bg-amber-500',
    btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  informational: {
    label: 'ℹ INFORMATIONAL',
    labelColor: 'text-blue-600',
    cardBorder: 'border-blue-200',
    leftBar: 'bg-blue-400',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
} as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: '2-digit' }).replace(',', '');
}

export default function FMAlertsDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/fm/alerts');
        if (!res.ok) throw new Error();
        setAlerts(await res.json());
      } catch {
        setAlerts(MOCK_ALERTS);
      }
    }
    load();
  }, []);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  const displayName = user?.name?.split(' ')[0] ?? 'there';
  const totalCount = visible.length;

  const sections: Severity[] = ['critical', 'high', 'informational'];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className="ml-[220px] flex-1 px-8 py-6">

        {/* Greeting header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-primary">{greeting()}, {displayName}</h1>
            <p className="text-sm text-ink-500 mt-1">{todayLabel()}</p>
          </div>
          {/* Bell icon */}
          <button
            onClick={() => navigate('/settings/notifications')}
            className="w-10 h-10 rounded-full border border-border-strong flex items-center justify-center hover:bg-surface-alt transition mt-1"
          >
            <span className="text-lg">🔔</span>
          </button>
        </div>

        {/* Unread count badge */}
        {totalCount > 0 && (
          <div className="mb-4">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold">
              {totalCount}
            </span>
          </div>
        )}

        {/* Section header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-4 bg-ink-700 rounded-full" />
          <p className="text-xs font-bold text-ink-500 uppercase tracking-widest">
            Section 1 · Alerts — Actions Required Today
          </p>
        </div>

        {/* Alert sections */}
        <div className="space-y-8">
          {sections.map(severity => {
            const cfg = SEVERITY_CONFIG[severity];
            const items = visible.filter(a => a.severity === severity);
            if (items.length === 0) return null;
            return (
              <div key={severity}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${cfg.labelColor}`}>
                  {cfg.label}
                </p>
                <div className="space-y-3">
                  {items.map(alert => (
                    <div
                      key={alert.id}
                      className={`bg-surface-card border ${cfg.cardBorder} rounded-xl flex overflow-hidden`}
                    >
                      {/* Left accent bar */}
                      <div className={`w-1 flex-shrink-0 ${cfg.leftBar}`} />

                      {/* Content */}
                      <div className="flex items-start gap-4 px-5 py-4 flex-1">
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${alert.iconBg}`}>
                          {alert.icon}
                        </div>

                        {/* Text + actions */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ink-900 mb-0.5">{alert.title}</p>
                          <p className="text-sm text-ink-500 mb-3">{alert.body}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {alert.actions.map(action => (
                              <button
                                key={action.label}
                                onClick={action.onClick}
                                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                                  action.primary
                                    ? cfg.btnPrimary
                                    : 'border border-border-strong text-ink-700 hover:bg-surface-alt'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dismiss */}
                        <button
                          onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                          className="text-ink-300 hover:text-ink-500 text-lg leading-none flex-shrink-0 mt-0.5"
                          title="Dismiss"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {visible.length === 0 && (
            <div className="bg-surface-card border border-border-subtle rounded-xl p-12 text-center">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-base font-semibold text-primary">All clear!</p>
              <p className="text-sm text-ink-400 mt-1">No alerts requiring your attention right now.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
