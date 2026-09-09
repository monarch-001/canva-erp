import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

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
  committed_delivery_date: string | null;
  requested_delivery_date: string | null;
  priority: string;
  status: string;
  created_at: string;
}

export default function WorkOrderList() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('supervisor_approved');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [clientFilter, setClientFilter] = useState('All Clients');
  const [priorityFilter, setPriorityFilter] = useState('Any Priority');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data
  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All Statuses') params.append('status', statusFilter);
      if (clientFilter !== 'All Clients') params.append('client_type', clientFilter);
      if (priorityFilter !== 'Any Priority') params.append('priority', priorityFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/work-orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0 || bulkUpdating) return;
    setBulkUpdating(true);

    try {
      const response = await fetch('/api/work-orders/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          status: bulkStatus,
          reason: bulkReason || undefined
        })
      });

      if (response.ok) {
        setSelectedIds([]);
        setBulkReason('');
        fetchWorkOrders();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to update statuses.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBulkUpdating(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter, clientFilter, priorityFilter, searchQuery]);

  // Helper to calculate days remaining
  const getDaysRemainingLabel = (dateStr: string | null) => {
    if (!dateStr) return { label: 'Pending', colorClass: 'bg-status-draft/10 text-status-draft' };
    const diffTime = new Date(dateStr).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)} Days Overdue`, colorClass: 'bg-status-error/10 text-status-error' };
    } else if (diffDays === 0) {
      return { label: 'Due Today', colorClass: 'bg-status-pending/10 text-status-pending' };
    } else if (diffDays <= 3) {
      return { label: `${diffDays} Days Left`, colorClass: 'bg-status-error/10 text-status-error font-bold' };
    } else {
      return { label: `${diffDays} Days Left`, colorClass: 'bg-status-success/10 text-status-success' };
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      
      <main className="ml-sidebar-width flex-1 min-h-screen">
        <Header 
          title="Work Orders" 
          showActionBtn={true} 
          actionBtnText="New Work Order"
          onActionClick={() => navigate('/work-orders/new')}
        />

        <div className="max-w-container-max mx-auto p-lg">
          
          {/* Filters Bar */}
          <div className="bg-surface-card border border-border-subtle rounded-xl p-lg mb-lg flex flex-wrap items-end gap-lg shadow-sm">
            <div className="space-y-base min-w-[160px]">
              <label className="font-label-md text-label-md text-on-surface-variant block">Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border-border-subtle rounded-lg text-sm h-10 focus:border-secondary focus:ring-0"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="in_production">In Production</option>
                <option value="bom_approved_pending_material">Material Prep</option>
                <option value="qc_pending">Quality Check</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-base min-w-[160px]">
              <label className="font-label-md text-label-md text-on-surface-variant block">Client Type</label>
              <select 
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full border-border-subtle rounded-lg text-sm h-10 focus:border-secondary focus:ring-0"
              >
                <option value="All Clients">All Clients</option>
                <option value="chhabee">Chhabee</option>
                <option value="b2b">External B2B</option>
                <option value="d2c">D2C</option>
              </select>
            </div>

            <div className="space-y-base min-w-[160px]">
              <label className="font-label-md text-label-md text-on-surface-variant block">Priority</label>
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full border-border-subtle rounded-lg text-sm h-10 focus:border-secondary focus:ring-0"
              >
                <option value="Any Priority">Any Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            <div className="space-y-base flex-1 min-w-[200px]">
              <label className="font-label-md text-label-md text-on-surface-variant block">Search</label>
              <div className="flex items-center gap-sm h-10 border border-border-subtle rounded-lg px-md bg-white">
                <span className="material-symbols-outlined text-sm opacity-50">search</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-none p-0 text-sm focus:ring-0 w-full" 
                  placeholder="Search orders, clients..."
                />
              </div>
            </div>

            <button 
              onClick={fetchWorkOrders}
              className="h-10 px-lg bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-all"
            >
              Apply Filters
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-lg">
            <div className="bg-surface-card border border-border-subtle p-lg rounded-xl flex items-center gap-lg">
              <div className="w-12 h-12 rounded-full bg-status-production/10 text-status-production flex items-center justify-center">
                <span className="material-symbols-outlined">precision_manufacturing</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Active Orders</p>
                <h3 className="text-headline-md font-headline-md">{workOrders.filter(w => w.status !== 'cancelled').length}</h3>
              </div>
            </div>
            <div className="bg-surface-card border border-border-subtle p-lg rounded-xl flex items-center gap-lg">
              <div className="w-12 h-12 rounded-full bg-status-pending/10 text-status-pending flex items-center justify-center">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Pending QC</p>
                <h3 className="text-headline-md font-headline-md">{workOrders.filter(w => w.status === 'qc_pending').length}</h3>
              </div>
            </div>
            <div className="bg-surface-card border border-border-subtle p-lg rounded-xl flex items-center gap-lg">
              <div className="w-12 h-12 rounded-full bg-status-error/10 text-status-error flex items-center justify-center">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Critical Delay</p>
                <h3 className="text-headline-md font-headline-md">{workOrders.filter(w => w.priority === 'critical' && w.status !== 'cancelled').length}</h3>
              </div>
            </div>
            <div className="bg-surface-card border border-border-subtle p-lg rounded-xl flex items-center gap-lg">
              <div className="w-12 h-12 rounded-full bg-status-success/10 text-status-success flex items-center justify-center">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Total Orders</p>
                <h3 className="text-headline-md font-headline-md">{workOrders.length}</h3>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-lg">
              {workOrders.map((wo) => {
                const dueInfo = getDaysRemainingLabel(wo.committed_delivery_date);
                return (
                  <div 
                    key={wo.id}
                    onClick={() => navigate(`/work-orders/${wo.id}`)}
                    className="bg-surface-card border border-border-subtle rounded-xl p-lg hover:shadow-md transition-all group relative overflow-hidden cursor-pointer"
                  >
                    {wo.priority === 'critical' && (
                      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                        <div className="absolute top-2 right-[-24px] rotate-45 bg-status-error text-white text-[10px] font-bold py-1 px-8">URGENT</div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-md">
                      <div className="flex items-start gap-md">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(wo.id)}
                          onChange={() => {}} // dummy onChange to satisfy React while using onClick
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedIds.includes(wo.id)) {
                              setSelectedIds(selectedIds.filter(id => id !== wo.id));
                            } else {
                              setSelectedIds([...selectedIds, wo.id]);
                            }
                          }}
                          className="mt-[5px] w-4 h-4 text-secondary rounded border-border-subtle focus:ring-secondary cursor-pointer"
                        />
                        <div>
                          <span className="text-secondary font-bold text-sm tracking-widest">{wo.wo_number}</span>
                          <h4 className="font-title-md text-title-md mt-1">{wo.title}</h4>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-sm">
                        <span className={`px-3 py-1 rounded-full font-status-pill text-status-pill border ${
                          wo.priority === 'critical' ? 'bg-status-error text-on-primary border-status-error' :
                          wo.priority === 'high' ? 'bg-status-pending/15 text-status-pending border-status-pending/20' :
                          'bg-status-success/15 text-status-success border-status-success/20'
                        }`}>
                          {wo.priority.toUpperCase()}
                        </span>
                        <span className="bg-status-production/15 text-status-production px-3 py-1 rounded-full font-status-pill text-status-pill border border-status-production/20">
                          {wo.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-md border-t border-border-subtle pt-md">
                      <div>
                        <p className="text-xs text-on-surface-variant uppercase font-bold mb-0.5">Client</p>
                        <p className="text-sm">{wo.client_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant uppercase font-bold mb-0.5">Furniture Type</p>
                        <p className="text-sm">{wo.furniture_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant uppercase font-bold mb-0.5">Quantity</p>
                        <p className="text-sm">{wo.production_quantity} Units</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant uppercase font-bold mb-0.5">Delivery Target</p>
                        <div className="flex items-center gap-sm">
                          <span className="text-sm font-bold">
                            {wo.committed_delivery_date ? new Date(wo.committed_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not Set'}
                          </span>
                          {wo.committed_delivery_date && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${dueInfo.colorClass}`}>
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              {dueInfo.label}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-lg flex gap-md">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/work-orders/${wo.id}`);
                        }}
                        className="flex-1 bg-primary text-on-primary py-2 rounded-lg text-sm font-bold hover:bg-secondary transition-all"
                      >
                        Manage Order
                      </button>
                      <button className="w-10 h-10 flex items-center justify-center border border-border-subtle rounded-lg hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-24 left-[55%] transform -translate-x-1/2 z-50 bg-white border border-border-subtle shadow-2xl rounded-xl p-md flex flex-wrap items-center gap-md max-w-4xl w-[70%]">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">layers</span>
              <span className="font-bold text-sm text-primary shrink-0">{selectedIds.length} Selected</span>
            </div>

            <form onSubmit={handleBulkUpdate} className="flex-1 flex items-center gap-md">
              <div className="flex-1 min-w-[120px]">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full h-10 border border-border-subtle rounded-lg px-md font-body-md text-sm bg-surface focus:ring-0"
                >
                  <option value="pending_review">Pending Review</option>
                  <option value="supervisor_approved">Supervisor Approved</option>
                  <option value="bom_approved_pending_material">BOM Approved Pending Material</option>
                  <option value="material_ready">Material Ready</option>
                  <option value="in_production">In Production</option>
                  <option value="production_complete">Production Complete</option>
                  <option value="qc_pending">QC Pending</option>
                  <option value="qc_passed">QC Passed</option>
                  <option value="ready_for_dispatch">Ready For Dispatch</option>
                  <option value="delivered_confirmed">Delivered Confirmed</option>
                </select>
              </div>

              <div className="flex-[2] min-w-[150px]">
                <input
                  type="text"
                  placeholder="Bulk update note/reason (optional)..."
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full h-10 border border-border-subtle rounded-lg px-md font-body-md text-sm focus:ring-0"
                />
              </div>

              <div className="flex gap-sm shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-md py-2 border border-border-subtle text-primary rounded text-xs font-bold hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkUpdating}
                  className="px-md py-2 bg-secondary text-on-primary rounded text-xs font-bold hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  {bulkUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* System Role Badge */}
        <div className="fixed bottom-lg right-lg z-50 bg-primary text-on-primary px-lg py-2 rounded-full shadow-2xl flex items-center gap-md border border-white/10 backdrop-blur-sm bg-opacity-90">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
          <span className="text-xs font-bold tracking-widest uppercase">System Role: Factory Manager</span>
        </div>
      </main>
    </div>
  );
}
