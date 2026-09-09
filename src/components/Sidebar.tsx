import { NavLink } from 'react-router-dom';
import { getCurrentUser, setCurrentUserRole } from '../utils/auth';
import type { UserRole } from '../utils/auth';

// ── Grouped nav structure ────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',   label: 'Dashboard' },
      { to: '/work-orders', label: 'Work Orders' },
      { to: '/quotations',  label: 'Quotations' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/change-requests',     label: 'Change Requests' },
      { to: '/bom/templates',       label: 'BOM & Materials' },
      { to: '/production',          label: 'Production' },
      { to: '/production/overtime', label: 'Overtime' },
      { to: '/quality-control',     label: 'Quality Control' },
      { to: '/dispatch',            label: 'Dispatch & Delivery' },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { to: '/purchase-requisitions', label: 'Purchase Requisitions' },
      { to: '/purchase-orders',       label: 'Purchase Orders' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/invoices', label: 'Invoices' },
      { to: '/reports',  label: 'Reports' },
    ],
  },
];

// ── Sub-components ───────────────────────────────────────────────────────────
function NavDot({ active }: { active: boolean }) {
  return (
    <span
      className={`w-[4px] h-[4px] rounded-full flex-shrink-0 transition-colors ${
        active ? 'bg-[#B8892B]' : 'bg-white/20'
      }`}
    />
  );
}

function GroupLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[9px] font-bold tracking-widest uppercase text-white/30 select-none">
      {label}
    </p>
  );
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const user = getCurrentUser();

  const handleRoleToggle = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentUserRole(e.target.value as UserRole);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-primary flex flex-col z-50 overflow-hidden no-print">

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 flex-shrink-0">
        <div className="w-7 h-7 rounded-md bg-[#B8892B] flex-shrink-0" />
        <div>
          <p className="text-white font-bold text-[13px] leading-tight">Canva Concepts</p>
          <p className="text-white/50 text-[10px] leading-tight">Factory ERP</p>
        </div>
      </div>

      {/* ── Nav groups ── */}
      <nav className="flex-1 px-3 overflow-y-auto no-scrollbar">
        {NAV_GROUPS.map((group) => {
          // Hide groups completely based on role
          if (user.role === 'supervisor' && ['Procurement', 'Finance'].includes(group.label)) return null;
          if (user.role === 'site_manager' && ['Procurement', 'Finance'].includes(group.label)) return null;

          const filteredItems = group.items.filter(item => {
            // Filter specific links
            if (user.role === 'supervisor') {
              if (item.label === 'Quotations') return false;
            }
            if (user.role === 'site_manager') {
              if (['BOM & Materials', 'Production', 'Overtime', 'Quality Control', 'Dispatch & Delivery', 'Quotations'].includes(item.label)) return false;
            }
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={group.label}>
              <GroupLabel label={group.label} />
              <div className="space-y-[1px]">
                {filteredItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium transition-colors duration-150 ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <NavDot active={isActive} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="px-3 pb-4 pt-3 border-t border-white/10 flex-shrink-0">
        {user.role === 'factory_manager' && (
          <>
            <NavLink
              to="/settings/users"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium transition-colors duration-150 mb-1.5 ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <NavDot active={isActive} />
                  User Directory
                </>
              )}
            </NavLink>

            <NavLink
              to="/settings/db"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium transition-colors duration-150 mb-1.5 ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <NavDot active={isActive} />
                  Database Schema
                </>
              )}
            </NavLink>
          </>
        )}

        <NavLink
          to="/settings/notifications"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium transition-colors duration-150 mb-3 ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white/90 hover:bg-white/5'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <NavDot active={isActive} />
              Settings
            </>
          )}
        </NavLink>

        {/* Profile + Role switcher */}
        <div className="px-3 py-3 bg-white/5 rounded-xl border border-white/10 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#B8892B] overflow-hidden flex-shrink-0">
              <img className="w-full h-full object-cover" src={user.avatar} alt={user.name} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white font-semibold text-[11px] truncate">{user.name}</p>
              <p className="text-white/50 text-[10px] truncate">{user.roleLabel}</p>
            </div>
          </div>
          <div>
            <label className="text-[9px] text-white/40 uppercase font-bold tracking-wider block mb-1">
              Toggle Role
            </label>
            <select
              value={user.role}
              onChange={handleRoleToggle}
              className="w-full h-7 px-2 bg-white/10 text-white border border-white/15 rounded text-[11px] focus:ring-0 focus:border-[#B8892B] cursor-pointer"
            >
              <option value="factory_manager" className="text-[#1C1917] bg-white">Factory Manager</option>
              <option value="supervisor" className="text-[#1C1917] bg-white">Supervisor</option>
              <option value="site_manager" className="text-[#1C1917] bg-white">Site Manager</option>
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
}

