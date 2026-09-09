import { useState, useRef } from 'react';

interface EodUpdateModalProps {
  open: boolean;
  onClose: () => void;
  jcNumber: string;
  carpenterName: string;
  totalQuantity: number;
  completedSoFar: number;
  onSubmit?: (data: EodUpdateData) => void;
}

export interface EodUpdateData {
  quantity_today: number;
  hours_worked: number;
  notes: string;
  flag_issue: boolean;
  issue_type: string;
  issue_description: string;
  issue_photo: File | null;
}

const ISSUE_TYPES = [
  'Material shortage',
  'Machine breakdown',
  'Drawing unclear',
  'Quality concern',
  'Other',
];

export default function EodUpdateModal({
  open,
  onClose,
  jcNumber,
  carpenterName,
  totalQuantity,
  completedSoFar,
  onSubmit,
}: EodUpdateModalProps) {
  const [quantity, setQuantity] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [flagIssue, setFlagIssue] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePhoto, setIssuePhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const runningTotal = completedSoFar + (parseInt(quantity) || 0);

  function reset() {
    setQuantity('');
    setHours('');
    setNotes('');
    setFlagIssue(false);
    setIssueType('');
    setIssueDesc('');
    setIssuePhoto(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!quantity || !hours) return;
    setSubmitting(true);
    const data: EodUpdateData = {
      quantity_today: parseInt(quantity),
      hours_worked: parseFloat(hours),
      notes,
      flag_issue: flagIssue,
      issue_type: issueType,
      issue_description: issueDesc,
      issue_photo: issuePhoto,
    };
    try {
      onSubmit?.(data);
    } finally {
      setSubmitting(false);
      handleClose();
    }
  }

  const canSubmit = quantity.trim() !== '' && hours.trim() !== '' && (!flagIssue || issueType !== '');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-card rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border-subtle flex-shrink-0">
          <h2 className="text-xl font-bold text-primary">Submit EOD Update</h2>
          <p className="text-sm text-ink-500 mt-0.5">End-of-day progress for {jcNumber}</p>
        </div>

        {/* Scrollable Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">

          {/* Job Card + Carpenter row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                Job Card
              </label>
              <div className="w-full border border-border-subtle rounded px-3 py-2 text-sm text-ink-700 bg-surface-alt">
                {jcNumber}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                Carpenter
              </label>
              <div className="w-full border border-border-subtle rounded px-3 py-2 text-sm text-ink-700 bg-surface-alt">
                {carpenterName}
              </div>
            </div>
          </div>

          {/* Quantity Completed Today */}
          <div>
            <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Quantity Completed Today <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max={totalQuantity}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full border border-border-strong rounded px-3 py-2.5 text-sm text-ink-700 placeholder-ink-300 focus:outline-none focus:ring-1 focus:ring-secondary"
            />
            {quantity !== '' && (
              <p className="text-xs font-medium mt-1.5" style={{ color: '#B8892B' }}>
                Running total so far: {runningTotal} / {totalQuantity} units
              </p>
            )}
          </div>

          {/* Hours Worked */}
          <div>
            <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Hours Worked <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="0"
              className="w-full border border-border-strong rounded px-3 py-2.5 text-sm text-ink-700 placeholder-ink-300 focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          {/* Progress Notes */}
          <div>
            <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Progress Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="What was done today?"
              className="w-full border border-border-strong rounded px-3 py-2 text-sm text-ink-700 placeholder-ink-300 focus:outline-none focus:ring-1 focus:ring-secondary resize-none"
            />
          </div>

          {/* Flag Issues Toggle */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-700">Any issues to flag?</span>
              <button
                type="button"
                onClick={() => {
                  setFlagIssue(v => !v);
                  if (flagIssue) { setIssueType(''); setIssueDesc(''); setIssuePhoto(null); }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${flagIssue ? 'bg-secondary' : 'bg-border-strong'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${flagIssue ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* Issue Panel */}
            {flagIssue && (
              <div className="mt-3 bg-gold-light border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-bold text-ink-700 uppercase tracking-wider">Issue Type</p>

                <div className="space-y-2">
                  {ISSUE_TYPES.map(type => (
                    <label
                      key={type}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        issueType === type
                          ? 'border-secondary bg-white'
                          : 'border-amber-200 bg-white hover:bg-amber-50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          issueType === type ? 'border-secondary' : 'border-ink-300'
                        }`}
                      >
                        {issueType === type && (
                          <div className="w-2 h-2 rounded-full bg-secondary" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="issue_type"
                        value={type}
                        checked={issueType === type}
                        onChange={() => setIssueType(type)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-ink-700">{type}</span>
                    </label>
                  ))}
                </div>

                {/* Issue Description */}
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1">Description</label>
                  <textarea
                    value={issueDesc}
                    onChange={e => setIssueDesc(e.target.value)}
                    rows={2}
                    placeholder="Hinges pending — hardware not yet delivered"
                    className="w-full border border-amber-200 rounded px-3 py-2 text-sm text-ink-700 placeholder-ink-300 focus:outline-none focus:ring-1 focus:ring-secondary resize-none bg-white"
                  />
                </div>

                {/* Attach Photo */}
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setIssuePhoto(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full border border-dashed border-amber-300 rounded-lg py-3 flex items-center justify-center gap-2 text-sm text-ink-500 hover:bg-amber-50 transition"
                  >
                    <span>📷</span>
                    <span>{issuePhoto ? issuePhoto.name : 'Attach photo (optional)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between gap-4 flex-shrink-0">
          <p className="text-xs text-ink-400">Submit between 5 PM – 7 PM</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2 border border-border-strong text-ink-700 text-sm font-medium rounded hover:bg-surface-alt transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="px-5 py-2 bg-secondary text-white text-sm font-semibold rounded hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
