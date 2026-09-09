import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface WorkOrder {
  id: string;
  wo_number: string;
  title: string;
  client_name: string;
}

const DEFAULT_CHECKPOINTS = [
  'Dimensions matches technical drawing within ±2mm tolerance',
  'Edge banding is flush, clean, and has no visible glue residue',
  'Hardware fittings (hinges, slides, handles) installed securely and operates smoothly',
  'Polishing/lamination finish is uniform, free of scratches or bubbles',
  'Structural stability check — stable under design load, no wobbling',
  'Corner joints are perfectly aligned, secure, and gap-free',
  'Packaging protection corner protectors applied'
];

export default function QCEntry() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWoId, setSelectedWoId] = useState('');
  const [qcType, setQcType] = useState<'pre_dispatch' | 're_qc'>('pre_dispatch');
  const [conditionalNotes, setConditionalNotes] = useState('');
  
  const [checks, setChecks] = useState<Array<{ text: string; passed: boolean; remarks: string }>>(
    DEFAULT_CHECKPOINTS.map(cp => ({ text: cp, passed: true, remarks: '' }))
  );
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch work orders to link
    fetch('/api/work-orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setWorkOrders(data);
          if (data.length > 0) setSelectedWoId(data[0].id);
        } else {
          // Fallback static list for seeding if work-orders route fails
          const sample = [
            { id: 'wo-1', wo_number: 'WO-CHH-26-001', title: 'Reception Counter', client_name: 'Starbucks' },
            { id: 'wo-2', wo_number: 'WO-B2B-26-001', title: 'Office Workstations', client_name: 'WeWork' },
            { id: 'wo-3', wo_number: 'WO-D2C-26-005', title: 'Wardrobe Set', client_name: 'Nisha Verma' }
          ];
          setWorkOrders(sample);
          setSelectedWoId(sample[0].id);
        }
      })
      .catch(() => {
        const sample = [
          { id: 'wo-1', wo_number: 'WO-CHH-26-001', title: 'Reception Counter', client_name: 'Starbucks' },
          { id: 'wo-2', wo_number: 'WO-B2B-26-001', title: 'Office Workstations', client_name: 'WeWork' },
          { id: 'wo-3', wo_number: 'WO-D2C-26-005', title: 'Wardrobe Set', client_name: 'Nisha Verma' }
        ];
        setWorkOrders(sample);
        setSelectedWoId(sample[0].id);
      });
  }, []);

  const totalCheckpoints = checks.length;
  const passedCheckpoints = checks.filter(c => c.passed).length;
  const failedCheckpoints = totalCheckpoints - passedCheckpoints;
  
  let finalResult: 'pass' | 'fail' | 'conditional_pass' = 'pass';
  if (failedCheckpoints > 0) {
    if (failedCheckpoints <= 2) {
      finalResult = 'conditional_pass';
    } else {
      finalResult = 'fail';
    }
  }

  function toggleCheck(index: number) {
    setChecks(prev => prev.map((c, i) => i === index ? { ...c, passed: !c.passed } : c));
  }

  function updateRemark(index: number, remark: string) {
    setChecks(prev => prev.map((c, i) => i === index ? { ...c, remarks: remark } : c));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWoId) return;
    
    setSubmitting(true);
    const selectedWo = workOrders.find(w => w.id === selectedWoId);
    
    try {
      const res = await fetch('/api/qc/records/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wo_id: selectedWoId,
          wo_number: selectedWo?.wo_number,
          wo_title: selectedWo?.title,
          client: selectedWo?.client_name,
          qc_type: qcType,
          result: finalResult,
          conditional_notes: conditionalNotes,
          total_checkpoints: totalCheckpoints,
          passed_checkpoints: passedCheckpoints,
          failed_checkpoints: failedCheckpoints,
          checks: checks
        })
      });

      if (res.ok) {
        navigate('/quality-control');
      } else {
        alert('Failed to save inspection record.');
      }
    } catch {
      alert('Network error - could not save inspection.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col">
        <Header 
          title="New Quality Control Entry" 
          subtitle="Record checklist audit for completed Work Orders" 
        />

        <form onSubmit={handleSubmit} className="px-8 py-6 max-w-4xl space-y-6">
          <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-ink-900 border-b pb-2">1. Select Work Order</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Work Order</label>
                <select
                  value={selectedWoId}
                  onChange={e => setSelectedWoId(e.target.value)}
                  className="border border-border-strong rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                >
                  {workOrders.map(wo => (
                    <option key={wo.id} value={wo.id}>
                      {wo.wo_number} — {wo.title} ({wo.client_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-ink-400">QC Type</label>
                <select
                  value={qcType}
                  onChange={e => setQcType(e.target.value as any)}
                  className="border border-border-strong rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                >
                  <option value="pre_dispatch">Pre-Dispatch Inspection</option>
                  <option value="re_qc">Re-QC (After Rework)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-ink-900 border-b pb-2">2. Checklist Verification</h3>
            
            <div className="divide-y divide-border-subtle">
              {checks.map((c, idx) => (
                <div key={idx} className="py-4 flex gap-4 items-start">
                  <input
                    type="checkbox"
                    checked={c.passed}
                    onChange={() => toggleCheck(idx)}
                    className="mt-1 w-4 h-4 rounded border-border-strong text-secondary focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-semibold text-ink-900">{c.text}</p>
                    <input
                      type="text"
                      placeholder="Add issues/remarks here (optional)"
                      value={c.remarks}
                      onChange={e => updateRemark(idx, e.target.value)}
                      className="w-full text-xs border border-border-subtle rounded px-2.5 py-1 focus:outline-none bg-surface-alt/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Result Card Summary */}
          <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-ink-900 border-b pb-2">3. Inspection Verdict</h3>
            
            <div className="flex justify-between items-center bg-surface-alt/50 p-4 rounded-lg">
              <div>
                <p className="text-xs font-bold text-ink-900">
                  {passedCheckpoints} of {totalCheckpoints} checkpoints passed
                </p>
                <p className="text-[11px] text-ink-400">
                  Failures trigger automatic Rework cards when submitted
                </p>
              </div>
              <div>
                {finalResult === 'pass' ? (
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#e6f4ea] text-[#137333]">APPROVED PASS</span>
                ) : finalResult === 'conditional_pass' ? (
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#fef7e0] text-[#b06000]">CONDITIONAL PASS</span>
                ) : (
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#fce8e6] text-[#c5221f]">REJECTED / FAIL</span>
                )}
              </div>
            </div>

            {finalResult === 'conditional_pass' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Conditional Notes</label>
                <textarea
                  placeholder="Explain minor defects accepted under tolerance..."
                  value={conditionalNotes}
                  onChange={e => setConditionalNotes(e.target.value)}
                  className="border border-border-strong rounded-lg p-2.5 text-xs h-20 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/quality-control')}
              className="px-5 py-2 border border-[#D5CFC8] text-ink-700 text-sm font-semibold rounded-lg hover:bg-surface-alt transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-secondary text-white text-sm font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Submit Inspection'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
