import { useState } from 'react';

interface Props {
  poNumber: string;
  vendorName: string;
  totalAmount: string;
  deliveryDate: string;
  defaultPhone?: string;
  defaultEmail?: string;
  onClose: () => void;
  onSend: (data: { phone: string; email: string; channel: 'whatsapp' | 'email' }) => void;
}

export default function SendPOModal({
  poNumber,
  vendorName,
  totalAmount,
  deliveryDate,
  defaultPhone = '+91 98110 22334',
  defaultEmail = '',
  onClose,
  onSend,
}: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);

  const hindiMessage = `नमस्ते ${vendorName},
कृपया संलग्न Purchase Order देखें
PO Number: ${poNumber}
कुल राशि: ${totalAmount}
डिलीवरी: ${deliveryDate}
कृपया 4 घंटे में पुष्टि करें
धन्यवाद,
Canva Concepts`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-[580px] max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#D5CFC8]">
          <h2 className="text-lg font-bold text-ink-900">
            Send PO to {vendorName}
          </h2>
          <p className="text-sm text-ink-400 mt-0.5">
            {poNumber} will be attached as a PDF — content generated in Hindi
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Vendor Phone (WhatsApp) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-[#D5CFC8] rounded-lg px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-[#B8892B]/30"
            />
          </div>

          {/* WhatsApp Preview */}
          <div className="border border-green-200 bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">💬</span>
              <span className="text-sm font-bold text-green-700">
                WhatsApp Message Preview (Hindi)
              </span>
            </div>
            <div className="space-y-0.5">
              {hindiMessage.split('\n').map((line, idx) => {
                const isBold =
                  line.startsWith('PO Number:') ||
                  line.startsWith('कुल राशि:') ||
                  line.startsWith('डिलीवरी:') ||
                  line === 'Canva Concepts';
                return (
                  <p
                    key={idx}
                    className={`text-sm text-ink-900 ${isBold ? 'font-bold' : ''}`}
                  >
                    {line}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Vendor Email <span className="text-ink-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="purchase@greenlam.com"
              className="w-full border border-[#D5CFC8] rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-[#B8892B]/30"
            />
          </div>

          {/* Preview PDF */}
          <div>
            <button
              onClick={() => alert('PDF preview')}
              className="px-4 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
            >
              Preview PDF
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#D5CFC8] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSend({ phone, email, channel: 'email' })}
              className="px-4 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
            >
              Send via Email
            </button>
            <button
              onClick={() => onSend({ phone, email, channel: 'whatsapp' })}
              className="px-5 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors"
            >
              Send via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
