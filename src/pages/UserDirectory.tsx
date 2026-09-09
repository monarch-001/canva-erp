import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function UserDirectory() {
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Add User Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Factory Supervisor');
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
        setNewRole('Factory Supervisor');
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

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex">
      <Sidebar />
      <main className="flex-1 ml-[220px] px-8 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">User Directory & Permissions</h1>
            <p className="text-sm text-ink-400 mt-0.5">Manage user credentials and access designations within this factory</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors"
          >
            + Add User
          </button>
        </div>

        {/* Directory Table */}
        <div className="bg-white border border-[#D5CFC8] rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr_80px] gap-4 px-6 py-3 border-b border-[#D5CFC8] bg-[#F9F8F6]">
            {['Name', 'Email ID', 'Designation / Role', 'Status'].map(h => (
              <p key={h} className="text-xs font-bold text-ink-400 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {usersLoading ? (
            <p className="text-sm text-ink-400 px-6 py-8">Loading directory...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-ink-400 italic px-6 py-8">No user profiles registered.</p>
          ) : (
            users.map((usr: any, i) => (
              <div
                key={usr.user_id}
                className={`grid grid-cols-[1.5fr_1.5fr_1.2fr_80px] gap-4 px-6 py-4 items-center ${
                  i < users.length - 1 ? 'border-b border-[#D5CFC8]' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{usr.full_name}</p>
                </div>
                <p className="text-sm text-ink-600 truncate">{usr.email}</p>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-stone-100 text-stone-700 border border-stone-200">
                    {usr.designation}
                  </span>
                </div>
                <div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${usr.is_active !== false ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {usr.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

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
