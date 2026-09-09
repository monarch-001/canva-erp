import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SendQuotationModal from '../components/SendQuotationModal';
import RecordResponseModal from '../components/RecordResponseModal';
import ConvertToWOModal from '../components/ConvertToWOModal';

// ─── Types ────────────────────────────────────────────────────────────────────
type QtStatus =
  | 'draft'
  | 'pending_approval'
  | 'sent'
  | 'negotiating'
  | 'accepted'
  | 'rejected'
  | 'converted';

interface QuoteLineItem {
  description: string;
  qty: number;
  unit: string;
  amount: number;
}

interface QuotationDetailData {
  id: string;
  qt_number: string;
  status: QtStatus;
  title: string;
  item_count: number;
  created_by: string;
  created_date: string;
  valid_until: string;
  client: string;
  client_location: string;
  // Internal view
  material_cost: number;
  labour_cost: number;
  overhead: number;
  target_margin: number;   // percentage e.g. 20
  calculated_price: number;
  override_price: number | null;
  internal_notes: string;
  // Client view
  line_items: QuoteLineItem[];
  terms: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

function statusPill(status: QtStatus) {
  const map: Record<QtStatus, string> = {
    draft: 'bg-ink-100 text-ink-500',
    pending_approval: 'bg-amber-100 text-amber-700',
    sent: 'bg-sky-100 text-sky-700',
    negotiating: 'bg-orange-100 text-orange-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
    converted: 'bg-green-100 text-green-700',
  };
  const label: Record<QtStatus, string> = {
    draft: 'DRAFT',
    pending_approval: 'PENDING APPROVAL',
    sent: 'SENT',
    negotiating: 'NEGOTIATING',
    accepted: 'ACCEPTED',
    rejected: 'REJECTED',
    converted: 'CONVERTED',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${map[status]}`}>
      {label[status]}
    </span>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_QUOTATION: QuotationDetailData = {
  id: 'qt14',
  qt_number: 'QT-26-014',
  status: 'negotiating',
  title: 'WeWork Cyber City',
  item_count: 6,
  created_by: 'Gaurav Raj',
  created_date: '10-Aug-2026',
  valid_until: '24-Aug-2026',
  client: 'WeWork India',
  client_location: 'WeWork Cyber City, Gurugram',
  // Internal
  material_cost: 120000,
  labour_cost: 48000,
  overhead: 24000,
  target_margin: 20,
  calculated_price: 240000,
  override_price: 218000,
  internal_notes:
    'Client negotiating on workstation unit price — hold firm above ₹2,10,000 to protect margin.',
  // Client view
  line_items: [
    { description: 'Executive Cabin Workstation — L-shaped', qty: 6, unit: 'Nos', amount: 210000 },
    { description: 'Delivery to site', qty: 1, unit: 'Lot', amount: 8000 },
  ],
  terms: [
    'Advance payment: 50% on order confirmation',
    'Balance: On delivery',
    'Delivery: 18 working days from advance receipt',
    'This quotation is valid until 24-Aug-2026',
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuotationDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showSendModal, setShowSendModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(() => window.location.pathname.endsWith('/convert'));

  // In real app: fetch by id. For now use mock.
  const q = MOCK_QUOTATION;

  const totalCost = q.material_cost + q.labour_cost + q.overhead;
  const finalPrice = q.override_price ?? q.calculated_price;
  const actualMarginPct = ((finalPrice - totalCost) / finalPrice) * 100;
  const aboveTarget = actualMarginPct >= q.target_margin;

  const subtotalExGst = q.line_items.reduce((s, i) => s + i.amount, 0);
  const gst = Math.round(subtotalExGst * 0.18);
  const total = subtotalExGst + gst;

  // Button visibility by status
  const canRecordResponse =
    q.status === 'sent' || q.status === 'negotiating';
  const canConvert = q.status === 'accepted';
  const canSend =
    q.status === 'draft' || q.status === 'pending_approval';

  return (
    <div className="min-h-screen bg-[#F5F2ED] ml-[220px]">
      {/* Back nav */}
      <div className="px-8 pt-6 pb-2">
        <button
          onClick={() => navigate('/quotations')}
          className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <span>←</span>
          <span>Back to Quotations</span>
        </button>
      </div>

      {/* Header card */}
      <div className="mx-8 mb-6 bg-white border border-[#D5CFC8] rounded-xl px-6 py-5">
        {/* QT number + status + actions */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-[#B8892B]">{q.qt_number}</span>
            {statusPill(q.status)}
          </div>
          <div className="flex items-center gap-2">
            {canSend && (
              <button
                onClick={() => setShowSendModal(true)}
                className="px-4 py-2 bg-[#B8892B] text-white text-sm font-medium rounded-lg hover:bg-[#9a7224] transition-colors"
              >
                Send to Client
              </button>
            )}
            {canRecordResponse && (
              <button
                onClick={() => setShowResponseModal(true)}
                className="px-4 py-2 bg-[#B8892B] text-white text-sm font-medium rounded-lg hover:bg-[#9a7224] transition-colors"
              >
                Record Response
              </button>
            )}
            {canConvert && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="px-4 py-2 bg-[#B8892B] text-white text-sm font-medium rounded-lg hover:bg-[#9a7224] transition-colors"
              >
                Convert to Work Order
              </button>
            )}
            <button
              onClick={() => navigate(`/quotations/${id}/revision`)}
              className="px-4 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
            >
              Create Revision
            </button>
            <button
              onClick={() => alert('Download PDF')}
              className="px-4 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-medium rounded-lg hover:bg-[#F5F2ED] transition-colors"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-ink-900 mb-1">
          {q.title} — {q.item_count} items
        </h1>

        {/* Meta */}
        <p className="text-sm text-ink-400">
          Created by {q.created_by} · {q.created_date} · Valid until {q.valid_until}
        </p>
      </div>

      {/* Two-column body */}
      <div className="mx-8 mb-10 flex gap-5 items-start">
        {/* ── LEFT: Internal View ──────────────────────────────── */}
        <div className="flex-[1.2] bg-[#F3E7CD] border border-[#D5C89A] rounded-xl p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-base">🔒</span>
            <h2 className="text-base font-bold text-ink-900">Internal View — FM Only</h2>
          </div>

          {/* Cost rows */}
          <div className="space-y-3 mb-5">
            <CostRow label="Material cost" value={fmtINR(q.material_cost)} />
            <CostRow label="Labour cost" value={fmtINR(q.labour_cost)} />
            <CostRow label="Overhead" value={fmtINR(q.overhead)} />
            <div className="border-t border-[#D5C89A] pt-3">
              <CostRow label="Total cost" value={fmtINR(totalCost)} bold />
            </div>
            <CostRow label="Target margin" value={`${q.target_margin}%`} />
            <CostRow label="Calculated price" value={fmtINR(q.calculated_price)} />
            {q.override_price !== null && (
              <CostRow
                label="Override price (used)"
                value={fmtINR(q.override_price)}
                highlight
              />
            )}
          </div>

          {/* Actual Margin */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-bold tracking-widest text-ink-700 uppercase">
              Actual Margin
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                aboveTarget
                  ? 'bg-green-500 text-white'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {actualMarginPct.toFixed(1)}% — {aboveTarget ? 'Above Target' : 'Below Target'}
            </span>
          </div>

          {/* Internal Notes */}
          {q.internal_notes && (
            <div className="border-t border-[#D5C89A] pt-4">
              <p className="text-xs text-ink-500 leading-relaxed">
                <span className="font-semibold text-ink-700">Internal Notes: </span>
                {q.internal_notes}
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Client View ───────────────────────────────── */}
        <div className="flex-1 bg-white border border-[#D5CFC8] rounded-xl p-6">
          {/* Company header */}
          <div className="mb-5 pb-4 border-b border-[#D5CFC8]">
            <h2 className="text-lg font-black tracking-widest text-ink-900 uppercase mb-0.5">
              Canva Concepts
            </h2>
            <p className="text-xs text-ink-400">Client View — exactly what appears on the PDF</p>
          </div>

          {/* Quotation meta */}
          <div className="flex justify-between mb-1">
            <span className="text-sm font-semibold text-ink-900">
              Quotation No: {q.qt_number}
            </span>
            <span className="text-sm font-semibold text-ink-900">
              Valid Until: {q.valid_until}
            </span>
          </div>
          <p className="text-xs text-ink-400 mb-4">Date: {q.created_date}</p>

          <p className="text-sm font-semibold text-ink-900 mb-4">
            TO: {q.client_location}
          </p>

          {/* Line items table */}
          <div className="mb-5">
            <div className="border-t border-[#D5CFC8]" />
            {q.line_items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-3 border-b border-[#D5CFC8]"
              >
                <span className="text-sm text-ink-700 flex-1 pr-4">{item.description}</span>
                <span className="text-xs text-ink-400 w-16 text-center">
                  {item.qty} {item.unit}
                </span>
                <span className="text-sm font-medium text-ink-900 w-24 text-right">
                  {fmtINR(item.amount)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm text-ink-500">
              <span>Subtotal (ex-GST)</span>
              <span>{fmtINR(subtotalExGst)}</span>
            </div>
            <div className="flex justify-between text-sm text-ink-500">
              <span>GST @ 18%</span>
              <span>{fmtINR(gst)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-ink-900 pt-2 border-t border-[#D5CFC8]">
              <span>TOTAL</span>
              <span>{fmtINR(total)}</span>
            </div>
          </div>

          {/* T&C */}
          <div className="border-t border-[#D5CFC8] pt-4">
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
              Terms &amp; Conditions
            </p>
            <ul className="space-y-1">
              {q.terms.map((t, idx) => (
                <li key={idx} className="text-xs text-ink-500 flex gap-1.5">
                  <span>•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Record Response Modal */}
      {showResponseModal && (
        <RecordResponseModal
          qtNumber={q.qt_number}
          clientName={q.client}
          clientType="B2B"
          onClose={() => setShowResponseModal(false)}
          onSave={(_data) => {
            setShowResponseModal(false);
            alert('Response recorded!');
          }}
        />
      )}

      {/* Convert to WO Modal */}
      {showConvertModal && (
        <ConvertToWOModal
          qtNumber={q.qt_number}
          clientName={q.client}
          itemCount={q.item_count}
          defaultTitle={`${q.client} — ${q.title}`}
          onClose={() => setShowConvertModal(false)}
          onConvert={(_data) => {
            setShowConvertModal(false);
            navigate('/work-orders');
          }}
        />
      )}

      {/* Send Quotation Modal */}
      {showSendModal && (
        <SendQuotationModal
          qtNumber={q.qt_number}
          clientName={q.title}
          subject={`Quotation ${q.qt_number} — Executive Cabin Workstations`}
          messageTemplate={`Dear ${q.title},\n\nPlease find attached our quotation for Executive Cabin Workstation — L-shaped.\n\nThis quotation is valid until ${q.valid_until}.\n\nPlease feel free to contact us for any queries.\n\nRegards,\nCanva Concepts`}
          onClose={() => setShowSendModal(false)}
          onSend={(_data) => {
            setShowSendModal(false);
            alert('Quotation sent successfully!');
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────
function CostRow({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-semibold text-ink-900' : 'text-ink-500'}`}>
        {label}
      </span>
      <span
        className={`text-sm ${
          highlight
            ? 'font-bold text-[#B8892B]'
            : bold
            ? 'font-semibold text-ink-900'
            : 'text-ink-700'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
