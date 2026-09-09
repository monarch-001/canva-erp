import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface QCRecord {
  id: string;
  qc_number: string;
  wo_number: string;
  wo_title: string;
  client: string;
  qc_date: string;
  result: 'pass' | 'fail' | 'conditional_pass';
  inspector: string;
  total_checkpoints: number;
  passed_checkpoints: number;
  conditional_notes?: string;
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

export default function QualityControl() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<QCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [selectedRecord, setSelectedRecord] = useState<QCRecord | null>(null);

  useEffect(() => {
    fetch('/api/qc/records')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecords(data);
        } else {
          setRecords([
            { id: '1', qc_number: 'QC-26-001', wo_number: 'WO-CHH-26-001', wo_title: 'Reception Counter', client: 'Starbucks', qc_date: '2026-08-15', result: 'pass', inspector: 'Suresh Yadav', total_checkpoints: 7, passed_checkpoints: 7 },
            { id: '2', qc_number: 'QC-26-002', wo_number: 'WO-B2B-26-001', wo_title: 'Office Workstations', client: 'WeWork', qc_date: '2026-08-14', result: 'fail', inspector: 'Suresh Yadav', total_checkpoints: 7, passed_checkpoints: 4 },
            { id: '3', qc_number: 'QC-26-003', wo_number: 'WO-D2C-26-005', wo_title: 'Wardrobe Set', client: 'Nisha Verma', qc_date: '2026-08-13', result: 'conditional_pass', inspector: 'Suresh Yadav', total_checkpoints: 7, passed_checkpoints: 6, conditional_notes: 'Minor edge banding gap accepted under limit' }
          ]);
        }
      })
      .catch(() => {
        setRecords([
          { id: '1', qc_number: 'QC-26-001', wo_number: 'WO-CHH-26-001', wo_title: 'Reception Counter', client: 'Starbucks', qc_date: '2026-08-15', result: 'pass', inspector: 'Suresh Yadav', total_checkpoints: 7, passed_checkpoints: 7 },
          { id: '2', qc_number: 'QC-26-002', wo_number: 'WO-B2B-26-001', wo_title: 'Office Workstations', client: 'WeWork', qc_date: '2026-08-14', result: 'fail', inspector: 'Suresh Yadav', total_checkpoints: 7, passed_checkpoints: 4 },
          { id: '3', qc_number: 'QC-26-003', wo_number: 'WO-D2C-26-005', wo_title: 'Wardrobe Set', client: 'Nisha Verma', qc_date: '2026-08-13', result: 'conditional_pass', inspector: 'Suresh Yadav', total_checkpoints: 7, passed_checkpoints: 6, conditional_notes: 'Minor edge banding gap accepted under limit' }
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredRecords = records.filter(r => {
    if (filter === 'pass') return r.result === 'pass' || r.result === 'conditional_pass';
    if (filter === 'fail') return r.result === 'fail';
    return true;
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col">
        <Header 
          title="Quality Control & Inspection" 
          subtitle="Inspect finished work orders, log results, and authorize dispatch" 
        />

        <div className="px-8 py-6 space-y-6">
          {/* Header Action Row */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
            <div className="flex gap-2">
              <button 
                onClick={() => setFilter('all')} 
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === 'all' ? 'bg-primary text-white' : 'bg-surface-alt hover:bg-border-subtle text-ink-700'}`}
              >
                All Inspections
              </button>
              <button 
                onClick={() => setFilter('pass')} 
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === 'pass' ? 'bg-status-material-ready/20 text-status-material-ready' : 'bg-surface-alt hover:bg-border-subtle text-ink-700'}`}
              >
                Passed
              </button>
              <button 
                onClick={() => setFilter('fail')} 
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === 'fail' ? 'bg-status-cancelled/20 text-status-cancelled' : 'bg-surface-alt hover:bg-border-subtle text-ink-700'}`}
              >
                Failed / Rework
              </button>
            </div>
            <button 
              onClick={() => navigate('/quality-control/new')} 
              className="px-4 h-9 bg-secondary text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_task</span>
              New QC Entry
            </button>
          </div>

          {/* Records Table */}
          <div className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-alt">
                  {['QC Num', 'Work Order', 'Client', 'Date', 'Score', 'Result', 'Inspector', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold text-ink-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-xs text-ink-400">Loading QC logs...</td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-xs text-ink-400">No QC logs match search filters.</td>
                  </tr>
                ) : filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="px-5 py-4 text-xs font-bold text-secondary">{r.qc_number}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-ink-900">
                      <div>{r.wo_number}</div>
                      <div className="text-[10px] text-ink-400 font-normal">{r.wo_title}</div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-ink-700">{r.client}</td>
                    <td className="px-5 py-4 text-xs text-ink-500">{new Date(r.qc_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-4 text-xs font-mono">
                      {r.passed_checkpoints}/{r.total_checkpoints} ({Math.round(r.passed_checkpoints / r.total_checkpoints * 100)}%)
                    </td>
                    <td className="px-5 py-4">
                      {r.result === 'pass' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333]">PASS</span>
                      ) : r.result === 'conditional_pass' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef7e0] text-[#b06000]">CONDITIONAL</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fce8e6] text-[#c5221f]">FAIL</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-ink-500">{r.inspector}</td>
                    <td className="px-5 py-4 text-xs">
                      <button 
                        onClick={() => setSelectedRecord(r)} 
                        className="text-secondary hover:underline font-bold"
                      >
                        View Checklist
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal View Checklist */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-border-subtle overflow-hidden">
              <div className="px-6 py-4 bg-surface-alt border-b border-border-subtle flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-ink-900">Checklist Audit Report: {selectedRecord.qc_number}</h3>
                  <p className="text-[11px] text-ink-400">For {selectedRecord.wo_number} — {selectedRecord.wo_title}</p>
                </div>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="text-ink-400 hover:text-ink-900 text-sm font-bold"
                >
                  ✕ Close
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                <div className="divide-y divide-border-subtle">
                  {DEFAULT_CHECKPOINTS.map((cp, idx) => {
                    const isPassed = idx < selectedRecord.passed_checkpoints;
                    return (
                      <div key={idx} className="py-3 flex items-start gap-3">
                        {isPassed ? (
                          <span className="text-status-material-ready font-bold">✓</span>
                        ) : (
                          <span className="text-status-cancelled font-bold">✗</span>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-ink-900">{cp}</p>
                          {!isPassed && (
                            <p className="text-[10px] text-red-500 mt-0.5">Failed check criteria. Rework required.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedRecord.result === 'conditional_pass' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                    <p className="text-[11px] font-bold text-amber-800">Conditional Acceptance Notes:</p>
                    <p className="text-xs text-amber-700 mt-1">{selectedRecord.conditional_notes}</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-surface-alt border-t border-border-subtle flex justify-end">
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-1.5 bg-secondary text-white text-xs font-bold rounded-lg hover:brightness-110"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
