import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

type QtStatus = 'negotiating' | 'sent' | 'pending_approval' | 'accepted' | 'rejected' | 'converted' | 'draft';
type ClientType = 'B2B' | 'D2C';

interface QtRow {
  id: string;
  qt_number: string;
  client: string;
  client_type: ClientType;
  items: number;
  value_ex_gst: number;
  value_inc_gst: number;
  valid_until: string;
  status: QtStatus;
}

const MOCK_QTS: QtRow[] = [
  { id: 'q14', qt_number: 'QT-26-014', client: 'WeWork Cyber City',      client_type: 'B2B', items: 6, value_ex_gst: 420000,  value_inc_gst: 495600,  valid_until: '24-Aug-26', status: 'negotiating' },
  { id: 'q13', qt_number: 'QT-26-013', client: 'Kavita Mehra (D2C)',     client_type: 'D2C', items: 2, value_ex_gst: 85000,   value_inc_gst: 100300,  valid_until: '22-Aug-26', status: 'sent' },
  { id: 'q12', qt_number: 'QT-26-012', client: 'Bata India Ltd',         client_type: 'B2B', items: 4, value_ex_gst: 210000,  value_inc_gst: 247800,  valid_until: '18-Aug-26', status: 'pending_approval' },
  { id: 'q11', qt_number: 'QT-26-011', client: 'Hexaware Technologies',  client_type: 'B2B', items: 8, value_ex_gst: 680000,  value_inc_gst: 802400,  valid_until: '15-Aug-26', status: 'accepted' },
  { id: 'q10', qt_number: 'QT-26-010', client: 'Rohan Verma (D2C)',      client_type: 'D2C', items: 1, value_ex_gst: 45000,   value_inc_gst: 53100,   valid_until: '10-Aug-26', status: 'rejected' },
  { id: 'q9',  qt_number: 'QT-26-009', client: 'Starbucks Saket',        client_type: 'B2B', items: 5, value_ex_gst: 315000,  value_inc_gst: 371700,  valid_until: '05-Aug-26', status: 'converted' },
];

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function statusPill(status: QtStatus) {
  switch (status) {
    case 'negotiating':      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 uppercase">Negotiating</span>;
    case 'sent':             return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-700 uppercase">Sent</span>;
    case 'pending_approval': return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700 uppercase whitespace-nowrap">Pending Approval</span>;
    case 'accepted':         return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 uppercase">Accepted</span>;
    case 'rejected':         return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-500 uppercase">Rejected</span>;
    case 'converted':        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-teal-100 text-teal-700 uppercase">Converted</span>;
    case 'draft':            return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-ink-100 text-ink-500 uppercase">Draft</span>;
  }
}

function typeBadge(type: ClientType) {
  return type === 'B2B'
    ? <span className="px-2 py-0.5 text-xs font-bold rounded bg-sky-100 text-sky-700">B2B</span>
    : <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-700">D2C</span>;
}

function actionLinks(row: QtRow, navigate: (path: string) => void) {
  const view   = <button key="view"   onClick={e => { e.stopPropagation(); navigate(`/quotations/${row.id}`); }}  className="text-sm text-ink-700 hover:text-secondary font-medium transition-colors">View</button>;
  const edit   = <button key="edit"   onClick={e => { e.stopPropagation(); navigate(`/quotations/${row.id}/edit`); }} className="text-sm text-ink-700 hover:text-secondary font-medium transition-colors">Edit</button>;
  const conv   = <button key="conv"   onClick={e => { e.stopPropagation(); navigate(`/quotations/${row.id}/convert`); }} className="text-sm text-ink-700 hover:text-secondary font-medium transition-colors">Convert</button>;
  const dup    = <button key="dup"    onClick={e => { e.stopPropagation(); }} className="text-sm text-ink-700 hover:text-secondary font-medium transition-colors">Duplicate</button>;
  const sep    = (key: string) => <span key={key} className="text-ink-300">|</span>;

  switch (row.status) {
    case 'negotiating':
    case 'pending_approval': return [view, sep('s1'), edit];
    case 'sent':             return [view];
    case 'accepted':         return [view, sep('s1'), conv];
    case 'rejected':         return [view, sep('s1'), dup];
    case 'converted':        return [view];
    default:                 return [view, sep('s1'), edit];
  }
}

