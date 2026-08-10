import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { getCurrentUser } from '../utils/auth';

interface WorkOrder {
  id: string;
  wo_number: string;
  title: string;
  client_type: string;
  client_name: string;
  project_name: string;
  furniture_type: string;
  production_quantity: number;
  delivery_terms: string;
  delivery_address: string;
  committed_delivery_date: string | null;
  requested_delivery_date: string | null;
  priority: string;
  status: string;
  finish_type: string;
  finish_detail: string;
  cancellation_reason?: string;
  created_at: string;
}

interface HistoryItem {
  id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changer_name: string | null;
  reason: string;
  created_at: string;
}

interface Drawing {
  id: string;
  file_name: string;
  file_url: string;
  version: number;
  uploaded_by: string;
  created_at: string;
}

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [activeTab, setActiveTab] = useState<'details' | 'status' | 'drawings'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  // Modals state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  const [showDateModal, setShowDateModal] = useState(false);
  const [newCommittedDate, setNewCommittedDate] = useState('');
  const [dateChangeReason, setDateChangeReason] = useState('');

  const fetchDetailData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/work-orders/${id}`);
      if (response.ok) {
        const data = await response.json();
        setWorkOrder(data.work_order);
        setHistory(data.history);
        setDrawings(data.drawings);
      } else {
        setError('Work order not found.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch details from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailData();
  }, [id]);

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;

    try {
      const response = await fetch(`/api/work-orders/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason })
      });

      if (response.ok) {
        setShowCancelModal(false);
        setCancelReason('');
        fetchDetailData();
      } else {
        alert('Failed to cancel order.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommittedDate) return;

    try {
      const response = await fetch(`/api/work-orders/${id}/committed-date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          committed_delivery_date: newCommittedDate,
          reason: dateChangeReason
        })
      });

      if (response.ok) {
        setShowDateModal(false);
        setNewCommittedDate('');
        setDateChangeReason('');
        fetchDetailData();
      } else {
        alert('Failed to update committed delivery date.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <main className="ml-sidebar-width flex-1 min-h-screen">
          <Header title="Work Order Detail" />
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <main className="ml-sidebar-width flex-1 min-h-screen">
          <Header title="Error" />
          <div className="max-w-container-max mx-auto p-lg text-center py-20">
            <h2 className="text-xl font-bold text-status-error mb-4">{error || 'Work Order not found'}</h2>
            <button
              onClick={() => navigate('/work-orders')}
              className="bg-primary text-on-primary px-lg py-2 rounded-lg"
            >
              Back to Work Orders
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />

      <main className="ml-sidebar-width flex-1 min-h-screen">
        <Header title="Work Order Detail" />

        <div className="max-w-container-max mx-auto p-lg no-print">
          
          {/* Top Panel card */}
          <div className="bg-surface-card border border-border-subtle p-lg rounded-lg mb-lg flex flex-col md:flex-row md:items-center justify-between gap-lg shadow-sm">
            <div className="flex items-start gap-lg">
              <div className="w-16 h-16 bg-surface-container-highest flex items-center justify-center rounded">
                <span className="material-symbols-outlined text-3xl text-secondary">precision_manufacturing</span>
              </div>
              <div>
                <div className="flex items-center gap-sm mb-xs flex-wrap">
                  <h2 className="font-headline-md text-headline-md">{workOrder.wo_number}: {workOrder.title}</h2>
                  <span className="px-sm py-[2px] bg-secondary-container text-on-secondary-container font-status-pill text-status-pill rounded border border-secondary-container">
                    {workOrder.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-md text-on-surface-variant font-label-md text-label-md">
                  <span className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-status-error text-base">priority_high</span> 
                    {workOrder.priority.toUpperCase()} PRIORITY
                  </span>
                  <span className="opacity-30">|</span>
                  <span>Created: {new Date(workOrder.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-sm flex-wrap no-print">
              <button
                onClick={() => window.print()}
                className="px-md py-sm bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md rounded flex items-center gap-xs hover:brightness-95 transition-all active:scale-95 font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">download</span> Export PDF
              </button>
              <button
                onClick={() => navigate('/work-orders/new', { state: { cloneFrom: workOrder } })}
                className="px-md py-sm bg-white border border-secondary text-secondary font-label-md text-label-md rounded flex items-center gap-xs hover:bg-secondary/10 transition-all active:scale-95 font-semibold"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span> Clone Order
              </button>
              {user.role === 'factory_manager' && workOrder.status !== 'cancelled' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-md py-sm bg-white border border-status-error text-status-error font-label-md text-label-md rounded flex items-center gap-xs hover:bg-status-error/10 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span> Cancel Order
                </button>
              )}
              <button
                onClick={() => navigate('/work-orders')}
                className="px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded flex items-center gap-xs hover:bg-primary/90 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
              </button>
            </div>
          </div>

          {/* Tabbed Panel */}
          <div className="bg-surface-card border border-border-subtle rounded-lg overflow-hidden shadow-sm">
            <div className="flex border-b border-border-subtle bg-surface-container-low">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-lg py-md font-title-md text-title-md flex items-center gap-sm transition-all ${
                  activeTab === 'details' ? 'active-tab font-semibold' : 'text-on-surface-variant hover:text-secondary'
                }`}
              >
                <span className="material-symbols-outlined">info</span> Details
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`px-lg py-md font-title-md text-title-md flex items-center gap-sm transition-all ${
                  activeTab === 'status' ? 'active-tab font-semibold' : 'text-on-surface-variant hover:text-secondary'
                }`}
              >
                <span className="material-symbols-outlined">history</span> Status History
              </button>
              <button
                onClick={() => setActiveTab('drawings')}
                className={`px-lg py-md font-title-md text-title-md flex items-center gap-sm transition-all ${
                  activeTab === 'drawings' ? 'active-tab font-semibold' : 'text-on-surface-variant hover:text-secondary'
                }`}
              >
                <span className="material-symbols-outlined">architecture</span> Drawings
              </button>
            </div>

            {/* Tab: Details */}
            {activeTab === 'details' && (
              <div className="p-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-xl">
                  {/* Client Info */}
                  <div className="space-y-md">
                    <h3 className="font-title-md text-title-md border-b border-border-subtle pb-sm mb-md flex items-center gap-sm text-primary font-bold">
                      <span className="material-symbols-outlined text-secondary">corporate_fare</span> Client Information
                    </h3>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Client Name</label>
                      <p className="font-body-lg text-body-lg font-semibold">{workOrder.client_name}</p>
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Client Type</label>
                      <p className="font-body-lg text-body-lg capitalize">{workOrder.client_type}</p>
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Project Name</label>
                      <p className="font-body-lg text-body-lg">{workOrder.project_name || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Furniture Specs */}
                  <div className="space-y-md">
                    <h3 className="font-title-md text-title-md border-b border-border-subtle pb-sm mb-md flex items-center gap-sm text-primary font-bold">
                      <span className="material-symbols-outlined text-secondary">chair</span> Furniture Specs
                    </h3>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Type</label>
                      <p className="font-body-lg text-body-lg">{workOrder.furniture_type}</p>
                    </div>
                    <div className="flex gap-xl">
                      <div>
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Quantity</label>
                        <p className="font-body-lg text-body-lg font-bold">{workOrder.production_quantity} Units</p>
                      </div>
                      <div>
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Finish Type</label>
                        <p className="font-body-lg text-body-lg">{workOrder.finish_type}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Dimensions (L x H x D)</label>
                      <p className="font-body-lg text-body-lg">
                        {workOrder.dimensions_l || '0'}mm x {workOrder.dimensions_h || '0'}mm x {workOrder.dimensions_d || '0'}mm
                      </p>
                    </div>
                  </div>

                  {/* Logistics & Dates */}
                  <div className="space-y-md">
                    <h3 className="font-title-md text-title-md border-b border-border-subtle pb-sm mb-md flex items-center gap-sm text-primary font-bold">
                      <span className="material-symbols-outlined text-secondary">local_shipping</span> Logistics & Committed Delivery
                    </h3>
                    
                    <div className="bg-surface-container-low border border-border-subtle p-md rounded flex flex-col justify-between gap-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Committed Delivery Date</label>
                          <p className="font-body-lg text-body-lg font-bold text-status-error">
                            {workOrder.committed_delivery_date 
                              ? new Date(workOrder.committed_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'Not Committed Yet'
                            }
                          </p>
                        </div>
                        {(user.role === 'factory_manager' || user.role === 'supervisor') && (
                          <button 
                            type="button"
                            onClick={() => setShowDateModal(true)}
                            className="p-xs text-secondary hover:bg-white rounded transition-colors"
                          >
                            <span className="material-symbols-outlined">edit_calendar</span>
                          </button>
                        )}
                      </div>
                      {(user.role === 'factory_manager' || user.role === 'supervisor') && (
                        <button
                          type="button"
                          onClick={() => setShowDateModal(true)}
                          className="w-full py-xs border border-secondary text-secondary font-label-md text-label-md rounded hover:bg-secondary hover:text-white transition-all text-sm font-semibold"
                        >
                          Set/Update Committed Date
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Delivery Terms</label>
                      <p className="font-body-lg text-body-lg capitalize">{workOrder.delivery_terms.replace(/_/g, ' ')}</p>
                    </div>
                    {workOrder.delivery_address && (
                      <div>
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Delivery Address</label>
                        <p className="text-sm text-on-surface-variant leading-relaxed">{workOrder.delivery_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cancel Info if Cancelled */}
                {workOrder.status === 'cancelled' && workOrder.cancellation_reason && (
                  <div className="mt-xl p-md bg-status-error/10 border-l-4 border-status-error rounded-r text-status-error">
                    <h4 className="font-bold text-sm mb-1">Order Cancellation Details</h4>
                    <p className="text-sm">{workOrder.cancellation_reason}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Status History */}
            {activeTab === 'status' && (
              <div className="p-lg">
                {history.length === 0 ? (
                  <p className="text-on-surface-variant text-center py-8">No status transition log records found.</p>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-0">
                    {history.map((item, idx) => (
                      <div key={item.id} className="flex gap-lg group">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 shrink-0 text-on-primary ${
                            item.new_status === 'cancelled' ? 'bg-status-error' : 'bg-status-success'
                          }`}>
                            <span className="material-symbols-outlined">
                              {item.new_status === 'cancelled' ? 'cancel' : 'check'}
                            </span>
                          </div>
                          {idx !== history.length - 1 && <div className="w-[2px] flex-1 bg-border-subtle"></div>}
                        </div>
                        <div className="pb-lg">
                          <h4 className="font-title-md text-title-md font-bold capitalize">
                            Status: {item.new_status.replace(/_/g, ' ')}
                          </h4>
                          <p className="text-on-surface-variant font-label-md text-label-md mb-xs">
                            {new Date(item.created_at).toLocaleString()} by {item.changer_name || 'System'}
                          </p>
                          {item.reason && (
                            <p className="font-body-md text-body-md bg-surface-container p-sm rounded border border-border-subtle">
                              {item.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Drawings */}
            {activeTab === 'drawings' && (
              <div className="p-lg">
                <div className="flex justify-between items-center mb-lg">
                  <h3 className="font-title-md text-title-md">Technical Documentation Drawings</h3>
                  <button className="bg-primary text-on-primary px-md py-sm font-label-md text-label-md rounded flex items-center gap-sm hover:opacity-90 transition-all">
                    <span className="material-symbols-outlined">upload</span> Upload New Version
                  </button>
                </div>
                {drawings.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-border-subtle rounded-lg">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">folder_open</span>
                    <p className="text-on-surface-variant">No engineering drawings attached to this work order yet.</p>
                  </div>
                ) : (
                  <div className="space-y-md">
                    {drawings.map((doc, idx) => (
                      <div key={doc.id} className={`border rounded-lg p-md ${idx === 0 ? 'border-secondary/30 bg-secondary-container/5' : 'border-border-subtle'}`}>
                        <div className="flex items-center justify-between flex-wrap gap-md">
                          <div className="flex items-center gap-md">
                            <div className="w-12 h-12 bg-status-error/10 text-status-error flex items-center justify-center rounded">
                              <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
                            </div>
                            <div>
                              <h4 className="font-title-md text-title-md font-bold">{doc.file_name}</h4>
                              <p className="text-on-surface-variant text-xs">
                                Uploaded {new Date(doc.created_at).toLocaleDateString()} • v{doc.version} • {idx === 0 && <span className="text-secondary font-bold">CURRENT VERSION</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-sm">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-sm py-xs border border-border-subtle rounded hover:bg-surface-container transition-colors text-sm font-semibold flex items-center gap-xs"
                            >
                              <span className="material-symbols-outlined text-base">visibility</span> View
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Cancellation Reason */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm">
            <div className="bg-white border border-border-subtle rounded-xl p-lg max-w-md w-full shadow-2xl mx-md">
              <div className="flex items-center gap-sm mb-md text-status-error">
                <span className="material-symbols-outlined text-2xl">warning</span>
                <h3 className="text-lg font-bold">Cancel Work Order</h3>
              </div>
              <form onSubmit={handleCancelOrder} className="space-y-md">
                <p className="text-sm text-on-surface-variant">
                  Are you sure you want to cancel this work order? This will atomically release all allocated raw materials and block production floor progression.
                </p>
                <div className="space-y-base">
                  <label className="block text-xs font-bold text-on-surface-variant">Reason for Cancellation *</label>
                  <textarea
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full border border-border-subtle rounded-lg p-md text-sm resize-none focus:border-secondary focus:ring-0"
                    placeholder="Enter reason (e.g., Client requested change, material shortage)..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-sm">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="px-md py-2 border border-border-subtle rounded text-sm hover:bg-surface"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-md py-2 bg-status-error text-on-primary rounded text-sm hover:opacity-90"
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Set/Update Committed Delivery Date */}
        {showDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm">
            <div className="bg-white border border-border-subtle rounded-xl p-lg max-w-md w-full shadow-2xl mx-md">
              <div className="flex items-center gap-sm mb-md text-secondary">
                <span className="material-symbols-outlined text-2xl">calendar_month</span>
                <h3 className="text-lg font-bold">Committed Delivery Date</h3>
              </div>
              <form onSubmit={handleUpdateDate} className="space-y-md">
                <div className="space-y-base">
                  <label className="block text-xs font-bold text-on-surface-variant">Committed Date *</label>
                  <input
                    required
                    type="date"
                    value={newCommittedDate}
                    onChange={(e) => setNewCommittedDate(e.target.value)}
                    className="w-full h-10 border border-border-subtle rounded-lg px-md text-sm focus:border-secondary focus:ring-0"
                  />
                </div>
                <div className="space-y-base">
                  <label className="block text-xs font-bold text-on-surface-variant">Reason / Notes for Date Log</label>
                  <textarea
                    value={dateChangeReason}
                    onChange={(e) => setDateChangeReason(e.target.value)}
                    className="w-full border border-border-subtle rounded-lg p-md text-sm resize-none focus:border-secondary focus:ring-0"
                    placeholder="Provide details for log version timeline..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-sm">
                  <button
                    type="button"
                    onClick={() => setShowDateModal(false)}
                    className="px-md py-2 border border-border-subtle rounded text-sm hover:bg-surface"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-md py-2 bg-secondary text-on-primary rounded text-sm hover:brightness-110"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PRINT ONLY VIEW */}
        <div className="hidden print:block p-xl space-y-lg max-w-4xl mx-auto text-black">
          <div className="border-b-2 border-primary pb-sm flex justify-between items-end">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider">Canva Concepts Staging ERP</h1>
              <p className="text-xs text-gray-500">Work Order Instruction Sheet</p>
            </div>
            <p className="text-xs font-mono">Date Printed: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-md pt-md">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Work Order ID</p>
              <p className="text-sm font-bold">{workOrder.wo_number}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Title / Item</p>
              <p className="text-sm font-bold">{workOrder.title}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Priority</p>
              <p className="text-sm font-bold uppercase">{workOrder.priority}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Production Status</p>
              <p className="text-sm font-bold uppercase">{workOrder.status.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <div className="border-t border-gray-300 pt-md">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-sm">Client & Project Info</h3>
            <table className="w-full text-xs text-left border-collapse">
              <tbody>
                <tr>
                  <th className="py-base pr-md border-b border-gray-200">Client Name</th>
                  <td className="py-base border-b border-gray-200">{workOrder.client_name}</td>
                  <th className="py-base px-md border-b border-gray-200">Client Type</th>
                  <td className="py-base border-b border-gray-200 uppercase">{workOrder.client_type}</td>
                </tr>
                <tr>
                  <th className="py-base pr-md border-b border-gray-200">Project / Stream</th>
                  <td className="py-base border-b border-gray-200">{workOrder.project_name || '--'} / {workOrder.stream}</td>
                  <th className="py-base px-md border-b border-gray-200">Production Qty</th>
                  <td className="py-base border-b border-gray-200">{workOrder.production_quantity} units</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-300 pt-md">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-sm">Product Specifications</h3>
            <table className="w-full text-xs text-left border-collapse">
              <tbody>
                <tr>
                  <th className="py-base pr-md border-b border-gray-200">Furniture Type</th>
                  <td className="py-base border-b border-gray-200">{workOrder.furniture_type}</td>
                  <th className="py-base px-md border-b border-gray-200">Dimensions</th>
                  <td className="py-base border-b border-gray-200">{workOrder.dimensions_l} x {workOrder.dimensions_h} x {workOrder.dimensions_d} mm</td>
                </tr>
                <tr>
                  <th className="py-base pr-md border-b border-gray-200">Finish Type</th>
                  <td className="py-base border-b border-gray-200 uppercase">{workOrder.finish_type || 'standard'}</td>
                  <th className="py-base px-md border-b border-gray-200">Finish Detail</th>
                  <td className="py-base border-b border-gray-200">{workOrder.finish_detail || 'None'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-300 pt-md">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-sm">Logistics & Delivery</h3>
            <table className="w-full text-xs text-left border-collapse">
              <tbody>
                <tr>
                  <th className="py-base pr-md border-b border-gray-200">Committed Delivery Date</th>
                  <td className="py-base border-b border-gray-200 font-bold">
                    {workOrder.committed_delivery_date ? new Date(workOrder.committed_delivery_date).toLocaleDateString() : 'NOT SET'}
                  </td>
                  <th className="py-base px-md border-b border-gray-200">Requested Date</th>
                  <td className="py-base border-b border-gray-200">
                    {workOrder.requested_delivery_date ? new Date(workOrder.requested_delivery_date).toLocaleDateString() : '--'}
                  </td>
                </tr>
                <tr>
                  <th className="py-base pr-md border-b border-gray-200">Delivery Terms</th>
                  <td className="py-base border-b border-gray-200 uppercase">{workOrder.delivery_terms}</td>
                  <th className="py-base px-md border-b border-gray-200">Delivery Address</th>
                  <td className="py-base border-b border-gray-200">{workOrder.delivery_address || '--'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-300 pt-md">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-sm">Timeline History</h3>
            <div className="space-y-base text-xs">
              {history.map((h, idx) => (
                <div key={idx} className="flex justify-between py-base border-b border-gray-100">
                  <span>
                    <span className="font-bold uppercase">[{h.new_status.replace(/_/g, ' ')}]</span> - {h.reason || 'Status transition logged.'}
                  </span>
                  <span className="text-gray-500">{new Date(h.created_at).toLocaleString()} by {h.changer_name || 'System'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
