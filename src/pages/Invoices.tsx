import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_billing_address: string;
  client_gstin: string;
  subtotal: number;
  discount_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  invoice_total: number;
  amount_received: number;
  status: 'draft' | 'approved' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  invoice_date: string;
  due_date: string;
  place_of_supply: string;
  is_inter_state?: boolean;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Payment Modal state
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentRef, setPaymentRef] = useState('');

  // Print Invoice state (forces rendering in printable layout)
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const [saving, setSaving] = useState(false);

  // New Invoice form state
  const [newInv, setNewInv] = useState({
    client_name: 'Starbucks Connaught Place',
    client_billing_address: 'G-12, Connaught Circus, New Delhi',
    client_gstin: '07AAACS1234F1Z1',
    subtotal: 58000,
    discount_amount: 0,
    place_of_supply: 'Delhi',
    is_inter_state: false,
  });

  useEffect(() => {
    fetch('/api/invoices')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInvoices(data);
        } else {
          setInvoices([
            { id: '1', invoice_number: 'INV-26-001', client_name: 'Starbucks', client_billing_address: 'G-12, Connaught Circus, New Delhi', client_gstin: '07AAACS1234F1Z1', subtotal: 58000, discount_amount: 0, cgst_amount: 5220, sgst_amount: 5220, igst_amount: 0, invoice_total: 68440, amount_received: 68440, status: 'paid', invoice_date: '2026-08-10', due_date: '2026-09-09', place_of_supply: 'Delhi' },
            { id: '2', invoice_number: 'INV-26-002', client_name: 'WeWork Labs', client_billing_address: 'Vasant Vihar, New Delhi', client_gstin: '07AAACW5678D1Z2', subtotal: 124000, discount_amount: 0, cgst_amount: 11160, sgst_amount: 11160, igst_amount: 0, invoice_total: 146320, amount_received: 50000, status: 'partially_paid', invoice_date: '2026-08-12', due_date: '2026-09-11', place_of_supply: 'Delhi' },
            { id: '3', invoice_number: 'INV-26-003', client_name: 'Nisha Verma', client_billing_address: 'Sector 45, Gurugram', client_gstin: '06AAACV9012E1Z3', subtotal: 41186, discount_amount: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 7414, invoice_total: 48600, amount_received: 0, status: 'sent', invoice_date: '2026-08-15', due_date: '2026-09-14', place_of_supply: 'Haryana' }
          ]);
        }
      })
      .catch(() => {
        setInvoices([
          { id: '1', invoice_number: 'INV-26-001', client_name: 'Starbucks', client_billing_address: 'G-12, Connaught Circus, New Delhi', client_gstin: '07AAACS1234F1Z1', subtotal: 58000, discount_amount: 0, cgst_amount: 5220, sgst_amount: 5220, igst_amount: 0, invoice_total: 68440, amount_received: 68440, status: 'paid', invoice_date: '2026-08-10', due_date: '2026-09-09', place_of_supply: 'Delhi' },
          { id: '2', invoice_number: 'INV-26-002', client_name: 'WeWork Labs', client_billing_address: 'Vasant Vihar, New Delhi', client_gstin: '07AAACW5678D1Z2', subtotal: 124000, discount_amount: 0, cgst_amount: 11160, sgst_amount: 11160, igst_amount: 0, invoice_total: 146320, amount_received: 50000, status: 'partially_paid', invoice_date: '2026-08-12', due_date: '2026-09-11', place_of_supply: 'Delhi' },
          { id: '3', invoice_number: 'INV-26-003', client_name: 'Nisha Verma', client_billing_address: 'Sector 45, Gurugram', client_gstin: '06AAACV9012E1Z3', subtotal: 41186, discount_amount: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 7414, invoice_total: 48600, amount_received: 0, status: 'sent', invoice_date: '2026-08-15', due_date: '2026-09-14', place_of_supply: 'Haryana' }
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentInvoice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${paymentInvoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: paymentAmount, ref: paymentRef })
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoices(prev => prev.map(inv => inv.id === paymentInvoice.id ? { ...inv, amount_received: Number(updated.amount_received), status: updated.status } : inv));
        setPaymentInvoice(null);
      } else {
        alert('Failed to record payment receipt.');
      }
    } catch {
      alert('Network error - could not record payment.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHtmlInvoice())
      });
      if (res.ok) {
        const added = await res.json();
        setInvoices(prev => [added, ...prev]);
        setShowCreateModal(false);
      } else {
        alert('Failed to create sales invoice.');
      }
    } catch {
      alert('Network error - could not create invoice.');
    } finally {
      setSaving(false);
    }
  }

  function newHtmlInvoice() {
    const cgst = newInv.is_inter_state ? 0 : Math.round(newInv.subtotal * 0.09);
    const sgst = newInv.is_inter_state ? 0 : Math.round(newInv.subtotal * 0.09);
    const igst = newInv.is_inter_state ? Math.round(newInv.subtotal * 0.18) : 0;
    const total = newInv.subtotal - newInv.discount_amount + cgst + sgst + igst;
    return {
      ...newInv,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      invoice_total: total
    };
  }

  // Trigger browser print layout when printInvoice is selected
  useEffect(() => {
    if (printInvoice) {
      setTimeout(() => {
        window.print();
        setPrintInvoice(null);
      }, 500);
    }
  }, [printInvoice]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Hide Sidebar & Header during print */}
      <div className="print:hidden flex flex-1">
        <Sidebar />
        <main className="ml-[220px] flex-1 flex flex-col">
          <Header 
            title="Billing & Invoicing" 
            subtitle="Generate GST sales invoices, track client receivables, and log payment completions" 
          />

          <div className="px-8 py-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm">
                <p className="text-2xl font-black text-green-600">
                  ₹{invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.invoice_total), 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-ink-400 mt-1 uppercase font-bold tracking-wider">Collected Payments</p>
              </div>
              <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm">
                <p className="text-2xl font-black text-amber-500">
                  ₹{invoices.filter(i => ['sent', 'partially_paid'].includes(i.status)).reduce((sum, i) => sum + (Number(i.invoice_total) - Number(i.amount_received)), 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-ink-400 mt-1 uppercase font-bold tracking-wider">Receivables Outstanding</p>
              </div>
              <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm">
                <p className="text-2xl font-black text-red-500">
                  {invoices.filter(i => i.status === 'overdue').length}
                </p>
                <p className="text-[11px] text-ink-400 mt-1 uppercase font-bold tracking-wider">Overdue Invoices</p>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
              <div>
                <p className="text-xs font-bold text-ink-900">GST Sales Ledger</p>
                <p className="text-[11px] text-ink-400">Total {invoices.length} invoices generated this fiscal year</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)} 
                className="px-4 h-9 bg-secondary text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">receipt</span>
                New Invoice
              </button>
            </div>

            {/* Table list */}
            <div className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-alt">
                    {['Invoice Num', 'Client', 'Invoice Date', 'Due Date', 'Total Amount', 'Collected', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-[10px] font-bold text-ink-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-xs text-ink-400">Loading invoices...</td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-xs text-ink-400">No invoices registered.</td>
                    </tr>
                  ) : invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="px-5 py-4 text-xs font-bold text-secondary">{inv.invoice_number}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-ink-900">{inv.client_name}</td>
                      <td className="px-5 py-4 text-xs text-ink-500">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-4 text-xs text-ink-500">{new Date(inv.due_date).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-ink-900">₹{Number(inv.invoice_total).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-green-600">₹{Number(inv.amount_received).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4">
                        {inv.status === 'draft' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">DRAFT</span>}
                        {inv.status === 'sent' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">SENT</span>}
                        {inv.status === 'partially_paid' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">PARTIAL</span>}
                        {inv.status === 'paid' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">PAID</span>}
                        {inv.status === 'overdue' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">OVERDUE</span>}
                      </td>
                      <td className="px-5 py-4 text-xs space-x-2">
                        {inv.status !== 'paid' && (
                          <button 
                            onClick={() => {
                              setPaymentInvoice(inv);
                              setPaymentAmount(Number(inv.invoice_total) - Number(inv.amount_received));
                              setPaymentRef('');
                            }}
                            className="text-secondary hover:underline font-bold"
                          >
                            Record Payment
                          </button>
                        )}
                        <button 
                          onClick={() => setPrintInvoice(inv)} 
                          className="text-ink-600 hover:underline font-bold"
                        >
                          Print PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Print-ready Layout (only visible during print media view) */}
      {printInvoice && (
        <div className="hidden print:block w-full max-w-[800px] mx-auto bg-white p-8 text-ink-900 font-sans">
          <div className="flex justify-between border-b pb-6 mb-6">
            <div>
              <h2 className="text-xl font-bold text-secondary">CANVA CONCEPTS</h2>
              <p className="text-xs text-ink-500 mt-1">Industrial Area Phase 1, Gurugram, Haryana</p>
              <p className="text-xs text-ink-500">GSTIN: 06ABCDE1234F1Z1</p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-black text-ink-900 tracking-wider">TAX INVOICE</h1>
              <p className="text-xs font-bold text-ink-500 mt-1">Invoice: {printInvoice.invoice_number}</p>
              <p className="text-xs text-ink-500">Date: {new Date(printInvoice.invoice_date).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-b pb-6 mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Bill To:</p>
              <p className="text-sm font-bold text-ink-900 mt-1">{printInvoice.client_name}</p>
              <p className="text-xs text-ink-600 mt-0.5 leading-relaxed">{printInvoice.client_billing_address}</p>
              {printInvoice.client_gstin && <p className="text-xs font-semibold text-ink-500 mt-1">GSTIN: {printInvoice.client_gstin}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Place of Supply:</p>
              <p className="text-xs font-bold text-ink-700 mt-1">{printInvoice.place_of_supply}</p>
              <p className="text-xs text-ink-500 mt-2">Due Date: {new Date(printInvoice.due_date).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <table className="w-full text-left mb-6 border-collapse">
            <thead>
              <tr className="border-b border-ink-900 text-xs font-bold">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Taxable Value</th>
                <th className="py-2 text-right">GST Rate</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              <tr className="py-2">
                <td className="py-2.5 font-semibold">Supply and Execution of Modular Furniture Units</td>
                <td className="py-2.5 text-right">₹{Number(printInvoice.subtotal).toLocaleString('en-IN')}</td>
                <td className="py-2.5 text-right">{printInvoice.is_inter_state ? '18% IGST' : '18% CGST+SGST'}</td>
                <td className="py-2.5 text-right">₹{Number(printInvoice.subtotal).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end pt-4 border-t">
            <div className="w-[300px] text-xs space-y-2">
              <div className="flex justify-between text-ink-600">
                <span>Subtotal:</span>
                <span>₹{Number(printInvoice.subtotal).toLocaleString('en-IN')}</span>
              </div>
              {!printInvoice.is_inter_state ? (
                <>
                  <div className="flex justify-between text-ink-600">
                    <span>CGST (9%):</span>
                    <span>₹{Number(printInvoice.cgst_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>SGST (9%):</span>
                    <span>₹{Number(printInvoice.sgst_amount).toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-ink-600">
                  <span>IGST (18%):</span>
                  <span>₹{Number(printInvoice.igst_amount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-secondary border-t pt-2 mt-2">
                <span>Grand Total:</span>
                <span>₹{Number(printInvoice.invoice_total).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      {paymentInvoice && (
        <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-border-subtle overflow-hidden">
            <div className="px-6 py-4 bg-surface-alt border-b border-border-subtle flex justify-between items-center">
              <h3 className="text-sm font-bold text-ink-900">Record Payment: {paymentInvoice.invoice_number}</h3>
              <button onClick={() => setPaymentInvoice(null)} className="text-ink-400 hover:text-ink-900 text-sm font-bold">✕</button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-400 uppercase">Received Amount (INR)</label>
                <input 
                  type="number" 
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  max={Number(paymentInvoice.invoice_total) - Number(paymentInvoice.amount_received)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-400 uppercase">Payment Reference / Transaction ID</label>
                <input 
                  type="text" 
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  placeholder="e.g. NEFT-12390, Bank Transfer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle mt-4">
                <button 
                  type="button" 
                  onClick={() => setPaymentInvoice(null)}
                  className="px-4 py-2 border border-[#D5CFC8] text-ink-700 text-xs font-semibold rounded-lg hover:bg-surface-alt"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-4 py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:brightness-110"
                >
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Invoice */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-border-subtle overflow-hidden">
            <div className="px-6 py-4 bg-surface-alt border-b border-border-subtle flex justify-between items-center">
              <h3 className="text-sm font-bold text-ink-900">Generate Sales Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-ink-400 hover:text-ink-900 text-sm font-bold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-400 uppercase">Client Billing Name</label>
                <input 
                  type="text" 
                  value={newInv.client_name}
                  onChange={e => setNewInv(prev => ({ ...prev, client_name: e.target.value }))}
                  className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-400 uppercase">Billing Address</label>
                <input 
                  type="text" 
                  value={newInv.client_billing_address}
                  onChange={e => setNewInv(prev => ({ ...prev, client_billing_address: e.target.value }))}
                  className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ink-400 uppercase">Client GSTIN</label>
                  <input 
                    type="text" 
                    value={newInv.client_gstin}
                    onChange={e => setNewInv(prev => ({ ...prev, client_gstin: e.target.value }))}
                    className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ink-400 uppercase">Place of Supply</label>
                  <input 
                    type="text" 
                    value={newInv.place_of_supply}
                    onChange={e => setNewInv(prev => ({ ...prev, place_of_supply: e.target.value }))}
                    className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ink-400 uppercase">Taxable Subtotal (INR)</label>
                  <input 
                    type="number" 
                    value={newInv.subtotal}
                    onChange={e => setNewInv(prev => ({ ...prev, subtotal: Number(e.target.value) }))}
                    className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ink-400 uppercase">Inter-state Transaction?</label>
                  <select 
                    value={newInv.is_inter_state ? 'true' : 'false'}
                    onChange={e => setNewInv(prev => ({ ...prev, is_inter_state: e.target.value === 'true' }))}
                    className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                  >
                    <option value="false">Intra-state (CGST + SGST 9%+9%)</option>
                    <option value="true">Inter-state (IGST 18%)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#D5CFC8] text-ink-700 text-xs font-semibold rounded-lg hover:bg-surface-alt"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-4 py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:brightness-110"
                >
                  {saving ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
