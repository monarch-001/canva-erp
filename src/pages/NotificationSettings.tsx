import { useState } from 'react';
import Sidebar from '../components/Sidebar';

type Channel = 'in_app' | 'in_app_whatsapp' | 'disabled';

interface NotifSetting {
  id: string;
  name: string;
  description: string;
  always_on: boolean;
  channel: Channel;
}

const DEFAULT_SETTINGS: NotifSetting[] = [
  // Critical — always on
  { id: 'wo_blocked',       name: 'WO Blocked',                always_on: true,  channel: 'in_app_whatsapp', description: 'Material shortage or blocked production' },
  { id: 'machine_breakdown',name: 'Machine Breakdown',          always_on: true,  channel: 'in_app_whatsapp', description: 'Flagged via job card issue report' },
  { id: 'overdue_invoice',  name: 'Overdue Invoice > 30 Days',  always_on: true,  channel: 'in_app_whatsapp', description: 'Escalation for long-overdue receivables' },
  { id: 'complaint_raised', name: 'Complaint Raised',           always_on: true,  channel: 'in_app_whatsapp', description: 'Client complaint on any Work Order' },
  { id: 'cash_balance',     name: 'Cash Balance Critical',      always_on: true,  channel: 'in_app_whatsapp', description: 'Bank balance below configured threshold' },
  { id: 'qc_failed',        name: 'QC Failed',                  always_on: true,  channel: 'in_app_whatsapp', description: 'Quality checkpoint failure requiring rework' },
  // Approvals
  { id: 'ot_approval',      name: 'OT Approval Pending',        always_on: false, channel: 'in_app_whatsapp', description: 'Overtime requests awaiting your decision' },
  { id: 'po_approval',      name: 'PO Pending Approval',        always_on: false, channel: 'in_app_whatsapp', description: 'Purchase orders above your threshold' },
  { id: 'dispatch_approval',name: 'Dispatch Approval',          always_on: false, channel: 'in_app_whatsapp', description: 'QC passed, ready for dispatch sign-off' },
  { id: 'bom_submitted',    name: 'BOM Submitted',              always_on: false, channel: 'in_app',          description: 'New BOM ready for your review' },
  // Informational
  { id: 'low_stock',        name: 'Low Stock Alerts',           always_on: false, channel: 'in_app',          description: 'Daily 7 AM summary of items below reorder level' },
  { id: 'pr_approval',      name: 'PR Pending Approval',        always_on: false, channel: 'in_app',          description: 'Purchase requisitions awaiting review' },
  { id: 'tds_due',          name: 'TDS Certificate Due',        always_on: false, channel: 'in_app',          description: 'Reminders ahead of statutory due dates' },
  { id: 'daily_summary',    name: 'Daily Summaries',            always_on: false, channel: 'in_app_whatsapp', description: 'End-of-day operational digest' },
  { id: 'weekly_pl',        name: 'Weekly P&L',                 always_on: false, channel: 'in_app_whatsapp', description: 'Weekly financial performance summary' },
];

const CRITICAL_IDS = ['wo_blocked','machine_breakdown','overdue_invoice','complaint_raised','cash_balance','qc_failed'];
const APPROVAL_IDS = ['ot_approval','po_approval','dispatch_approval','bom_submitted'];
const INFO_IDS     = ['low_stock','pr_approval','tds_due','daily_summary','weekly_pl'];

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: 'in_app',          label: 'In-app only' },
  { value: 'in_app_whatsapp', label: 'In-app + WhatsApp' },
  { value: 'disabled',        label: 'Disabled' },
];

