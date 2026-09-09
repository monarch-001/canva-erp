import { useState } from 'react';

type ClientResponse = 'accepted' | 'negotiating' | 'rejected' | null;

const REJECTION_REASONS = [
  'Price too high',
  'Timeline not acceptable',
  'Chose a competitor',
  'Project on hold',
  'Budget constraints',
  'Other',
];

export interface RecordResponseProps {
  qtNumber: string;
  clientName: string;
  clientType: 'B2B' | 'D2C';
  onClose: () => void;
  onSave: (data: { response: ClientResponse; rejectionReason?: string; notes?: string }) => void;
}

export default function RecordResponseModal({
  qtNumber,
  clientName,
  clientType,
  onClose,
  onSave,
}: RecordResponseProps) {
  const [response, setResponse] = useState<ClientResponse>(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isRejected = response === 'rejected';

  function handleSave() {
    setSubmitted(true);
    if (!response) return;
    onSave({ response, rejectionReason: isRejected ? rejectionReason : undefined, notes: notes || undefined });
  }

  const radioBase =
    'flex items-center gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-colors';

  function radioClass(val: ClientResponse) {
    if (response === val) {
      if (val === 'rejected') return `${radioBase} border-red-400 bg-red-50`;
      return `${radioBase} border-[#B8892B] bg-[#F3E7CD]`;
    }
    return `${radioBase} border-[#D5CFC8] bg-white hover:bg-[#F5F2ED]`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#D5CFC8]">
          <h2 className="text-lg font-bold text-ink-900">Record Client Response</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            {qtNumber} · {clientName} ({clientType})
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-semibold text-ink-700">Client Response</p>

          {/* Accepted */}
          <label className={radioClass('accepted')}>
            <input
              type="radio"
              name="response"
              value="accepted"
              checked={response === 'accepted'}
              onChange={() => setResponse('accepted')}
              className="accent-[#B8892B] w-4 h-4"
            />
            <span className="text-sm text-ink-900">Accepted — client wants to proceed</span>
          </label>

          {/* Negotiating */}
          <label className={radioClass('negotiating')}>
            <input
              type="radio"
              name="response"
              value="negotiating"
              checked={response === 'negotiating'}
              onChange={() => setResponse('negotiating')}
              className="accent-[#B8892B] w-4 h-4"
            />
            <span className="text-sm text-ink-900">Negotiating — client wants to discuss price</span>
          </label>

          {/* Rejected */}
          <label className={radioClass('rejected')}>
            <input
              type="radio"
              name="response"
              value="rejected"
              checked={response === 'rejected'}
              onChange={() => setResponse('rejected')}
              className="accent-red-500 w-4 h-4"
            />
            <span className="text-sm text-ink-900">Rejected — client does not want to proceed</span>
          </label>

          {/* Rejection sub-form */}
          {isRejected && (
            <div className="border border-red-300 bg-red-50 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border border-red-300 bg-white rounded-lg px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any further context to record"
                  className="w-full border border-red-300 bg-white rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none"
                />
              </div>
            </div>
          )}

          {submitted && !response && (
            <p className="text-xs text-red-500">Please select a client response.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#D5CFC8] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`px-5 py-2 text-white text-sm font-semibold rounded-lg transition-colors ${
              isRejected
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[#B8892B] hover:bg-[#9a7224]'
            }`}
          >
            Save Response
          </button>
        </div>
      </div>
    </div>
  );
}
