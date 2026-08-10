import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { getCurrentUser } from '../utils/auth';

interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  ref_link: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);

  // Mock data for Factory Manager Dashboard
  const financialData = {
    mtd_revenue: '₹24,80,000',
    receivables: '₹8,45,000',
    payables: '₹3,12,000',
    bank_balance: '₹42,10,000'
  };

  const managerAlerts: AlertItem[] = [
    { id: '1', type: 'critical', message: 'Machine breakdown on Edgebanding Line B', ref_link: '#' },
    { id: '2', type: 'warning', message: 'Low Stock: Laminate glue (Stock B) - 12L remaining', ref_link: '#' },
    { id: '3', type: 'info', message: 'Overdue Invoice: #INV-2026-089 (Global Tech Holdings)', ref_link: '#' }
  ];

  // Mock data for Supervisor Dashboard
  const supervisorActions = [
    { id: '1', task: 'BOM Review Required: WO-8835-23', duration: '2 hours ago' },
    { id: '2', task: 'Approve Overtime Request: Anil Wilson (2.5 hrs)', duration: '4 hours ago' },
    { id: '3', task: 'EOD Production Update Verification (5 tasks)', duration: 'Yesterday' }
  ];

  // Mock data for Site Manager Dashboard
  const myWorkOrders = [
    { id: '1', wo_number: 'WO-0005-26', title: 'Test Executive Desk', client: 'Test Client Inc', status: 'draft', target: 'Aug 15, 2026' },
    { id: '2', wo_number: 'WO-8850-23', title: 'Retail Display Unit - Matte Black', client: 'Urban Outfitters HQ', status: 'draft', target: 'Sep 23, 2026' }
  ];

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />

      <main className="ml-sidebar-width flex-1 min-h-screen flex flex-col bg-background">
        <Header title="Dashboard Overview" />

        {loading ? (
          <div className="flex-grow flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
          </div>
        ) : (
          <div className="p-lg max-w-container-max mx-auto w-full space-y-lg">
            
            {/* Greeting Header */}
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary font-bold">
                Welcome back, {user.name}
              </h2>
              <p className="text-on-surface-variant font-body-md">
                Here is your operational snapshot for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
              </p>
            </div>

            {/* FACTORY MANAGER VIEW */}
            {user.role === 'factory_manager' && (
              <div className="space-y-lg">
                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
                  <div className="bg-surface-card border border-border-subtle p-md rounded-lg shadow-sm">
                    <p className="text-xs text-on-surface-variant/75 uppercase tracking-wider font-bold">MTD Revenue</p>
                    <p className="text-headline-md font-bold text-status-success mt-1">{financialData.mtd_revenue}</p>
                    <span className="text-[10px] text-status-success font-bold">↑ 12% vs last month</span>
                  </div>
                  <div className="bg-surface-card border border-border-subtle p-md rounded-lg shadow-sm">
                    <p className="text-xs text-on-surface-variant/75 uppercase tracking-wider font-bold">Receivables Aging</p>
                    <p className="text-headline-md font-bold text-status-pending mt-1">{financialData.receivables}</p>
                    <span className="text-[10px] text-status-pending font-bold">Within 30-day bucket</span>
                  </div>
                  <div className="bg-surface-card border border-border-subtle p-md rounded-lg shadow-sm">
                    <p className="text-xs text-on-surface-variant/75 uppercase tracking-wider font-bold">Payables Due</p>
                    <p className="text-headline-md font-bold text-status-error mt-1">{financialData.payables}</p>
                    <span className="text-[10px] text-status-error font-bold">Due this Friday</span>
                  </div>
                  <div className="bg-surface-card border border-border-subtle p-md rounded-lg shadow-sm">
                    <p className="text-xs text-on-surface-variant/75 uppercase tracking-wider font-bold">Liquid Cash Balance</p>
                    <p className="text-headline-md font-bold text-primary mt-1">{financialData.bank_balance}</p>
                    <span className="text-[10px] text-on-surface-variant/50 font-bold">HDFC bank accounts</span>
                  </div>
                </div>

                {/* Alerts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
                  <div className="bg-surface-card border border-border-subtle rounded-xl p-lg shadow-sm">
                    <h3 className="font-title-md text-title-md text-primary mb-md font-bold flex items-center gap-sm">
                      <span className="material-symbols-outlined text-status-error">notifications_active</span> Critical In-Floor Alerts
                    </h3>
                    <div className="space-y-sm">
                      {managerAlerts.map((alert) => (
                        <div 
                          key={alert.id}
                          className={`p-md rounded border flex gap-sm items-center ${
                            alert.type === 'critical' ? 'bg-status-error/10 border-status-error/20 text-status-error' :
                            alert.type === 'warning' ? 'bg-status-pending/10 border-status-pending/20 text-on-secondary-container' :
                            'bg-surface-container border-border-subtle text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">
                            {alert.type === 'critical' ? 'cancel' : alert.type === 'warning' ? 'warning' : 'info'}
                          </span>
                          <span className="text-xs font-semibold flex-1">{alert.message}</span>
                          <button className="text-[10px] underline font-bold uppercase hover:opacity-80">Resolve</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Production Snapshot */}
                  <div className="bg-surface-card border border-border-subtle rounded-xl p-lg shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-title-md text-title-md text-primary mb-md font-bold flex items-center gap-sm">
                        <span className="material-symbols-outlined text-secondary">precision_manufacturing</span> Production Snapshot
                      </h3>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Currently loading 3 active Job Cards across 4 present floor technicians. Current Plant capacity load is at 68%.
                      </p>
                    </div>
                    <button 
                      onClick={() => navigate('/production')}
                      className="w-full mt-lg py-2.5 bg-primary text-on-primary rounded-lg font-bold text-xs hover:opacity-95 transition-all"
                    >
                      Open Production Floor Panel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUPERVISOR VIEW */}
            {user.role === 'supervisor' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
                {/* Left Side: Actions Needed */}
                <div className="lg:col-span-8 bg-surface-card border border-border-subtle rounded-xl p-lg shadow-sm space-y-md">
                  <h3 className="font-title-md text-title-md text-primary font-bold flex items-center gap-sm">
                    <span className="material-symbols-outlined text-status-pending">list_alt</span> Supervisor Action Log
                  </h3>
                  <div className="divide-y divide-border-subtle">
                    {supervisorActions.map((act) => (
                      <div key={act.id} className="py-md flex justify-between items-center gap-md hover:bg-surface-container-low/20 transition-all px-xs">
                        <div>
                          <p className="text-sm font-semibold text-primary">{act.task}</p>
                          <span className="text-[10px] text-on-surface-variant/60">{act.duration}</span>
                        </div>
                        <button className="px-md py-1 bg-secondary text-on-primary font-bold text-xs rounded hover:brightness-105 transition-all">
                          Action
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Quick Links */}
                <div className="lg:col-span-4 space-y-md">
                  <div className="bg-surface-card border border-border-subtle rounded-xl p-lg shadow-sm space-y-md">
                    <h3 className="font-title-md text-title-md text-primary font-bold">Quick Allocation</h3>
                    <div className="space-y-sm">
                      <button 
                        onClick={() => navigate('/production/job-cards/new')}
                        className="w-full py-2.5 bg-accent-gold text-white font-bold text-xs rounded shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-base"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span> Create Job Card
                      </button>
                      <button 
                        onClick={() => navigate('/production/attendance')}
                        className="w-full py-2.5 bg-white border border-border-subtle text-primary font-bold text-xs rounded hover:bg-surface transition-all flex items-center justify-center gap-base"
                      >
                        <span className="material-symbols-outlined text-[16px]">event_available</span> Mark Floor Attendance
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SITE MANAGER VIEW */}
            {user.role === 'site_manager' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
                {/* Left Side: My Work Orders */}
                <div className="lg:col-span-8 bg-surface-card border border-border-subtle rounded-xl p-lg shadow-sm space-y-md">
                  <h3 className="font-title-md text-title-md text-primary font-bold flex items-center gap-sm">
                    <span className="material-symbols-outlined text-secondary">assignment</span> My Active Work Orders
                  </h3>
                  <div className="divide-y divide-border-subtle">
                    {myWorkOrders.map((wo) => (
                      <div key={wo.id} className="py-md flex justify-between items-center gap-md">
                        <div>
                          <p className="text-sm font-semibold text-primary">{wo.wo_number}: {wo.title}</p>
                          <p className="text-xs text-on-surface-variant/75">{wo.client} • Target: {wo.target}</p>
                        </div>
                        <span className="px-sm py-0.5 bg-status-draft/10 text-status-draft text-[10px] font-bold rounded uppercase">
                          {wo.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Quick Actions */}
                <div className="lg:col-span-4 bg-surface-card border border-border-subtle rounded-xl p-lg shadow-sm space-y-md">
                  <h3 className="font-title-md text-title-md text-primary font-bold">Quick Actions</h3>
                  <div className="space-y-sm">
                    <button 
                      onClick={() => navigate('/work-orders/new')}
                      className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded hover:opacity-90 transition-all flex items-center justify-center gap-base"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span> Raise New Work Order
                    </button>
                    <button 
                      className="w-full py-2.5 bg-white border border-border-subtle text-primary font-bold text-xs rounded hover:bg-surface transition-all flex items-center justify-center gap-base"
                    >
                      <span className="material-symbols-outlined text-[16px]">rule</span> Request Change Order
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
