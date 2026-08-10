import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  showActionBtn?: boolean;
  actionBtnText?: string;
  onActionClick?: () => void;
  actionBtnIcon?: string;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export default function Header({
  title,
  showActionBtn = false,
  actionBtnText = 'New Action',
  onActionClick,
  actionBtnIcon = 'add'
}: HeaderProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkRead = async (id: string, refType: string | null, refId: string | null) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
        if (refType === 'work_order' && refId) {
          navigate(`/work-orders/${refId}`);
          setDropdownOpen(false);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center w-full px-lg h-16 bg-surface border-b border-border-subtle max-w-container-max mx-auto">
      <div className="flex items-center gap-xl">
        <h2 className="font-headline-sm text-headline-sm text-primary font-bold">{title}</h2>
        <div className="relative group hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            className="bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm w-80 focus:ring-1 focus:ring-secondary transition-all"
            placeholder="Search orders, clients, items..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-lg">
        {showActionBtn && (
          <button
            onClick={onActionClick}
            className="bg-secondary text-on-primary px-lg py-2.5 rounded-lg flex items-center gap-sm font-label-md text-label-md hover:brightness-110 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">{actionBtnIcon}</span>
            {actionBtnText}
          </button>
        )}

        <div className="flex gap-md border-l border-border-subtle pl-lg relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-all relative"
          >
            notifications
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-status-error text-[9px] text-white flex items-center justify-center rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {dropdownOpen && (
            <div className="absolute right-0 top-8 mt-2 w-80 bg-white border border-border-subtle rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-md border-b border-border-subtle bg-surface-container-low flex justify-between items-center">
                <span className="font-bold text-xs text-primary uppercase tracking-wider">In-App Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-secondary font-bold hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-border-subtle">
                {notifications.length === 0 ? (
                  <div className="p-lg text-center text-xs text-on-surface-variant italic">
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => handleMarkRead(n.id, n.reference_type, n.reference_id)}
                      className={`p-md hover:bg-surface-container-low cursor-pointer transition-colors flex gap-sm items-start ${
                        !n.is_read ? 'bg-secondary-fixed/10' : ''
                      }`}
                    >
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs font-bold text-primary flex justify-between items-center">
                          {n.title}
                          {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>}
                        </p>
                        <p className="text-[11px] text-on-surface-variant leading-tight">{n.body}</p>
                        <span className="text-[9px] text-on-surface-variant/50 block pt-1">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <button className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-all">help</button>
          <button
            onClick={() => navigate('/settings')}
            className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-all"
          >
            settings
          </button>
        </div>
      </div>
    </header>
  );
}
