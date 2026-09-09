import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

/* ── Types ──────────────────────────────────────────────────────────── */
interface ActiveWO {
  id: string;
  wo_number: string;
  title: string;
  client_name?: string;
}

interface PresentCarpenter {
  id: string;
  full_name: string;
  is_present: boolean;
  active_jobs: number;
}

const STAGES = ['Cutting', 'Edge Banding', 'Assembly', 'Finishing', 'Hardware', 'QC'];

const STAGE_TASK_SUGGESTIONS: Record<string, string> = {
  'Cutting':      'Cut components',
  'Edge Banding': 'Apply edge banding',
  'Assembly':     'Assemble base frame',
  'Finishing':    'Apply finishing coat',
  'Hardware':     'Install hardware',
  'QC':           'Quality check',
};

/* ── Priority Radio ─────────────────────────────────────────────────── */
function PriorityOption({
  value, label, selected, onChange,
}: { value: string; label: string; selected: boolean; onChange: () => void }) {
  return (
    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
      selected ? 'border-secondary bg-gold-light/40' : 'border-border-subtle hover:border-border-strong'
    }`}>
      <input type="radio" name="priority" value={value} checked={selected} onChange={onChange} className="sr-only" />
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
        selected ? 'border-secondary' : 'border-ink-300'
      }`}>
        {selected && <span className="w-2 h-2 rounded-full bg-secondary block" />}
      </span>
      <span className={`text-[13px] font-medium ${selected ? 'text-ink-900' : 'text-ink-700'}`}>{label}</span>
    </label>
  );
}

