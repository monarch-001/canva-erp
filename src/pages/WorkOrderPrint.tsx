import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

interface WorkOrder {
  id: string;
  wo_number: string;
  title: string;
  client_type: string;
  stream?: string;
  client_name: string;
  project_name: string;
  furniture_type: string;
  production_quantity: number;
  dimensions_l?: string;
  dimensions_h?: string;
  dimensions_d?: string;
  finish_type: string;
  finish_detail: string;
  delivery_terms: string;
  requested_delivery_date: string | null;
  committed_delivery_date: string | null;
  delivery_address: string;
  priority: string;
  status: string;
  special_notes?: string;
  created_at: string;
}

interface Drawing {
  id: string;
  file_name: string;
  version: number;
}

function PrintField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 mb-0.5">{label}</p>
      <p className="text-[13px] text-gray-900 font-medium">{value || '—'}</p>
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-3">{title}</p>
      {children}
    </div>
  );
}

export default function WorkOrderPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/work-orders/${id}`)
      .then(r => r.json())
      .then(data => {
        setWorkOrder(data.work_order || null);
        setDrawings(data.drawings || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary" />
        </main>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] flex-1 flex items-center justify-center">
          <p className="text-ink-500">Work order not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] flex-1">

        {/* ── Screen header (hidden on print) ─────────────────────────────────── */}
        <div className="px-8 py-6 flex items-start justify-between no-print">
          <div>
            <h1 className="text-[22px] font-bold text-ink-900">Print / Export Work Order</h1>
            <p className="text-[13px] text-ink-500 mt-0.5">
              {workOrder.wo_number} · Generated via browser print dialog or PDF export
            </p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => navigate(-1)}
              className="h-9 px-4 border border-border-strong text-[13px] font-semibold text-ink-700 rounded-lg hover:bg-surface-alt transition-colors"
            >
              Close Preview
            </button>
            <button
              onClick={() => window.print()}
              className="h-9 px-4 bg-secondary text-white text-[13px] font-semibold rounded-lg hover:brightness-110 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              Download PDF
            </button>
          </div>
        </div>

        {/* ── Print document card ──────────────────────────────────────────────── */}
        <div className="px-8 pb-10 no-print-pad">
          <div
            id="print-doc"
            className="bg-white border border-border-subtle rounded-xl max-w-[760px] mx-auto p-10 print:p-0 print:border-0 print:shadow-none print:rounded-none"
          >

            {/* Document header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-white text-[14px] font-black">C</span>
                </div>
                <div>
                  <p className="text-[14px] font-black text-ink-900 tracking-wide">CANVA CONCEPTS</p>
                  <p className="text-[11px] text-ink-500">Factory ERP · Work Order Document</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-bold text-secondary">{workOrder.wo_number}</p>
                <p className="text-[11px] text-ink-500">Generated: {today}</p>
              </div>
            </div>

            <hr className="border-border-subtle mb-5" />

            {/* WO Title */}
            <h2 className="text-[20px] font-bold text-ink-900 mb-6">{workOrder.title}</h2>

            {/* CLIENT INFORMATION */}
            <PrintSection title="Client Information">
              <div className="grid grid-cols-3 gap-5">
                <PrintField label="Client Type" value={workOrder.client_type?.charAt(0).toUpperCase() + workOrder.client_type?.slice(1)} />
                <PrintField label="Client Name" value={workOrder.client_name} />
                <PrintField label="Project / Site" value={workOrder.project_name} />
              </div>
            </PrintSection>

            <hr className="border-border-subtle mb-5" />

            {/* FURNITURE SPECIFICATION */}
            <PrintSection title="Furniture Specification">
              <div className="grid grid-cols-3 gap-5 mb-4">
                <PrintField label="Furniture Type" value={workOrder.furniture_type} />
                <PrintField label="Quantity"       value={String(workOrder.production_quantity)} />
                <PrintField
                  label="Dimensions"
                  value={
                    (workOrder.dimensions_l || workOrder.dimensions_h || workOrder.dimensions_d)
                      ? `${workOrder.dimensions_l || '0'} × ${workOrder.dimensions_h || '0'} × ${workOrder.dimensions_d || '0'} mm`
                      : undefined
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-5">
                <PrintField label="Finish Type"   value={workOrder.finish_type} />
                <PrintField label="Finish Detail" value={workOrder.finish_detail} />
              </div>
            </PrintSection>

            <hr className="border-border-subtle mb-5" />

            {/* DELIVERY */}
            <PrintSection title="Delivery">
              <div className="grid grid-cols-3 gap-5 mb-4">
                <PrintField label="Delivery Terms"   value={workOrder.delivery_terms?.replace(/_/g, ' ')} />
                <PrintField label="Requested Date"   value={fmt(workOrder.requested_delivery_date)} />
                <PrintField label="Committed Date"   value={fmt(workOrder.committed_delivery_date)} />
              </div>
              <PrintField label="Delivery Address" value={workOrder.delivery_address} />
            </PrintSection>

            <hr className="border-border-subtle mb-5" />

            {/* STATUS & NOTES */}
            <PrintSection title="Status &amp; Notes">
              <div className="grid grid-cols-3 gap-5 mb-4">
                <PrintField
                  label="Current Status"
                  value={workOrder.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                />
                <PrintField
                  label="Priority"
                  value={workOrder.priority?.charAt(0).toUpperCase() + workOrder.priority?.slice(1)}
                />
              </div>
              {workOrder.special_notes && (
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">Notes</p>
                  <p className="text-[13px] text-gray-900 leading-relaxed">{workOrder.special_notes}</p>
                </div>
              )}
            </PrintSection>

            {/* DRAWINGS ON FILE */}
            {drawings.length > 0 && (
              <>
                <hr className="border-border-subtle mb-5" />
                <PrintSection title="Drawings on File">
                  <ul className="space-y-1">
                    {drawings.map((d, i) => (
                      <li key={d.id} className="flex items-center gap-2 text-[13px] text-gray-800">
                        <span className="text-gray-400">•</span>
                        {d.file_name}
                        {i === 0 && (
                          <span className="text-[10px] text-ink-500 font-semibold ml-1">(current)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </PrintSection>
              </>
            )}

            {/* Document footer */}
            <hr className="border-border-subtle mt-6 mb-4" />
            <p className="text-[11px] text-gray-400 text-center">
              This document excludes internal status history, cost information, and margin data.
            </p>
          </div>
        </div>
      </main>

      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          #print-doc { box-shadow: none; border: none; padding: 0; }
        }
      `}</style>
    </div>
  );
}
