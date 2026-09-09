import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EodUpdateModal from '../components/EodUpdateModal';

interface Carpenter {
  id: string;
  name: string;
  is_lead: boolean;
  present: boolean;
}

interface EodUpdate {
  id: string;
  date: string;
  carpenter_id: string;
  carpenter_name: string;
  units_completed: number;
  hours_worked: number;
  notes: string;
  material_shortage: boolean;
}

interface StatusEvent {
  status: string;
  time: string | null;
}

interface QcFailure {
  checkpoint_name: string;
  failed_by: string;
  failed_at: string;
  checkpoint_ref: string;
  qc_record_url?: string;
}

interface JobCard {
  id: string;
  jc_number: string;
  wo_id: string;
  wo_number: string;
  wo_title: string;
  stage: string;
  task_title: string;
  description: string;
  date: string;
  shift: string;
  quantity: number;
  estimated_hours: number;
  actual_hours: number;
  units_completed: number;
  status: string;
  priority: string;
  supervisor_notes: string;
  is_rework: boolean;
  rework_reason?: string;
  original_jc_number?: string;
  qc_failure?: QcFailure;
  carpenters: Carpenter[];
  eod_updates: EodUpdate[];
  status_timeline: StatusEvent[];
}

const MOCK_NORMAL: JobCard = {
  id: '1',
  jc_number: 'JC-230826-001',
  wo_id: 'wo-1',
  wo_number: 'WO-CHH-26-001',
  wo_title: 'Reception Counter',
  stage: 'Assembly',
  task_title: 'Assemble base frame',
  description: 'Assemble base frame per drawing v2.0. Ensure all joints are glued and clamped before proceeding to lamination.',
  date: '2026-08-10',
  shift: 'Day Shift',
  quantity: 3,
  estimated_hours: 45,
  actual_hours: 18,
  units_completed: 2,
  status: 'in_progress',
  priority: 'high',
  supervisor_notes: '',
  is_rework: false,
  carpenters: [
    { id: 'c1', name: 'Ramesh Kumar', is_lead: true, present: true },
    { id: 'c2', name: 'Suresh Yadav', is_lead: false, present: true },
  ],
  eod_updates: [
    { id: 'e1', date: '2026-08-09', carpenter_id: 'c1', carpenter_name: 'Ramesh Kumar', units_completed: 2, hours_worked: 9, notes: 'Frame assembly on track, no issues', material_shortage: false },
    { id: 'e2', date: '2026-08-08', carpenter_id: 'c2', carpenter_name: 'Suresh Yadav', units_completed: 0, hours_worked: 6, notes: 'Material shortage — hinges pending', material_shortage: true },
  ],
  status_timeline: [
    { status: 'Assigned', time: '08:45 AM' },
    { status: 'In Progress', time: '09:15 AM' },
    { status: 'Completed', time: null },
  ],
};

const MOCK_REWORK: JobCard = {
  id: '14',
  jc_number: 'JC-230826-014',
  wo_id: 'wo-1',
  wo_number: 'WO-CHH-26-001',
  wo_title: 'Reception Counter',
  stage: 'Rework',
  task_title: 'Edge Banding — Reception Counter',
  description: 'QC Failed: Edge banding gap exceeds 0.5mm tolerance on 2 of 10 units. Fix required: Re-apply edge banding to affected panels and re-glue corners before resubmitting for QC.',
  date: '2026-08-10',
  shift: 'Day Shift',
  quantity: 2,
  estimated_hours: 4,
  actual_hours: 0,
  units_completed: 0,
  status: 'assigned',
  priority: 'high',
  supervisor_notes: '',
  is_rework: true,
  rework_reason: 'QC failed — edge banding gap exceeds 0.5mm tolerance',
  original_jc_number: 'JC-230826-002',
  qc_failure: {
    checkpoint_name: 'Edge Finish Inspection',
    failed_by: 'Ramesh Yadav (Supervisor)',
    failed_at: '09-Aug-2026, 5:40 PM',
    checkpoint_ref: 'QC-230826-007',
    qc_record_url: '/quality-control/QC-230826-007',
  },
  carpenters: [
    { id: 'c1', name: 'Ramesh Kumar', is_lead: true, present: true },
  ],
  eod_updates: [],
  status_timeline: [
    { status: 'Assigned', time: '10:00 AM' },
    { status: 'In Progress', time: null },
    { status: 'Completed', time: null },
  ],
};