/* ── Carpenter Card ─────────────────────────────────────────────────── */
function CarpenterCard({
  c, selected, isLead, onToggle,
}: {
  c: PresentCarpenter;
  selected: boolean;
  isLead: boolean;
  onToggle: () => void;
}) {
  const unavailable = !c.is_present;
  const full = c.active_jobs >= 2;

  return (
    <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
      unavailable
        ? 'border-border-subtle bg-surface-alt opacity-60 cursor-not-allowed'
        : selected
        ? 'border-secondary bg-gold-light/40'
        : 'border-border-subtle hover:border-border-strong'
    }`}>
      <input
        type="checkbox"
        checked={selected}
        disabled={unavailable}
        onChange={onToggle}
        className="sr-only"
      />
      {/* Custom checkbox */}
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
        selected ? 'border-secondary bg-secondary' : 'border-ink-300'
      }`}>
        {selected && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-ink-900">{c.full_name}</p>
          {isLead && (
            <span className="px-1.5 py-0.5 bg-secondary text-white text-[9px] font-bold rounded uppercase tracking-wider">
              Lead
            </span>
          )}
        </div>
        <p className="text-[11px] text-ink-500 mt-0.5">
          {unavailable
            ? 'Not available'
            : c.active_jobs === 0
            ? 'Available'
            : full
            ? `${c.active_jobs} active job — full`
            : `${c.active_jobs} active job`}
        </p>
      </div>
    </label>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function JobCardCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedWoId = searchParams.get('wo_id') || '';

  // Form state
  const [woId, setWoId]             = useState(preselectedWoId);
  const [stage, setStage]           = useState('Assembly');
  const [date, setDate]             = useState(() => new Date().toISOString().slice(0, 10));
  const [taskTitle, setTaskTitle]   = useState(STAGE_TASK_SUGGESTIONS['Assembly'] || '');
  const [taskDesc, setTaskDesc]     = useState('');
  const [selectedCarpenters, setSelectedCarpenters] = useState<string[]>([]);
  const [quantity, setQuantity]     = useState(10);
  const [estHours, setEstHours]     = useState(45);
  const [hoursMode, setHoursMode]   = useState<'per_unit' | 'total'>('total');
  const [priority, setPriority]     = useState('high');
  const [notes, setNotes]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [activeWOs, setActiveWOs]         = useState<ActiveWO[]>([]);
  const [carpenters, setCarpenters]       = useState<PresentCarpenter[]>([]);

  // Today label
  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const isToday  = date === new Date().toISOString().slice(0, 10);
  const dateDisplayValue = isToday ? `${todayStr.replace(/ /g, '-')} (Today)` : date;

  useEffect(() => {
    fetch('/api/work-orders?status=in_production,material_ready')
      .then(r => r.json())
      .then(d => setActiveWOs(d.work_orders || d || []))
      .catch(console.error);

    fetch('/api/carpenters/present')
      .then(r => r.json())
      .then(d => setCarpenters(d.carpenters || d || []))
      .catch(console.error);
  }, []);

  const handleStageChange = (s: string) => {
    setStage(s);
    setTaskTitle(STAGE_TASK_SUGGESTIONS[s] || '');
  };

  const toggleCarpenter = (cid: string) => {
    setSelectedCarpenters(prev =>
      prev.includes(cid) ? prev.filter(id => id !== cid) : [...prev, cid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woId || selectedCarpenters.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/job-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wo_id: woId,
          stage,
          date,
          task_title: taskTitle,
          task_description: taskDesc,
          carpenter_ids: selectedCarpenters,
          lead_carpenter_id: selectedCarpenters[0] || null,
          quantity,
          estimated_hours: estHours,
          hours_mode: hoursMode,
          priority,
          supervisor_notes: notes,
        }),
      });
      if (res.ok) {
        navigate('/production');
      } else {
        alert('Failed to create job card.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] flex-1 pb-24">

        {/* ── Back nav ──────────────────────────────────────────────── */}
        <div className="px-8 pt-6">
          <button
            onClick={() => navigate('/production')}
            className="flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900 transition-colors mb-5"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Production Floor
          </button>

          {/* ── Page title ──────────────────────────────────────────── */}
          <h1 className="text-[26px] font-bold text-ink-900 leading-tight">Create Job Card</h1>
          <p className="text-[13px] text-ink-500 mt-1 mb-7">
            Assign today's task to one or more carpenters — typically done every morning by 9 AM.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 space-y-4">

          {/* ── Section 1: Work Order & Stage ─────────────────────── */}
          <div className="bg-white border border-border-subtle rounded-xl p-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-5">Work Order &amp; Stage</h2>

            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-ink-700 mb-1">
                Work Order <span className="text-status-cancelled">*</span>
              </label>
              <select
                required
                value={woId}
                onChange={e => setWoId(e.target.value)}
                className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none bg-white"
              >
                <option value="">Select a Work Order…</option>
                {activeWOs.map(wo => (
                  <option key={wo.id} value={wo.id}>
                    {wo.wo_number} — {wo.title}{wo.client_name ? ` (${wo.client_name})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-400 mt-1">
                Only shows WOs with status: in_production or material_ready
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-ink-700 mb-1">
                  Production Stage <span className="text-status-cancelled">*</span>
                </label>
                <select
                  required
                  value={stage}
                  onChange={e => handleStageChange(e.target.value)}
                  className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none bg-white"
                >
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-ink-700 mb-1">
                  Date <span className="text-status-cancelled">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none opacity-0 absolute inset-0"
                  />
                  <div className="w-full h-10 border border-border-subtle rounded-lg px-3 flex items-center text-[13px] text-ink-900 pointer-events-none">
                    {dateDisplayValue}
                  </div>
                </div>
                <p className="text-[11px] text-ink-400 mt-1">Can create for tomorrow in advance</p>
              </div>
            </div>
          </div>

          {/* ── Section 2: Task Details ────────────────────────────── */}
          <div className="bg-white border border-border-subtle rounded-xl p-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-5">Task Details</h2>

            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-ink-700 mb-1">
                Task Title <span className="text-status-cancelled">*</span>
              </label>
              <input
                required
                type="text"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
              />
              <p className="text-[11px] text-ink-400 mt-1">Auto-suggested based on stage — editable</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink-700 mb-1">Task Description</label>
              <textarea
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                rows={3}
                placeholder="Detailed instructions for carpenter"
                className="w-full border border-border-subtle rounded-lg px-3 py-2.5 text-[13px] focus:border-secondary outline-none resize-none"
              />
            </div>
          </div>

          {/* ── Section 3: Assign Carpenters ──────────────────────── */}
          <div className="bg-white border border-border-subtle rounded-xl p-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-1">Assign Carpenters</h2>
            <p className="text-[12px] text-ink-500 mb-4">Only carpenters marked present today are shown.</p>

            {carpenters.length === 0 ? (
              <p className="text-[13px] text-ink-400 italic">No carpenters available.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {carpenters.map((c) => (
                  <CarpenterCard
                    key={c.id}
                    c={c}
                    selected={selectedCarpenters.includes(c.id)}
                    isLead={selectedCarpenters[0] === c.id}
                    onToggle={() => toggleCarpenter(c.id)}
                  />
                ))}
              </div>
            )}

            {selectedCarpenters.length > 0 && (
              <p className="text-[11px] text-ink-500 mt-3">
                First selected carpenter is automatically the <span className="font-semibold text-secondary">Lead</span>.
              </p>
            )}
          </div>

          {/* ── Section 4: Quantity & Time ────────────────────────── */}
          <div className="bg-white border border-border-subtle rounded-xl p-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-5">Quantity &amp; Time</h2>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-ink-700 mb-1">
                  Quantity <span className="text-status-cancelled">*</span>
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
                />
                <p className="text-[11px] text-ink-400 mt-1">Number of units for this task</p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink-700 mb-1">
                  Estimated Hours <span className="text-status-cancelled">*</span>
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={estHours}
                  onChange={e => setEstHours(parseInt(e.target.value) || 1)}
                  className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
                />
                <p className="text-[11px] text-ink-400 mt-1">How long should this take?</p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink-700 mb-1">Per Unit / Total</label>
                <div className="flex h-10 border border-border-subtle rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setHoursMode('per_unit')}
                    className={`flex-1 text-[12px] font-semibold transition-colors ${
                      hoursMode === 'per_unit' ? 'bg-secondary text-white' : 'text-ink-500 hover:bg-surface-alt'
                    }`}
                  >
                    Per Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => setHoursMode('total')}
                    className={`flex-1 text-[12px] font-semibold transition-colors border-l border-border-subtle ${
                      hoursMode === 'total' ? 'bg-secondary text-white' : 'text-ink-500 hover:bg-surface-alt'
                    }`}
                  >
                    Total
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 5: Priority & Notes ───────────────────────── */}
          <div className="bg-white border border-border-subtle rounded-xl p-6">
            <h2 className="text-[15px] font-bold text-ink-900 mb-5">Priority &amp; Notes</h2>

            <div className="mb-5">
              <label className="block text-[12px] font-semibold text-ink-700 mb-2">Priority</label>
              <div className="flex gap-3 flex-wrap">
                {(['normal', 'high', 'critical'] as const).map(p => (
                  <PriorityOption
                    key={p}
                    value={p}
                    label={p.charAt(0).toUpperCase() + p.slice(1)}
                    selected={priority === p}
                    onChange={() => setPriority(p)}
                  />
                ))}
              </div>
              <p className="text-[11px] text-ink-400 mt-2">Default: inherited from WO priority (High)</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink-700 mb-1">Supervisor Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Visible to carpenter on Glide app"
                className="w-full border border-border-subtle rounded-lg px-3 py-2.5 text-[13px] focus:border-secondary outline-none resize-none"
              />
            </div>
          </div>
        </form>

        {/* ── Sticky footer ────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-[220px] right-0 bg-white border-t border-border-subtle px-8 py-4 flex items-center justify-between z-30">
          <p className="text-[12px] text-ink-400">Carpenter sees this immediately on the Glide app</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/production')}
              className="h-10 px-5 border border-border-strong text-[13px] font-semibold rounded-lg hover:bg-surface-alt transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="job-card-form"
              disabled={submitting || !woId || selectedCarpenters.length === 0}
              onClick={handleSubmit}
              className="h-10 px-5 bg-secondary text-white text-[13px] font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-40 flex items-center gap-2"
            >
              {submitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Create Job Card
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
