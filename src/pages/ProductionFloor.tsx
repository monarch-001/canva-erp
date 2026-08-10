import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface Metrics {
  present_carpenters: number;
  total_carpenters: number;
  active_jobs: number;
  completed_today: number;
  in_progress: number;
  not_started: number;
  blocked: number;
}

interface Carpenter {
  carpenter_id: string;
  full_name: string;
  designation: string;
  avatar_url: string;
  jc_number: string;
  job_title: string;
  production_stage: string;
  job_status: string;
  quantity_assigned: number;
  quantity_completed: number;
  pause_reason: string | null;
  is_rework?: boolean;
  rework_reason?: string | null;
  wo_id?: string;
  job_card_id?: string;
}

interface WOStage {
  done: number;
  total: number;
}

interface WOProgress {
  wo_number: string;
  wo_title: string;
  priority: string;
  overall_pct: number;
  completed_qty: number;
  assigned_qty: number;
  stages: {
    cutting: WOStage;
    edgebanding: WOStage;
    assembly: WOStage;
  };
}

export default function ProductionFloor() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [carpenters, setCarpenters] = useState<Carpenter[]>([]);
  const [woProgress, setWoProgress] = useState<WOProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal details states
  const [selectedJobCardId, setSelectedJobCardId] = useState<string | null>(null);
  const [jobCardDetail, setJobCardDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!selectedJobCardId) {
      setJobCardDetail(null);
      return;
    }
    const fetchJobCardDetail = async () => {
      setLoadingDetail(true);
      try {
        const response = await fetch(`/api/production/job-cards/${selectedJobCardId}`);
        if (response.ok) {
          const data = await response.json();
          setJobCardDetail(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchJobCardDetail();
  }, [selectedJobCardId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/production/dashboard?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setCarpenters(data.carpenters);
        setWoProgress(data.wo_progress);
      }
    } catch (error) {
      console.error('Failed to fetch production floor data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [date]);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />

      <main className="ml-sidebar-width flex-1 min-h-screen flex flex-col bg-background">
        <Header 
          title="Production Floor" 
          showActionBtn={true}
          actionBtnText="Daily Attendance"
          actionBtnIcon="event_available"
          onActionClick={() => navigate('/production/attendance')}
        />

        {loading ? (
          <div className="flex-1 flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
          </div>
        ) : (
          <div className="p-lg max-w-container-max mx-auto w-full space-y-lg">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-md">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-primary font-bold">Production Dashboard</h2>
                <p className="font-body-md text-on-surface-variant">Section 4.1: PRD-09 Woodworking & Assembly</p>
              </div>
              <div className="flex items-center gap-sm bg-surface-card border border-border-subtle p-sm rounded-lg shadow-sm">
                <span className="material-symbols-outlined text-on-surface-variant">calendar_today</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border-none bg-transparent font-label-md focus:ring-0 cursor-pointer"
                />
                <span className="w-[1px] h-4 bg-border-subtle mx-sm"></span>
                <button 
                  onClick={() => setDate(new Date().toISOString().split('T')[0])}
                  className="px-md py-1 bg-surface-container-high rounded text-label-md hover:bg-surface-container-highest transition-colors font-bold text-xs"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Overview Cards (Bento Style) */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-md mb-xl">
                <div className="bg-surface-card border border-border-subtle p-md rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-sm">
                    <span className="material-symbols-outlined text-secondary">engineering</span>
                    <span className="text-status-success font-label-md text-[11px] bg-status-success/10 px-2 py-0.5 rounded font-bold">
                      {Math.round((metrics.present_carpenters / metrics.total_carpenters) * 100)}%
                    </span>
                  </div>
                  <p className="text-label-md text-on-surface-variant">Carpenters</p>
                  <h3 className="text-headline-md font-bold text-primary">{metrics.present_carpenters}/{metrics.total_carpenters}</h3>
                  <p className="text-[11px] text-on-surface-variant mt-1">{metrics.total_carpenters - metrics.present_carpenters} Absent today</p>
                </div>

                <div className="bg-surface-card border border-border-subtle p-md rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-sm">
                    <span className="material-symbols-outlined text-status-material">assignment_turned_in</span>
                  </div>
                  <p className="text-label-md text-on-surface-variant">Active Jobs</p>
                  <h3 className="text-headline-md font-bold text-primary">{metrics.active_jobs}</h3>
                  <div className="w-full bg-surface-container h-1.5 rounded-full mt-2">
                    <div className="bg-status-material h-full rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>

                <div className="bg-surface-card border border-border-subtle p-md rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-sm">
                    <span className="material-symbols-outlined text-status-success">check_circle</span>
                  </div>
                  <p className="text-label-md text-on-surface-variant">Completed</p>
                  <h3 className="text-headline-md font-bold text-status-success">{metrics.completed_today.toString().padStart(2, '0')}</h3>
                  <p className="text-[11px] text-on-surface-variant mt-1">Ready for QC</p>
                </div>

                <div className="bg-surface-card border border-border-subtle p-md rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-sm">
                    <span className="material-symbols-outlined text-status-pending">trending_up</span>
                  </div>
                  <p className="text-label-md text-on-surface-variant">In Progress</p>
                  <h3 className="text-headline-md font-bold text-status-pending">{metrics.in_progress.toString().padStart(2, '0')}</h3>
                  <p className="text-[11px] text-on-surface-variant mt-1">Steady flow</p>
                </div>

                <div className="bg-surface-card border border-border-subtle p-md rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-sm">
                    <span className="material-symbols-outlined text-status-draft">schedule</span>
                  </div>
                  <p className="text-label-md text-on-surface-variant">Not Started</p>
                  <h3 className="text-headline-md font-bold text-status-draft">{metrics.not_started.toString().padStart(2, '0')}</h3>
                  <p className="text-[11px] text-on-surface-variant mt-1">Queue priority: Low</p>
                </div>

                <div className={`bg-surface-card border p-md rounded-lg shadow-sm ${
                  metrics.blocked > 0 ? 'bg-error-container/20 border-error/20' : 'border-border-subtle'
                }`}>
                  <div className="flex justify-between items-start mb-sm">
                    <span className="material-symbols-outlined text-status-error">warning</span>
                  </div>
                  <p className="text-label-md text-on-surface-variant">Blocked/Paused</p>
                  <h3 className="text-headline-md font-bold text-status-error">{metrics.blocked.toString().padStart(2, '0')}</h3>
                  <p className="text-[11px] text-status-error font-medium mt-1">Requires Attention</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
              
              {/* SECTION 2: Carpenter Status Board */}
              <section className="lg:col-span-8 space-y-md">
                <div className="flex items-center justify-between mb-lg">
                  <h3 className="font-title-md text-title-md text-primary flex items-center gap-sm font-bold">
                    <span className="material-symbols-outlined">groups</span>
                    Carpenter Status Board
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  {carpenters.length === 0 ? (
                    <div className="col-span-2 text-center py-10 bg-surface-card border border-border-subtle rounded-xl text-on-surface-variant">
                      No carpenters assigned to job cards today.
                    </div>
                  ) : (
                    carpenters.map((carp) => {
                      const isBlocked = carp.job_status === 'paused';
                      const progressPct = carp.quantity_assigned > 0 ? Math.round((carp.quantity_completed / carp.quantity_assigned) * 100) : 0;
                      
                      return (
                        <div 
                          key={carp.job_card_id ?? carp.carpenter_id}
                          className={`bg-surface-card border rounded-xl p-md relative overflow-hidden group shadow-sm hover:shadow-md transition-all ${
                            carp.is_rework ? 'border-status-error/30 bg-status-error/[0.02]' : 'border-border-subtle'
                          }`}
                        >
                          <div className={`absolute top-0 left-0 w-1 h-full ${
                            carp.is_rework ? 'bg-status-error' : isBlocked ? 'bg-status-error' : progressPct >= 80 ? 'bg-status-success' : 'bg-status-pending'
                          }`}></div>

                          {carp.is_rework && (
                            <div className="mb-md bg-status-error/10 border border-status-error/25 text-status-error text-[10px] uppercase font-bold py-1 px-3 tracking-wider flex items-center gap-xs rounded w-fit">
                              <span className="material-symbols-outlined text-[14px]">warning</span> QC REWORK TASK
                            </div>
                          )}
                          
                          <div className="flex justify-between items-start mb-md">
                            <div className="flex items-center gap-md">
                              <div className="w-10 h-10 rounded-full bg-surface-container border-2 border-status-success p-0.5 overflow-hidden">
                                {carp.avatar_url ? (
                                  <img className="w-full h-full rounded-full object-cover" src={carp.avatar_url} alt={carp.full_name} />
                                ) : (
                                  <div className="w-full h-full rounded-full bg-secondary-fixed flex items-center justify-center font-bold text-primary">
                                    {carp.full_name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 className="font-label-md text-primary font-bold">{carp.full_name}</h4>
                                <span className="text-[11px] px-2 py-0.5 bg-status-success/10 text-status-success rounded-full font-bold">PRESENT</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">{carp.jc_number}</p>
                              <span className={`text-[11px] font-bold ${isBlocked ? 'text-status-error' : 'text-on-primary-container'}`}>
                                {isBlocked ? 'PAUSED' : carp.job_status.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-sm mb-md">
                            <p className="text-body-md font-semibold text-primary">{carp.job_title} ({carp.production_stage.toUpperCase()})</p>
                            <div className="flex justify-between text-[11px] text-on-surface-variant">
                              <span>Progress: {carp.quantity_completed}/{carp.quantity_assigned} units</span>
                              <span className={`font-bold ${isBlocked ? 'text-status-error' : 'text-status-success'}`}>
                                {progressPct}%
                              </span>
                            </div>
                            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                isBlocked ? 'bg-status-error' : progressPct >= 85 ? 'bg-status-success' : 'bg-status-pending'
                              }`} style={{ width: `${progressPct}%` }}></div>
                            </div>
                            {isBlocked && carp.pause_reason && (
                              <p className="text-[11px] text-status-error italic font-medium bg-status-error/10 p-1.5 rounded border border-status-error/20">
                                Pause: {carp.pause_reason}
                              </p>
                            )}
                            {carp.is_rework && carp.rework_reason && (
                              <p className="text-[11px] text-status-error italic font-medium bg-status-error/5 p-1.5 rounded border border-status-error/15 mt-sm">
                                Rework Reason: {carp.rework_reason}
                              </p>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => carp.job_card_id && setSelectedJobCardId(carp.job_card_id)}
                            className="w-full py-2 bg-surface-container-low text-primary text-label-md rounded border border-border-subtle hover:bg-surface-container transition-colors font-bold text-xs"
                          >
                            View Assignment Details
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* SECTION 3: Work Order Production Progress */}
              <section className="lg:col-span-4 space-y-md">
                <h3 className="font-title-md text-title-md text-primary mb-lg flex items-center gap-sm font-bold">
                  <span className="material-symbols-outlined">timeline</span>
                  WO Production Progress
                </h3>

                <div className="space-y-lg">
                  {woProgress.length === 0 ? (
                    <div className="bg-surface-card border border-border-subtle p-lg rounded-xl text-center text-on-surface-variant">
                      No active production orders found.
                    </div>
                  ) : (
                    woProgress.map((wo) => (
                      <div key={wo.wo_number} className="bg-surface-card border border-border-subtle rounded-xl p-lg shadow-sm">
                        <div className="flex justify-between items-start mb-md">
                          <div>
                            <h4 className="font-label-md text-primary font-bold">{wo.wo_number}</h4>
                            <p className="text-body-md text-on-surface-variant">{wo.wo_title}</p>
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-1 rounded ${
                            wo.priority === 'critical' ? 'bg-status-error text-on-primary' :
                            wo.priority === 'high' ? 'bg-secondary-container text-on-secondary-container' :
                            'bg-status-success/15 text-status-success'
                          }`}>
                            PRIORITY: {wo.priority.toUpperCase()}
                          </span>
                        </div>

                        <div className="mb-lg">
                          <div className="flex justify-between text-body-md mb-xs">
                            <span className="font-medium text-primary">{wo.completed_qty} of {wo.assigned_qty} Assigned Units Complete</span>
                            <span className="font-bold">{wo.overall_pct}%</span>
                          </div>
                          <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden flex">
                            <div className="bg-status-success h-full" style={{ width: `${wo.overall_pct}%` }}></div>
                          </div>
                        </div>

                        <div className="space-y-md">
                          {/* Stage: Cutting */}
                          <div className="flex items-center gap-md">
                            <div className="w-8 h-8 rounded bg-status-success/10 flex items-center justify-center text-status-success">
                              <span className="material-symbols-outlined text-[18px]">content_cut</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="font-bold text-on-surface uppercase text-xs">Cutting Stage</span>
                                <span className="font-bold">{wo.stages.cutting.done}/{wo.stages.cutting.total} DONE</span>
                              </div>
                              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                <div className="bg-status-success h-full" style={{ width: wo.stages.cutting.total > 0 ? `${(wo.stages.cutting.done / wo.stages.cutting.total) * 100}%` : '0%' }}></div>
                              </div>
                            </div>
                          </div>

                          {/* Stage: Edgebanding */}
                          <div className="flex items-center gap-md">
                            <div className="w-8 h-8 rounded bg-status-pending/10 flex items-center justify-center text-status-pending">
                              <span className="material-symbols-outlined text-[18px]">texture</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="font-bold text-on-surface uppercase text-xs">Edge Banding Stage</span>
                                <span className="font-bold">{wo.stages.edgebanding.done}/{wo.stages.edgebanding.total} DONE</span>
                              </div>
                              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                <div className="bg-status-pending h-full" style={{ width: wo.stages.edgebanding.total > 0 ? `${(wo.stages.edgebanding.done / wo.stages.edgebanding.total) * 100}%` : '0%' }}></div>
                              </div>
                            </div>
                          </div>

                          {/* Stage: Assembly */}
                          <div className="flex items-center gap-md">
                            <div className="w-8 h-8 rounded bg-primary-fixed flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined text-[18px]">handyman</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="font-bold text-on-surface uppercase text-xs">Assembly Stage</span>
                                <span className="font-bold">{wo.stages.assembly.done}/{wo.stages.assembly.total} DONE</span>
                              </div>
                              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                <div className="bg-primary h-full" style={{ width: wo.stages.assembly.total > 0 ? `${(wo.stages.assembly.done / wo.stages.assembly.total) * 100}%` : '0%' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Job Card Details Overlay Modal */}
        {selectedJobCardId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-lg animate-fade-in no-print">
            <div className="bg-surface-card border border-border-subtle rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto flex flex-col shadow-xl">
              {loadingDetail || !jobCardDetail ? (
                <div className="p-xl flex flex-col items-center justify-center gap-md">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-on-surface-variant font-label-md text-sm">Loading allocation details...</p>
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="border-b border-border-subtle p-xl flex justify-between items-start bg-surface-container-low">
                    <div>
                      <div className="flex items-center gap-sm mb-1">
                        <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                          {jobCardDetail.job_card.jc_number}: {jobCardDetail.job_card.title}
                        </h2>
                        {jobCardDetail.job_card.is_rework && (
                          <span className="text-[10px] px-2.5 py-0.5 bg-status-error/10 text-status-error rounded font-bold border border-status-error/20">
                            QC REWORK
                          </span>
                        )}
                      </div>
                      <p className="text-on-surface-variant font-body-sm text-sm">
                        Work Order: <span className="font-bold">{jobCardDetail.job_card.wo_number} - {jobCardDetail.job_card.wo_title}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedJobCardId(null)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors"
                    >
                      <span className="material-symbols-outlined text-outline">close</span>
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-xl space-y-xl flex-grow overflow-y-auto">
                    {/* QC Rework Alert Panel */}
                    {jobCardDetail.job_card.is_rework && (
                      <div className="bg-status-error/5 border border-status-error/15 p-md rounded-lg flex items-start gap-md">
                        <span className="material-symbols-outlined text-status-error text-xl mt-0.5">warning</span>
                        <div>
                          <h4 className="font-label-md text-status-error font-bold text-sm">QC Failure Rework Item</h4>
                          <p className="text-status-error font-body-md text-sm mt-0.5 italic">
                            Reason: {jobCardDetail.job_card.rework_reason || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                      {/* Left: Specs */}
                      <div className="space-y-lg">
                        <h3 className="font-title-sm text-title-sm text-primary font-bold border-b border-border-subtle pb-1">Task Specification</h3>
                        
                        <div className="grid grid-cols-2 gap-md text-sm">
                          <div>
                            <p className="text-on-surface-variant text-xs">Production Stage</p>
                            <p className="font-bold text-primary capitalize mt-0.5">{jobCardDetail.job_card.production_stage}</p>
                          </div>
                          <div>
                            <p className="text-on-surface-variant text-xs">Status</p>
                            <p className="font-bold text-primary capitalize mt-0.5">{jobCardDetail.job_card.status.replace(/_/g, ' ')}</p>
                          </div>
                          <div>
                            <p className="text-on-surface-variant text-xs">Quantity Assigned</p>
                            <p className="font-bold text-primary mt-0.5">{jobCardDetail.job_card.quantity_assigned} Units</p>
                          </div>
                          <div>
                            <p className="text-on-surface-variant text-xs">Quantity Completed</p>
                            <p className="font-bold text-status-success mt-0.5">{jobCardDetail.job_card.quantity_completed} Units</p>
                          </div>
                          <div>
                            <p className="text-on-surface-variant text-xs">Priority</p>
                            <p className="font-bold text-primary capitalize mt-0.5">{jobCardDetail.job_card.priority}</p>
                          </div>
                          <div>
                            <p className="text-on-surface-variant text-xs">Supervisor Allocation Date</p>
                            <p className="font-bold text-primary mt-0.5">{new Date(jobCardDetail.job_card.date).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {jobCardDetail.job_card.description && (
                          <div className="pt-sm">
                            <p className="text-on-surface-variant text-xs mb-1">Task Description / Drawing References</p>
                            <p className="font-body-md text-primary bg-surface-container p-md rounded text-sm italic">{jobCardDetail.job_card.description}</p>
                          </div>
                        )}

                        {jobCardDetail.job_card.supervisor_notes && (
                          <div>
                            <p className="text-on-surface-variant text-xs mb-1">Supervisor Technical Notes</p>
                            <p className="font-body-md text-primary bg-surface-container p-md rounded text-sm italic">{jobCardDetail.job_card.supervisor_notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Carpenter Allocations */}
                      <div className="space-y-lg">
                        <h3 className="font-title-sm text-title-sm text-primary font-bold border-b border-border-subtle pb-1">Assigned Carpenters</h3>
                        <div className="space-y-md">
                          {jobCardDetail.assignments.map((assign: any, index: number) => (
                            <div key={index} className="flex justify-between items-center bg-surface p-md rounded-lg border border-border-subtle">
                              <div className="flex items-center gap-md">
                                <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center font-bold text-primary text-sm">
                                  {assign.carpenter_name.split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="font-label-md text-primary font-bold text-sm">{assign.carpenter_name}</p>
                                  <p className="text-on-surface-variant text-[11px] uppercase tracking-wider">{assign.designation}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                {assign.is_lead ? (
                                  <span className="text-[10px] px-2 py-0.5 bg-accent-gold/15 text-accent-gold rounded font-bold uppercase tracking-wider border border-accent-gold/20">
                                    LEAD
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 bg-outline-variant text-outline rounded font-bold uppercase tracking-wider">
                                    SUPPORT
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom: EOD Updates */}
                    <div className="space-y-lg pt-md">
                      <h3 className="font-title-sm text-title-sm text-primary font-bold border-b border-border-subtle pb-1">End of Day (EOD) Logs</h3>
                      {jobCardDetail.eod_updates.length === 0 ? (
                        <p className="text-on-surface-variant font-body-md text-sm italic text-center py-4 bg-surface rounded">No work summaries logged for this card yet.</p>
                      ) : (
                        <div className="space-y-md">
                          {jobCardDetail.eod_updates.map((eod: any, index: number) => (
                            <div key={index} className="bg-surface p-md rounded-lg border border-border-subtle space-y-sm">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-primary">{eod.carpenter_name}</span>
                                <span className="text-on-surface-variant">{new Date(eod.update_date).toLocaleDateString()}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-sm text-[11px]">
                                <div>
                                  <span className="text-on-surface-variant">Qty Completed:</span> <span className="font-bold text-status-success">{eod.quantity_completed} units</span>
                                </div>
                                <div>
                                  <span className="text-on-surface-variant">Hours Spent:</span> <span className="font-bold text-primary">{eod.hours_logged} hrs</span>
                                </div>
                              </div>
                              {eod.notes && (
                                <p className="text-[11px] text-primary italic bg-surface-container/50 p-sm rounded border border-border-subtle/50">
                                  Log: {eod.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="border-t border-border-subtle p-xl flex justify-end bg-surface-container-low">
                    <button 
                      onClick={() => setSelectedJobCardId(null)}
                      className="px-lg h-[40px] bg-primary text-on-primary text-label-md rounded font-bold hover:opacity-90 active:scale-95 transition-all text-sm"
                    >
                      Close Detail View
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
