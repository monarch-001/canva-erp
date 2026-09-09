import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showActionBtn?: boolean;
  actionBtnText?: string;
  onActionClick?: () => void;
  actionBtnIcon?: string;
}

interface Notification {
  id: string;
  type: string; // 'blocked' | 'ot_approval' | 'invoice' | 'qc' | 'stock' | 'delivery' | 'bom' | 'general'
  title: string;
  body: string;
  reference_label: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', type: 'blocked',
    title: 'WO-CHH-26-001 Blocked',
    body: 'Plywood not received. Expected PO-26-003 due yesterday.',
    reference_label: 'WO-CHH-26-001', reference_type: 'work_order', reference_id: 'wo-1',
    is_read: false, created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'n2', type: 'ot_approval',
    title: 'OT Approval Pending',
    body: 'Ramesh Kumar — 3 hours today for WO-CHH-26-001.',
    reference_label: 'OTR-26-005', reference_type: 'ot_request', reference_id: 'otr-5',
    is_read: false, created_at: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
  },
  {
    id: 'n3', type: 'invoice',
    title: 'Invoice Overdue 38 Days',
    body: 'WeWork | ₹84,000. Follow up required.',
    reference_label: 'INV-B2B-26-001', reference_type: 'invoice', reference_id: 'inv-1',
    is_read: false, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n4', type: 'qc',
    title: 'QC Passed',
    body: 'WO-CHH-26-003 passed QC. Ready to dispatch.',
    reference_label: 'WO-CHH-26-003', reference_type: 'work_order', reference_id: 'wo-3',
    is_read: false, created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n5', type: 'stock',
    title: 'Low Stock — Edge Tape',
    body: '2 rolls remaining. Reorder level: 5 rolls.',
    reference_label: 'MAT-EDT-001', reference_type: 'material', reference_id: null,
    is_read: true, created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n6', type: 'delivery',
    title: 'Delivery Confirmed',
    body: 'WO-CHH-26-009 confirmed by SPOC. Ready to invoice.',
    reference_label: 'WO-CHH-26-009', reference_type: 'work_order', reference_id: 'wo-9',
    is_read: true, created_at: new Date(Date.now() - 18 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'n7', type: 'bom',
    title: 'BOM Submitted for Approval',
    body: 'BOM for WO-CHH-26-005 submitted by Gaurav.',
    reference_label: 'WO-CHH-26-005', reference_type: 'work_order', reference_id: 'wo-5',
    is_read: true, created_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
  },
];

// Type → icon emoji + bg colour
function notifIcon(type: string): { emoji: string; bg: string } {
  switch (type) {
    case 'blocked':    return { emoji: '🚫', bg: 'bg-red-100'    };
    case 'ot_approval':return { emoji: '⚠',  bg: 'bg-amber-100'  };
    case 'invoice':    return { emoji: '₹',   bg: 'bg-blue-100'  };
    case 'qc':         return { emoji: '✓',   bg: 'bg-green-100' };
    case 'stock':      return { emoji: '📦',  bg: 'bg-amber-50'  };
    case 'delivery':   return { emoji: '🚚',  bg: 'bg-sky-100'   };
    case 'bom':        return { emoji: 'ℹ',   bg: 'bg-blue-50'   };
    default:           return { emoji: '🔔',  bg: 'bg-slate-100' };
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1)  return 'just now';
  if (mins  < 60)  return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  if (hours < 24)  return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  // Yesterday with time
  const d = new Date(iso);
  const hhmm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1)  return `Yesterday at ${hhmm}`;
  return `${days} days ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Header({
  title,
  subtitle,
  actions,
  showActionBtn = false,
  actionBtnText = 'New Action',
  onActionClick,
  actionBtnIcon = 'add',
}: HeaderProps) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          setNotifications(await res.json());
        } else {
          throw new Error();
        }
      } catch {
        setNotifications(MOCK_NOTIFICATIONS);
      }
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  async function handleMarkAllRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch { /* continue */ }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handleNotifClick(n: Notification) {
    if (!n.is_read) {
      try {
        await fetch(`/api/notifications/${n.id}/read`, { method: 'POST' });
      } catch { /* continue */ }
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    setDropdownOpen(false);
    if (n.reference_type === 'work_order' && n.reference_id) navigate(`/work-orders/${n.reference_id}`);
    else if (n.reference_type === 'ot_request') navigate('/production/overtime');
    else if (n.reference_type === 'invoice') navigate('/invoices');
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const userName = user?.name ?? 'User';
  const userRole = (user?.role ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur-sm border-b border-border-subtle no-print">
      <div className="flex items-start justify-between px-8 py-5">

        {/* Left: Title + Subtitle */}
        <div>
          <h1 className="text-[26px] font-bold text-ink-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-[13px] text-ink-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Right: actions + bell + user chip */}
        <div className="flex items-center gap-3 flex-shrink-0 pt-1">

          {/* Custom actions */}
          {actions}

          {/* Legacy button */}
          {showActionBtn && !actions && (
            <button
              onClick={onActionClick}
              className="bg-secondary text-white px-5 h-10 rounded-lg flex items-center gap-2 text-sm font-semibold hover:brightness-110 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">{actionBtnIcon}</span>
              {actionBtnText}
            </button>
          )}

          {/* Notification Bell + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-ink-500 hover:bg-border-subtle hover:text-ink-900 transition-all"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
              )}
            </button>

            {/* Dropdown Panel */}
            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-[400px] bg-white border border-border-subtle rounded-2xl shadow-2xl z-50 overflow-hidden">

                {/* Dropdown header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                  <span className="text-base font-bold text-primary">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-semibold text-secondary hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="max-h-[440px] overflow-y-auto divide-y divide-border-subtle">
                  {notifications.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-ink-400 italic">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(n => {
                      const { emoji, bg } = notifIcon(n.type);
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`flex gap-3 px-5 py-4 cursor-pointer hover:bg-surface-alt transition-colors ${!n.is_read ? 'bg-amber-50/40' : ''}`}
                        >
                          {/* Icon */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${bg}`}>
                            {emoji}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-ink-900 leading-snug">{n.title}</p>
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-xs text-ink-500 mt-0.5 leading-snug">{n.body}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {n.reference_label && (
                                <span className="text-xs font-semibold text-secondary">{n.reference_label}</span>
                              )}
                              {n.reference_label && <span className="text-ink-300 text-xs">·</span>}
                              <span className="text-xs text-ink-400">{relativeTime(n.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-border-subtle">
                  <button
                    onClick={() => { navigate('/notifications'); setDropdownOpen(false); }}
                    className="w-full py-3.5 text-sm font-semibold text-ink-700 hover:bg-surface-alt transition-colors text-center"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar Chip */}
          <div className="flex items-center gap-2.5 pl-2">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {getInitials(userName)}
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-semibold text-ink-900 leading-tight">{userName}</p>
              <p className="text-[11px] text-ink-400 leading-tight">{userRole}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
