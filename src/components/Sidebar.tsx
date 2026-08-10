import { NavLink } from 'react-router-dom';
import { getCurrentUser, setCurrentUserRole } from '../utils/auth';
import type { UserRole } from '../utils/auth';

export default function Sidebar() {
  const user = getCurrentUser();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/work-orders', label: 'Work Orders', icon: 'manufacturing' },
    // Only Factory Manager & Supervisor can access Production Floor
    ...(user.role === 'factory_manager' || user.role === 'supervisor' 
      ? [{ to: '/production', label: 'Production', icon: 'precision_manufacturing' }] 
      : []),
    { to: '/users', label: 'Users', icon: 'group' },
    { to: '/finance', label: 'Finance', icon: 'payments' }
  ];

  const handleRoleToggle = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentUserRole(e.target.value as UserRole);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-sidebar-width bg-primary flex flex-col py-lg z-50 overflow-y-auto no-scrollbar no-print">
      <div className="px-lg mb-xl">
        <h1 className="font-headline-sm text-headline-sm text-on-primary font-bold">Canva Concepts</h1>
        <p className="text-on-primary opacity-60 text-xs tracking-widest uppercase">Industrial ERP</p>
      </div>

      <nav className="flex-1 px-sm space-y-base">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-md px-lg py-md rounded-lg text-on-primary transition-colors active:scale-95 duration-150 ${
                isActive ? 'sidebar-active' : 'opacity-80 hover:opacity-100 hover:bg-surface-container-highest'
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-title-md text-title-md">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-sm pt-xl border-t border-on-primary/10 space-y-base">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-md px-lg py-md rounded-lg text-on-primary transition-colors active:scale-95 duration-150 ${
              isActive ? 'sidebar-active' : 'opacity-80 hover:opacity-100 hover:bg-surface-container-highest'
            }`
          }
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-title-md text-title-md">Settings</span>
        </NavLink>
        <a
          href="#"
          className="flex items-center gap-md px-lg py-md rounded-lg text-on-primary opacity-80 hover:opacity-100 hover:bg-surface-container-highest transition-colors active:scale-95 duration-150"
        >
          <span className="material-symbols-outlined">help</span>
          <span className="font-title-md text-title-md">Support</span>
        </a>

        {/* Profile Card & Role Switcher */}
        <div className="mt-xl px-lg py-md bg-white/5 rounded-xl border border-white/10 space-y-md">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex-shrink-0">
              <img className="w-full h-full object-cover" src={user.avatar} alt={user.name} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-on-primary font-bold text-sm truncate">{user.name}</p>
              <p className="text-on-primary opacity-60 text-xs truncate">{user.roleLabel}</p>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-white/50 uppercase font-bold tracking-wider block">Toggle System Role</label>
            <select
              value={user.role}
              onChange={handleRoleToggle}
              className="w-full h-8 px-2 bg-primary-container text-white border border-white/15 rounded text-xs focus:ring-0 focus:border-secondary cursor-pointer"
            >
              <option value="factory_manager">Factory Manager</option>
              <option value="supervisor">Supervisor</option>
              <option value="site_manager">Site Manager</option>
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
}
