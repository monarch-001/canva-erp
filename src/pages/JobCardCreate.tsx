import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface WorkOrder {
  id: string;
  wo_number: string;
  title: string;
  priority: string;
}

interface Carpenter {
  user_id: string;
  full_name: string;
  designation: string;
}

export default function JobCardCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Options states
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [carpenters, setCarpenters] = useState<Carpenter[]>([]);

  // Form states
  const [woId, setWoId] = useState('');
  const [productionStage, setProductionStage] = useState('cutting');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [priority, setPriority] = useState('normal');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [leadCarpenterId, setLeadCarpenterId] = useState('');
  const [supportCarpenterIds, setSupportCarpenterIds] = useState<string[]>([]);
  
  // Rework states
  const [isRework, setIsRework] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [originalJcId, setOriginalJcId] = useState('');
  const [existingJobCards, setExistingJobCards] = useState<{ id: string; jc_number: string; title: string; production_stage: string }[]>([]);

  useEffect(() => {
    const fetchFormOptions = async () => {
      try {
        const response = await fetch('/api/production/job-cards/form-data');
        if (response.ok) {
          const data = await response.json();
          setWorkOrders(data.work_orders);
          setCarpenters(data.carpenters);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load active resources.');
      } finally {
        setLoading(false);
      }
    };
    fetchFormOptions();
  }, []);

  useEffect(() => {
    if (!woId) {
      setExistingJobCards([]);
      return;
    }
    const fetchExistingJobCards = async () => {
      try {
        const response = await fetch(`/api/production/work-orders/${woId}/job-cards`);
        if (response.ok) {
          const data = await response.json();
          setExistingJobCards(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchExistingJobCards();
  }, [woId]);

  // Update priority based on selected Work Order
  const handleWOChange = (selectedWoId: string) => {
    setWoId(selectedWoId);
    const selectedWo = workOrders.find(wo => wo.id === selectedWoId);
    if (selectedWo) {
      setPriority(selectedWo.priority);
    }
  };

  const handleSupportCheckbox = (carpenterId: string, checked: boolean) => {
    if (checked) {
      setSupportCarpenterIds(prev => [...prev, carpenterId]);
    } else {
      setSupportCarpenterIds(prev => prev.filter(id => id !== carpenterId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woId || !title || !leadCarpenterId) {
      setError('Work Order, Task Title, and Lead Carpenter are required.');
      return;
    }

    setSaving(true);
    setError(null);

    const body = {
      wo_id: woId,
      production_stage: productionStage,
      title,
      description,
      quantity_assigned: quantity,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : 0,
      priority,
      supervisor_notes: supervisorNotes,
      lead_carpenter_id: leadCarpenterId,
      support_carpenter_ids: supportCarpenterIds,
      is_rework: isRework,
      rework_reason: reworkReason || null,
      original_jc_id: originalJcId || null
    };

    try {
      const response = await fetch('/api/production/job-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        navigate('/production');
      } else {
        const resErr = await response.json();
        setError(resErr.error || 'Failed to create job card.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to staging server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />

      <main className="ml-sidebar-width flex-1 min-h-screen flex flex-col bg-background">
        <Header title="New Job Card" />

        {loading ? (
          <div className="flex-1 flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
          </div>
        ) : (
          <div className="p-xl max-w-container-max mx-auto w-full flex-grow">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-outline font-label-md text-[12px] mb-md">
              <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/production')}>Production</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-bold">New Job Card</span>
            </nav>

            <div className="flex justify-between items-end mb-lg">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">Create New Job Card</h1>
                <p className="text-on-surface-variant font-body-md mt-1 italic text-opacity-70">PRD-09 Section 4.2: Daily Morning Supervisor Allocation</p>
              </div>
              <div className="flex items-center gap-3 bg-surface-container p-2 rounded-lg border border-border-subtle shadow-sm">
                <span className="material-symbols-outlined text-accent-gold">calendar_today</span>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-outline">Allocation Date</p>
                  <p className="font-label-md text-primary">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-status-error/10 border-l-4 border-status-error text-status-error p-md rounded-r-lg font-body-md mb-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-lg">
              {/* Main Form Fields */}
              <div className="col-span-12 lg:col-span-8 space-y-lg">
                <section className="bg-surface-card border border-border-subtle rounded-xl p-xl shadow-sm space-y-xl">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface block">Work Order Selection *</label>
                      <div className="relative">
                        <select
                          value={woId}
                          onChange={(e) => handleWOChange(e.target.value)}
                          className="w-full h-[40px] px-md bg-surface border border-border-subtle rounded focus:border-accent-gold focus:ring-0 appearance-none font-body-md cursor-pointer"
                          required
                        >
                          <option value="" disabled>Select Active Work Order</option>
                          {workOrders.map((wo) => (
                            <option key={wo.id} value={wo.id}>{wo.wo_number}: {wo.title}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface block">Production Stage *</label>
                      <div className="relative">
                        <select
                          value={productionStage}
                          onChange={(e) => setProductionStage(e.target.value)}
                          className="w-full h-[40px] px-md bg-surface border border-border-subtle rounded focus:border-accent-gold focus:ring-0 appearance-none font-body-md cursor-pointer"
                          required
                        >
                          <option value="cutting">Cutting</option>
                          <option value="edgebanding">Edge Banding</option>
                          <option value="drilling">Drilling</option>
                          <option value="assembly">Assembly</option>
                          <option value="lamination">Lamination</option>
                          <option value="finishing">Finishing</option>
                          <option value="hardware_fitting">Hardware Fitting</option>
                          <option value="quality_check">Quality Control</option>
                          <option value="rework">Rework</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                      </div>
                    </div>
                  </div>

                  {/* Rework Toggle & Selectors */}
                  {woId && (
                    <div className="bg-status-error/5 border border-status-error/15 p-md rounded-lg space-y-md">
                      <label className="flex items-center gap-sm cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isRework}
                          onChange={(e) => {
                            setIsRework(e.target.checked);
                            if (e.target.checked) {
                              setProductionStage('rework');
                            } else {
                              setProductionStage('cutting');
                            }
                          }}
                          className="w-4 h-4 text-status-error border-border-subtle focus:ring-status-error"
                        />
                        <span className="font-label-md text-label-md text-status-error font-bold group-hover:opacity-90">
                          Is this a QC Rework Task? (Flagged rework triggers separate hour/labor tracking)
                        </span>
                      </label>

                      {isRework && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-sm">
                          <div className="space-y-1">
                            <label className="font-label-md text-label-md text-status-error block font-bold">Referenced Parent Job Card *</label>
                            <div className="relative">
                              <select
                                value={originalJcId}
                                onChange={(e) => setOriginalJcId(e.target.value)}
                                required={isRework}
                                className="w-full h-[40px] px-md bg-white border border-status-error/30 rounded focus:border-status-error focus:ring-0 appearance-none font-body-md text-sm cursor-pointer text-status-error"
                              >
                                <option value="">Select Parent Job Card</option>
                                {existingJobCards.map((jc) => (
                                  <option key={jc.id} value={jc.id}>
                                    {jc.jc_number}: {jc.title} ({jc.production_stage.toUpperCase()})
                                  </option>
                                ))}
                              </select>
                              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-status-error opacity-60">expand_more</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="font-label-md text-label-md text-status-error block font-bold">Rework Reason *</label>
                            <input
                              type="text"
                              value={reworkReason}
                              onChange={(e) => setReworkReason(e.target.value)}
                              required={isRework}
                              placeholder="e.g., Lamination bubble, size mismatch"
                              className="w-full h-[40px] px-md bg-white border border-status-error/30 rounded focus:border-status-error focus:ring-0 font-body-md text-sm text-status-error"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface block">Task Title *</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-[40px] px-md bg-surface border border-border-subtle rounded focus:border-accent-gold focus:ring-0 font-body-md"
                      placeholder="e.g., Cut plywood for base unit"
                      type="text"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface block">Task Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-md bg-surface border border-border-subtle rounded focus:border-accent-gold focus:ring-0 font-body-md resize-none"
                      placeholder="Detailed technical instructions for the team..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface block">Quantity of Units *</label>
                      <input
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full h-[40px] px-md bg-surface border border-border-subtle rounded focus:border-accent-gold focus:ring-0 font-body-md"
                        min="1"
                        type="number"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface block">Estimated Time (Hours)</label>
                      <div className="relative">
                        <input
                          value={estimatedHours}
                          onChange={(e) => setEstimatedHours(e.target.value)}
                          className="w-full h-[40px] px-md bg-surface border border-border-subtle rounded focus:border-accent-gold focus:ring-0 font-body-md"
                          placeholder="0.0"
                          step="0.5"
                          type="number"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[12px] font-bold">HOURS</span>
                      </div>
                    </div>
                  </div>

                  {/* Priority display (Read-only, inherited from Work Order) */}
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface block">Job Priority <span className="text-outline font-normal">(Inherited from Work Order)</span></label>
                    <div className="flex gap-md">
                      {['normal', 'high', 'critical'].map((pr) => (
                        <div
                          key={pr}
                          className={`flex-1 p-md border rounded text-center transition-all uppercase font-bold text-xs ${
                            priority === pr
                              ? pr === 'critical' ? 'border-status-error bg-status-error/10 text-status-error'
                                : pr === 'high' ? 'border-status-pending bg-status-pending/10 text-on-secondary-container'
                                : 'border-status-success bg-status-success/5 text-status-success'
                              : 'border-border-subtle opacity-40 bg-surface-container-low'
                          }`}
                        >
                          {pr}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface block">Supervisor Notes <span className="text-outline font-normal">(Internal Only)</span></label>
                    <textarea
                      value={supervisorNotes}
                      onChange={(e) => setSupervisorNotes(e.target.value)}
                      className="w-full p-md bg-surface border border-border-subtle rounded focus:border-accent-gold focus:ring-0 font-body-md resize-none"
                      placeholder="Private notes for the Glide shift manager..."
                      rows={2}
                    />
                  </div>
                </section>

                <div className="flex items-center justify-end gap-md pt-md">
                  <button
                    onClick={() => navigate('/production')}
                    className="px-xl py-3 border border-tertiary text-tertiary font-label-md rounded hover:bg-surface-container transition-all"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    className="px-xl py-3 bg-accent-gold text-white font-label-md rounded shadow-lg shadow-gold-accent/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 font-bold"
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[20px]">post_add</span>
                    {saving ? 'Creating...' : 'Create Job Card'}
                  </button>
                </div>
              </div>

              {/* Resource Allocation Sidebar */}
              <div className="col-span-12 lg:col-span-4 space-y-lg">
                <section className="bg-surface-card border border-border-subtle rounded-xl p-lg shadow-sm space-y-4">
                  <div className="flex items-center justify-between mb-md">
                    <h3 className="font-title-md text-title-md text-primary font-bold">Resource Allocation</h3>
                    <span className="bg-status-success/10 text-status-success text-[10px] px-2 py-0.5 rounded font-bold">{carpenters.length} PRESENT</span>
                  </div>

                  {/* Lead Carpenter */}
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface block">Lead Carpenter *</label>
                    <div className="relative">
                      <select
                        value={leadCarpenterId}
                        onChange={(e) => setLeadCarpenterId(e.target.value)}
                        className="w-full h-[40px] px-md bg-surface border border-border-subtle rounded focus:border-accent-gold focus:ring-0 appearance-none font-body-md cursor-pointer"
                        required
                      >
                        <option value="" disabled>Assign Lead</option>
                        {carpenters.map((carp) => (
                          <option key={carp.user_id} value={carp.user_id}>{carp.full_name} ({carp.designation})</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">person</span>
                    </div>
                  </div>

                  {/* Support Team Checklist */}
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface block">Assign Support Team</label>
                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                      {carpenters.length === 0 ? (
                        <p className="text-xs text-on-surface-variant italic">No present staff available.</p>
                      ) : (
                        carpenters.map((carp) => (
                          <div 
                            key={carp.user_id}
                            className={`flex items-center justify-between p-3 border rounded hover:bg-surface-container-low cursor-pointer transition-all border-l-4 ${
                              leadCarpenterId === carp.user_id ? 'border-l-status-pending bg-status-pending/5' : 'border-l-status-success bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                checked={supportCarpenterIds.includes(carp.user_id)}
                                onChange={(e) => handleSupportCheckbox(carp.user_id, e.target.checked)}
                                disabled={leadCarpenterId === carp.user_id}
                                className="w-4 h-4 text-accent-gold border-border-subtle rounded focus:ring-0"
                                type="checkbox"
                              />
                              <div>
                                <p className="font-label-md text-primary font-bold">{carp.full_name}</p>
                                <p className="text-[11px] text-outline italic">
                                  {leadCarpenterId === carp.user_id ? 'Assigned as Lead' : carp.designation}
                                </p>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-outline-variant text-[20px]">construction</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