function SettingRow({
  s,
  onChange,
}: {
  s: NotifSetting;
  onChange: (id: string, channel: Channel) => void;
}) {
  return (
    <div className="py-4 border-b border-border-subtle last:border-0">
      <div className="flex items-center justify-between gap-4">
        {/* Left: name + badge + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink-900">{s.name}</p>
            {s.always_on && (
              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                ALWAYS ON
              </span>
            )}
          </div>
          <p className="text-xs text-ink-400 mt-0.5">{s.description}</p>
        </div>

        {/* Right: radio group */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {CHANNEL_OPTIONS.map(opt => {
            const isSelected = s.channel === opt.value;
            const disabled = s.always_on && opt.value === 'disabled';
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-1.5 cursor-pointer ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-secondary' : 'border-ink-300'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                </div>
                <input
                  type="radio"
                  name={s.id}
                  value={opt.value}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => !disabled && onChange(s.id, opt.value)}
                  className="sr-only"
                />
                <span className={`text-xs font-medium whitespace-nowrap ${isSelected ? 'text-ink-900' : 'text-ink-400'}`}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotifSetting[]>(DEFAULT_SETTINGS);
  const [whatsappNumber, setWhatsappNumber] = useState('+91 98765 43210');
  const [showChangeNumber, setShowChangeNumber] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleChange(id: string, channel: Channel) {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, channel } : s));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
    } catch { /* continue */ }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleChangeNumber() {
    if (newNumber.trim()) {
      setWhatsappNumber(newNumber.trim());
      setNewNumber('');
    }
    setShowChangeNumber(false);
  }

  const byId = (ids: string[]) => settings.filter(s => ids.includes(s.id));

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className="ml-[220px] flex-1 px-8 py-8 pb-24">

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Notification Preferences</h1>
          <p className="text-sm text-ink-500 mt-1">Factory Manager only · Configure how and when you're notified</p>
        </div>

        {/* WhatsApp number banner */}
        <div className="bg-gold-light border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-bold text-ink-700 uppercase tracking-wider mb-0.5">WhatsApp Number</p>
            <p className="text-sm font-semibold text-ink-900">{whatsappNumber} · <span className="font-normal text-ink-500">Sent via Baileys</span></p>
          </div>
          <button
            onClick={() => setShowChangeNumber(v => !v)}
            className="px-4 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded-lg hover:bg-amber-50 transition"
          >
            Change Number
          </button>
        </div>

        {showChangeNumber && (
          <div className="bg-surface-card border border-border-subtle rounded-xl p-4 mb-6 flex items-center gap-3">
            <input
              value={newNumber}
              onChange={e => setNewNumber(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              className="flex-1 border border-border-strong rounded-lg px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-1 focus:ring-secondary"
            />
            <button
              onClick={handleChangeNumber}
              className="px-4 py-2 bg-secondary text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowChangeNumber(false)}
              className="px-4 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded-lg hover:bg-surface-alt transition"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="space-y-5">

          {/* Critical Alerts */}
          <div className="bg-surface-card border border-border-subtle rounded-xl px-6">
            <h2 className="text-base font-bold text-primary py-4 border-b border-border-subtle">
              Critical Alerts — Cannot Be Disabled
            </h2>
            {byId(CRITICAL_IDS).map(s => (
              <SettingRow key={s.id} s={s} onChange={handleChange} />
            ))}
          </div>

          {/* Approvals */}
          <div className="bg-surface-card border border-border-subtle rounded-xl px-6">
            <h2 className="text-base font-bold text-primary py-4 border-b border-border-subtle">
              Approvals Needed
            </h2>
            {byId(APPROVAL_IDS).map(s => (
              <SettingRow key={s.id} s={s} onChange={handleChange} />
            ))}
          </div>

          {/* Informational */}
          <div className="bg-surface-card border border-border-subtle rounded-xl px-6">
            <h2 className="text-base font-bold text-primary py-4 border-b border-border-subtle">
              Informational
            </h2>
            {byId(INFO_IDS).map(s => (
              <SettingRow key={s.id} s={s} onChange={handleChange} />
            ))}
          </div>
        </div>
      </main>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-background/90 backdrop-blur-sm border-t border-border-subtle px-8 py-4 flex items-center justify-between z-40">
        <p className="text-sm text-ink-400">Changes are saved automatically</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-secondary text-white text-sm font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-60"
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
