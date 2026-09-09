import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function DatabaseExplorer() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [sql, setSql] = useState<string>('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [executing, setExecuting] = useState<boolean>(false);

  const [storageHealth, setStorageHealth] = useState<any>(null);

  useEffect(() => {
    async function loadTables() {
      try {
        const res = await fetch('/api/admin/db/tables');
        if (!res.ok) throw new Error('Failed to load table list');
        const data = await res.json();
        setTables(data);
        if (data.length > 0) {
          handleSelectTable(data[0]);
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
    async function loadStorageHealth() {
      try {
        const res = await fetch('/api/admin/db/storage-health');
        if (res.ok) {
          const data = await res.json();
          setStorageHealth(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadTables();
    loadStorageHealth();
  }, []);

  async function handleSelectTable(tableName: string) {
    setSelectedTable(tableName);
    const query = `SELECT * FROM public.${tableName} LIMIT 50`;
    setSql(query);
    runQuery(query);
  }

  async function runQuery(queryText: string) {
    setExecuting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: queryText })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Query execution failed');
      }
      setQueryResult(data);
    } catch (err: any) {
      setError(err.message);
      setQueryResult(null);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex">
      <Sidebar />
      <main className="flex-1 ml-[220px] flex overflow-hidden h-screen">
        
        {/* Left Side: Tables List */}
        <div className="w-[240px] bg-white border-r border-[#D5CFC8] flex flex-col h-full">
          <div className="px-5 py-4 border-b border-[#D5CFC8] bg-[#F9F8F6]">
            <h2 className="text-sm font-bold text-ink-900">Database Tables</h2>
            <p className="text-[11px] text-ink-400 mt-0.5">Select a table to browse records</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {tables.map(t => (
              <button
                key={t}
                onClick={() => handleSelectTable(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  selectedTable === t 
                    ? 'bg-[#B8892B]/10 text-[#B8892B] border border-[#B8892B]/20' 
                    : 'text-ink-600 hover:bg-stone-50 hover:text-ink-850'
                }`}
              >
                📊 public.{t}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Query Editor & Data Grid */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">

          {/* Database Resource Limit & Alarm Banner */}
          {storageHealth && (
            <div className={`px-5 py-3 border-b flex items-center justify-between text-xs ${
              storageHealth.status === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-700' :
              storageHealth.status === 'WARNING' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-base font-bold">
                  {storageHealth.status === 'CRITICAL' ? '🚨' : storageHealth.status === 'WARNING' ? '⚠️' : '🛡️'}
                </span>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span>Database Storage Resource Status: {storageHealth.status}</span>
                    <span className="font-normal opacity-80">({storageHealth.size_mb} MB / {storageHealth.max_mb} MB used — {storageHealth.usage_pct}%)</span>
                  </div>
                  <p className="text-[11px] opacity-90 mt-0.5">{storageHealth.message}</p>
                </div>
              </div>

              {/* Progress Bar & Alarm Trigger */}
              <div className="w-[200px] flex flex-col items-end gap-1 ml-4">
                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      storageHealth.status === 'CRITICAL' ? 'bg-red-500' :
                      storageHealth.status === 'WARNING' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, storageHealth.usage_pct)}%` }}
                  />
                </div>
                <button 
                  onClick={() => alert(`🔔 Storage Resource Alarm Configured!\n\nCurrent Usage: ${storageHealth.size_mb} MB / ${storageHealth.max_mb} MB (${storageHealth.usage_pct}%).\nYou will receive automatic in-app alerts if database usage exceeds 80% (400 MB).`)}
                  className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-stone-800 text-white hover:bg-stone-900 transition flex items-center gap-1"
                >
                  🔔 Storage Alarm Active
                </button>
              </div>
            </div>
          )}

          {/* Query Editor Box */}
          <div className="bg-white p-5 border-b border-[#D5CFC8]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ink-900">SQL Query Editor</h2>
              <button
                onClick={() => runQuery(sql)}
                disabled={executing}
                className="px-4 py-1.5 bg-[#B8892B] text-white text-xs font-bold rounded hover:bg-[#9a7224] transition disabled:opacity-50"
              >
                {executing ? 'Executing...' : 'Run Query ⚡'}
              </button>
            </div>
            <textarea
              value={sql}
              onChange={e => setSql(e.target.value)}
              className="w-full h-24 p-3 border border-border-strong rounded-xl text-xs font-mono bg-stone-50 text-ink-900 focus:outline-none focus:border-[#B8892B] focus:ring-1 focus:ring-[#B8892B]"
            />
          </div>

          {/* Results Pane */}
          <div className="flex-1 overflow-hidden flex flex-col p-5 bg-[#F5F2ED]">
            {error && (
              <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-mono">
                Error: {error}
              </div>
            )}

            {queryResult && (
              <div className="flex-1 bg-white border border-[#D5CFC8] rounded-xl flex flex-col overflow-hidden shadow-sm">
                {/* Result header */}
                <div className="px-5 py-3 border-b border-[#D5CFC8] bg-[#F9F8F6] flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-700">
                    Showing {queryResult.rows.length} rows
                  </span>
                  <span className="text-[11px] text-ink-400">
                    Command: {queryResult.command}
                  </span>
                </div>

                {/* Data Grid */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-stone-55 border-b border-[#D5CFC8] sticky top-0">
                      <tr>
                        {queryResult.fields.map((f: string) => (
                          <th key={f} className="px-4 py-2.5 font-bold text-ink-700 border-r border-[#D5CFC8] last:border-0 bg-stone-50">
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {queryResult.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-stone-50/50">
                          {queryResult.fields.map((f: string) => {
                            const val = row[f];
                            const cellStr = val === null ? 'NULL' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                            return (
                              <td key={f} className={`px-4 py-2 border-r border-stone-100 last:border-0 truncate max-w-[250px] font-mono text-[11px] ${val === null ? 'text-ink-300 italic' : 'text-ink-700'}`}>
                                {cellStr}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
