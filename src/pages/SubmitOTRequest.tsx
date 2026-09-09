import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const SIDEBAR_NAV = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Work Orders', path: '/work-orders' },
  { label: 'Quotations', path: '/quotations' },
  { label: 'Change Requests', path: '/change-requests' },
  { label: 'Vendors', path: '/vendors' },
  { label: 'Materials', path: '/materials' },
  { label: 'Purchase Requisitions', path: '/purchase-requisitions' },
  { label: 'Purchase Orders', path: '/purchase-orders' },
  { label: 'Warehouse & Inventory', path: '/warehouse' },
  { label: 'Production', path: '/production' },
  { label: 'Overtime', path: '/production/overtime' },
  { label: 'Quality Control', path: '/quality-control' },
  { label: 'Dispatch & Delivery', path: '/dispatch' },
  { label: 'Invoices', path: '/invoices' },
  { label: 'Reports', path: '/reports' },
  { label: 'Settings', path: '/settings' },
];

type OtType = 'daily' | 'holiday' | 'weekend';

interface CarpenterOption {
  id: string;
  name: string;
  team: string;
  otThisMonth: number;
  otCap: number;
}

const MOCK_CARPENTERS: CarpenterOption[] = [
  { id: 'c1', name: 'Ramesh Kumar', team: 'Assembly Team', otThisMonth: 24, otCap: 26 },
  { id: 'c2', name: 'Suresh Patel', team: 'Finishing Team', otThisMonth: 18, otCap: 26 },
  { id: 'c3', name: 'Ajay Sharma', team: 'Carpentry Unit A', otThisMonth: 10, otCap: 26 },
  { id: 'c4', name: 'Mohan Das', team: 'Assembly Team', otThisMonth: 26, otCap: 26 },
  { id: 'c5', name: 'Vikram Singh', team: 'Carpentry Unit B', otThisMonth: 22, otCap: 26 },
];

const MOCK_WORK_ORDERS = [
  { id: 'wo1', label: 'WO-CHH-26-001 — Reception Counter' },
  { id: 'wo2', label: 'WO-B2C-26-012 — Custom Wardrobe' },
  { id: 'wo3', label: 'WO-CHH-26-004 — Office Cabin' },
];

const MOCK_JOB_CARDS: Record<string, { id: string; label: string }[]> = {
  wo1: [
    { id: 'jc1', label: 'JC-230826-001 — Assemble base frame' },
    { id: 'jc2', label: 'JC-230826-002 — Sand & Polish surface' },
  ],
  wo2: [
    { id: 'jc3', label: 'JC-230820-001 — Cut wardrobe panels' },
  ],
  wo3: [
    { id: 'jc4', label: 'JC-230815-001 — Cabin frame assembly' },
    { id: 'jc5', label: 'JC-230815-002 — Door fitting' },
  ],
};

const OT_TYPE_CONFIG: Record<OtType, { label: string; description: string }> = {
  daily: { label: 'Daily OT', description: 'After 6 PM on a working day' },
  holiday: { label: 'Holiday Work', description: 'Work on a public holiday' },
  weekend: { label: 'Weekend Work', description: 'Work on weekly off day' },
};

