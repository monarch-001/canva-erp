import { useState } from 'react';

type ConversionMode = 'per_item' | 'all_items';

export interface ConvertToWOProps {
  qtNumber: string;
  clientName: string;
  itemCount: number;
  defaultTitle: string;
  onClose: () => void;
  onConvert: (data: { mode: ConversionMode; title: string }) => void;
}

export default function ConvertToWOModal({
  qtNumber,
  clientName,
  itemCount,
  defaultTitle,
  onClose,
  onConvert,
}: ConvertToWOProps) {
  const [mode, setMode] = useState<ConversionMode>('all_items');
  const [title, setTitle] = useState(defaultTitle);
  const [submitted, setSubmitted] = useState(false);

  function handleConvert() {
    setSubmitted(true);
    if (!title.trim()) return;
    onConvert({ mode, title });
  }

  const radioBase =
    'flex items-start gap-3 px-4 py-4 rounded-xl border cursor-pointer transition-colors';

  function radioClass(val: ConversionMode) {
    return mode === val
      ? `${radioBase} border-[#B8892B] bg-[#F3E7CD]`
      : `${radioBase} border-[#D5CFC8] bg-white hover:bg-[#F5F2ED]`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#D5CFC8]">
          <h2 className="text-lg font-bold text-ink-900">Convert Quotation to Work Order</h2>
          <p className="text-sm text-ink-400 mt-0.5 leading-snug">
            This will create a new Work Order based on this quotation. The quotation will be marked
            as converted.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Summary */}
          <p className="text-sm font-semibold text-ink-900">
            {qtNumber} — {clientName} has {itemCount} furniture item{itemCount !== 1 ? 's' : ''}
          </p>

          <p className="text-xs font-semibold text-ink-700">How should these be converted?</p>

          {/* Per item */}
          <label className={radioClass('per_item')}>
            <input
              type="radio"
              name="mode"
              value="per_item"
              checked={mode === 'per_item'}
              onChange={() => setMode('per_item')}
              className="accent-[#B8892B] w-4 h-4 mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-ink-900">One Work Order per item</p>
              <p className="text-xs text-ink-400 mt-0.5">
                Creates {itemCount} separate WO{itemCount !== 1 ? 's' : ''}, one per furniture item
              </p>
            </div>
          </label>

          {/* All items */}
          <label className={radioClass('all_items')}>
            <input
              type="radio"
              name="mode"
              value="all_items"
              checked={mode === 'all_items'}
              onChange={() => setMode('all_items')}
              className="accent-[#B8892B] w-4 h-4 mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-ink-900">One Work Order for all items</p>
              <p className="text-xs text-ink-400 mt-0.5">
                Creates a single WO covering all {itemCount} item{itemCount !== 1 ? 's' : ''} together
              </p>
            </div>
          </label>

          {/* WO Title */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">
              Confirm Work Order Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-[#B8892B]/40 transition-colors ${
                submitted && !title.trim()
                  ? 'border-red-400 bg-white'
                  : 'border-[#D5CFC8] bg-white'
              }`}
              placeholder="Work order title"
            />
            {submitted && !title.trim() && (
              <p className="text-xs text-red-500 mt-1">Work order title is required.</p>
            )}
          </div>
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
            onClick={handleConvert}
            className="px-5 py-2 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors"
          >
            Create Work Order
          </button>
        </div>
      </div>
    </div>
  );
}
