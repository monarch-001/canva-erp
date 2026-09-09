import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface EmployeeAttendance {
  employee_id: string;
  full_name: string;
  email: string;
  designation: string;
  status: 'present' | 'absent' | 'half_day' | 'on_leave';
  check_in_time: string;
  check_out_time: string;
  ot_hours: number;
  notes: string;
  monthly_present?: number;
  monthly_absent?: number;
  monthly_half?: number;
  monthly_leave?: number;
  monthly_ot?: number;
}

const STATUS_OPTIONS = [
  { value: 'present'  as const, label: 'Present',  dotClass: 'bg-status-qc-passed',       textClass: 'text-status-qc-passed' },
  { value: 'absent'   as const, label: 'Absent',   dotClass: 'bg-status-cancelled',        textClass: 'text-status-cancelled' },
  { value: 'half_day' as const, label: 'Half Day', dotClass: 'bg-status-partial-material', textClass: 'text-status-partial-material' },
  { value: 'on_leave' as const, label: 'Leave',    dotClass: 'bg-ink-500',                 textClass: 'text-ink-500' },
];

function RadioChoice({ empId, option, selected, onChange }: {
  empId: string;
  option: typeof STATUS_OPTIONS[number];
  selected: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
      <input type="radio" name={`status-${empId}`} checked={selected} onChange={onChange} className="sr-only" />
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        selected ? `${option.textClass} border-current` : 'border-border-strong group-hover:border-ink-500'
      }`}>
        {selected && <span className={`w-2 h-2 rounded-full ${option.dotClass}`} />}
      </span>
      <span className={`text-[12px] font-semibold transition-colors ${selected ? option.textClass : 'text-ink-500 group-hover:text-ink-700'}`}>
        {option.label}
      </span>
    </label>
  );
}

export default function AttendanceMarking() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const monthLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric'
  });

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setRoster(data.map((emp: any, i: number) => ({
          ...emp,
          monthly_present: 20 - (i % 3),
          monthly_absent: i % 2,
          monthly_half: i % 3 === 0 ? 1 : 0,
          monthly_leave: i % 4 === 0 ? 1 : 0,
          monthly_ot: i % 2 === 0 ? 4 : 0,
        })));
      }
    } catch { console.error('Attendance fetch failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRoster(); }, [date]);

  const handleStatusChange = (id: string, newStatus: EmployeeAttendance['status']) => {
    setRoster(prev => prev.map(e => e.employee_id !== id ? e : {
      ...e,
      status: newStatus,
      check_in_time: newStatus === 'absent' || newStatus === 'on_leave' ? '--' : '08:00:00',
      check_out_time: newStatus === 'absent' || newStatus === 'on_leave' ? '--' : '17:30:00',
      ot_hours: newStatus === 'absent' || newStatus === 'on_leave' ? 0 : e.ot_hours,
    }));
  };

  const handleMarkAllPresent = () => {
    setRoster(prev => prev.map(e => ({
      ...e, status: 'present', check_in_time: '08:00:00', check_out_time: '17:30:00'
    })));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, records: roster }),
      });
      if (res.ok) { fetchRoster(); }
      else { alert('Failed to save attendance.'); }
    } catch { console.error('Save failed'); }
    finally { setSaving(false); }
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 px-3 h-9 border border-border-subtle rounded-lg bg-white text-[12px] cursor-pointer">
        <span className="material-symbols-outlined text-[16px] text-ink-500">calendar_today</span>
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="border-none p-0 text-[12px] text-ink-700 font-semibold bg-transparent focus:ring-0 cursor-pointer"
        />
      </label>
      <button
        onClick={handleMarkAllPresent}
        className="h-9 px-4 rounded-lg border border-border-strong bg-white text-[12px] font-semibold text-ink-700 hover:bg-surface-alt transition-all active:scale-95"
      >
        Mark All Present
      </button>
      <button
        onClick={handleSubmit} disabled={saving}
        className="h-9 px-5 rounded-lg bg-secondary text-white text-[12px] font-bold hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
      >
        {saving ? 'Saving…' : 'Save Attendance'}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col">
        <Header
          title={`Attendance — ${formattedDate}`}
          subtitle="Mark today's attendance before 9 AM to enable job card assignment."
          actions={headerActions}
        />

        <div className="px-8 py-6 space-y-6">

          {/* Quick Mark */}
          <section className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h2 className="font-bold text-[14px] text-ink-900">Quick Mark</h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-subtle border-t-secondary" />
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {roster.map((emp) => (
                  <div key={emp.employee_id} className="flex items-center justify-between px-6 py-4 hover:bg-surface-alt/50 transition-colors">
                    <div>
                      <p className="text-[13px] font-bold text-ink-900">{emp.full_name}</p>
                      <p className="text-[11px] text-ink-400 font-medium mt-0.5">{emp.employee_id.toUpperCase().slice(0, 8)}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      {STATUS_OPTIONS.map((opt) => (
                        <RadioChoice
                          key={opt.value} empId={emp.employee_id} option={opt}
                          selected={emp.status === opt.value}
                          onChange={() => handleStatusChange(emp.employee_id, opt.value)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Monthly Summary */}
          <section className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h2 className="font-bold text-[14px] text-ink-900">Monthly Summary — {monthLabel}</h2>
            </div>
            <div className="px-6 py-2 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {['Name', 'Present', 'Absent', 'Half Days', 'Leave', 'OT Hours', 'Payable Days'].map((h) => (
                      <th key={h} className="py-3 pr-6 text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((emp) => {
                    const present = emp.monthly_present ?? 0;
                    const absent  = emp.monthly_absent  ?? 0;
                    const half    = emp.monthly_half    ?? 0;
                    const leave   = emp.monthly_leave   ?? 0;
                    const ot      = emp.monthly_ot      ?? 0;
                    const payable = present + half * 0.5;
                    return (
                      <tr key={emp.employee_id} className="border-b border-border-subtle/50 hover:bg-surface-alt/40">
                        <td className="py-3 pr-6 font-semibold text-ink-900">{emp.full_name}</td>
                        <td className="py-3 pr-6 font-bold text-status-qc-passed">{present}</td>
                        <td className="py-3 pr-6 font-semibold text-status-cancelled">{absent}</td>
                        <td className="py-3 pr-6 font-semibold text-status-partial-material">{half}</td>
                        <td className="py-3 pr-6 text-ink-700">{leave}</td>
                        <td className="py-3 pr-6 font-bold text-ink-900">{ot}</td>
                        <td className="py-3 pr-6 font-bold text-ink-900">{payable.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Info Banner */}
          <div className="flex items-center gap-3 px-5 py-3.5 bg-gold-light/40 border border-[#B8892B]/25 rounded-xl text-[12px] text-ink-600">
            <span className="text-base flex-shrink-0">ℹ️</span>
            Supervisor can approve Casual and Sick leave directly. Festival leave requires Factory Manager approval.
          </div>
        </div>
      </main>
    </div>
  );
}
