import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

interface TrailStep {
  icon: 'done' | 'pending' | 'rejected';
  label: string;
  who: string;
  when: string;
  note?: string;
}

interface CrDetailData {
  id: string;
  cr_number: string;
  tier: 1 | 2 | 3;
  status: 'pending' | 'ip_approved' | 'approved' | 'rejected';
  title: string;
  wo_number: string;
  wo_title: string;
  change_type: string;
  delivery_impact: string;
  cost_impact: string;
  description: string;
  reason: string;
  raised_by: string;
  raised_at: string;
  trail: TrailStep[];
  action_context?: string;
}

// Mock data types

function tierPill(tier: number) {
  const cfg =
    tier === 1 ? { label: 'TIER 1', cls: 'bg-amber-100 text-amber-700' } :
    tier === 2 ? { label: 'TIER 2', cls: 'bg-orange-100 text-orange-700' } :
                 { label: 'TIER 3', cls: 'bg-red-100 text-red-600' };
  return <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${cfg.cls}`}>{cfg.label}</span>;
}

function statusPill(status: CrDetailData['status']) {
  switch (status) {
    case 'pending':     return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700">Pending</span>;
    case 'ip_approved': return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-100 text-sky-700">IP Approved</span>;
    case 'approved':    return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700">Approved</span>;
    case 'rejected':    return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-600">Rejected</span>;
  }
}

export default function CRDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [cr, setCr] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null);

  const fetchCrDetails = async () => {
    try {
      const response = await fetch(`/api/change-requests/${id}`);
      if (response.ok) {
        const data = await response.json();
        // Map backend schema values to components layout
        setCr({
          id: data.id,
          cr_number: data.cr_number,
          tier: data.notes?.includes('Minor') ? 1 : data.notes?.includes('Major') ? 3 : 2, // Mock tier for UI Badge
          status: data.status,
          title: data.reason || 'Change Request',
          wo_number: data.wo_number || 'WO-8829',
          wo_title: data.wo_title || 'Work Order',
          change_type: data.reason?.split(':')[0] || 'Dimension Change',
          delivery_impact: data.time_impact_days > 0 ? `Yes — ${data.time_impact_days} days` : 'No',
          cost_impact: data.cost_impact > 0 ? `₹${data.cost_impact.toLocaleString('en-IN')}` : '₹0',
          description: data.notes || '',
          reason: data.reason?.split(':').slice(1).join(':').trim() || data.reason || '',
          raised_by: data.creator_name || 'Supervisor',
          raised_at: new Date(data.created_at).toLocaleString(),
          action_context: data.status === 'pending' ? 'Factory Manager or Corporate Partner approval is required to implement this Change Request.' : undefined,
          trail: [
            { icon: 'done',    label: 'CR Raised',                  who: data.creator_name || 'Supervisor', when: new Date(data.created_at).toLocaleString() },
            { icon: data.status === 'pending' ? 'pending' : data.status === 'approved' ? 'done' : 'rejected', 
              label: `Status — ${data.status.toUpperCase()}`,       
              who: data.status === 'pending' ? 'Awaiting review' : 'Factory Manager', 
              when: data.status === 'pending' ? '' : new Date(data.updated_at).toLocaleString(),
              note: data.notes ? `"${data.notes}"` : undefined }
          ]
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrDetails();
  }, [id]);

  const handleApprove = async () => {
    try {
      const res = await fetch(`/api/change-requests/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', notes }),
      });
      if (res.ok) {
        setActionDone('approved');
        fetchCrDetails();
      } else {
        alert('Failed to approve change request.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    try {
      const res = await fetch(`/api/change-requests/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes }),
      });
      if (res.ok) {
        setActionDone('rejected');
        fetchCrDetails();
      } else {
        alert('Failed to reject change request.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center">
        <p className="text-sm text-ink-500 font-semibold">Loading details...</p>
      </div>
    );
  }

  if (!cr) {
    return (
      <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center">
        <p className="text-sm text-red-500 font-semibold">Change request not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex">
      <Sidebar />
      <div className="ml-[220px] flex-1 px-8 py-6 max-w-[900px]">

        {/* Back nav */}
        <button
          onClick={() => navigate(`/work-orders/${cr.wo_number}`)}
          className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 mb-5 transition-colors"
        >
          <span>←</span>
          <span>Back to {cr.wo_number} · Change Requests</span>
        </button>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-[#E8E2D9] px-6 py-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base font-bold text-secondary">{cr.cr_number}</span>
            {tierPill(cr.tier)}
            {statusPill(cr.status)}
          </div>
          <h1 className="text-xl font-bold text-ink-900 mb-1">{cr.title}</h1>
          <p className="text-sm text-ink-500">On {cr.wo_number} — {cr.wo_title}</p>
        </div>

        {/* Change Details + Approval Trail card */}
        <div className="bg-white rounded-xl border border-[#E8E2D9] px-6 py-5 mb-4">
          <h2 className="text-sm font-bold text-ink-900 mb-4">Change Details</h2>

          {/* Change meta grid */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Change Type</p>
              <p className="text-sm font-semibold text-ink-900">{cr.change_type}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Delivery Impact</p>
              <p className="text-sm font-semibold text-ink-900">{cr.delivery_impact}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Cost Impact</p>
              <p className="text-sm font-semibold text-ink-900">{cr.cost_impact}</p>
            </div>
          </div>

          <div className="mb-3">
            <p className="text-xs text-ink-400 mb-0.5">Description</p>
            <p className="text-sm font-semibold text-ink-900 leading-relaxed">{cr.description}</p>
          </div>

          <div className="mb-4">
            <p className="text-xs text-ink-400 mb-0.5">Reason</p>
            <p className="text-sm font-semibold text-ink-900 leading-relaxed">{cr.reason}</p>
          </div>

          <div>
            <p className="text-xs text-ink-400 mb-0.5">Raised by</p>
            <p className="text-sm font-semibold text-ink-900">
              {cr.raised_by} <span className="text-ink-400 font-normal">· {cr.raised_at}</span>
            </p>
          </div>

          {/* Divider */}
          <hr className="border-[#E8E2D9] my-5" />

          {/* Approval Trail */}
          <h2 className="text-sm font-bold text-ink-900 mb-4">Approval Trail</h2>
          <div className="space-y-0">
            {cr.trail.map((step: TrailStep, idx: number) => (
              <div key={idx} className="flex gap-4">
                {/* Icon + connector */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.icon === 'done'    ? 'bg-green-100 text-green-600' :
                    step.icon === 'rejected'? 'bg-red-100 text-red-600' :
                    'bg-amber-100 text-amber-500'
                  }`}>
                    {step.icon === 'done'    ? <span className="text-sm font-bold">✓</span> :
                     step.icon === 'rejected'? <span className="text-sm font-bold">✕</span> :
                     <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />}
                  </div>
                  {idx < cr.trail.length - 1 && (
                    <div className="w-px flex-1 bg-[#E8E2D9] my-1" style={{ minHeight: '24px' }} />
                  )}
                </div>

                {/* Content */}
                <div className="pb-6 flex-1">
                  <p className="text-sm font-semibold text-ink-900">{step.label}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {step.who}{step.when ? ` · ${step.when}` : ''}
                  </p>
                  {step.note && (
                    <p className="text-xs text-ink-400 italic mt-1">{step.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions card */}
        {cr.action_context && !actionDone && (
          <div className="bg-white rounded-xl border border-[#E8E2D9] px-6 py-5">
            <h2 className="text-sm font-bold text-ink-900 mb-1">Actions — Super Admin Approval</h2>
            <p className="text-sm text-ink-500 mb-4">{cr.action_context}</p>

            <label className="block text-sm font-semibold text-ink-900 mb-1">Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any notes for the approval record"
              className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary resize-none mb-4"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleApprove}
                className="px-6 py-2 text-sm font-semibold bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={handleReject}
                className="px-6 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Action done confirmation */}
        {actionDone && (
          <div className={`rounded-xl border px-6 py-5 ${
            actionDone === 'approved' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
          }`}>
            <p className={`text-sm font-bold ${actionDone === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
              {actionDone === 'approved' ? '✓ Change Request Approved' : '✕ Change Request Rejected'}
            </p>
            <p className={`text-xs mt-1 ${actionDone === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
              {actionDone === 'approved'
                ? 'The change request has been fully approved. Production can proceed with this change.'
                : 'The change request has been rejected and the site manager has been notified.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
