import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getCurrentUser } from '../utils/auth';
import WoProductionProgress from '../components/WoProductionProgress';
import RaiseCrModal from '../components/RaiseCrModal';

interface WorkOrder {
  id: string;
  wo_number: string;
  title: string;
  client_type: string;
  stream?: string;
  client_name: string;
  project_name: string;
  po_reference?: string;
  furniture_type: string;
  production_quantity: number;
  dimensions_l?: string;
  dimensions_h?: string;
  dimensions_d?: string;
  finish_type: string;
  finish_detail: string;
  delivery_terms: string;
  requested_delivery_date: string | null;
  committed_delivery_date: string | null;
  delivery_address: string;
  priority: string;
  status: string;
  special_notes?: string;
  cancellation_reason?: string;
  created_at: string;
  creator_name?: string;
  supervisor_name?: string;
  approver_name?: string;
}

interface HistoryItem {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  changer_name: string | null;
  changer_role?: string | null;
  reason: string | null;
  created_at: string;
}

interface Drawing {
  id: string;
  file_name: string;
  file_url: string;
  version: number;
  uploaded_by: string;
  uploader_name?: string;
  notes?: string;
  created_at: string;
}

// ── Helper: status badge colours ──────────────────────────────────────────────
function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    draft:                           'bg-slate-100 text-status-draft border border-slate-300',
    pending_review:                  'bg-blue-50 text-status-pending-review border border-blue-200',
    supervisor_approved:             'bg-indigo-50 text-status-supervisor-approved border border-indigo-200',
    approved_pending_bom:            'bg-violet-50 text-status-approved-pending-bom border border-violet-200',
    bom_approved:                    'bg-cyan-50 text-status-bom-approved border border-cyan-200',
    partial_material:                'bg-amber-50 text-status-partial-material border border-amber-200',
    material_ready:                  'bg-teal-50 text-status-material-ready border border-teal-200',
    in_production:                   'bg-orange-50 text-status-in-production border border-orange-200',
    production_complete:             'bg-lime-50 text-status-production-complete border border-lime-200',
    qc_pending:                      'bg-yellow-50 text-status-qc-pending border border-yellow-200',
    qc_passed:                       'bg-green-50 text-status-qc-passed border border-green-200',
    ready_for_dispatch:              'bg-sky-50 text-status-ready-for-dispatch border border-sky-200',
    in_transit:                      'bg-blue-50 text-status-in-transit border border-blue-200',
    delivered_pending_confirmation:  'bg-teal-50 text-status-delivered-pending-confirmation border border-teal-200',
    delivered_confirmed:             'bg-green-50 text-status-delivered-confirmed border border-green-200',
    invoice_raised:                  'bg-purple-50 text-status-invoice-raised border border-purple-200',
    financially_closed:              'bg-emerald-50 text-status-financially-closed border border-emerald-200',
    cancelled:                       'bg-red-50 text-status-cancelled border border-red-200',
  };
  return map[status] || 'bg-slate-100 text-ink-700 border border-slate-300';
}

function priorityBadgeClass(priority: string): string {
  if (priority === 'critical') return 'bg-red-50 text-status-cancelled border border-red-300';
  if (priority === 'high')     return 'bg-amber-50 text-amber-700 border border-amber-300';
  if (priority === 'medium')   return 'bg-yellow-50 text-yellow-700 border border-yellow-300';
  return 'bg-slate-100 text-ink-500 border border-slate-300';
}

// ── Status history helpers ─────────────────────────────────────────────────────
function prettyStatus(s: string | null): string {
  if (!s) return '';
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function statusCircleBg(status: string): string {
  const map: Record<string, string> = {
    draft:                           'bg-slate-500',
    pending_review:                  'bg-blue-500',
    supervisor_approved:             'bg-indigo-500',
    approved_pending_bom:            'bg-violet-500',
    bom_approved:                    'bg-cyan-600',
    partial_material:                'bg-amber-500',
    material_ready:                  'bg-teal-500',
    in_production:                   'bg-orange-500',
    production_complete:             'bg-lime-600',
    qc_pending:                      'bg-yellow-500',
    qc_passed:                       'bg-green-600',
    ready_for_dispatch:              'bg-sky-600',
    in_transit:                      'bg-blue-600',
    delivered_pending_confirmation:  'bg-teal-600',
    delivered_confirmed:             'bg-green-700',
    invoice_raised:                  'bg-purple-600',
    financially_closed:              'bg-emerald-600',
    cancelled:                       'bg-red-500',
  };
  return map[status] || 'bg-slate-500';
}

const ARROW_STATUSES = new Set(['draft', 'pending_review', 'partial_material', 'in_transit', 'delivered_pending_confirmation']);

// ── Sub-components ─────────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[13px] text-ink-900 font-semibold leading-snug">{value || '—'}</p>
    </div>
  );
}

