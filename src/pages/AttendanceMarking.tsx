import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface EmployeeAttendance {
  employee_id: string;
  full_name: string;
  email: string;
  designation: string;
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday' | 'weekly_off';
  check_in_time: string;
  check_out_time: string;
  ot_hours: number;
  notes: string;
}

export default function AttendanceMarking() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(false);

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/attendance?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setRoster(data);
        setPendingChanges(false);
      }
    } catch (error) {
      console.error('Failed to fetch attendance roster:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [date]);

  const handleStatusChange = (employeeId: string, newStatus: EmployeeAttendance['status']) => {
    setRoster(prev =>
      prev.map(emp => {
        if (emp.employee_id === employeeId) {
          // Reset check-in times if marked absent or on leave
          const isAbsentOrLeave = newStatus === 'absent' || newStatus === 'on_leave';
          return {
            ...emp,
            status: newStatus,
            check_in_time: isAbsentOrLeave ? '--' : emp.check_in_time === '--' ? '08:00:00' : emp.check_in_time,
            check_out_time: isAbsentOrLeave ? '--' : emp.check_out_time === '--' ? '17:30:00' : emp.check_out_time,
            ot_hours: isAbsentOrLeave ? 0 : emp.ot_hours
          };
        }
        return emp;
      })
    );
    setPendingChanges(true);
  };

  const handleInputChange = (employeeId: string, field: keyof EmployeeAttendance, value: any) => {
    setRoster(prev =>
      prev.map(emp => (emp.employee_id === employeeId ? { ...emp, [field]: value } : emp))
    );
    setPendingChanges(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, records: roster })
      });

      if (response.ok) {
        setPendingChanges(false);
        alert('Attendance updated successfully!');
      } else {
        alert('Failed to save attendance.');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = () => {
    setRoster(prev =>
      prev.map(emp => ({
        ...emp,
        status: 'present',
        check_in_time: emp.check_in_time === '--' ? '08:00:00' : emp.check_in_time,
        check_out_time: emp.check_out_time === '--' ? '17:30:00' : emp.check_out_time
      }))
    );
    setPendingChanges(true);
  };

  // Stats calculation
  const totalStaff = roster.length;
  const totalPresent = roster.filter(e => e.status === 'present').length;
  const totalAbsent = roster.filter(e => e.status === 'absent').length;
  const totalLeave = roster.filter(e => e.status === 'on_leave' || e.status === 'half_day').length;

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />

      <main className="ml-sidebar-width flex-1 min-h-screen flex flex-col bg-background overflow-x-hidden">
        <Header title="Daily Attendance" />

        <div className="flex-1 p-lg pb-32">
          <div className="max-w-container-max mx-auto space-y-lg">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  Attendance - <span className="text-secondary">{new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </h2>
                <p className="text-on-surface-variant font-body-md text-body-md">Daily manpower tracking for Plant Floor A1.</p>
              </div>
              
              <div className="flex items-center gap-md">
                <div className="flex items-center bg-white border border-border-subtle rounded px-sm h-10 shadow-sm">
                  <span className="material-symbols-outlined text-on-surface-variant mr-2">calendar_today</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="border-none p-0 text-sm focus:ring-0 text-on-surface bg-transparent"
                  />
                </div>
                <button
                  onClick={handleMarkAllPresent}
                  className="bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md px-lg h-10 rounded shadow-sm hover:brightness-95 transition-all flex items-center gap-sm font-bold"
                >
                  <span className="material-symbols-outlined text-[18px]">done_all</span> Mark All Present
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
              <div className="bg-surface-card border border-border-subtle p-md rounded flex items-center gap-md">
                <div className="w-12 h-12 bg-surface-container-low flex items-center justify-center rounded">
                  <span className="material-symbols-outlined text-primary">groups</span>
                </div>
                <div>
                  <p className="text-label-md font-label-md text-on-surface-variant opacity-70 uppercase tracking-wider">Total Staff</p>
                  <p className="text-headline-md font-headline-md text-on-surface">{totalStaff}</p>
                </div>
              </div>
              
              <div className="bg-surface-card border border-border-subtle p-md rounded flex items-center gap-md">
                <div className="w-12 h-12 bg-status-success/10 flex items-center justify-center rounded">
                  <span className="material-symbols-outlined text-status-success">check_circle</span>
                </div>
                <div>
                  <p className="text-label-md font-label-md text-on-surface-variant opacity-70 uppercase tracking-wider">Total Present</p>
                  <p className="text-headline-md font-headline-md text-status-success">{totalPresent}</p>
                </div>
              </div>

              <div className="bg-surface-card border border-border-subtle p-md rounded flex items-center gap-md">
                <div className="w-12 h-12 bg-status-error/10 flex items-center justify-center rounded">
                  <span className="material-symbols-outlined text-status-error">cancel</span>
                </div>
                <div>
                  <p className="text-label-md font-label-md text-on-surface-variant opacity-70 uppercase tracking-wider">Absent</p>
                  <p className="text-headline-md font-headline-md text-status-error">{totalAbsent}</p>
                </div>
              </div>

              <div className="bg-surface-card border border-border-subtle p-md rounded flex items-center gap-md">
                <div className="w-12 h-12 bg-status-pending/10 flex items-center justify-center rounded">
                  <span className="material-symbols-outlined text-status-pending">event_busy</span>
                </div>
                <div>
                  <p className="text-label-md font-label-md text-on-surface-variant opacity-70 uppercase tracking-wider">On Leave / Half</p>
                  <p className="text-headline-md font-headline-md text-status-pending">{totalLeave}</p>
                </div>
              </div>
            </div>

            {/* Main Data Table */}
            <div className="bg-surface-card border border-border-subtle rounded-sm flex flex-col overflow-hidden shadow-sm">
              <div className="p-md border-b border-border-subtle flex items-center justify-between bg-surface-container-lowest">
                <div className="flex items-center gap-lg">
                  <h3 className="font-title-md text-title-md text-on-surface font-bold">Staff Roster</h3>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low sticky top-0 z-20">
                      <tr>
                        <th className="px-md py-sm border-b border-border-subtle font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Name</th>
                        <th className="px-md py-sm border-b border-border-subtle font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Employee ID</th>
                        <th className="px-md py-sm border-b border-border-subtle font-label-md text-label-md text-on-surface-variant uppercase tracking-wider w-[320px]">Status</th>
                        <th className="px-md py-sm border-b border-border-subtle font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Check-In</th>
                        <th className="px-md py-sm border-b border-border-subtle font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Check-Out</th>
                        <th className="px-md py-sm border-b border-border-subtle font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">OT Hours</th>
                        <th className="px-md py-sm border-b border-border-subtle font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle bg-white">
                      {roster.map((emp) => (
                        <tr key={emp.employee_id} className="hover:bg-surface-container-low/30 transition-colors">
                          <td className="px-md py-md">
                            <div className="flex items-center gap-sm">
                              <div className="w-8 h-8 rounded bg-primary-fixed flex items-center justify-center font-bold text-xs text-primary">
                                {emp.full_name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-title-md text-title-md text-on-surface font-semibold leading-tight">{emp.full_name}</p>
                                <p className="text-[11px] text-on-surface-variant/70 uppercase font-bold tracking-tighter">{emp.designation || 'Worker'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-md py-md font-body-md text-body-md text-on-surface-variant">
                            {emp.employee_id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-md py-md">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(emp.employee_id, 'present')}
                                className={`h-8 px-2 rounded border text-xs font-bold flex-1 ${
                                  emp.status === 'present'
                                    ? 'bg-status-success border-status-success text-white'
                                    : 'border-border-subtle text-on-surface-variant hover:bg-status-success/10'
                                }`}
                              >
                                PRESENT
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(emp.employee_id, 'absent')}
                                className={`h-8 px-2 rounded border text-xs font-bold flex-1 ${
                                  emp.status === 'absent'
                                    ? 'bg-status-error border-status-error text-white'
                                    : 'border-border-subtle text-on-surface-variant hover:bg-status-error/10'
                                }`}
                              >
                                ABSENT
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(emp.employee_id, 'half_day')}
                                className={`h-8 px-2 rounded border text-xs font-bold flex-1 ${
                                  emp.status === 'half_day'
                                    ? 'bg-status-pending border-status-pending text-black'
                                    : 'border-border-subtle text-on-surface-variant hover:bg-status-pending/10'
                                }`}
                              >
                                HALF
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(emp.employee_id, 'on_leave')}
                                className={`h-8 px-2 rounded border text-xs font-bold flex-1 ${
                                  emp.status === 'on_leave'
                                    ? 'bg-status-material border-status-material text-white'
                                    : 'border-border-subtle text-on-surface-variant hover:bg-status-material/10'
                                }`}
                              >
                                LEAVE
                              </button>
                            </div>
                          </td>
                          <td className="px-md py-md">
                            <input
                              disabled={emp.status === 'absent' || emp.status === 'on_leave'}
                              value={emp.check_in_time}
                              onChange={(e) => handleInputChange(emp.employee_id, 'check_in_time', e.target.value)}
                              className="h-8 w-24 border-border-subtle rounded text-sm bg-transparent focus:ring-1 focus:ring-secondary disabled:opacity-50"
                              type="text"
                            />
                          </td>
                          <td className="px-md py-md">
                            <input
                              disabled={emp.status === 'absent' || emp.status === 'on_leave'}
                              value={emp.check_out_time}
                              onChange={(e) => handleInputChange(emp.employee_id, 'check_out_time', e.target.value)}
                              className="h-8 w-24 border-border-subtle rounded text-sm bg-transparent focus:ring-1 focus:ring-secondary disabled:opacity-50"
                              type="text"
                            />
                          </td>
                          <td className="px-md py-md">
                            <input
                              disabled={emp.status === 'absent' || emp.status === 'on_leave'}
                              value={emp.ot_hours}
                              onChange={(e) => handleInputChange(emp.employee_id, 'ot_hours', parseFloat(e.target.value) || 0)}
                              className="h-8 w-16 border-border-subtle rounded text-sm bg-transparent text-center focus:ring-1 focus:ring-secondary disabled:opacity-50"
                              type="number"
                              step="0.5"
                            />
                          </td>
                          <td className="px-md py-md">
                            <input
                              value={emp.notes}
                              onChange={(e) => handleInputChange(emp.employee_id, 'notes', e.target.value)}
                              className="h-8 w-full min-w-[120px] border-none border-b border-transparent hover:border-border-subtle bg-transparent focus:border-secondary focus:ring-0 text-sm"
                              placeholder="Add note..."
                              type="text"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Bottom Save Bar */}
        {pendingChanges && (
          <div className="fixed bottom-lg left-1/2 -translate-x-1/2 bg-primary text-on-primary px-xl py-md rounded-full shadow-2xl flex items-center gap-xl z-50 animate-pulse hover:animate-none">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Changes Pending</span>
              <span className="text-label-md font-label-md">{roster.length} staff updates ready</span>
            </div>
            <div className="flex gap-md">
              <button
                type="button"
                onClick={fetchRoster}
                className="text-label-md font-label-md text-white/70 hover:text-white px-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md px-lg py-sm rounded-full font-bold shadow-md hover:brightness-105 active:scale-95 transition-all"
              >
                {saving ? 'SUBMITTING...' : 'SUBMIT DAILY ATTENDANCE'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
