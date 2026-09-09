import { useState } from 'react';

export interface OtRequestDetail {
  otrNumber: string;
  carpenterName: string;
  type: string; // e.g. "Weekend Work Request"
  date: string;
  time: string;
  hoursRequested: number;
  workOrder: string;
  jobCard: string;
  reason: string;
  workDescription: string;
  carpenterOtThisMonth: number;
  otCap: number;
}

interface FMApprovalModalProps {
  open: boolean;
  request: OtRequestDetail | null;
  onClose: () => void;
  onReject: (otrNumber: string) => void;
  onApprove: (otrNumber: string, hoursApproved: number, overrideReason?: string) => void;
}

export default function FMApprovalModal({
  open,
  request,
  onClose,
  onReject,
  onApprove,
}: FMApprovalModalProps) {
  const [hoursToApprove, setHoursToApprove] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!open || !request) return null;

  const wouldExceedCap =
    request.carpenterOtThisMonth + request.hoursRequested > request.otCap;
  const estimatedCost = request.hoursRequested * 100;
  const isOverride = wouldExceedCap;
  const canApprove =
    hoursToApprove !== '' &&
    parseFloat(hoursToApprove) > 0 &&
    (!isOverride || overrideReason.trim().length > 0);

  function handleApprove() {
    setSubmitted(true);
    if (!canApprove) return;
    onApprove(
      request!.otrNumber,
      parseFloat(hoursToApprove),
      isOverride ? overrideReason : undefined
    );
    setHoursToApprove('');
    setOverrideReason('');
    setSubmitted(false);
  }

  function handleClose() {
    setHoursToApprove('');
    setOverrideReason('');
    setSubmitted(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#E8E2D9]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-secondary">{request.otrNumber}</span>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                Pending
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-ink-400 hover:text-ink-700 text-xl leading-none transition-colors"
            >
              ×
            </button>
          </div>
          <h2 className="text-base font-semibold text-ink-900 mt-2">
            {request.carpenterName} — {request.type}
          </h2>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Info grid */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Date</p>
              <p className="text-sm font-semibold text-ink-900">{request.date}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Time</p>
              <p className="text-sm font-semibold text-ink-900">{request.time}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Hours Requested</p>
              <p className="text-sm font-semibold text-ink-900">{request.hoursRequested} hours</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Work Order</p>
              <p className="text-sm font-semibold text-ink-900">{request.workOrder}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Job Card</p>
              <p className="text-sm font-semibold text-ink-900">{request.jobCard}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-ink-400 mb-0.5">Reason</p>
            <p className="text-sm text-ink-700">{request.reason}</p>
          </div>

          <div>
            <p className="text-xs text-ink-400 mb-0.5">Work Description</p>
            <p className="text-sm font-semibold text-ink-900">{request.workDescription}</p>
          </div>

          {/* Cap exceeded warning */}
          {wouldExceedCap && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">
                  ⚠ This will exceed the monthly cap of {request.otCap} hours
                </p>
                <p className="text-xs text-red-600">
                  {request.carpenterName} has already used {request.carpenterOtThisMonth} hours this month.
                  Approving this request requires FM override with a documented reason.
                </p>
              </div>
              <span className="text-sm font-bold text-red-700 whitespace-nowrap ml-4">
                {request.carpenterOtThisMonth + request.hoursRequested} / {request.otCap} hrs
              </span>
            </div>
          )}

          {/* Estimated cost */}
          <div className="flex items-center justify-between py-2 border-t border-[#E8E2D9]">
            <span className="text-sm text-ink-700">Estimated Cost</span>
            <span className="text-sm font-semibold text-secondary">
              {request.hoursRequested} hours × ₹100 = ₹{estimatedCost.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Approve section */}
          <div>
            <h3 className="text-sm font-bold text-ink-900 mb-3">
              {isOverride ? 'Approve with Override' : 'Approve'}
            </h3>

            <div className="mb-4">
              <label className="block text-xs text-ink-500 mb-1">
                Hours to Approve <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.5"
                max={request.hoursRequested}
                step="0.5"
                value={hoursToApprove}
                onChange={e => setHoursToApprove(e.target.value)}
                placeholder={String(request.hoursRequested)}
                className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary"
              />
              <p className="text-xs text-ink-400 mt-1">FM can approve fewer hours than requested</p>
            </div>

            {isOverride && (
              <div>
                <label className="block text-xs text-ink-500 mb-1">
                  Override Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="Mandatory — this will be logged permanently in the audit trail"
                  className={`w-full border rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none resize-none ${
                    submitted && !overrideReason.trim()
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-[#E8E2D9] focus:border-secondary'
                  }`}
                />
                <p className={`text-xs mt-1 ${
                  submitted && !overrideReason.trim() ? 'text-red-500' : 'text-ink-400'
                }`}>
                  Required for cap override. Logged in audit_trail.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E2D9] flex items-center justify-between">
          <button
            onClick={() => onReject(request.otrNumber)}
            className="px-5 py-2 text-sm font-medium text-ink-700 border border-[#E8E2D9] rounded-lg hover:bg-[#F5F2EC] transition-colors"
          >
            Reject
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2 text-sm text-ink-700 border border-[#E8E2D9] rounded-lg hover:bg-[#F5F2EC] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              className={`px-6 py-2 text-sm font-semibold rounded-lg text-white transition-colors ${
                isOverride
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-secondary hover:bg-secondary/90'
              }`}
            >
              {isOverride ? 'Override and Approve' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