export default function QuotationList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('All time');
  const [search, setSearch] = useState('');

  const filtered = MOCK_QTS.filter(q => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (typeFilter !== 'all' && q.client_type !== typeFilter) return false;
    if (search && !q.client.toLowerCase().includes(search.toLowerCase()) && !q.qt_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalOpen = MOCK_QTS.filter(q => ['negotiating','sent','pending_approval'].includes(q.status)).length;

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex">
      <Sidebar />
      <div className="ml-[220px] flex-1 px-8 py-8">

        {/* Title row */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Quotations</h1>
            <p className="text-sm text-ink-500 mt-0.5">B2B and D2C quotes — Chhabee work is billed Cost+5%, not quoted</p>
          </div>
          <button
            onClick={() => navigate('/quotations/new')}
            className="px-5 py-2 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-secondary/90 transition-colors flex-shrink-0"
          >
            + New Quotation
          </button>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-4 gap-4 my-6">
          {[
            { value: totalOpen, label: 'Total Open',            color: 'text-orange-500' },
            { value: 7,         label: 'Accepted This Month',   color: 'text-green-600' },
            { value: 3,         label: 'Rejected This Month',   color: 'text-red-500' },
            { value: '58%',     label: 'Conversion Rate',       color: 'text-blue-600' },
          ].map(tile => (
            <div key={tile.label} className="bg-white rounded-xl border border-[#E8E2D9] px-5 py-4">
              <p className={`text-3xl font-bold ${tile.color} mb-1`}>{tile.value}</p>
              <p className="text-sm text-ink-500">{tile.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[#E8E2D9] rounded-full bg-white text-ink-700 focus:outline-none focus:border-secondary">
            <option value="all">Status: All</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="sent">Sent</option>
            <option value="negotiating">Negotiating</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="converted">Converted</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[#E8E2D9] rounded-full bg-white text-ink-700 focus:outline-none focus:border-secondary">
            <option value="all">Client Type: All</option>
            <option value="B2B">B2B</option>
            <option value="D2C">D2C</option>
          </select>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[#E8E2D9] rounded-full bg-white text-ink-700 focus:outline-none focus:border-secondary">
            {['All time','This week','This month','Last month'].map(d => (
              <option key={d}>{d === 'All time' ? `Date range: ${d}` : d}</option>
            ))}
          </select>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search client name or QT number..."
              className="pl-8 pr-3 py-1.5 text-sm border border-[#E8E2D9] rounded-full bg-white text-ink-700 focus:outline-none focus:border-secondary w-56"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E8E2D9] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E2D9]">
                {['QT Number','Client','Type','Items','Value (ex-GST)','Quoted (inc-GST)','Valid Until','Status','Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE3]">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-400 italic">No quotations found.</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="hover:bg-[#FAF8F5] transition-colors cursor-pointer" onClick={() => navigate(`/quotations/${row.id}`)}>
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-secondary">{row.qt_number}</span>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-ink-900">{row.client}</td>
                  <td className="px-4 py-4">{typeBadge(row.client_type)}</td>
                  <td className="px-4 py-4 text-sm text-ink-600">{row.items} item{row.items !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-4 text-sm text-ink-600">{fmtINR(row.value_ex_gst)}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-ink-900">{fmtINR(row.value_inc_gst)}</td>
                  <td className="px-4 py-4 text-sm text-ink-500">{row.valid_until}</td>
                  <td className="px-4 py-4">{statusPill(row.status)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">{actionLinks(row, navigate)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
