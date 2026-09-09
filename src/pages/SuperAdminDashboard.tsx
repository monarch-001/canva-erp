import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

const SA_NAV = [
  { to: '/super-admin',              label: 'Dashboard' },
  { to: '/super-admin/work-orders',  label: 'Chhabee Work Orders' },
  { to: '/settings',                 label: 'Settings' },
];

interface StatTile {
  value: number;
  label: string;
  color: 'black' | 'green' | 'orange';
}

interface WoRow {
  id: string;
  wo_number: string;
  description: string;
  status: string;
  committed_date: string | null;
  days_label: string;
  days_color: 'green' | 'amber' | 'red' | 'teal' | 'muted';
}

interface RevenueSummary {
  billed_this_month: number;
  outstanding: number;
  collected: number;
}

const MOCK_STATS: StatTile[] = [
  { value: 14, label: 'Active WOs',           color: 'black'  },
  { value:  6, label: 'Delivered This Month', color: 'green'  },
  { value:  8, label: 'Pending Delivery',     color: 'orange' },
];

const MOCK_WOS: WoRow[] = [
  { id:'wo-1',  wo_number:'WO-CHH-26-001', description:'Reception Counter — DLF Cyber Hub',  status:'in_production',  committed_date:'25-Aug-2026', days_label:'6 days left',            days_color:'green' },
  { id:'wo-3',  wo_number:'WO-CHH-26-003', description:'Kitchen Counter — Fortis Hospital',  status:'partial_material', committed_date:'28-Aug-2026', days_label:'9 days left',          days_color:'amber' },
  { id:'wo-5',  wo_number:'WO-CHH-26-005', description:'Nurses Station — Fortis Hospital',   status:'pending_review', committed_date:null,          days_label:'—',                      days_color:'muted' },
  { id:'wo-9',  wo_number:'WO-CHH-26-009', description:'Cash Counter — QSR Fitout',          status:'delivered_confirmed', committed_date:'15-Aug-2026', days_label:'Delivered',         days_color:'green' },
  { id:'wo-11', wo_number:'WO-CHH-26-011', description:'Display Counter — DLF Cyber Hub',   status:'qc_passed',      committed_date:'18-Aug-2026', days_label:'Awaiting confirmation',   days_color:'teal'  },
];

const MOCK_REVENUE: RevenueSummary = {
  billed_this_month: 842000,
  outstanding: 215000,
  collected: 627000,
};

const STATUS_PILL: Record<string, string> = {
  in_production:      'bg-orange-100 text-orange-700',
  partial_material:   'bg-amber-100 text-amber-700',
  pending_review:     'bg-blue-100 text-blue-700',
  delivered_confirmed:'bg-teal-100 text-teal-700',
  delivered_pending_confirmation: 'bg-teal-100 text-teal-700',
  qc_passed:          'bg-green-100 text-green-700',
  qc_pending:         'bg-yellow-100 text-yellow-700',
  in_transit:         'bg-blue-100 text-blue-700',
  material_ready:     'bg-teal-100 text-teal-700',
  bom_approved:       'bg-cyan-100 text-cyan-700',
  supervisor_approved:'bg-indigo-100 text-indigo-700',
  draft:              'bg-slate-100 text-slate-600',
  cancelled:          'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  in_production:       'IN PRODUCTION',
  partial_material:    'MATERIAL PENDING',
  pending_review:      'PENDING REVIEW',
  delivered_confirmed: 'DELIVERED',
  delivered_pending_confirmation: 'DELIVERED',
  qc_passed:           'QC PASSED',
  qc_pending:          'QC PENDING',
  material_ready:      'MATERIAL READY',
  bom_approved:        'BOM APPROVED',
  supervisor_approved: 'SUPERVISOR APPROVED',
  draft:               'DRAFT',
  cancelled:           'CANCELLED',
};

const DAYS_COLOR: Record<string, string> = {
  green: 'text-green-600',
  amber: 'text-amber-600',
  red:   'text-red-600',
  teal:  'text-teal-600',
  muted: 'text-ink-400',
};

function fmtINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [stats] = useState<StatTile[]>(MOCK_STATS);
  const [rows, setRows] = useState<WoRow[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary>(MOCK_REVENUE);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Users Directory State
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Add User Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Factory Manager');
  const [newPassword, setNewPassword] = useState('');

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error();
      const d = await res.json();
      setUsers(d);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/super-admin/chhabee-summary');
        if (!res.ok) throw new Error();
        const d = await res.json();
        setRows(d.work_orders);
        setRevenue(d.revenue);
      } catch {
        setRows(MOCK_WOS);
        setRevenue(MOCK_REVENUE);
      } finally {
        setLoading(false);
      }
    }
    load();
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newName,
          email: newEmail,
          designation: newRole
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewName('');
        setNewEmail('');
        setNewRole('Factory Manager');
        setNewPassword('');
        loadUsers();
      } else {
        alert('Failed to create new user');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to staging API');
    }
  };

  const filteredRows = statusFilter === 'All'
    ? rows
    : rows.filter(r => r.status === statusFilter);

  const statColor = (c: StatTile['color']) =>
    c === 'green'  ? 'text-green-600'  :
    c === 'orange' ? 'text-orange-500' :
    'text-primary';

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Super Admin Sidebar ──────────────────────────────────────────────── */}
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
          {SA_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/super-admin'}
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
                  <span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 transition-colors ${isActive ? 'bg-secondary' : 'bg-white/20'}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 pb-5 text-white/40 text-[10px]">
          <p className="font-medium text-white/60">{user?.name ?? 'Super Admin'}</p>
          <p>Chhabee Admin</p>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="ml-[220px] flex-1 px-8 py-8">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">Chhabee Programme Summary</h1>
          <p className="text-sm text-ink-500 mt-1">Read-only view — Chhabee stream only</p>
        </div>

        {/* Stat Tiles */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className="bg-surface-card border border-border-subtle rounded-xl p-5">
              <p className={`text-4xl font-bold mb-1 ${statColor(s.color)}`}>{s.value}</p>
              <p className="text-sm text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Work Order Status Table */}
        <div className="bg-surface-card border border-border-subtle rounded-xl mb-4 overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <h2 className="text-base font-semibold text-primary">Work Order Status</h2>
            <div className="flex items-center gap-4 text-sm text-ink-500">
              <span>
                Status:{' '}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="ml-1 font-medium text-ink-700 bg-transparent border-none outline-none cursor-pointer"
                >
                  <option>All</option>
                  <option value="in_production">In Production</option>
                  <option value="partial_material">Material Pending</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="qc_passed">QC Passed</option>
                  <option value="delivered_confirmed">Delivered</option>
                </select>
              </span>
              <span>Date range: <span className="font-medium text-ink-700">This month</span></span>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[200px_1fr_160px_140px_160px] gap-4 px-6 py-2.5 border-b border-border-subtle bg-surface-alt">
            {['WO No', 'Description', 'Status', 'Committed Date', 'Days Left / Overdue'].map(h => (
              <p key={h} className="text-xs font-semibold text-ink-400 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <p className="text-sm text-ink-400 px-6 py-6">Loading…</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-ink-400 italic px-6 py-6">No work orders found.</p>
          ) : (
            filteredRows.map((row, i) => (
              <div
                key={row.id}
                onClick={() => navigate(`/work-orders/${row.id}`)}
                className={`grid grid-cols-[200px_1fr_160px_140px_160px] gap-4 px-6 py-4 items-center cursor-pointer hover:bg-surface-alt transition ${
                  i < filteredRows.length - 1 ? 'border-b border-border-subtle' : ''
                }`}
              >
                <p className="text-sm font-bold text-secondary">{row.wo_number}</p>
                <p className="text-sm text-ink-700">{row.description}</p>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide w-fit ${STATUS_PILL[row.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[row.status] ?? row.status.replace(/_/g,' ')}
                </span>
                <p className="text-sm text-ink-600">{row.committed_date ?? 'Not committed'}</p>
                <p className={`text-sm font-semibold ${DAYS_COLOR[row.days_color]}`}>{row.days_label}</p>
              </div>
            ))
          )}
        </div>

        {/* Revenue Summary */}
        <div className="bg-surface-card border border-border-subtle rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-primary mb-4">Revenue Summary — Chhabee Stream Only</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-ink-400 mb-1">Billed This Month</p>
              <p className="text-2xl font-bold text-primary">₹{fmtINR(revenue.billed_this_month)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-amber-600">₹{fmtINR(revenue.outstanding)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">Collected</p>
              <p className="text-2xl font-bold text-green-600">₹{fmtINR(revenue.collected)}</p>
            </div>
          </div>
        </div>

        {/* User Management & Directory */}
        <div className="bg-surface-card border border-border-subtle rounded-xl mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <div>
              <h2 className="text-base font-semibold text-primary">User Directory & Permissions</h2>
              <p className="text-xs text-ink-400 mt-0.5">Manage user designations, profiles, and portal credentials</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-secondary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all"
            >
              + Add User
            </button>
          </div>

          <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr_80px] gap-4 px-6 py-2.5 border-b border-border-subtle bg-surface-alt">
            {['Name', 'Email ID', 'Designation', 'Status'].map(h => (
              <p key={h} className="text-xs font-semibold text-ink-400 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {usersLoading ? (
            <p className="text-sm text-ink-400 px-6 py-6">Loading user directory…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-ink-400 italic px-6 py-6">No user profiles found.</p>
          ) : (
            users.map((usr: any, i) => (
              <div
                key={usr.user_id}
                className={`grid grid-cols-[1.5fr_1.5fr_1.2fr_80px] gap-4 px-6 py-4 items-center ${
                  i < users.length - 1 ? 'border-b border-border-subtle' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{usr.full_name}</p>
                </div>
                <p className="text-sm text-ink-600 truncate">{usr.email}</p>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-primary/10 text-primary">
                    {usr.designation}
                  </span>
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${usr.is_active !== false ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {usr.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-ink-400 flex items-start gap-1.5">
          <span className="flex-shrink-0 mt-0.5">ℹ</span>
          <span>No costs, margins, B2B/D2C data, payroll, or inventory information is visible in this view.</span>
        </p>

        {/* Modal: Add User */}
        {showAddModal && (
          <div className="fixed inset-0 bg-primary/45 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl border border-border-strong w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between bg-surface-alt">
                <div>
                  <h3 className="text-base font-bold text-ink-900">Add New User</h3>
                  <p className="text-xs text-ink-400 mt-0.5">Assign directory credentials and workspace access</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-ink-400 hover:text-ink-600 transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-ink-700 uppercase tracking-wider block mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Anand Kumar"
                    className="w-full h-10 px-3 border border-border-strong rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ink-700 uppercase tracking-wider block mb-1">
                    Email Address / User ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="e.g. anand@canva.com"
                    className="w-full h-10 px-3 border border-border-strong rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ink-700 uppercase tracking-wider block mb-1">
                    Designation / Access Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full h-10 px-3 border border-border-strong rounded-xl text-sm bg-white focus:outline-none focus:border-secondary cursor-pointer"
                  >
                    <option value="Factory Manager">Factory Manager</option>
                    <option value="Factory Supervisor">Factory Supervisor</option>
                    <option value="Site Manager">Site Manager</option>
                    <option value="Lead Carpenter">Lead Carpenter</option>
                    <option value="Senior Finisher">Senior Finisher</option>
                    <option value="Junior Woodworker">Junior Woodworker</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ink-700 uppercase tracking-wider block mb-1">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3 border border-border-strong rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="h-10 px-4 border border-border-strong text-ink-600 text-xs font-semibold rounded-xl hover:bg-surface-alt transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-5 bg-secondary text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-all"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
