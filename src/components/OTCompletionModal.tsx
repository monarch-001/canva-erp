import { useState } from 'react';

export interface OtCompletionRequest {
  otrNumber: string;
  carpenterName: string;
  type: string;
  date: string;
  approvedHours: number;
  approvedCost: number;
  workOrder: string;
}

interface OTCompletionModalProps {
  open: boolean;
  request: OtCompletionRequest | null;
  onClose: () => void;
  onConfirm: (otrNumber: string, actualHours: number, notes: string) => void;
}

export default function OTCompletionModal({
  open,
  request,
  onClose,
  onConfirm,
}: OTCompletionModalProps) {
  const [actualHours, setActualHours] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!open || !request) return null;

  const parsed = parseFloat(actualHours);
  const isValid = !isNaN(parsed) && parsed > 0 && parsed <= request.approvedHours;
  const finalCost = isValid ? parsed * 100 : 0;

  function handleConfirm() {
    setSubmitted(true);
    if (!isValid) return;
    onConfirm(request!.otrNumber, parsed, notes);
    setActualHours('');
    setNotes('');
    setSubmitted(false);
  }

  function handleClose() {
    setActualHours('');
    setNotes('');
    setSubmitted(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-ink-900 mb-1">Confirm OT Completion</h2>
          <p className="text-sm text-ink-500">
            {request.otrNumber} · {request.carpenterName} — {request.type}
          </p>
        </div>

        <div className="px-6 pb-4 space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Date</p>
              <p className="text-sm font-semibold text-ink-900">{request.date}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Approved Hours</p>
              <p className="text-sm font-semibold text-ink-900">{request.approvedHours} hours</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-0.5">Approved Cost</p>
              <p className="text-sm font-semibold text-ink-900">₹{request.approvedCost.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-ink-400 mb-0.5">Work Order</p>
            <p className="text-sm font-semibold text-ink-900">{request.workOrder}</p>
          </div>

          <hr className="border-[#E8E2D9]" />

          {/* Actual hours */}
          <div>
            <label className="block text-sm font-semibold text-ink-900 mb-1">
              Actual Hours Worked <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.5"
              max={request.approvedHours}
              step="0.5"
              value={actualHours}
              onChange={e => setActualHours(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm text-ink-900 focus:outline-none ${
                submitted && !isValid
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-[#E8E2D9] focus:border-secondary'
              }`}
            />
            {submitted && !isValid && actualHours !== '' && (
              <p className="text-xs text-red-500 mt-1">Cannot exceed approved hours ({request.approvedHours}).</p>
            )}
            {!(submitted && !isValid) && (
              <p className="text-xs text-ink-400 mt-1">
                Cannot exceed approved hours ({request.approvedHours}). If more time was needed, raise a new OT request.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-ink-900 mb-1">Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context about the completed work"
              className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary resize-none"
            />
          </div>

          {/* Final Payroll Cost */}
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <span className="text-sm font-semibold text-ink-700">Final Payroll Cost</span>
            <span className="text-sm font-bold text-secondary">
              {isValid
                ? `${actualHours} hrs × ₹100 = ₹${finalCost.toLocaleString('en-IN')}`
                : '— hrs × ₹100 = ₹—'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E2D9] flex items-center justify-between">
          <p className="text-xs text-ink-400">Feeds directly into this month's payroll calculation</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2 text-sm text-ink-700 border border-[#E8E2D9] rounded-lg hover:bg-[#F5F2EC] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 text-sm font-semibold bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Confirm Completion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
