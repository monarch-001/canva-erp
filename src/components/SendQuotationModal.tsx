import { useState } from 'react';

export interface SendQuotationProps {
  qtNumber: string;
  clientName: string;
  subject: string;
  messageTemplate: string;
  onClose: () => void;
  onSend: (data: { to: string; cc: string; subject: string; message: string }) => void;
}

export default function SendQuotationModal({
  qtNumber,
  clientName,
  subject: defaultSubject,
  messageTemplate,
  onClose,
  onSend,
}: SendQuotationProps) {
  const [to, setTo] = useState('procurement@wework.com');
  const [cc, setCc] = useState('gaurav@canvaconcepts.in');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(messageTemplate);
  const [errors, setErrors] = useState<{ to?: string; subject?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  function validate() {
    const e: { to?: string; subject?: string } = {};
    if (!to.trim()) e.to = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim()))
      e.to = 'Enter a valid email';
    if (!subject.trim()) e.subject = 'Subject is required';
    return e;
  }

  function handleSend() {
    setSubmitted(true);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) {
      onSend({ to, cc, subject, message });
    }
  }

  const inputBase =
    'w-full border rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-[#B8892B]/40 transition-colors';
  const inputNormal = `${inputBase} border-[#D5CFC8] bg-white`;
  const inputError = `${inputBase} border-red-400 bg-white`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[580px] mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#D5CFC8]">
          <h2 className="text-lg font-bold text-ink-900">
            Send Quotation to {clientName}
          </h2>
          <p className="text-sm text-ink-400 mt-0.5">
            {qtNumber} will be attached as a PDF
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* To + CC row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                To (Email) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  if (submitted) setErrors((prev) => ({ ...prev, to: undefined }));
                }}
                className={submitted && errors.to ? inputError : inputNormal}
                placeholder="client@example.com"
              />
              {submitted && errors.to && (
                <p className="text-xs text-red-500 mt-1">{errors.to}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                CC (optional)
              </label>
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className={inputNormal}
                placeholder="gaurav@canvaconcepts.in"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (submitted) setErrors((prev) => ({ ...prev, subject: undefined }));
              }}
              className={submitted && errors.subject ? inputError : inputNormal}
              placeholder="Quotation subject"
            />
            {submitted && errors.subject && (
              <p className="text-xs text-red-500 mt-1">{errors.subject}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className={`${inputNormal} resize-none leading-relaxed`}
            />
          </div>

          {/* Preview PDF */}
          <div>
            <button
              onClick={() => alert('PDF Preview coming soon')}
              className="px-4 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
            >
              Preview PDF
            </button>
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
            onClick={handleSend}
            className="px-5 py-2 bg-[#B8892B] text-white text-sm font-semibold rounded-lg hover:bg-[#9a7224] transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
