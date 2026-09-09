import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getCurrentUser } from '../utils/auth';

/* ─── Shared field components ─────────────────────────────── */
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[12px] font-semibold text-ink-700 mb-1.5">
      {children}
      {required && <span className="text-status-cancelled ml-0.5">*</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] text-ink-900 bg-white placeholder:text-ink-300 focus:outline-none focus:ring-1 focus:ring-secondary/50 focus:border-secondary transition-colors ${props.className ?? ''}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className={`w-full h-10 border border-border-subtle rounded-lg px-3 text-[13px] text-ink-900 bg-white focus:outline-none focus:ring-1 focus:ring-secondary/50 focus:border-secondary transition-colors appearance-none ${props.className ?? ''}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full border border-border-subtle rounded-lg px-3 py-2.5 text-[13px] text-ink-900 bg-white placeholder:text-ink-300 focus:outline-none focus:ring-1 focus:ring-secondary/50 focus:border-secondary transition-colors resize-none ${props.className ?? ''}`}
    />
  );
}

/* ─── Section wrapper ─────────────────────────────────────── */
function Section({ num, title, subtitle, children }: {
  num: number; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border-subtle rounded-xl shadow-sm p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-7 h-7 rounded-full bg-gold-light border border-secondary/30 flex items-center justify-center text-[12px] font-bold text-secondary flex-shrink-0 mt-0.5">
          {num}
        </span>
        <div>
          <p className="font-bold text-[14px] text-ink-900">{title}</p>
          {subtitle && <p className="text-[12px] text-ink-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─── Client type radio card ──────────────────────────────── */
function ClientTypeCard({ label, description, selected, onSelect }: {
  value?: string; label: string; description: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-start gap-2.5 p-4 rounded-xl border cursor-pointer transition-all ${
        selected
          ? 'border-secondary bg-[#FDF8EF] ring-1 ring-secondary'
          : 'border-border-subtle hover:bg-surface-alt'
      }`}
    >
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
        selected ? 'border-secondary' : 'border-border-strong'
      }`}>
        {selected && <span className="w-2 h-2 rounded-full bg-secondary" />}
      </span>
      <div>
        <p className="text-[13px] font-bold text-ink-900">{label}</p>
        <p className="text-[11px] text-ink-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

/* ─── Delivery terms card ─────────────────────────────────── */
function DeliveryCard({ label, description, selected, onSelect }: {
  value?: string; label: string; description: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-start gap-2.5 p-4 rounded-xl border cursor-pointer transition-all ${
        selected
          ? 'border-secondary bg-[#FDF8EF] ring-1 ring-secondary'
          : 'border-border-subtle hover:bg-surface-alt'
      }`}
    >
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
        selected ? 'border-secondary' : 'border-border-strong'
      }`}>
        {selected && <span className="w-2 h-2 rounded-full bg-secondary" />}
      </span>
      <div>
        <p className="text-[13px] font-bold text-ink-900">{label}</p>
        <p className="text-[11px] text-ink-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

/* ─── Priority radio button ───────────────────────────────── */
function PriorityOption({ label, selected, disabled, onSelect, activeColor }: {
  value?: string; label: string; selected: boolean; disabled?: boolean;
  onSelect: () => void; activeColor: string;
}) {
  return (
    <label className={`flex items-center gap-1.5 cursor-pointer select-none ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <input type="radio" className="sr-only" checked={selected} onChange={onSelect} disabled={disabled} />
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        selected ? `${activeColor} border-current` : 'border-border-strong'
      }`}>
        {selected && <span className={`w-2 h-2 rounded-full ${activeColor.replace('text-', 'bg-')}`} />}
      </span>
      <span className={`text-[13px] font-semibold ${selected ? activeColor : 'text-ink-500'}`}>{label}</span>
    </label>
  );
}

/* ─── Main page ───────────────────────────────────────────── */
export default function WorkOrderCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientType, setClientType]       = useState<'chhabee' | 'b2b' | 'd2c'>('chhabee');
  const [clientName, setClientName]       = useState('Chhabee');
  const [projectName, setProjectName]     = useState('');
  const [poRef, setPoRef]                 = useState('');
  const [poValue, setPoValue]             = useState('');
  const [title, setTitle]                 = useState('');
  const [furnitureType, setFurnitureType] = useState('');
  const [quantity, setQuantity]           = useState(1);
  const [dimL, setDimL]                   = useState('');
  const [dimH, setDimH]                   = useState('');
  const [dimD, setDimD]                   = useState('');
  const [finishType, setFinishType]       = useState('');
  const [finishDetail, setFinishDetail]   = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState<'included' | 'actuals' | 'client_arranges'>('included');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [priority, setPriority]           = useState('normal');
  const [notes, setNotes]                 = useState('');

  // Auto-fill client name when type = chhabee
  useEffect(() => {
    if (clientType === 'chhabee') setClientName('Chhabee');
  }, [clientType]);

  // Pre-fill from clone
  useEffect(() => {
    if (location.state?.cloneFrom) {
      const c = location.state.cloneFrom;
      setClientType(c.client_type || 'chhabee');
      setClientName(c.client_name || '');
      setProjectName(c.project_name || '');
      setPoRef(c.client_po_reference || '');
      setPoValue(c.client_po_value?.toString() ?? '');
      setTitle((c.title || '') + ' (Copy)');
      setFurnitureType(c.furniture_type || '');
      setQuantity(c.production_quantity || 1);
      setDimL(c.dimensions_l?.toString() ?? '');
      setDimH(c.dimensions_h?.toString() ?? '');
      setDimD(c.dimensions_d?.toString() ?? '');
      setFinishType(c.finish_type || '');
      setFinishDetail(c.finish_detail || '');
      setDeliveryTerms(c.delivery_terms || 'included');
      setDeliveryAddress(c.delivery_address || '');
      if (user.role === 'site_manager') setPriority('normal');
      else if (user.role === 'supervisor' && c.priority === 'critical') setPriority('high');
      else setPriority(c.priority || 'normal');
    }
  }, [location.state, user.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientName) {
      setError('Work Order Title and Client Name are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, client_type: clientType, client_name: clientName,
          project_name: projectName,
          stream: clientType === 'chhabee' ? 'chhabee' : clientType === 'b2b' ? 'external_b2b' : 'd2c',
          furniture_type: furnitureType,
          dimensions_l: dimL ? parseFloat(dimL) : null,
          dimensions_h: dimH ? parseFloat(dimH) : null,
          dimensions_d: dimD ? parseFloat(dimD) : null,
          finish_type: finishType, finish_detail: finishDetail,
          delivery_terms: deliveryTerms, delivery_address: deliveryAddress,
          requested_delivery_date: requestedDate || null,
          priority, production_quantity: quantity,
          client_po_reference: poRef || null,
          client_po_value: poValue ? parseFloat(poValue) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/work-orders/${data.id}`);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to create work order.');
      }
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canSetHigh     = user.role !== 'site_manager';
  const canSetCritical = user.role === 'factory_manager';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] flex-1 flex flex-col min-h-screen">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">

          {/* ── Page header area ── */}
          <div className="px-8 pt-6 pb-2">
            {/* Back nav */}
            <button
              type="button"
              onClick={() => navigate('/work-orders')}
              className="flex items-center gap-1 text-[12px] text-ink-400 hover:text-ink-700 mb-3 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Back to Work Orders
            </button>

            {/* Title row */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-[26px] font-bold text-ink-900 leading-tight">Create Work Order</h1>
                <p className="text-[13px] text-ink-400 mt-1">A Work Order is the master record for every job the factory produces.</p>
              </div>
              <span className="mt-1.5 px-3 py-1 rounded-full border border-border-strong text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                DRAFT
              </span>
            </div>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div className="mx-8 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* ── Sections ── */}
          <div className="px-8 py-5 space-y-5 flex-1">

            {/* 1 — Client Details */}
            <Section num={1} title="Client Details" subtitle="Who is this job for?">
              {/* Client type cards */}
              <div className="mb-4">
                <Label required>Client Type</Label>
                <div className="grid grid-cols-3 gap-3">
                  <ClientTypeCard value="chhabee" label="Chhabee"      description="Internal furniture program"   selected={clientType === 'chhabee'} onSelect={() => setClientType('chhabee')} />
                  <ClientTypeCard value="b2b"     label="External B2B" description="Corporate / commercial client" selected={clientType === 'b2b'}     onSelect={() => setClientType('b2b')} />
                  <ClientTypeCard value="d2c"     label="D2C"          description="Direct to consumer"           selected={clientType === 'd2c'}     onSelect={() => setClientType('d2c')} />
                </div>
              </div>

              {/* Client name + project */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label required>Client Name</Label>
                  <Input
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Chhabee"
                    readOnly={clientType === 'chhabee'}
                  />
                </div>
                <div>
                  <Label>Project or Site Name <span className="text-ink-300 font-normal">(optional)</span></Label>
                  <Input
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g. DLF Cyber Hub, Gurugram"
                  />
                </div>
              </div>

              {/* Chhabee ref */}
              {clientType === 'chhabee' && (
                <div>
                  <Label>Chhabee Project Reference</Label>
                  <Input
                    value={poRef}
                    onChange={e => setPoRef(e.target.value)}
                    placeholder="Enter the project code from Chhabee's system"
                  />
                  <p className="text-[11px] text-ink-400 mt-1.5">Shown only when Client Type = Chhabee</p>
                </div>
              )}

              {/* B2B PO fields */}
              {clientType === 'b2b' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>Client PO Reference</Label>
                    <Input value={poRef} onChange={e => setPoRef(e.target.value)} placeholder="PO-XXXXX" />
                  </div>
                  <div>
                    <Label required>Client PO Value (INR)</Label>
                    <Input value={poValue} onChange={e => setPoValue(e.target.value)} placeholder="e.g. 150000" type="number" min="0" />
                  </div>
                </div>
              )}
            </Section>

            {/* 2 — Furniture Details */}
            <Section num={2} title="Furniture Details" subtitle="What are we building?">
              <div className="mb-4">
                <Label required>Work Order Title</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Reception Counter Front"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Furniture Type</Label>
                  <div className="relative">
                    <Select value={furnitureType} onChange={e => setFurnitureType(e.target.value)}>
                      <option value="" disabled>Counter / Workstation / Cabinet / Storage Unit / …</option>
                      <option value="Counter">Counter</option>
                      <option value="Workstation">Workstation</option>
                      <option value="Cabinet">Cabinet</option>
                      <option value="Storage Unit">Storage Unit</option>
                      <option value="Table">Table</option>
                      <option value="Shelf">Shelf</option>
                      <option value="Partition">Partition</option>
                      <option value="Wardrobe">Wardrobe</option>
                      <option value="Other">Other</option>
                    </Select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 material-symbols-outlined text-[16px]">
                      expand_more
                    </span>
                  </div>
                </div>
                <div>
                  <Label>Number of Units</Label>
                  <Input
                    type="number"
                    value={quantity}
                    min={1}
                    onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            </Section>

            {/* 3 — Dimensions (Optional) */}
            <Section num={3} title="Dimensions (Optional)" subtitle="Leave blank if dimensions are specified in the drawing.">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Length (mm)', val: dimL, set: setDimL },
                  { label: 'Height (mm)', val: dimH, set: setDimH },
                  { label: 'Depth (mm)',  val: dimD, set: setDimD },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      value={val}
                      onChange={e => set(e.target.value)}
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
            </Section>

            {/* 4 — Finish */}
            <Section num={4} title="Finish">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Finish Type</Label>
                  <div className="relative">
                    <Select value={finishType} onChange={e => setFinishType(e.target.value)}>
                      <option value="" disabled>Laminate / Veneer / Duco / Polish / …</option>
                      <option value="Laminate">Laminate</option>
                      <option value="Natural Veneer">Natural Veneer</option>
                      <option value="Duco Paint">Duco Paint</option>
                      <option value="Polish">Polish</option>
                      <option value="Powder Coat">Powder Coat</option>
                      <option value="Raw / Unfinished">Raw / Unfinished</option>
                    </Select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 material-symbols-outlined text-[16px]">
                      expand_more
                    </span>
                  </div>
                </div>
                <div>
                  <Label>Finish Detail</Label>
                  <Input
                    value={finishDetail}
                    onChange={e => setFinishDetail(e.target.value)}
                    placeholder="e.g. Merino Charcoal Grey 1mm ABS"
                  />
                  <p className="text-[11px] text-ink-400 mt-1.5">Shade, brand, or specification</p>
                </div>
              </div>
            </Section>

            {/* 5 — Delivery */}
            <Section num={5} title="Delivery">
              {/* Delivery Terms — 3 horizontal cards */}
              <div className="mb-5">
                <Label required>Delivery Terms</Label>
                <div className="grid grid-cols-3 gap-3">
                  <DeliveryCard value="included"        label="Included in Price"  description="Delivery cost absorbed in WO price"    selected={deliveryTerms === 'included'}        onSelect={() => setDeliveryTerms('included')} />
                  <DeliveryCard value="actuals"         label="Billed at Actuals"  description="We arrange, client pays actual cost"   selected={deliveryTerms === 'actuals'}         onSelect={() => setDeliveryTerms('actuals')} />
                  <DeliveryCard value="client_arranges" label="Client Arranges"    description="Client pays transporter directly"      selected={deliveryTerms === 'client_arranges'} onSelect={() => setDeliveryTerms('client_arranges')} />
                </div>
              </div>

              {/* Address */}
              <div className="mb-4">
                <Label>Delivery Address</Label>
                <Input
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Site address for delivery"
                />
              </div>

              {/* Date */}
              <div className="max-w-xs">
                <Label>Requested Delivery Date</Label>
                <Input
                  type="date"
                  value={requestedDate}
                  onChange={e => setRequestedDate(e.target.value)}
                  placeholder="dd / mm / yyyy"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-[11px] text-ink-400 mt-1.5">Requested by Client · Min date: today</p>
              </div>
            </Section>

            {/* 6 — Priority & Notes */}
            <Section num={6} title="Priority & Notes">
              <div className="mb-5">
                <Label>Priority</Label>
                <div className="flex items-center gap-6 mt-1">
                  <PriorityOption value="normal"   label="Normal"   selected={priority === 'normal'}   onSelect={() => setPriority('normal')}   activeColor="text-secondary" />
                  <PriorityOption value="high"     label="High"     selected={priority === 'high'}     onSelect={() => setPriority('high')}     activeColor="text-status-partial-material" disabled={!canSetHigh} />
                  <PriorityOption value="critical" label="Critical" selected={priority === 'critical'} onSelect={() => setPriority('critical')} activeColor="text-status-cancelled"        disabled={!canSetCritical} />
                </div>
                <p className="text-[11px] text-ink-400 mt-2">High/Critical priority can only be set by Factory Manager</p>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Any special requirements or instructions for this work order"
                />
              </div>
            </Section>

          </div>

          {/* ── Sticky footer ── */}
          <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border-subtle px-8 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-ink-400">Fields marked <span className="text-status-cancelled">*</span> are required</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/work-orders')}
                  className="h-10 px-5 rounded-lg border border-border-strong bg-white text-[13px] font-semibold text-ink-700 hover:bg-surface-alt transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-10 px-6 rounded-lg bg-secondary text-white text-[13px] font-bold hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Creating…' : 'Create Work Order'}
                </button>
              </div>
            </div>
          </div>

        </form>
      </main>
    </div>
  );
}
