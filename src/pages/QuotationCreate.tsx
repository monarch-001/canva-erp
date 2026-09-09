import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

type ClientType = 'B2B' | 'D2C';
type ItemType = 'Furniture' | 'Delivery' | 'Installation' | 'Hardware' | 'Other';

interface QuoteItem {
  id: string;
  item_type: ItemType;
  description: string;
  dimensions: string;
  finish: string;
  quantity: number;
  unit_price: number;
}

let nextItemId = 3;

function blankItem(): QuoteItem {
  return { id: String(nextItemId++), item_type: 'Furniture', description: '', dimensions: '', finish: '', quantity: 1, unit_price: 0 };
}

export default function QuotationCreate() {
  const navigate = useNavigate();

  // Client info
  const [clientType, setClientType] = useState<ClientType>('B2B');
  const [clientName, setClientName] = useState('');
  const [enquirySource, setEnquirySource] = useState('Direct enquiry');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [validUntil, setValidUntil] = useState('2026-08-25');

  // Items
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', item_type: 'Furniture', description: 'Executive Cabin Workstation — L-shaped', dimensions: '1800 × 750 × 1600', finish: 'Laminate — Merino Oak Grey', quantity: 6, unit_price: 35000 },
    { id: '2', item_type: 'Delivery',  description: 'Delivery to WeWork Cyber City, Gurugram', dimensions: '', finish: '', quantity: 1, unit_price: 8000 },
  ]);

  // Internal cost
  const [matCost, setMatCost] = useState('120000');
  const [labCost, setLabCost] = useState('48000');
  const [ohCost, setOhCost] = useState('24000');
  const [targetMargin, setTargetMargin] = useState('20');
  const [overridePrice, setOverridePrice] = useState('218000');

  // Extra charges
  const [deliveryCharge, setDeliveryCharge] = useState('0');
  const [installCharge, setInstallCharge] = useState('0');
  const [otherCharge, setOtherCharge] = useState('0');
  const [otherLabel, setOtherLabel] = useState('');

  // Terms
  const [advancePct, setAdvancePct] = useState('50');
  const [deliveryDays, setDeliveryDays] = useState('18');
  const [notesClient, setNotesClient] = useState('');
  const [notesInternal, setNotesInternal] = useState('');

  const { id } = useParams<{ id: string }>();
  const isRevision = window.location.pathname.endsWith('/revision');
  const isEdit = window.location.pathname.endsWith('/edit');

  useEffect(() => {
    if (id) {
      // Pre-fill state with parent quotation details
      setClientName('WeWork India');
      setClientEmail('design@wework.co.in');
      setClientPhone('+91 99999 88888');
      setClientType('B2B');
      setItems([
        { id: '1', item_type: 'Furniture', description: 'Executive Cabin Workstation — L-shaped (Revised)', dimensions: '1800 × 750 × 1600', finish: 'Laminate — Merino Oak Grey', quantity: 6, unit_price: 34000 },
        { id: '2', item_type: 'Delivery',  description: 'Delivery to WeWork Cyber City, Gurugram', dimensions: '', finish: '', quantity: 1, unit_price: 8000 },
      ]);
      setMatCost('115000');
      setLabCost('45000');
      setOhCost('22000');
    }
  }, [id]);

  // Computed
  const itemsSubtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const subtotalExGst = itemsSubtotal + parseFloat(deliveryCharge || '0') + parseFloat(installCharge || '0') + parseFloat(otherCharge || '0');
  const gst = subtotalExGst * 0.18;
  const totalIncGst = subtotalExGst + gst;
  const totalCost = (parseFloat(matCost || '0') + parseFloat(labCost || '0') + parseFloat(ohCost || '0'));
  const calcPrice = targetMargin ? totalCost / (1 - parseFloat(targetMargin) / 100) : 0;
  const finalPrice = parseFloat(overridePrice) || calcPrice;
  const actualMargin = finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice * 100) : 0;
  const aboveTarget = actualMargin >= parseFloat(targetMargin || '0');

  const updateItem = useCallback((id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  }, []);

  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
  const addItem = () => setItems(prev => [...prev, blankItem()]);

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex">
      <Sidebar />
      <div className="ml-[220px] flex-1 px-8 py-6 pb-28">

        {/* Back nav */}
        <button onClick={() => navigate('/quotations')}
          className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 mb-5 transition-colors">
          <span>←</span><span>Back to Quotations</span>
        </button>

        <h1 className="text-2xl font-bold text-ink-900 mb-1">
          {id ? (isRevision ? 'Revise Quotation' : isEdit ? 'Edit Quotation' : 'Modify Quotation') : 'New Quotation'}
        </h1>
        <p className="text-sm text-ink-500 mb-6">
          {id ? `Modifying quotation details linked to ID: ${id}` : 'For B2B and D2C clients only — Chhabee work is billed Cost+5%, no quotation needed.'}
        </p>

        <div className="space-y-5 max-w-3xl">

          {/* Client Information */}
          <div className="bg-white rounded-xl border border-[#E8E2D9] p-6">
            <h2 className="text-sm font-bold text-ink-900 mb-4">Client Information</h2>

            <p className="text-xs text-ink-500 mb-2">Client Type <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(['B2B', 'D2C'] as ClientType[]).map(t => (
                <button key={t} onClick={() => setClientType(t)}
                  className={`text-left px-4 py-3 rounded-lg border-2 transition-all ${clientType === t ? 'border-secondary bg-[#F3E7CD]' : 'border-[#E8E2D9] hover:border-ink-300'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${clientType === t ? 'border-secondary' : 'border-ink-300'}`}>
                      {clientType === t && <div className="w-2 h-2 rounded-full bg-secondary" />}
                    </div>
                    <span className={`text-sm font-semibold ${clientType === t ? 'text-secondary' : 'text-ink-900'}`}>{t}</span>
                  </div>
                  <p className="text-xs text-ink-400 pl-6">{t === 'B2B' ? 'Corporate / commercial client' : 'Direct to consumer'}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-1">
              <div>
                <label className="block text-xs text-ink-500 mb-1">Client Name <span className="text-red-500">*</span></label>
                <input value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. WeWork Cyber City"
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
                <p className="text-xs text-ink-400 mt-1">Autofills from existing organisations if matched</p>
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1">Enquiry Source</label>
                <select value={enquirySource} onChange={e => setEnquirySource(e.target.value)}
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 bg-white focus:outline-none focus:border-secondary">
                  {['Direct enquiry','Referral','Website','Social media','Returning client'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs text-ink-500 mb-1">Client Email</label>
                <input value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                  placeholder="contact@client.com" type="email"
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1">Client Phone</label>
                <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1">Valid Until <span className="text-red-500">*</span></label>
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
              </div>
            </div>
          </div>

          {/* Quotation Items */}
          <div className="bg-white rounded-xl border border-[#E8E2D9] p-6">
            <h2 className="text-sm font-bold text-ink-900 mb-1">Quotation Items</h2>
            <p className="text-xs text-ink-400 mb-4">Minimum 1 item required. Items can be reordered.</p>

            <div className="space-y-5">
              {items.map((item, idx) => (
                <div key={item.id} className="border border-[#E8E2D9] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-secondary">Item {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="text-xs text-ink-400 hover:text-red-500 transition-colors">× Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-ink-500 mb-1">Item Type</label>
                      <select value={item.item_type} onChange={e => updateItem(item.id, 'item_type', e.target.value as ItemType)}
                        className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 bg-white focus:outline-none focus:border-secondary">
                        {['Furniture','Delivery','Installation','Hardware','Other'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-ink-500 mb-1">Description <span className="text-red-500">*</span></label>
                      <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                        className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
                    </div>
                  </div>
                  {item.item_type === 'Furniture' && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-ink-500 mb-1">Dimensions L×H×D (mm)</label>
                        <input value={item.dimensions} onChange={e => updateItem(item.id, 'dimensions', e.target.value)}
                          placeholder="1800 × 750 × 1600"
                          className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
                      </div>
                      <div>
                        <label className="block text-xs text-ink-500 mb-1">Finish</label>
                        <input value={item.finish} onChange={e => updateItem(item.id, 'finish', e.target.value)}
                          placeholder="Laminate — Merino Oak Grey"
                          className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-ink-500 mb-1">Quantity</label>
                      <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-500 mb-1">Unit Price (₹ ex-GST) <span className="text-red-500">*</span></label>
                      <input type="number" min="0" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-500 mb-1">Total Price</label>
                      <div className="w-full border border-[#E8E2D9] bg-[#FAF8F5] rounded-lg px-3 py-2 text-sm font-semibold text-ink-700">
                        ₹{(item.quantity * item.unit_price).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addItem}
              className="mt-4 px-4 py-2 text-sm font-medium text-secondary border border-secondary rounded-lg hover:bg-[#F3E7CD] transition-colors">
              + Add Item
            </button>
          </div>

          {/* Internal Cost Analysis */}
          <div className="bg-[#FFF8EC] rounded-xl border border-[#F3D89C] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm">🔒</span>
              <h2 className="text-sm font-bold text-ink-900">Internal Cost Analysis</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-secondary text-white">FM ONLY — NOT SHOWN TO CLIENT</span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {[
                { label: 'Estimated Material Cost (₹)', val: matCost, set: setMatCost },
                { label: 'Estimated Labour Cost (₹)',   val: labCost, set: setLabCost },
                { label: 'Estimated Overhead Cost (₹)', val: ohCost,  set: setOhCost },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs text-ink-500 mb-1">{f.label}</label>
                  <input type="number" value={f.val} onChange={e => f.set(e.target.value)}
                    className="w-full border border-[#E8C96A] rounded-lg px-3 py-2 text-sm text-ink-900 bg-white focus:outline-none focus:border-secondary" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-ink-500 mb-1">Total Estimated Cost (₹)</label>
                <div className="w-full border border-[#E8C96A] bg-[#F3E7CD] rounded-lg px-3 py-2 text-sm font-bold text-ink-900">
                  {totalCost.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-ink-500 mb-1">Target Margin %</label>
                <input type="number" min="0" max="100" value={targetMargin} onChange={e => setTargetMargin(e.target.value)}
                  className="w-full border border-[#E8C96A] rounded-lg px-3 py-2 text-sm text-ink-900 bg-white focus:outline-none focus:border-secondary" />
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1">Calculated Price (₹)</label>
                <div className="w-full border border-[#E8C96A] bg-[#F3E7CD] rounded-lg px-3 py-2 text-sm font-bold text-ink-900">
                  {calcPrice ? calcPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                </div>
                <p className="text-xs text-ink-400 mt-0.5">= Total Cost ÷ (1 - margin%)</p>
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1">Override Price (₹)</label>
                <input type="number" min="0" value={overridePrice} onChange={e => setOverridePrice(e.target.value)}
                  placeholder="Leave blank to use calculated price"
                  className="w-full border border-[#E8C96A] rounded-lg px-3 py-2 text-sm text-ink-900 bg-white focus:outline-none focus:border-secondary" />
                <p className="text-xs text-ink-400 mt-0.5">Leave blank to use calculated price</p>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-white rounded-xl border border-[#E8E2D9] p-6">
            <h2 className="text-sm font-bold text-ink-900 mb-1">Pricing Summary</h2>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-ink-400">Subtotal (ex-GST) — from items</p>
              <p className="text-sm font-semibold text-ink-900">₹{itemsSubtotal.toLocaleString('en-IN')}</p>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Delivery Charge (₹)', val: deliveryCharge, set: setDeliveryCharge },
                { label: 'Installation Charge (₹)', val: installCharge, set: setInstallCharge },
                { label: 'Other Charges (₹)', val: otherCharge, set: setOtherCharge },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs text-ink-500 mb-1">{f.label}</label>
                  <input type="number" min="0" value={f.val} onChange={e => f.set(e.target.value)}
                    className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-ink-500 mb-1">Other Charges Label</label>
                <input value={otherLabel} onChange={e => setOtherLabel(e.target.value)}
                  placeholder="e.g. Custom crating"
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
              </div>
            </div>
            <div className="space-y-1.5 border-t border-[#E8E2D9] pt-4">
              <div className="flex justify-between text-sm text-ink-600">
                <span>Total (ex-GST)</span>
                <span>₹{subtotalExGst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm text-ink-600">
                <span>GST @ 18%</span>
                <span>₹{gst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-ink-900 pt-1">
                <span>TOTAL (inc-GST)</span>
                <span className="text-secondary">₹{totalIncGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
            {totalCost > 0 && (
              <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${aboveTarget ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {aboveTarget ? '✓' : '⚠'} You are quoting at {actualMargin.toFixed(1)}% margin — {aboveTarget ? 'above' : 'below'} your {targetMargin}% target.
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="bg-white rounded-xl border border-[#E8E2D9] p-6">
            <h2 className="text-sm font-bold text-ink-900 mb-4">Terms</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-ink-500 mb-1">Advance Required %</label>
                <input type="number" min="0" max="100" value={advancePct} onChange={e => setAdvancePct(e.target.value)}
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1">Delivery Timeline (working days)</label>
                <input type="number" min="1" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)}
                  className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-ink-500 mb-1">Notes for Client</label>
              <textarea rows={3} value={notesClient} onChange={e => setNotesClient(e.target.value)}
                placeholder="Appears on the client PDF — e.g. warranty, care instructions"
                className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary resize-none" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">Internal Notes</label>
              <textarea rows={3} value={notesInternal} onChange={e => setNotesInternal(e.target.value)}
                placeholder="Never shown on client PDF — for internal reference only"
                className="w-full border border-[#E8E2D9] rounded-lg px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-secondary resize-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <footer className="fixed bottom-0 left-[220px] right-0 bg-white border-t border-[#E8E2D9] px-8 py-4 flex items-center justify-end gap-3 z-20">
        <button onClick={() => navigate('/quotations')}
          className="px-5 py-2 text-sm text-ink-700 border border-[#E8E2D9] rounded-lg hover:bg-[#F5F2EC] transition-colors">
          Save as Draft
        </button>
        <button className="px-5 py-2 text-sm text-ink-700 border border-[#E8E2D9] rounded-lg hover:bg-[#F5F2EC] transition-colors">
          Save & Preview PDF
        </button>
        <button onClick={() => navigate('/quotations')}
          className="px-6 py-2 text-sm font-semibold bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors">
          Save & Send to Client
        </button>
      </footer>
    </div>
  );
}
