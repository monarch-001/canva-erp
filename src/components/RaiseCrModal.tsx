import { useState } from 'react';

const CHANGE_TYPES = [
  { label: 'Dimension Change',        tier: 2, tierName: 'Moderate Change', tierDesc: 'Requires FM and Site Manager approval. Cost and time impact must be assessed.' },
  { label: 'Finish / Material Change',tier: 1, tierName: 'Minor Change',    tierDesc: 'This will be reviewed by the Supervisor. FM is notified but no action is needed from them.' },
  { label: 'Additional Item',         tier: 3, tierName: 'Major Change',     tierDesc: 'Requires dual approval from FM and Site Manager. A revised quotation may be required.' },
  { label: 'Design Modification',     tier: 2, tierName: 'Moderate Change', tierDesc: 'Requires FM and Site Manager approval. Cost and time impact must be assessed.' },
  { label: 'Scope Reduction',         tier: 1, tierName: 'Minor Change',    tierDesc: 'This will be reviewed by the Supervisor. FM is notified but no action is needed from them.' },
  { label: 'Delivery Date Change',    tier: 2, tierName: 'Moderate Change', tierDesc: 'Requires FM and Site Manager approval. Cost and time impact must be assessed.' },
  { label: 'Other',                   tier: 2, tierName: 'Moderate Change', tierDesc: 'Requires FM and Site Manager approval. Cost and time impact must be assessed.' },
];

export interface RaiseCrData {
  changeType: string;
  tier: number;
  description: string;
  reason: string;
  affectsDelivery: boolean;
}

interface RaiseCrModalProps {
  open: boolean;
  woNumber: string;
  woTitle: string;
  onClose: () => void;
  onSubmit: (data: RaiseCrData) => void;
}

export default function RaiseCrModal({ open, woNumber, woTitle, onClose, onSubmit }: RaiseCrModalProps) {
  const [changeTypeLabel, setChangeTypeLabel] = useState(CHANGE_TYPES[0].label);
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [affectsDelivery, setAffectsDelivery] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const selectedType = CHANGE_TYPES.find(t => t.label === changeTypeLabel) || CHANGE_TYPES[0];

  const tierColor =
    selectedType.tier === 1 ? { bg: 'bg-[#FFF8EC]', border: 'border-[#F3D89C]', badge: 'bg-secondary text-white', text: 'text-amber-800' }
    : selectedType.tier === 2 ? { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-500 text-white', text: 'text-amber-800' }
    : { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-600 text-white', text: 'text-red-800' };

  const descOk = description.trim().length >= 20;
  const reasonOk = reason.trim().length >= 10;
  const canSubmit = descOk && reasonOk;

  function handleSubmit() {
    setSubmitted(true);
    if (!canSubmit) return;
    onSubmit({
      changeType: changeTypeLabel,
      tier: selectedType.tier,
      description,
      reason,
      affectsDelivery,
    });
    // Reset
    setChangeTypeLabel(CHANGE_TYPES[0].label);
    setDescription('');
    setReason('');
    setAffectsDelivery(false);
    setSubmitted(false);
  }

  function handleClose() {
    setChangeTypeLabel(CHANGE_TYPES[0].label);
    setDescription('');
    setReason('');
    setAffectsDelivery(false);
    setSubmitted(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#E8E2D9] flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Raise Change Request</h2>
            <p className="text-sm text-ink-500 mt-0.5">{woNumber} · {woTitle}</p>
          </div>
          <button onClick={handleClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none transition-colors ml-4">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Change Type */}
          <div>
            <label className="block text-sm font-semibold text-ink-900 mb-1">
              Change Type <span className="text-red-500">*</span>
            </label>
            <select
              value={changeTypeLabel}
              onChange={e => setChangeTypeLabel(e.target.value)}
              className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2.5 text-sm text-ink-900 bg-white focus:outline-none focus:border-secondary"
            >
              {CHANGE_TYPES.map(t => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Tier suggestion banner */}
          <div className={`rounded-lg border ${tierColor.bg} ${tierColor.border} px-4 py-3`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${tierColor.badge}`}>
                SUGGESTED: TIER {selectedType.tier}
              </span>
              <span className={`text-sm font-semibold ${tierColor.text}`}>{selectedType.tierName}</span>
            </div>
            <p className={`text-xs leading-relaxed ${tierColor.text}`}>{selectedType.tierDesc}</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-ink-900 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe exactly what needs to change"
              className={`w-full border rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none resize-none ${
                submitted && !descOk ? 'border-red-400 focus:border-red-500' : 'border-[#E8E2D9] focus:border-secondary'
              }`}
            />
            <p className={`text-xs mt-1 ${submitted && !descOk ? 'text-red-500' : 'text-ink-400'}`}>
              Minimum 20 characters{description.length > 0 ? ` (${description.length})` : ''}
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-ink-900 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why is this change needed?"
              className={`w-full border rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none resize-none ${
                submitted && !reasonOk ? 'border-red-400 focus:border-red-500' : 'border-[#E8E2D9] focus:border-secondary'
              }`}
            />
            <p className={`text-xs mt-1 ${submitted && !reasonOk ? 'text-red-500' : 'text-ink-400'}`}>
              Minimum 10 characters{reason.length > 0 ? ` (${reason.length})` : ''}
            </p>
          </div>

          {/* Delivery date toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-ink-900">Does this affect the delivery date?</span>
            <button
              onClick={() => setAffectsDelivery(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                affectsDelivery ? 'bg-secondary' : 'bg-ink-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                affectsDelivery ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E2D9] flex items-center justify-between">
          <p className="text-xs text-ink-400">Fields marked * are required</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2 text-sm text-ink-700 border border-[#E8E2D9] rounded-lg hover:bg-[#F5F2EC] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 text-sm font-semibold bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Raise Change Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