function statusPillClass(status: string): string {
  switch (status) {
    case 'in_progress': return 'bg-blue-100 text-blue-700';
    case 'assigned': return 'bg-gray-100 text-gray-600';
    case 'completed': return 'bg-green-100 text-green-700';
    case 'paused': return 'bg-amber-100 text-amber-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function prettyStatus(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(d: string): string {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

export default function JobCardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [jc, setJc] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEodModal, setShowEodModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/job-cards/${id}`);
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        setJc(data);
      } catch {
        // Use rework mock for id='14', normal mock otherwise
        setJc(id === '14' ? MOCK_REWORK : MOCK_NORMAL);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleMarkComplete() {
    if (!jc) return;
    setActionLoading(true);
    try {
      await fetch(`/api/job-cards/${id}/complete`, { method: 'POST' });
    } catch { /* continue */ }
    setJc({ ...jc, status: 'completed' });
    setActionLoading(false);
  }

  async function handlePause() {
    if (!jc) return;
    setActionLoading(true);
    try {
      await fetch(`/api/job-cards/${id}/pause`, { method: 'POST' });
    } catch { /* continue */ }
    setJc({ ...jc, status: 'paused' });
    setActionLoading(false);
  }

  async function handleMarkInProgress() {
    if (!jc) return;
    setActionLoading(true);
    try {
      await fetch(`/api/job-cards/${id}/start`, { method: 'POST' });
    } catch { /* continue */ }
    setJc({ ...jc, status: 'in_progress' });
    setActionLoading(false);
  }

  async function handleCancel() {
    if (!jc) return;
    setActionLoading(true);
    try {
      await fetch(`/api/job-cards/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
    } catch { /* continue */ }
    setJc({ ...jc, status: 'cancelled' });
    setShowCancelModal(false);
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background ml-[220px] flex items-center justify-center">
        <p className="text-ink-500 text-sm">Loading job card…</p>
      </div>
    );
  }

  if (!jc) {
    return (
      <div className="min-h-screen bg-background ml-[220px] flex items-center justify-center">
        <p className="text-ink-500 text-sm">Job card not found.</p>
      </div>
    );
  }

  const progressPct = jc.quantity > 0 ? Math.round((jc.units_completed / jc.quantity) * 100) : 0;
  const isComplete = jc.status === 'completed';
  const isCancelled = jc.status === 'cancelled';
  const isAssigned = jc.status === 'assigned';

  return (
    <div className="min-h-screen bg-background ml-[220px]">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-4">

        {/* Back Nav */}
        <button
          onClick={() => navigate('/production')}
          className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-primary transition-colors"
        >
          <span>←</span>
          <span>Back to Production Floor</span>
        </button>

        {/* Header Card */}
        <div className={`bg-surface-card rounded-lg p-6 border ${jc.is_rework ? 'border-red-300' : 'border-border-subtle'}`}>

          {/* Rework Alert Banner */}
          {jc.is_rework && (
            <div className="bg-red-600 text-white rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="font-bold text-sm uppercase tracking-wide">REWORK JOB CARD</p>
                <p className="text-sm opacity-90 mt-0.5">Reason: {jc.rework_reason}</p>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            {/* Left: JC info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <span className="text-secondary font-bold text-xl tracking-wide">{jc.jc_number}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusPillClass(jc.status)}`}>
                  {prettyStatus(jc.status)}
                </span>
                {jc.is_rework && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-red-600 text-white">
                    REWORK
                  </span>
                )}
                {!jc.is_rework && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-violet-100 text-violet-700">
                    {jc.stage}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-primary mb-2">
                {jc.is_rework ? `REWORK: ${jc.task_title}` : jc.task_title}
              </h1>
              <p className="text-sm text-ink-500">
                Work Order: <span className="font-medium text-ink-700">{jc.wo_number} — {jc.wo_title}</span>
              </p>
              {jc.is_rework && jc.original_jc_number && (
                <p className="text-sm text-ink-500 mt-0.5">
                  Original Job Card: <span className="font-medium text-ink-700">{jc.original_jc_number}</span>
                  <span className="mx-2">·</span>
                  Date: <span className="font-medium text-ink-700">{formatDate(jc.date)}</span>
                </p>
              )}
              {!jc.is_rework && (
                <p className="text-sm text-ink-500 mt-0.5">
                  Date: <span className="font-medium text-ink-700">{formatDate(jc.date)}</span>
                  <span className="mx-2">·</span>
                  <span className="font-medium text-ink-700">{jc.shift}</span>
                </p>
              )}
            </div>

            {/* Right: Action buttons */}
            {!isCancelled && (
              <div className="flex flex-col gap-2 items-end flex-shrink-0">
                {jc.is_rework ? (
                  /* Rework card actions */
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMarkInProgress}
                      disabled={actionLoading || !isAssigned}
                      className="px-4 py-2 bg-secondary text-white text-sm font-semibold rounded hover:opacity-90 transition disabled:opacity-60"
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={() => setShowReassignModal(true)}
                      className="px-4 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded hover:bg-surface-alt transition"
                    >
                      Reassign Carpenter
                    </button>
                  </div>
                ) : (
                  /* Normal card actions */
                  <>
                    <div className="flex items-center gap-2">
                      {!isComplete && (
                        <button
                          onClick={handleMarkComplete}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-secondary text-white text-sm font-semibold rounded hover:opacity-90 transition disabled:opacity-60"
                        >
                          Mark Complete
                        </button>
                      )}
                      {!isComplete && (
                        <button
                          onClick={handlePause}
                          disabled={actionLoading}
                          className="px-4 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded hover:bg-surface-alt transition disabled:opacity-60"
                        >
                          Pause
                        </button>
                      )}
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="px-4 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded hover:bg-surface-alt transition"
                      >
                        Edit Job Card
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowReassignModal(true)}
                        className="px-4 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded hover:bg-surface-alt transition"
                      >
                        Reassign Carpenter
                      </button>
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 transition"
                      >
                        Cancel Job Card
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Task Details */}
        <div className="bg-surface-card border border-border-subtle rounded-lg p-6">
          <h2 className="text-base font-semibold text-primary mb-4">Task Details</h2>
          <div className="grid grid-cols-4 gap-6 mb-4">
            <div>
              <p className="text-xs text-ink-400 mb-1">Work Order</p>
              <p className="text-sm font-medium text-ink-700">{jc.wo_number}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">Stage</p>
              <p className="text-sm font-medium text-ink-700">{jc.stage}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">Quantity</p>
              <p className="text-sm font-medium text-ink-700">{jc.quantity} units</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">Estimated Hours</p>
              <p className="text-sm font-medium text-ink-700">{jc.estimated_hours} hours</p>
            </div>
          </div>
          {jc.description && (
            <>
              <hr className="border-border-subtle mb-4" />
              <div>
                <p className="text-xs text-ink-400 mb-1">Description</p>
                <p className="text-sm text-ink-700 leading-relaxed">{jc.description}</p>
              </div>
            </>
          )}
        </div>

        {/* QC Failure Detail — rework only */}
        {jc.is_rework && jc.qc_failure && (
          <div className="bg-surface-card border border-border-subtle rounded-lg p-6">
            <h2 className="text-base font-semibold text-primary mb-4">QC Failure Detail</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-4 space-y-1">
              <p className="text-sm font-bold text-red-700">
                QC Checkpoint Failed: {jc.qc_failure.checkpoint_name}
              </p>
              <p className="text-sm text-red-600">
                Failed by: {jc.qc_failure.failed_by} · {jc.qc_failure.failed_at}
              </p>
              <p className="text-sm text-red-600">
                Checkpoint reference: {jc.qc_failure.checkpoint_ref}
                {jc.qc_failure.qc_record_url && (
                  <span>
                    {' '}→{' '}
                    <a
                      href={jc.qc_failure.qc_record_url}
                      className="underline font-medium hover:opacity-80"
                    >
                      View full QC record
                    </a>
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Assigned Carpenters */}
        <div className="bg-surface-card border border-border-subtle rounded-lg p-6">
          <h2 className="text-base font-semibold text-primary mb-4">Assigned Carpenters</h2>
          <div className="space-y-3">
            {jc.carpenters.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                {c.is_lead && (
                  <span className="px-2 py-0.5 bg-secondary text-white text-xs font-bold rounded-full uppercase tracking-wide">
                    LEAD
                  </span>
                )}
                <span className="text-sm font-medium text-ink-700">{c.name}</span>
                <span
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: c.present ? '#16A34A' : '#DC2626' }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.present ? '#16A34A' : '#DC2626' }}
                  />
                  {c.present ? 'Present' : 'Absent'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-surface-card border border-border-subtle rounded-lg p-6">
          <h2 className="text-base font-semibold text-primary mb-4">Progress</h2>

          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-ink-700 font-medium">
              {jc.units_completed} / {jc.quantity} units complete
            </p>
            <p className="text-sm font-bold text-secondary">{progressPct}%</p>
          </div>
          <div className="w-full h-2.5 bg-border-subtle rounded-full mb-4">
            <div
              className="h-2.5 rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: '#B8892B' }}
            />
          </div>

          <p className="text-sm text-ink-500 mb-4">
            <span className="font-medium text-ink-700">Actual Hours</span>
            <span className="ml-2 text-ink-700">{jc.actual_hours} / {jc.estimated_hours} hours</span>
          </p>

          <hr className="border-border-subtle mb-4" />

          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">Status Timeline</p>
          <div className="space-y-3">
            {jc.status_timeline.map((ev, i) => {
              const active = ev.time !== null;
              const dotColor = active
                ? (i === 0 ? '#B8892B' : i === 1 ? '#2563EB' : '#16A34A')
                : '#D3CCBC';
              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className={`text-sm ${active ? 'font-medium text-ink-700' : 'text-ink-400'}`}>
                    {ev.status}
                  </span>
                  <span className={`text-sm ${active ? 'text-ink-500' : 'text-ink-400'}`}>
                    — {active ? ev.time : 'pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* EOD Updates */}
        <div className="bg-surface-card border border-border-subtle rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-primary">EOD Updates</h2>
            {!isComplete && !isCancelled && (
              <button
                onClick={() => setShowEodModal(true)}
                className="px-3 py-1.5 bg-secondary text-white text-xs font-semibold rounded hover:opacity-90 transition"
              >
                + Add EOD Update
              </button>
            )}
          </div>
          {jc.eod_updates.length === 0 ? (
            <p className="text-sm text-ink-400">No EOD updates yet.</p>
          ) : (
            <div className="space-y-3">
              {jc.eod_updates.map(update => (
                <div key={update.id} className="border border-border-subtle rounded-lg p-4">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-sm font-bold text-ink-700">{formatDate(update.date)}</span>
                    <span className="text-sm font-semibold text-secondary">{update.carpenter_name}</span>
                    <span className="text-sm text-ink-500">— {update.units_completed} units</span>
                  </div>
                  <p className="text-sm text-ink-500">
                    Hours: <span className="text-ink-700">{update.hours_worked} hrs</span>
                    <span className="mx-2">|</span>
                    Notes: <span className="text-ink-700">{update.notes}</span>
                  </p>
                  {update.material_shortage && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded text-xs font-medium text-amber-700">
                      <span>⚠</span>
                      <span>Material shortage flagged</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-primary mb-1">Cancel Job Card</h2>
            <p className="text-sm text-ink-500 mb-4">This action cannot be undone. Please provide a reason.</p>
            <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Reason</label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
              placeholder="e.g. Duplicate entry, work reassigned…"
              className="w-full border border-border-strong rounded px-3 py-2 text-sm text-ink-700 placeholder-ink-300 focus:outline-none focus:ring-1 focus:ring-secondary resize-none"
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded hover:bg-surface-alt transition"
              >
                Keep Job Card
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading || !cancelReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 transition disabled:opacity-50"
              >
                Cancel Job Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-primary mb-4">Reassign Carpenter</h2>
            <p className="text-sm text-ink-500 mb-4">Select a new lead carpenter for this job card.</p>
            <div className="space-y-2 mb-5">
              {jc.carpenters.map(c => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 border border-border-subtle rounded-lg hover:bg-surface-alt cursor-pointer"
                >
                  <div className="w-4 h-4 rounded-full border-2 border-secondary flex-shrink-0" />
                  <span className="text-sm font-medium text-ink-700">{c.name}</span>
                  {c.is_lead && (
                    <span className="ml-auto text-xs text-secondary font-semibold">Current Lead</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReassignModal(false)}
                className="flex-1 px-4 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded hover:bg-surface-alt transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowReassignModal(false)}
                className="flex-1 px-4 py-2 bg-secondary text-white text-sm font-semibold rounded hover:opacity-90 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-primary mb-4">Edit Job Card</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Task Title</label>
                <input
                  defaultValue={jc.task_title}
                  className="w-full border border-border-strong rounded px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  defaultValue={jc.description}
                  rows={3}
                  className="w-full border border-border-strong rounded px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-1 focus:ring-secondary resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Quantity</label>
                  <input
                    type="number"
                    defaultValue={jc.quantity}
                    className="w-full border border-border-strong rounded px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    defaultValue={jc.estimated_hours}
                    className="w-full border border-border-strong rounded px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded hover:bg-surface-alt transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-secondary text-white text-sm font-semibold rounded hover:opacity-90 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EOD Update Modal */}
      <EodUpdateModal
        open={showEodModal}
        onClose={() => setShowEodModal(false)}
        jcNumber={jc.jc_number}
        carpenterName={jc.carpenters.find(c => c.is_lead)?.name ?? ''}
        totalQuantity={jc.quantity}
        completedSoFar={jc.units_completed}
        onSubmit={async (data) => {
          try {
            await fetch(`/api/job-cards/${id}/eod-updates`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
          } catch { /* continue */ }
        }}
      />
    </div>
  );
}