function SectionDivider() {
  return <hr className="border-border-subtle my-0" />;
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-6 px-8">
      <h3 className="text-[15px] font-bold text-ink-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [activeTab, setActiveTab] = useState<'details' | 'status' | 'drawings' | 'bom' | 'change_requests'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);

  const [showRaiseCrModal, setShowRaiseCrModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonPreset, setCancelReasonPreset] = useState('');
  const [cancelDetails, setCancelDetails] = useState('');

  // Duplicate modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    client_name: '',
    project_name: '',
    po_reference: '',
    furniture_type: '',
    production_quantity: 1,
    dimensions_l: '',
    dimensions_h: '',
    dimensions_d: '',
    finish_type: '',
    finish_detail: '',
    delivery_terms: '',
    requested_delivery_date: '',
    delivery_address: '',
    priority: '',
    special_notes: '',
  });

  const openEditModal = () => {
    if (!workOrder) return;
    setEditForm({
      title: workOrder.title || '',
      client_name: workOrder.client_name || '',
      project_name: workOrder.project_name || '',
      po_reference: workOrder.po_reference || '',
      furniture_type: workOrder.furniture_type || '',
      production_quantity: workOrder.production_quantity || 1,
      dimensions_l: workOrder.dimensions_l || '',
      dimensions_h: workOrder.dimensions_h || '',
      dimensions_d: workOrder.dimensions_d || '',
      finish_type: workOrder.finish_type || '',
      finish_detail: workOrder.finish_detail || '',
      delivery_terms: workOrder.delivery_terms || '',
      requested_delivery_date: workOrder.requested_delivery_date
        ? workOrder.requested_delivery_date.slice(0, 10) : '',
      delivery_address: workOrder.delivery_address || '',
      priority: workOrder.priority || '',
      special_notes: workOrder.special_notes || '',
    });
    setShowEditModal(true);
  };
  const [showDateModal, setShowDateModal] = useState(false);
  const [newCommittedDate, setNewCommittedDate] = useState('');
  const [dateChangeReason, setDateChangeReason] = useState('');

  // Upload drawing state
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVersion, setUploadVersion] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadDragging, setUploadDragging] = useState(false);

  const fetchDetailData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/work-orders/${id}`);
      if (response.ok) {
        const data = await response.json();
        setWorkOrder(data.work_order || null);
        setHistory(data.history || []);
        setDrawings(data.drawings || []);
        setChangeRequests(data.change_requests || []);
      } else {
        setError('Work order not found.');
      }
    } catch (err) {
      console.error(err);
      // Use mock data for development
      setChangeRequests([
        {
          id: 'cr3', cr_number: 'CR-WO-CHH-26-001-03', tier: 3, title: 'Additional Item',
          description: 'Client requests an additional matching side table to be added to the reception area, coordinating with the existing counter finish.',
          status: 'pending', creator_name: 'Neha Kapoor', raised_on: '09-Aug-2026',
        },
        {
          id: 'cr2', cr_number: 'CR-WO-CHH-26-001-02', tier: 1, title: 'Finish / Material Change',
          description: 'Change laminate shade from Charcoal Grey to Graphite Black — same Merino product family.',
          status: 'implemented', creator_name: 'Neha Kapoor', raised_on: '05-Aug-2026',
        },
        {
          id: 'cr1', cr_number: 'CR-WO-CHH-26-001-01', tier: 2, title: 'Dimension Change',
          description: 'Increase counter length from 2400mm to 2750mm to fit revised site layout — exceeds 10% on length axis.',
          status: 'rejected', creator_name: 'Neha Kapoor', raised_on: '03-Aug-2026',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetailData(); }, [id]);

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const combined = cancelReasonPreset
      ? cancelDetails.trim() ? `${cancelReasonPreset} — ${cancelDetails.trim()}` : cancelReasonPreset
      : cancelReason.trim();
    if (!combined) return;
    try {
      const res = await fetch(`/api/work-orders/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: combined }),
      });
      if (res.ok) {
        setShowCancelModal(false);
        setCancelReason('');
        setCancelReasonPreset('');
        setCancelDetails('');
        fetchDetailData();
      } else alert('Failed to cancel order.');
    } catch (err) { console.error(err); }
  };

  const handleUpdateDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommittedDate) return;
    try {
      const res = await fetch(`/api/work-orders/${id}/committed-date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ committed_delivery_date: newCommittedDate, reason: dateChangeReason }),
      });
      if (res.ok) { setShowDateModal(false); setNewCommittedDate(''); setDateChangeReason(''); fetchDetailData(); }
      else alert('Failed to update committed delivery date.');
    } catch (err) { console.error(err); }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] flex-1 min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary" />
        </main>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] flex-1 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-status-cancelled font-bold mb-4">{error || 'Work Order not found'}</p>
            <button
              onClick={() => navigate('/work-orders')}
              className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-semibold"
            >
              Back to Work Orders
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Save edit handler ─────────────────────────────────────────────────────────
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) { setShowEditModal(false); fetchDetailData(); }
      else alert('Failed to save changes.');
    } catch (err) { console.error(err); }
  };

  // ── Duplicate handler ─────────────────────────────────────────────────────────
  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/work-orders/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const newId = data.work_order?.id || data.id;
        setShowDuplicateModal(false);
        if (newId) navigate(`/work-orders/${newId}`);
        else navigate('/work-orders');
      } else {
        alert('Duplication failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDuplicating(false);
    }
  };

  // ── Upload drawing handler ────────────────────────────────────────────────────
  const handleUploadDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    const form = new FormData();
    form.append('file', uploadFile);
    form.append('version', uploadVersion);
    form.append('notes', uploadNotes);
    try {
      const res = await fetch(`/api/work-orders/${id}/drawings`, { method: 'POST', body: form });
      if (res.ok) {
        setShowUploadPanel(false);
        setUploadFile(null);
        setUploadVersion('');
        setUploadNotes('');
        fetchDetailData();
      } else {
        alert('Upload failed.');
      }
    } catch (err) { console.error(err); }
  };

  // ── Days left helper ─────────────────────────────────────────────────────────
  const daysLeft = workOrder.committed_delivery_date
    ? Math.ceil((new Date(workOrder.committed_delivery_date).getTime() - Date.now()) / 86400000)
    : null;

  const daysLabel = daysLeft === null ? null
    : daysLeft < 0  ? `${Math.abs(daysLeft)}d overdue`
    : `${daysLeft}d left`;

  const daysColor = daysLeft === null ? ''
    : daysLeft < 0  ? 'bg-red-50 text-status-cancelled border-red-300'
    : daysLeft <= 3 ? 'bg-amber-50 text-amber-700 border-amber-300'
    : 'bg-gold-light text-secondary border-secondary/30';

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '—';

  const formatCreatedAt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const TABS = [
    { key: 'details',         label: 'Details' },
    { key: 'status',          label: 'Status History' },
    { key: 'drawings',        label: 'Drawings' },
    { key: 'change_requests', label: 'Change Requests' },
    { key: 'bom',             label: 'BOM' },
  ] as const;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] flex-1 min-h-screen">
        <div className="px-8 py-6 max-w-[1220px]">

          {/* ── Back Nav ─────────────────────────────────────────────────────── */}
          <button
            onClick={() => navigate('/work-orders')}
            className="flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900 transition-colors mb-5 no-print"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Work Orders
          </button>

          {/* ── WO Header Card ───────────────────────────────────────────────── */}
          <div className="bg-white border border-border-subtle rounded-xl mb-4 no-print">
            <div className="px-8 pt-6 pb-0">

              {/* Row 1: WO number + badges | action buttons */}
              <div className="flex items-start justify-between gap-4 mb-3">
                {/* Left: number + status + priority */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[17px] font-bold text-secondary tracking-wide">
                    {workOrder.wo_number}
                  </span>
                  <span className={`px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${statusBadgeClass(workOrder.status)}`}>
                    {workOrder.status.replace(/_/g, ' ')}
                  </span>
                  {workOrder.priority && workOrder.priority !== 'normal' && (
                    <span className={`px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${priorityBadgeClass(workOrder.priority)}`}>
                      ⚠ {workOrder.priority.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  {user.role === 'factory_manager' && (
                    <>
                      <button
                        onClick={openEditModal}
                        className="h-9 px-4 border border-border-strong text-[13px] font-semibold text-ink-700 rounded-lg hover:bg-surface-alt transition-colors"
                      >
                        Edit Details
                      </button>
                      <button
                        onClick={() => setShowDuplicateModal(true)}
                        className="h-9 px-4 border border-border-strong text-[13px] font-semibold text-ink-700 rounded-lg hover:bg-surface-alt transition-colors"
                      >
                        Duplicate WO
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => navigate(`/work-orders/${id}/print`)}
                    className="h-9 px-4 border border-border-strong text-[13px] font-semibold text-ink-700 rounded-lg hover:bg-surface-alt transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">print</span>
                    Print / Export
                  </button>
                  {workOrder.status !== 'cancelled' && user.role === 'factory_manager' && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="h-9 px-4 bg-status-cancelled text-white text-[13px] font-semibold rounded-lg hover:brightness-110 transition-all"
                    >
                      Cancel WO
                    </button>
                  )}
                </div>
              </div>

              {/* WO Title */}
              <h1 className="text-[22px] font-bold text-ink-900 mb-2 leading-tight">
                {workOrder.title}
              </h1>

              {/* Client / Furniture / Created */}
              <div className="space-y-0.5 mb-5">
                <p className="text-[13px] text-ink-700">
                  <span className="text-ink-500">Client: </span>
                  {workOrder.client_name}
                  {workOrder.project_name ? ` — ${workOrder.project_name}` : ''}
                </p>
                <p className="text-[13px] text-ink-700">
                  <span className="text-ink-500">Furniture: </span>
                  {workOrder.furniture_type || '—'} × {workOrder.production_quantity}
                </p>
                <p className="text-[13px] text-ink-700">
                  <span className="text-ink-500">Created by </span>
                  {workOrder.creator_name || 'System'}{' '}
                  <span className="text-ink-500">on </span>
                  {formatCreatedAt(workOrder.created_at)}
                </p>
              </div>

              {/* Tab bar (inside header card, at bottom) */}
              <div className="flex items-end border-t border-border-subtle -mx-8 px-8 gap-6">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative py-3 text-[13px] font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-ink-900 font-semibold'
                        : 'text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-secondary rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Tab: Details ─────────────────────────────────────────────────── */}
          {activeTab === 'details' && (
            <div className="bg-white border border-border-subtle rounded-xl overflow-hidden">

              {/* Client Information */}
              <SectionBlock title="Client Information">
                <div className="grid grid-cols-5 gap-6">
                  <Field label="Client Type"               value={workOrder.client_type ? (workOrder.client_type.charAt(0).toUpperCase() + workOrder.client_type.slice(1)) : undefined} />
                  <Field label="Stream"                    value={workOrder.stream} />
                  <Field label="Client Name"               value={workOrder.client_name} />
                  <Field label="Project / Site Name"       value={workOrder.project_name} />
                  <Field
                    label={workOrder.client_type === 'chhabee' ? 'Chhabee Project Reference' : 'Client PO Reference'}
                    value={workOrder.po_reference}
                  />
                </div>
              </SectionBlock>

              <SectionDivider />

              {/* Furniture Specification */}
              <SectionBlock title="Furniture Specification">
                <div className="grid grid-cols-3 gap-6 mb-5">
                  <Field label="Work Order Title" value={workOrder.title} />
                  <Field label="Furniture Type"   value={workOrder.furniture_type} />
                  <Field label="Quantity"          value={String(workOrder.production_quantity)} />
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <Field
                    label="Dimensions"
                    value={
                      (workOrder.dimensions_l || workOrder.dimensions_h || workOrder.dimensions_d)
                        ? `${workOrder.dimensions_l || '0'}mm × ${workOrder.dimensions_h || '0'}mm × ${workOrder.dimensions_d || '0'}mm`
                        : undefined
                    }
                  />
                  <Field label="Finish Type"   value={workOrder.finish_type} />
                  <Field label="Finish Detail" value={workOrder.finish_detail} />
                </div>
              </SectionBlock>

              <SectionDivider />

              {/* Delivery */}
              <SectionBlock title="Delivery">
                <div className="grid grid-cols-3 gap-6 mb-5">
                  <Field label="Delivery Terms"          value={workOrder.delivery_terms?.replace(/_/g, ' ')} />
                  <Field label="Requested Delivery Date" value={formatDate(workOrder.requested_delivery_date)} />
                  <div>
                    <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-0.5">Committed Delivery Date</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-ink-900 font-semibold">
                        {formatDate(workOrder.committed_delivery_date)}
                      </span>
                      {daysLabel && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${daysColor}`}>
                          {daysLabel}
                        </span>
                      )}
                      {(user.role === 'factory_manager' || user.role === 'supervisor') && (
                        <button
                          onClick={() => setShowDateModal(true)}
                          className="text-[12px] text-secondary font-semibold hover:underline ml-1"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <Field label="Delivery Address" value={workOrder.delivery_address} />
              </SectionBlock>

              <SectionDivider />

              {/* Priority & Notes */}
              <SectionBlock title="Priority &amp; Notes">
                <div className="mb-4">
                  <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-1.5">Priority</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-bold border ${priorityBadgeClass(workOrder.priority)}`}>
                    {(workOrder.priority === 'high' || workOrder.priority === 'critical') && '⚠ '}
                    {workOrder.priority.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-[13px] text-ink-700 leading-relaxed">
                    {workOrder.special_notes || <span className="text-ink-300 italic">No notes specified.</span>}
                  </p>
                </div>
                {workOrder.status === 'cancelled' && workOrder.cancellation_reason && (
                  <div className="mt-4 p-3 bg-red-50 border-l-4 border-status-cancelled rounded-r text-status-cancelled text-[13px]">
                    <span className="font-bold">Cancellation Reason: </span>{workOrder.cancellation_reason}
                  </div>
                )}
              </SectionBlock>

              <SectionDivider />

              {/* Assignment */}
              <SectionBlock title="Assignment">
                <div className="grid grid-cols-3 gap-6">
                  <Field
                    label="Created by"
                    value={
                      <>
                        {workOrder.creator_name || 'System'}
                        <span className="text-ink-400 font-normal"> · {formatCreatedAt(workOrder.created_at)}</span>
                      </>
                    }
                  />
                  <Field label="Assigned Supervisor" value={workOrder.supervisor_name} />
                  <Field label="Approved by"         value={workOrder.approver_name || 'Pending'} />
                </div>
              </SectionBlock>
            </div>
          )}

          {/* ── Production Progress (embedded below Details tab) ──────────────── */}
          {activeTab === 'details' && (
            <div className="mt-4">
              <p className="text-xs text-ink-400 uppercase tracking-wider font-semibold mb-2 px-1">Production Progress</p>
              <WoProductionProgress woId={workOrder.id} woNumber={workOrder.wo_number} />
            </div>
          )}

          {/* ── Tab: Status History ───────────────────────────────────────────── */}
          {activeTab === 'status' && (
            <div className="bg-white border border-border-subtle rounded-xl p-8">
              {history.length === 0 ? (
                <p className="text-ink-500 text-center py-10 italic text-[13px]">No status history records found.</p>
              ) : (
                <div className="max-w-2xl">
                  {history.map((item, idx) => {
                    const isArrow = ARROW_STATUSES.has(item.new_status);
                    const circleBg = statusCircleBg(item.new_status);
                    const dt = new Date(item.created_at);
                    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const changerLabel = item.changer_name
                      ? item.changer_role
                        ? `${item.changer_name} (${item.changer_role})`
                        : item.changer_name
                      : 'System';

                    return (
                      <div key={item.id} className="flex gap-5">
                        {/* Circle + line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 shrink-0 text-white ${circleBg}`}>
                            {isArrow ? (
                              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            ) : (
                              <span className="material-symbols-outlined text-[18px]">check</span>
                            )}
                          </div>
                          {idx !== history.length - 1 && (
                            <div className="w-px flex-1 bg-border-subtle my-1 min-h-[24px]" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="pb-7">
                          <p className="text-[14px] font-semibold text-ink-900 leading-snug">
                            {item.old_status
                              ? <>{prettyStatus(item.old_status)} <span className="text-ink-400 font-normal">→</span> {prettyStatus(item.new_status)}</>
                              : prettyStatus(item.new_status)
                            }
                          </p>
                          <p className="text-[12px] text-ink-500 mt-0.5">
                            {changerLabel} · {dateStr}, {timeStr}
                          </p>
                          {item.reason && (
                            <p className="text-[12px] text-ink-700 mt-1.5 italic">
                              "{item.reason}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Drawings ─────────────────────────────────────────────────── */}
          {activeTab === 'drawings' && (
            <div className="bg-white border border-border-subtle rounded-xl p-8">

              {/* Header row */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[15px] font-bold text-ink-900">Drawings &amp; References</h3>
                <button
                  onClick={() => setShowUploadPanel(v => !v)}
                  className="h-9 px-4 bg-secondary text-white text-[13px] font-semibold rounded-lg hover:brightness-110 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  Upload Drawing
                </button>
              </div>

              {/* Upload panel */}
              {showUploadPanel && (
                <form
                  onSubmit={handleUploadDrawing}
                  className="border border-border-subtle rounded-xl p-5 mb-6 bg-surface-alt"
                >
                  <p className="text-[13px] font-semibold text-ink-900 mb-3">Upload New Drawing</p>

                  {/* Drag & drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setUploadDragging(true); }}
                    onDragLeave={() => setUploadDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setUploadDragging(false);
                      const f = e.dataTransfer.files[0];
                      if (f) setUploadFile(f);
                    }}
                    onClick={() => document.getElementById('drawing-file-input')?.click()}
                    className={`border-2 border-dashed rounded-xl py-8 text-center cursor-pointer transition-colors mb-4 ${
                      uploadDragging ? 'border-secondary bg-gold-light/20' : 'border-border-strong hover:border-secondary/50'
                    }`}
                  >
                    <input
                      id="drawing-file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && setUploadFile(e.target.files[0])}
                    />
                    <span className="material-symbols-outlined text-[22px] text-ink-500 block mb-1">upload</span>
                    {uploadFile ? (
                      <p className="text-[13px] font-semibold text-ink-900">{uploadFile.name}</p>
                    ) : (
                      <>
                        <p className="text-[13px] text-ink-700">Drag &amp; drop file here, or click to browse</p>
                        <p className="text-[11px] text-ink-400 mt-0.5">Accepts .pdf, .jpg, .jpeg, .png, .dwg, .dxf · Max 50MB</p>
                      </>
                    )}
                  </div>

                  {/* Version + Notes row */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[11px] text-ink-500 uppercase tracking-wider mb-1">Version</label>
                      <input
                        type="text"
                        value={uploadVersion}
                        onChange={(e) => setUploadVersion(e.target.value)}
                        placeholder={`v${drawings.length > 0 ? (drawings[0].version + 0.1).toFixed(1) : '1.0'}  (auto-suggested)`}
                        className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-ink-500 uppercase tracking-wider mb-1">Notes (optional)</label>
                      <input
                        type="text"
                        value={uploadNotes}
                        onChange={(e) => setUploadNotes(e.target.value)}
                        placeholder="e.g. Updated after client revision"
                        className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none bg-white"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowUploadPanel(false); setUploadFile(null); setUploadVersion(''); setUploadNotes(''); }}
                      className="h-9 px-4 border border-border-strong text-[13px] font-semibold rounded-lg hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!uploadFile}
                      className="h-9 px-4 bg-secondary text-white text-[13px] font-semibold rounded-lg hover:brightness-110 disabled:opacity-40"
                    >
                      Upload
                    </button>
                  </div>
                </form>
              )}

              {/* Empty state */}
              {drawings.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border-strong rounded-xl">
                  <span className="material-symbols-outlined text-4xl text-ink-300 block mb-2">folder_open</span>
                  <p className="text-[13px] text-ink-500">No drawings attached to this work order yet.</p>
                </div>
              ) : (() => {
                const [current, ...prev] = drawings;
                const fileExt = (name: string) => name.split('.').pop()?.toUpperCase() || 'FILE';
                const extBg = (name: string) => {
                  const ext = name.split('.').pop()?.toLowerCase();
                  if (ext === 'pdf') return 'bg-red-100 text-red-600';
                  if (ext === 'dwg' || ext === 'dxf') return 'bg-slate-200 text-slate-600';
                  return 'bg-blue-100 text-blue-600';
                };
                const fmtDate = (d: string) =>
                  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                return (
                  <>
                    {/* Current version */}
                    <p className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-3">Current Version</p>
                    <div className="border border-secondary/30 bg-gold-light/30 rounded-xl p-4 flex items-center gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${extBg(current.file_name)}`}>
                        {fileExt(current.file_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-bold text-secondary">v{current.version}</span>
                          <span className="px-2 py-0.5 bg-secondary text-white text-[10px] font-bold rounded-full uppercase tracking-wide">Current</span>
                        </div>
                        <p className="text-[13px] font-semibold text-ink-900 truncate">{current.file_name}</p>
                        <p className="text-[11px] text-ink-500 mt-0.5">
                          Uploaded by {current.uploader_name || current.uploaded_by} · {fmtDate(current.created_at)}
                          {current.notes ? ` · ${current.notes}` : ''}
                        </p>
                      </div>
                      <a
                        href={current.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 px-4 border border-border-strong text-[13px] font-semibold rounded-lg hover:bg-white flex items-center gap-1.5 shrink-0"
                      >
                        <span className="material-symbols-outlined text-[15px]">download</span>
                        Download
                      </a>
                    </div>

                    {/* Previous versions */}
                    {prev.length > 0 && (
                      <>
                        <p className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-3">
                          Previous Versions ({prev.length})
                        </p>
                        <div className="space-y-3">
                          {prev.map((doc) => (
                            <div key={doc.id} className="flex items-center gap-4 py-3 border-b border-border-subtle last:border-0">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${extBg(doc.file_name)}`}>
                                {fileExt(doc.file_name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] text-ink-500 font-semibold">v{doc.version}</p>
                                <p className="text-[13px] font-semibold text-ink-900 truncate">{doc.file_name}</p>
                                <p className="text-[11px] text-ink-500 mt-0.5">
                                  Uploaded by {doc.uploader_name || doc.uploaded_by} · {fmtDate(doc.created_at)}
                                  {doc.notes ? ` · ${doc.notes}` : ''}
                                </p>
                              </div>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 px-3 border border-border-strong text-[12px] font-semibold rounded-lg hover:bg-surface-alt flex items-center gap-1 shrink-0"
                              >
                                <span className="material-symbols-outlined text-[14px]">download</span>
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── Tab: BOM ──────────────────────────────────────────────────────── */}
          {activeTab === 'bom' && (() => {
            // Mock BOM data — replace with real API fetch
            const mockBom = {
              bom_number: `BOM-${workOrder?.wo_number || 'WO-CHH-26-001'}`,
              status: 'submitted',
              billing_sqft: 96,
              production_qty: 2,
              material_cost_est: 28400,
              material_cost_committed: 0,
              material_cost_actual: 0,
              total_cost_est: 28400,
              total_cost_committed: 0,
              total_cost_actual: 0,
            };

            const bomStatusPill = (s: string) => {
              const map: Record<string, string> = {
                draft: 'bg-ink-100 text-ink-500',
                submitted: 'bg-sky-100 text-sky-700',
                approved: 'bg-green-100 text-green-700',
                rejected: 'bg-red-100 text-red-600',
              };
              return (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${map[s] || map.draft}`}>
                  {s}
                </span>
              );
            };

            const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN');

            return (
              <div className="bg-white border border-border-subtle rounded-xl p-6">
                {/* BOM card header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[15px] font-bold text-[#B8892B]">{mockBom.bom_number}</span>
                      {bomStatusPill(mockBom.status)}
                    </div>
                    <p className="text-[13px] text-ink-400">
                      Billing Sqft: {mockBom.billing_sqft} sqft &nbsp;·&nbsp; Production Qty: {mockBom.production_qty} units
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/work-orders/${id}/stock-check`)}
                      className="px-4 py-2 bg-secondary text-white text-[13px] font-bold rounded-lg hover:brightness-110 transition-colors"
                    >
                      Check Stock
                    </button>
                    <button
                      onClick={() => navigate(`/bom/${id}/approve`)}
                      className="px-4 py-2 bg-[#B8892B] text-white text-[13px] font-medium rounded-lg hover:bg-[#9a7224] transition-colors"
                    >
                      View BOM
                    </button>
                    <button
                      onClick={() => navigate(`/bom/${id}/edit`)}
                      className="px-4 py-2 border border-border-subtle text-ink-700 text-[13px] font-medium rounded-lg hover:bg-surface-alt transition-colors"
                    >
                      Edit BOM
                    </button>
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-4">
                  {/* Legend */}
                  <div className="flex items-center gap-4 mb-4 text-[12px] text-ink-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-ink-900 inline-block" />
                      Estimated
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                      Committed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      Actual
                    </span>
                  </div>

                  {/* Cost rows */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-8">
                      <div className="w-40">
                        <p className="text-[12px] text-ink-500 mb-1">Material Cost</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[15px] font-bold text-ink-900">{fmtINR(mockBom.material_cost_est)}</span>
                          <span className="text-[15px] font-bold text-sky-500">{fmtINR(mockBom.material_cost_committed)}</span>
                          <span className="text-[15px] font-bold text-green-500">{fmtINR(mockBom.material_cost_actual)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[12px] text-ink-500 mb-1">Total BOM Cost</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[15px] font-bold text-ink-900">{fmtINR(mockBom.total_cost_est)}</span>
                          <span className="text-[15px] font-bold text-sky-500">{fmtINR(mockBom.total_cost_committed)}</span>
                          <span className="text-[15px] font-bold text-green-500">{fmtINR(mockBom.total_cost_actual)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Tab: Change Requests ──────────────────────────────────────────── */}
          {activeTab === 'change_requests' && (
            <div className="bg-white border border-border-subtle rounded-xl p-6">
              {/* Header row */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[15px] font-bold text-ink-900">
                  Change Requests {changeRequests.length > 0 && `(${changeRequests.length})`}
                </h3>
                {user.role !== 'supervisor' && (
                  <button
                    onClick={() => setShowRaiseCrModal(true)}
                    className="px-4 py-2 bg-secondary text-white text-[13px] font-semibold rounded-lg hover:opacity-90 transition"
                  >
                    + Raise Change Request
                  </button>
                )}
              </div>

              {changeRequests.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border-strong rounded-xl">
                  <p className="text-[13px] text-ink-500">No change requests raised for this work order.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {changeRequests.map((cr: any) => {
                    const statusPill = cr.status === 'pending'
                      ? <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 uppercase">Pending</span>
                      : cr.status === 'implemented' || cr.status === 'approved'
                      ? <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 uppercase">Implemented</span>
                      : cr.status === 'rejected'
                      ? <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-600 uppercase">Rejected</span>
                      : <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-700 uppercase">{cr.status}</span>;

                    const tierBadge = cr.tier
                      ? <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-ink-100 text-ink-500 uppercase">Tier {cr.tier}</span>
                      : null;

                    return (
                      <div key={cr.id} className="border border-border-subtle rounded-xl p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-bold text-secondary">{cr.cr_number}</span>
                            {tierBadge}
                          </div>
                          {statusPill}
                        </div>
                        <p className="text-[14px] font-semibold text-ink-900 mb-1">{cr.title || cr.reason}</p>
                        {cr.description && (
                          <p className="text-[13px] text-ink-500 mb-3 leading-relaxed">{cr.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[12px] text-ink-400">
                            Raised by {cr.creator_name || 'Supervisor'} on {cr.raised_on || cr.created_at || '—'}
                          </p>
                          <button
                            onClick={() => navigate(`/change-requests/${cr.id}`)}
                            className="px-3 py-1.5 text-[12px] font-medium text-ink-700 border border-border-subtle rounded-lg hover:bg-[#F5F2EC] transition"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal: Duplicate WO ──────────────────────────────────────────────── */}
        {showDuplicateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">

              {/* Header */}
              <div className="px-8 pt-7 pb-5 border-b border-border-subtle">
                <h3 className="text-[18px] font-bold text-ink-900">Duplicate Work Order?</h3>
                <p className="text-[12px] text-ink-500 mt-1">
                  A new draft WO will be created from <span className="font-semibold text-secondary">{workOrder.wo_number}</span> — {workOrder.title}
                </p>
              </div>

              {/* Flow cards */}
              <div className="px-8 py-6 flex items-start gap-4">

                {/* Step 1: Source */}
                <div className="flex-1 border border-border-subtle rounded-xl p-4">
                  <span className="inline-block px-2 py-0.5 bg-gold-light text-secondary text-[10px] font-bold uppercase tracking-wider rounded-full mb-3">
                    Step 1 · Source
                  </span>
                  <p className="text-[14px] font-bold text-secondary">{workOrder.wo_number}</p>
                  <p className="text-[13px] font-semibold text-ink-900 mt-0.5">{workOrder.title}</p>
                  <p className="text-[12px] text-ink-500 mt-1">
                    Status: {workOrder.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </p>
                </div>

                <span className="material-symbols-outlined text-ink-300 text-[22px] mt-8 shrink-0">arrow_forward</span>

                {/* Step 2: What copies */}
                <div className="flex-1 border border-border-subtle rounded-xl p-4">
                  <span className="inline-block px-2 py-0.5 bg-gold-light text-secondary text-[10px] font-bold uppercase tracking-wider rounded-full mb-3">
                    Step 2 · What Copies
                  </span>
                  <div className="space-y-1.5">
                    {[
                      { copies: true,  label: 'Client details, furniture spec, finish' },
                      { copies: true,  label: 'Dimensions & delivery terms' },
                      { copies: false, label: 'WO Number' },
                      { copies: false, label: 'Status' },
                      { copies: false, label: 'Committed / requested dates' },
                      { copies: false, label: 'Drawings' },
                    ].map(({ copies, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className={`text-[13px] font-bold ${copies ? 'text-status-qc-passed' : 'text-status-cancelled'}`}>
                          {copies ? '✓' : '×'}
                        </span>
                        <span className={`text-[12px] ${copies ? 'text-status-qc-passed' : 'text-status-cancelled'}`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Result hint */}
              <div className="px-8 pb-2">
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-status-qc-passed text-[16px]">check_circle</span>
                  <p className="text-[12px] text-status-qc-passed font-semibold">
                    New WO will be created in Draft status — you'll be taken to it automatically.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 flex justify-end gap-3">
                <button
                  onClick={() => setShowDuplicateModal(false)}
                  className="h-10 px-5 border border-border-strong text-[13px] font-semibold rounded-xl hover:bg-surface-alt transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  className="h-10 px-5 bg-secondary text-white text-[13px] font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {duplicating && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  Duplicate WO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Edit Work Order Details ───────────────────────────────────── */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="px-8 pt-7 pb-4 border-b border-border-subtle flex items-start justify-between shrink-0">
                <div>
                  <h3 className="text-[18px] font-bold text-ink-900">Edit Work Order Details</h3>
                  <p className="text-[12px] text-ink-500 mt-0.5">
                    {workOrder.wo_number} · Same fields as Create form, pre-populated
                  </p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-alt text-ink-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto px-8 py-6 space-y-5 flex-1">

                {/* Info banner */}
                <div className="flex items-start gap-2.5 bg-gold-light/50 border border-secondary/20 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5 shrink-0">info</span>
                  <p className="text-[12px] text-ink-700">
                    WO Number, Client Type, Stream, Status, and Created By cannot be changed here.
                  </p>
                </div>

                {/* Read-only row */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'WO Number', value: workOrder.wo_number },
                    { label: 'Client Type', value: workOrder.client_type ? (workOrder.client_type.charAt(0).toUpperCase() + workOrder.client_type.slice(1)) : '' },
                    { label: 'Status', value: workOrder.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <label className="block text-[11px] text-ink-500 mb-1 flex items-center gap-1">
                        {label}
                        <span className="material-symbols-outlined text-[12px] text-ink-300">lock</span>
                        <span className="text-ink-300 text-[10px]">not editable</span>
                      </label>
                      <div className="h-10 border border-border-subtle rounded-lg px-3 flex items-center bg-surface-alt text-[13px] text-ink-400">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Work Order Title */}
                <div>
                  <label className="block text-[12px] font-semibold text-ink-700 mb-1">Work Order Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
                  />
                </div>

                {/* Client Name | Project / Site Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-700 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={editForm.client_name}
                      onChange={e => setEditForm(f => ({ ...f, client_name: e.target.value }))}
                      className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-700 mb-1">Project / Site Name</label>
                    <input
                      type="text"
                      value={editForm.project_name}
                      onChange={e => setEditForm(f => ({ ...f, project_name: e.target.value }))}
                      className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
                    />
                  </div>
                </div>

                {/* Furniture Type | Number of Units */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-700 mb-1">Furniture Type</label>
                    <input
                      type="text"
                      value={editForm.furniture_type}
                      onChange={e => setEditForm(f => ({ ...f, furniture_type: e.target.value }))}
                      className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-700 mb-1">Number of Units</label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.production_quantity}
                      onChange={e => setEditForm(f => ({ ...f, production_quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
                    />
                  </div>
                </div>

                {/* Finish Type | Finish Detail */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-700 mb-1">Finish Type</label>
                    <input
                      type="text"
                      value={editForm.finish_type}
                      onChange={e => setEditForm(f => ({ ...f, finish_type: e.target.value }))}
                      className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-700 mb-1">Finish Detail</label>
                    <input
                      type="text"
                      value={editForm.finish_detail}
                      onChange={e => setEditForm(f => ({ ...f, finish_detail: e.target.value }))}
                      className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
                    />
                  </div>
                </div>

                {/* Delivery Terms | Requested Delivery Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-700 mb-1">Delivery Terms</label>
                    <select
                      value={editForm.delivery_terms}
                      onChange={e => setEditForm(f => ({ ...f, delivery_terms: e.target.value }))}
                      className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none bg-white"
                    >
                      <option value="">Select...</option>
                      <option value="included_in_price">Included in Price</option>
                      <option value="ex_factory">Ex-Factory</option>
                      <option value="client_arranged">Client Arranged</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-700 mb-1">Requested Delivery Date</label>
                    <input
                      type="date"
                      value={editForm.requested_delivery_date}
                      onChange={e => setEditForm(f => ({ ...f, requested_delivery_date: e.target.value }))}
                      className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="block text-[12px] font-semibold text-ink-700 mb-1">Delivery Address</label>
                  <textarea
                    value={editForm.delivery_address}
                    onChange={e => setEditForm(f => ({ ...f, delivery_address: e.target.value }))}
                    rows={2}
                    className="w-full border border-border-subtle rounded-lg px-3 py-2.5 text-[13px] focus:border-secondary outline-none resize-none"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[12px] font-semibold text-ink-700 mb-1">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary outline-none bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[12px] font-semibold text-ink-700 mb-1">Notes</label>
                  <textarea
                    value={editForm.special_notes}
                    onChange={e => setEditForm(f => ({ ...f, special_notes: e.target.value }))}
                    rows={3}
                    placeholder="Add manufacturing notes or special client instructions..."
                    className="w-full border border-border-subtle rounded-lg px-3 py-2.5 text-[13px] focus:border-secondary outline-none resize-none"
                  />
                </div>
              </div>

              {/* Sticky footer */}
              <div className="px-8 py-4 border-t border-border-subtle flex items-center justify-between shrink-0">
                <p className="text-[12px] text-ink-400">
                  Version {drawings.length + history.length} · Last updated {workOrder.created_at ? formatCreatedAt(workOrder.created_at) : '—'}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="h-10 px-5 border border-border-strong text-[13px] font-semibold rounded-xl hover:bg-surface-alt transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="h-10 px-5 bg-secondary text-white text-[13px] font-semibold rounded-xl hover:brightness-110 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Cancel WO ─────────────────────────────────────────────────── */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl mx-4">

              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-status-cancelled text-[24px]">warning</span>
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-ink-900 leading-tight">
                    Cancel Work Order {workOrder.wo_number}?
                  </h3>
                  <p className="text-[13px] text-ink-500 mt-1 leading-snug">
                    This action cannot be undone. All material reservations will be released. Please provide a reason below.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCancelOrder} className="space-y-4">

                {/* Preset reasons */}
                <div>
                  <label className="block text-[12px] font-bold text-ink-700 mb-2">
                    Reason for cancellation <span className="text-status-cancelled">*</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      'Client cancelled order',
                      'Design change — restart required',
                      'Duplicate work order',
                      'Other (specify below)',
                    ].map((opt) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition-colors ${
                          cancelReasonPreset === opt
                            ? 'border-secondary bg-gold-light/40'
                            : 'border-border-subtle hover:border-border-strong'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          cancelReasonPreset === opt
                            ? 'border-secondary'
                            : 'border-ink-300'
                        }`}>
                          {cancelReasonPreset === opt && (
                            <span className="w-2 h-2 rounded-full bg-secondary block" />
                          )}
                        </span>
                        <input
                          type="radio"
                          name="cancel-preset"
                          value={opt}
                          checked={cancelReasonPreset === opt}
                          onChange={() => setCancelReasonPreset(opt)}
                          className="sr-only"
                        />
                        <span className="text-[13px] text-ink-900">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional details */}
                <div>
                  <label className="block text-[12px] font-bold text-ink-700 mb-1">Additional details</label>
                  <textarea
                    value={cancelDetails}
                    onChange={(e) => setCancelDetails(e.target.value)}
                    className="w-full border border-border-subtle rounded-xl p-3 text-[13px] resize-none focus:border-secondary outline-none"
                    placeholder="Client has requested a full redesign of the reception area layout following an internal review..."
                    rows={3}
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowCancelModal(false); setCancelReasonPreset(''); setCancelDetails(''); }}
                    className="h-10 px-6 border border-border-strong text-[13px] font-semibold rounded-xl hover:bg-surface-alt transition-colors"
                  >
                    Keep Work Order
                  </button>
                  <button
                    type="submit"
                    disabled={!cancelReasonPreset}
                    className="h-10 px-6 bg-status-cancelled text-white text-[13px] font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-40"
                  >
                    Cancel Work Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Committed Delivery Date ──────────────────────────────────── */}
        {showDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white border border-border-subtle rounded-xl p-6 max-w-md w-full shadow-2xl mx-4">
              <div className="flex items-center gap-2 mb-4 text-secondary">
                <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                <h3 className="text-[17px] font-bold">Committed Delivery Date</h3>
              </div>
              <form onSubmit={handleUpdateDate} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-1">
                    Committed Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={newCommittedDate}
                    onChange={(e) => setNewCommittedDate(e.target.value)}
                    className="w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] focus:border-secondary focus:ring-0 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-1">
                    Reason / Notes
                  </label>
                  <textarea
                    value={dateChangeReason}
                    onChange={(e) => setDateChangeReason(e.target.value)}
                    className="w-full border border-border-subtle rounded-lg p-3 text-[13px] resize-none focus:border-secondary focus:ring-0 outline-none"
                    placeholder="Provide details for the version log timeline..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDateModal(false)}
                    className="h-9 px-4 border border-border-strong text-[13px] font-semibold rounded-lg hover:bg-surface-alt"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 bg-secondary text-white text-[13px] font-semibold rounded-lg hover:brightness-110"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── PRINT VIEW ───────────────────────────────────────────────────────── */}
        <div className="hidden print:block p-8 space-y-6 max-w-4xl mx-auto text-black text-sm">
          <div className="border-b-2 border-gray-900 pb-3 flex justify-between items-end">
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wider">Canva Concepts Staging ERP</h1>
              <p className="text-xs text-gray-500">Work Order Instruction Sheet</p>
            </div>
            <p className="text-xs font-mono">Printed: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div><p className="text-xs font-bold text-gray-500 uppercase">Work Order ID</p><p className="font-bold">{workOrder.wo_number}</p></div>
            <div><p className="text-xs font-bold text-gray-500 uppercase">Title</p><p className="font-bold">{workOrder.title}</p></div>
            <div><p className="text-xs font-bold text-gray-500 uppercase">Priority</p><p className="font-bold uppercase">{workOrder.priority}</p></div>
            <div><p className="text-xs font-bold text-gray-500 uppercase">Status</p><p className="font-bold uppercase">{workOrder.status.replace(/_/g, ' ')}</p></div>
          </div>

          <div className="border-t border-gray-300 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Client & Project</h3>
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr>
                  <th className="py-1 pr-4 border-b border-gray-200 text-left">Client Name</th>
                  <td className="py-1 border-b border-gray-200">{workOrder.client_name}</td>
                  <th className="py-1 px-4 border-b border-gray-200 text-left">Client Type</th>
                  <td className="py-1 border-b border-gray-200 uppercase">{workOrder.client_type}</td>
                </tr>
                <tr>
                  <th className="py-1 pr-4 border-b border-gray-200 text-left">Project / Stream</th>
                  <td className="py-1 border-b border-gray-200">{workOrder.project_name} / {workOrder.stream || '—'}</td>
                  <th className="py-1 px-4 border-b border-gray-200 text-left">Qty</th>
                  <td className="py-1 border-b border-gray-200">{workOrder.production_quantity} units</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-300 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Product Specifications</h3>
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr>
                  <th className="py-1 pr-4 border-b border-gray-200 text-left">Furniture Type</th>
                  <td className="py-1 border-b border-gray-200">{workOrder.furniture_type}</td>
                  <th className="py-1 px-4 border-b border-gray-200 text-left">Dimensions</th>
                  <td className="py-1 border-b border-gray-200">{workOrder.dimensions_l} × {workOrder.dimensions_h} × {workOrder.dimensions_d} mm</td>
                </tr>
                <tr>
                  <th className="py-1 pr-4 border-b border-gray-200 text-left">Finish Type</th>
                  <td className="py-1 border-b border-gray-200 uppercase">{workOrder.finish_type || '—'}</td>
                  <th className="py-1 px-4 border-b border-gray-200 text-left">Finish Detail</th>
                  <td className="py-1 border-b border-gray-200">{workOrder.finish_detail || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-300 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Logistics & Delivery</h3>
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr>
                  <th className="py-1 pr-4 border-b border-gray-200 text-left">Committed Date</th>
                  <td className="py-1 border-b border-gray-200 font-bold">{formatDate(workOrder.committed_delivery_date)}</td>
                  <th className="py-1 px-4 border-b border-gray-200 text-left">Requested Date</th>
                  <td className="py-1 border-b border-gray-200">{formatDate(workOrder.requested_delivery_date)}</td>
                </tr>
                <tr>
                  <th className="py-1 pr-4 border-b border-gray-200 text-left">Delivery Terms</th>
                  <td className="py-1 border-b border-gray-200 uppercase">{workOrder.delivery_terms}</td>
                  <th className="py-1 px-4 border-b border-gray-200 text-left">Address</th>
                  <td className="py-1 border-b border-gray-200">{workOrder.delivery_address || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-300 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Status Timeline</h3>
            <div className="space-y-1 text-xs">
              {history.map((h, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-gray-100">
                  <span>
                    <span className="font-bold uppercase">[{h.new_status.replace(/_/g, ' ')}]</span>
                    {h.reason ? ` — ${h.reason}` : ''}
                  </span>
                  <span className="text-gray-500">{new Date(h.created_at).toLocaleString()} · {h.changer_name || 'System'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Raise CR Modal */}
      {workOrder && (
        <RaiseCrModal
          open={showRaiseCrModal}
          woNumber={workOrder.wo_number}
          woTitle={workOrder.title || workOrder.project_name}
          onClose={() => setShowRaiseCrModal(false)}
          onSubmit={async (data) => {
            try {
              const res = await fetch(`/api/work-orders/${id}/change-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (res.ok) {
                setShowRaiseCrModal(false);
                fetchDetailData();
              } else {
                alert('Failed to submit change request.');
              }
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}
    </div>
  );
}
