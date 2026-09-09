import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface DeliveryChallan {
  id: string;
  dc_number: string;
  wo_number: string;
  wo_title: string;
  client: string;
  quantity: number;
  consignee_name: string;
  vehicle_number: string;
  ewaybill_number: string | null;
  status: 'draft' | 'approved' | 'dispatched' | 'delivered' | 'confirmed';
}

export default function Dispatch() {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // New DC form state
  const [newDc, setNewDc] = useState({
    wo_number: 'WO-CHH-26-001',
    wo_title: 'Reception Counter',
    client: 'Starbucks',
    quantity: 10,
    consignee_name: 'Rahul Sharma',
    consignee_phone: '+91 99887 76655',
    delivery_address: 'Starbucks Connaught Place, New Delhi',
    vehicle_number: 'HR-26-BQ-1234',
    ewaybill_number: '1213 1415 1617'
  });

  useEffect(() => {
    fetch('/api/dispatch/challans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChallans(data);
        } else {
          setChallans([
            { id: '1', dc_number: 'DC-26-001', wo_number: 'WO-CHH-26-001', wo_title: 'Reception Counter', client: 'Starbucks', quantity: 10, consignee_name: 'Rahul Sharma', vehicle_number: 'HR-26-BQ-1234', ewaybill_number: '1213 1415 1617', status: 'approved' },
            { id: '2', dc_number: 'DC-26-002', wo_number: 'WO-B2B-26-001', wo_title: 'Office Workstations', client: 'WeWork', quantity: 12, consignee_name: 'Mohit Goel', vehicle_number: 'DL-3C-AY-5678', ewaybill_number: null, status: 'dispatched' },
            { id: '3', dc_number: 'DC-26-003', wo_number: 'WO-D2C-26-005', wo_title: 'Wardrobe Set', client: 'Nisha Verma', quantity: 1, consignee_name: 'Nisha Verma', vehicle_number: 'UP-16-CT-9012', ewaybill_number: null, status: 'draft' }
          ]);
        }
      })
      .catch(() => {
        setChallans([
          { id: '1', dc_number: 'DC-26-001', wo_number: 'WO-CHH-26-001', wo_title: 'Reception Counter', client: 'Starbucks', quantity: 10, consignee_name: 'Rahul Sharma', vehicle_number: 'HR-26-BQ-1234', ewaybill_number: '1213 1415 1617', status: 'approved' },
          { id: '2', dc_number: 'DC-26-002', wo_number: 'WO-B2B-26-001', wo_title: 'Office Workstations', client: 'WeWork', quantity: 12, consignee_name: 'Mohit Goel', vehicle_number: 'DL-3C-AY-5678', ewaybill_number: null, status: 'dispatched' },
          { id: '3', dc_number: 'DC-26-003', wo_number: 'WO-D2C-26-005', wo_title: 'Wardrobe Set', client: 'Nisha Verma', quantity: 1, consignee_name: 'Nisha Verma', vehicle_number: 'UP-16-CT-9012', ewaybill_number: null, status: 'draft' }
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, newStatus: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/dispatch/challans/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setChallans(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
      } else {
        alert('Failed to update challan status.');
      }
    } catch {
      alert('Network error - could not update status.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/dispatch/challans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDc)
      });
      if (res.ok) {
        const added = await res.json();
        setChallans(prev => [added, ...prev]);
        setShowCreateModal(false);
      } else {
        alert('Failed to create Delivery Challan.');
      }
    } catch {
      alert('Network error - could not create Challan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col">
        <Header 
          title="Dispatch & Delivery" 
          subtitle="Generate delivery challans, track e-Way bills, and confirm client receipts" 
        />

        <div className="px-8 py-6 space-y-6">
          {/* Action Header Row */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
            <div>
              <p className="text-xs font-bold text-ink-900">Delivery Status Board</p>
              <p className="text-[11px] text-ink-400">Track shipments from factory to destination site</p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="px-4 h-9 bg-secondary text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              New Delivery Challan
            </button>
          </div>

          {/* Challans Table */}
          <div className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-alt">
                  {['Challan Num', 'Work Order', 'Client', 'Qty', 'Consignee', 'Vehicle', 'e-Way Bill', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold text-ink-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-xs text-ink-400">Loading delivery challans...</td>
                  </tr>
                ) : challans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-xs text-ink-400">No delivery challans registered.</td>
                  </tr>
                ) : challans.map(c => (
                  <tr key={c.id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="px-5 py-4 text-xs font-bold text-secondary">{c.dc_number}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-ink-900">
                      <div>{c.wo_number}</div>
                      <div className="text-[10px] text-ink-400 font-normal">{c.wo_title}</div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-ink-700">{c.client}</td>
                    <td className="px-5 py-4 text-xs text-ink-500 font-bold">{c.quantity}</td>
                    <td className="px-5 py-4 text-xs text-ink-500">{c.consignee_name}</td>
                    <td className="px-5 py-4 text-xs font-mono text-ink-500">{c.vehicle_number}</td>
                    <td className="px-5 py-4 text-xs font-mono">
                      {c.ewaybill_number ? (
                        <span className="text-green-700 font-semibold">{c.ewaybill_number}</span>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {c.status === 'draft' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f1f3f4] text-[#5f6368]">DRAFT</span>
                      )}
                      {c.status === 'approved' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f0fe] text-[#1967d2]">APPROVED</span>
                      )}
                      {c.status === 'dispatched' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef7e0] text-[#b06000]">DISPATCHED</span>
                      )}
                      {c.status === 'delivered' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333]">DELIVERED</span>
                      )}
                      {c.status === 'confirmed' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#137333]">CONFIRMED</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs space-x-2">
                      {c.status === 'draft' && (
                        <button 
                          onClick={() => updateStatus(c.id, 'approved')} 
                          disabled={saving}
                          className="text-secondary hover:underline font-bold disabled:opacity-60"
                        >
                          Approve Challan
                        </button>
                      )}
                      {c.status === 'approved' && (
                        <button 
                          onClick={() => updateStatus(c.id, 'dispatched')} 
                          disabled={saving}
                          className="text-amber-700 hover:underline font-bold disabled:opacity-60"
                        >
                          Mark Out / Dispatch
                        </button>
                      )}
                      {c.status === 'dispatched' && (
                        <button 
                          onClick={() => updateStatus(c.id, 'delivered')} 
                          disabled={saving}
                          className="text-green-700 hover:underline font-bold disabled:opacity-60"
                        >
                          Confirm Delivery
                        </button>
                      )}
                      {c.status === 'delivered' && (
                        <button 
                          onClick={() => updateStatus(c.id, 'confirmed')} 
                          disabled={saving}
                          className="text-green-700 hover:underline font-bold disabled:opacity-60"
                        >
                          Client Receipt Signoff
                        </button>
                      )}
                      {c.status === 'confirmed' && (
                        <span className="text-ink-400">Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: New Delivery Challan */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-border-subtle overflow-hidden">
              <div className="px-6 py-4 bg-surface-alt border-b border-border-subtle flex justify-between items-center">
                <h3 className="text-sm font-bold text-ink-900">Create New Delivery Challan</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-ink-400 hover:text-ink-900 text-sm font-bold">✕</button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-ink-400 uppercase">Work Order</label>
                    <select 
                      value={newDc.wo_number}
                      onChange={e => setNewDc(prev => ({ ...prev, wo_number: e.target.value }))}
                      className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                    >
                      <option value="WO-CHH-26-001">WO-CHH-26-001 (Starbucks)</option>
                      <option value="WO-B2B-26-001">WO-B2B-26-001 (WeWork)</option>
                      <option value="WO-D2C-26-005">WO-D2C-26-005 (Nisha Verma)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-ink-400 uppercase">Quantity Items</label>
                    <input 
                      type="number" 
                      value={newDc.quantity}
                      onChange={e => setNewDc(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-ink-400 uppercase">Consignee Name</label>
                    <input 
                      type="text" 
                      value={newDc.consignee_name}
                      onChange={e => setNewDc(prev => ({ ...prev, consignee_name: e.target.value }))}
                      className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-ink-400 uppercase">Vehicle Number</label>
                    <input 
                      type="text" 
                      value={newDc.vehicle_number}
                      onChange={e => setNewDc(prev => ({ ...prev, vehicle_number: e.target.value }))}
                      className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ink-400 uppercase">e-Way Bill Number (Optional)</label>
                  <input 
                    type="text" 
                    value={newDc.ewaybill_number}
                    onChange={e => setNewDc(prev => ({ ...prev, ewaybill_number: e.target.value }))}
                    className="border border-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    placeholder="Enter e-way bill number"
                  />
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
                    {saving ? 'Creating...' : 'Create Challan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