export default function SubmitOTRequest() {
  const navigate = useNavigate();

  const [otType, setOtType] = useState<OtType>('daily');
  const [selectedCarpenterId, setSelectedCarpenterId] = useState('c1');
  const [date, setDate] = useState('2026-08-10');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('21:00');
  const [hoursRequested, setHoursRequested] = useState('3');
  const [linkedWoId, setLinkedWoId] = useState('wo1');
  const [linkedJcId, setLinkedJcId] = useState('jc1');
  const [reason, setReason] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [advanceNotice, setAdvanceNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedCarpenter = MOCK_CARPENTERS.find(c => c.id === selectedCarpenterId);
  const hoursRemaining = selectedCarpenter ? selectedCarpenter.otCap - selectedCarpenter.otThisMonth : 0;
  const isNearCap = selectedCarpenter && hoursRemaining <= 2 && hoursRemaining > 0;
  const isCapped = selectedCarpenter && hoursRemaining <= 0;
  const estimatedCost = parseFloat(hoursRequested) * 100 || 0;
  const availableJobs = linkedWoId ? (MOCK_JOB_CARDS[linkedWoId] || []) : [];

  useEffect(() => {
    if (availableJobs.length > 0) {
      setLinkedJcId(availableJobs[0].id);
    } else {
      setLinkedJcId('');
    }
  }, [linkedWoId]);

  const requiresAdvanceNotice = otType === 'holiday' || otType === 'weekend';

  function handleSubmit() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      navigate('/production/overtime');
    }, 1200);
  }

  const canSubmit =
    selectedCarpenterId &&
    date &&
    startTime &&
    hoursRequested &&
    reason.trim() &&
    workDescription.trim() &&
    (!requiresAdvanceNotice || advanceNotice);

  return (
    <div className="min-h-screen bg-[#F5F2EC]">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-[220px] bg-primary flex flex-col z-30">
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Canva Concepts</p>
              <p className="text-white/50 text-xs">Factory ERP</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {SIDEBAR_NAV.map(item => {
            const active = item.path === '/production/overtime';
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  active ? 'text-white font-semibold' : 'text-white/60 hover:text-white/90'
                }`}
              >
                {active && <span className="mr-1">·</span>}
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="ml-[220px] flex flex-col min-h-screen">
        <Header title="Submit Overtime Request" subtitle="Overtime Management" />

        <main className="flex-1 px-8 py-6 pb-32">
          {/* Back nav */}
          <button
            onClick={() => navigate('/production/overtime')}
            className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 mb-5 transition-colors"
          >
            <span>←</span>
            <span>Back to Overtime Management</span>
          </button>

          {/* Page title */}
          <h1 className="text-2xl font-bold text-ink-900 mb-1">Submit OT Request</h1>
          <p className="text-sm text-ink-500 mb-6">
            Must be submitted and approved BEFORE the carpenter works overtime. No retrospective requests.
          </p>

          <div className="flex flex-col gap-4 max-w-3xl">
            {/* Request Type */}
            <div className="bg-white rounded-xl border border-[#E8E2D9] p-6">
              <h2 className="text-base font-semibold text-ink-900 mb-4">Request Type</h2>
              <p className="text-xs text-ink-500 mb-3">Type <span className="text-red-500">*</span></p>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(OT_TYPE_CONFIG) as OtType[]).map(type => {
                  const cfg = OT_TYPE_CONFIG[type];
                  const selected = otType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setOtType(type)}
                      className={`text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        selected
                          ? 'border-secondary bg-[#F3E7CD]'
                          : 'border-[#E8E2D9] bg-white hover:border-ink-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selected ? 'border-secondary' : 'border-ink-300'
                        }`}>
                          {selected && <div className="w-2 h-2 rounded-full bg-secondary" />}
                        </div>
                        <span className={`text-sm font-semibold ${selected ? 'text-secondary' : 'text-ink-900'}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-ink-400 pl-6">{cfg.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Carpenter */}
            <div className="bg-white rounded-xl border border-[#E8E2D9] p-6">
              <h2 className="text-base font-semibold text-ink-900 mb-4">Carpenter</h2>
              <label className="block text-xs text-ink-500 mb-1">
                Carpenter <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCarpenterId}
                onChange={e => setSelectedCarpenterId(e.target.value)}
                className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 bg-white focus:outline-none focus:border-secondary"
              >
                {MOCK_CARPENTERS.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.team}</option>
                ))}
              </select>

              {/* Near cap warning */}
              {selectedCarpenter && (isNearCap || isCapped) && (
                <div className={`mt-3 rounded-lg border px-4 py-3 flex items-start justify-between ${
                  isCapped
                    ? 'bg-red-50 border-red-200'
                    : 'bg-[#FFF8EC] border-[#F3D89C]'
                }`}>
                  <div>
                    <p className={`text-sm font-semibold ${isCapped ? 'text-red-700' : 'text-amber-700'}`}>
                      OT this month: {selectedCarpenter.otThisMonth} / {selectedCarpenter.otCap} hours
                    </p>
                    <p className={`text-xs mt-0.5 ${isCapped ? 'text-red-600' : 'text-amber-600'}`}>
                      {isCapped
                        ? '▲ This carpenter has reached the monthly cap. FM override required to proceed.'
                        : `▲ This carpenter is close to the monthly cap. Requesting more than ${hoursRemaining} hours will require FM override.`}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold whitespace-nowrap ml-4 ${isCapped ? 'text-red-700' : 'text-amber-700'}`}>
                    {isCapped ? 'Cap reached' : `Hours remaining: ${hoursRemaining}`}
                  </span>
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="bg-white rounded-xl border border-[#E8E2D9] p-6">
              <h2 className="text-base font-semibold text-ink-900 mb-4">Date & Time</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-ink-500 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary"
                  />
                  <p className="text-xs text-ink-400 mt-1">Today or future only</p>
                </div>
                <div>
                  <label className="block text-xs text-ink-500 mb-1">
                    OT Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary"
                  />
                  <p className="text-xs text-ink-400 mt-1">Minimum 6:00 PM for Daily OT</p>
                </div>
                <div>
                  <label className="block text-xs text-ink-500 mb-1">OT End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary"
                  />
                  <p className="text-xs text-ink-400 mt-1">Optional — estimate</p>
                </div>
              </div>
              <div className="max-w-xs">
                <label className="block text-xs text-ink-500 mb-1">
                  Hours Requested <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.5"
                  max={otType === 'daily' ? 3 : 8}
                  step="0.5"
                  value={hoursRequested}
                  onChange={e => setHoursRequested(e.target.value)}
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary"
                />
                <p className="text-xs text-ink-400 mt-1">
                  Max {otType === 'daily' ? '3' : '8'} hours for {OT_TYPE_CONFIG[otType].label}
                </p>
              </div>
            </div>

            {/* Work Reference */}
            <div className="bg-white rounded-xl border border-[#E8E2D9] p-6">
              <h2 className="text-base font-semibold text-ink-900 mb-4">Work Reference</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-ink-500 mb-1">Linked Work Order</label>
                  <select
                    value={linkedWoId}
                    onChange={e => setLinkedWoId(e.target.value)}
                    className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 bg-white focus:outline-none focus:border-secondary"
                  >
                    <option value="">— None —</option>
                    {MOCK_WORK_ORDERS.map(wo => (
                      <option key={wo.id} value={wo.id}>{wo.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-ink-400 mt-1">Optional but recommended</p>
                </div>
                <div>
                  <label className="block text-xs text-ink-500 mb-1">Linked Job Card</label>
                  <select
                    value={linkedJcId}
                    onChange={e => setLinkedJcId(e.target.value)}
                    disabled={!linkedWoId || availableJobs.length === 0}
                    className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 bg-white focus:outline-none focus:border-secondary disabled:opacity-50"
                  >
                    <option value="">— None —</option>
                    {availableJobs.map(jc => (
                      <option key={jc.id} value={jc.id}>{jc.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-ink-400 mt-1">Auto-populates from WO</p>
                </div>
              </div>
            </div>

            {/* Reason & Work Description */}
            <div className="bg-white rounded-xl border border-[#E8E2D9] p-6">
              <h2 className="text-base font-semibold text-ink-900 mb-4">Reason & Work Description</h2>
              <div className="mb-4">
                <label className="block text-xs text-ink-500 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Why is OT needed? Be specific. e.g. Behind schedule — delivery tomorrow"
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1">
                  Work Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={workDescription}
                  onChange={e => setWorkDescription(e.target.value)}
                  placeholder="What exactly will the carpenter work on?"
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary resize-none"
                />
              </div>
            </div>

            {/* Advance Notice Confirmation */}
            <div className="bg-white rounded-xl border border-[#E8E2D9] p-6">
              <h2 className="text-base font-semibold text-ink-900 mb-1">Advance Notice Confirmation</h2>
              <p className="text-xs text-ink-400 mb-4">Required only for Holiday Work and Weekend Work requests</p>
              <label className={`flex items-start gap-3 cursor-pointer group ${
                !requiresAdvanceNotice ? 'opacity-40 pointer-events-none' : ''
              }`}>
                <div
                  onClick={() => requiresAdvanceNotice && setAdvanceNotice(v => !v)}
                  className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    advanceNotice ? 'bg-secondary border-secondary' : 'border-[#C9BFA9] group-hover:border-secondary'
                  }`}
                >
                  {advanceNotice && <span className="text-white text-xs font-bold leading-none">✓</span>}
                </div>
                <span className="text-sm text-ink-700">
                  I confirm 24-hour advance notice has been given to the carpenter
                </span>
              </label>
              <p className="text-xs text-ink-400 mt-3 leading-relaxed">
                This is mandatory — the request cannot be submitted without confirming advance notice for Holiday/Weekend work.
                The carpenter may decline holiday/weekend work without penalty.
              </p>
            </div>

            {/* Estimated Cost */}
            <div className="bg-[#F3E7CD] rounded-xl border border-[#E8C96A] px-6 py-4">
              <p className="text-xs font-semibold text-ink-700 mb-0.5">Estimated Cost</p>
              <p className="text-xs text-ink-500 mb-2">
                {hoursRequested} hours × ₹100/hour flat rate
              </p>
              <p className="text-3xl font-bold text-ink-900">₹{estimatedCost.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </main>

        {/* Sticky footer */}
        <footer className="fixed bottom-0 left-[220px] right-0 bg-white border-t border-[#E8E2D9] px-8 py-4 flex items-center justify-between z-20">
          <p className="text-xs text-ink-400">FM will be notified via WhatsApp immediately upon submission</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/production/overtime')}
              className="px-5 py-2 text-sm text-ink-700 border border-[#E8E2D9] rounded-lg hover:bg-[#F5F2EC] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="px-6 py-2 text-sm font-semibold bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit for FM Approval'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
