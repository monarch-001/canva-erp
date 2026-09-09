import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

type CarpenterResponse = 'accepted' | 'declined' | null;



export default function HolidayWeekendFlow() {
  const navigate = useNavigate();
  const [noticeConfirmed, setNoticeConfirmed] = useState(true);
  const [carpenterResponse, setCarpenterResponse] = useState<CarpenterResponse>('accepted');

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        <Header title="Holiday / Weekend Work" subtitle="Overtime Management" />

        <main className="flex-1 px-8 py-8">
          {/* Title */}
          <h1 className="text-2xl font-bold text-ink-900 mb-2">
            Holiday / Weekend Work — Special Flow
          </h1>
          <p className="text-sm text-ink-500 mb-8">
            Additional labour-law compliance steps beyond a regular Daily OT request.
          </p>

          {/* 4-step cards */}
          <div className="flex items-start gap-0 mb-8 overflow-x-auto pb-2">
            {/* Step 1 — Approval */}
            <div className="bg-white rounded-xl border border-[#E8E2D9] p-5 w-72 flex-shrink-0">
              <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#F3E7CD] text-secondary mb-3">
                STEP 1 · APPROVAL
              </span>
              <p className="text-base font-bold text-secondary mb-1">OTR-26-003</p>
              <p className="text-sm font-semibold text-ink-900 mb-2">Mohan Lal — Weekend Work</p>
              <p className="text-xs text-ink-500 leading-relaxed mb-4">
                FM approves the request, same as regular OT — but full shift (9 hrs) allowed, no 3-hour cap.
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg">
                ✓ APPROVED
              </span>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center w-10 flex-shrink-0 pt-16">
              <span className="text-ink-300 text-lg">→</span>
            </div>

            {/* Step 2 — Advance Notice */}
            <div className="bg-white rounded-xl border border-[#E8E2D9] p-5 w-64 flex-shrink-0">
              <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#F3E7CD] text-secondary mb-3">
                STEP 2 · ADVANCE NOTICE
              </span>
              <p className="text-xs text-ink-700 leading-relaxed mb-4">
                System flags: advance notice must be given at least 24 hours before 10-Aug-2026.
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => setNoticeConfirmed(v => !v)}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                    noticeConfirmed ? 'bg-green-500' : 'bg-ink-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    noticeConfirmed ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
                <span className="text-sm text-ink-700">I have informed the carpenter</span>
              </label>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center w-10 flex-shrink-0 pt-16">
              <span className="text-ink-300 text-lg">→</span>
            </div>

            {/* Step 3 — Carpenter Response */}
            <div className="bg-white rounded-xl border border-[#E8E2D9] p-5 w-64 flex-shrink-0">
              <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#F3E7CD] text-secondary mb-3">
                STEP 3 · CARPENTER RESPONSE
              </span>
              <p className="text-xs text-ink-500 leading-relaxed mb-4">
                Carpenter's decision is tracked. No penalty either way — labour law compliance.
              </p>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setCarpenterResponse('accepted')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                    carpenterResponse === 'accepted'
                      ? 'bg-secondary text-white border-secondary'
                      : 'border-[#E8E2D9] text-ink-700 hover:border-secondary/50'
                  }`}
                >
                  ✓ Accepted
                </button>
                <button
                  onClick={() => setCarpenterResponse('declined')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                    carpenterResponse === 'declined'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-[#E8E2D9] text-ink-700 hover:border-red-300'
                  }`}
                >
                  Declined
                </button>
              </div>
              {carpenterResponse && (
                <p className={`text-xs font-semibold ${
                  carpenterResponse === 'accepted' ? 'text-green-600' : 'text-red-600'
                }`}>
                  Selected: {carpenterResponse === 'accepted' ? 'Accepted' : 'Declined'}
                </p>
              )}
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center w-10 flex-shrink-0 pt-16">
              <span className="text-ink-300 text-lg">→</span>
            </div>

            {/* Step 4 — On the Day */}
            <div className={`bg-white rounded-xl border p-5 w-64 flex-shrink-0 transition-opacity ${
              carpenterResponse === 'declined' ? 'opacity-40 pointer-events-none' : 'border-[#E8E2D9]'
            }`}>
              <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#F3E7CD] text-secondary mb-3">
                STEP 4 · ON THE DAY
              </span>
              <ul className="space-y-2 mb-4">
                {[
                  'Attendance marked: Present',
                  'Job card created as normal',
                  'EOD update submitted',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
                    <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-400 leading-relaxed">
                Hours may exceed 9 — full shift allowed on holiday/weekend.
              </p>
            </div>
          </div>

          {/* Carpenter declines info box */}
          {carpenterResponse === 'declined' ? (
            <div className="rounded-xl border border-red-300 bg-red-50 px-6 py-5 max-w-3xl">
              <p className="text-sm font-bold text-red-700 mb-2">If the carpenter declines</p>
              <p className="text-sm text-red-700 leading-relaxed">
                Work cannot be forced. The decline reason is recorded, but has no impact on the
                carpenter's attendance record or performance. Supervisor must find an alternate plan —
                e.g. reassign to another available carpenter or reschedule the task.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-sky-300 bg-sky-50 px-6 py-5 max-w-3xl">
              <p className="text-sm font-bold text-sky-800 mb-2">If the carpenter declines</p>
              <p className="text-sm text-sky-700 leading-relaxed">
                Work cannot be forced. The decline reason is recorded, but has no impact on the
                carpenter's attendance record or performance. Supervisor must find an alternate plan —
                e.g. reassign to another available carpenter or reschedule the task.
              </p>
            </div>
          )}

          {/* Action row */}
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => navigate('/production/overtime')}
              className="px-5 py-2 text-sm text-ink-700 border border-[#E8E2D9] rounded-lg hover:bg-white transition-colors"
            >
              ← Back to Overtime
            </button>
            {carpenterResponse === 'accepted' && (
              <button
                onClick={() => navigate('/production/overtime')}
                className="px-6 py-2 text-sm font-semibold bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Confirm & Proceed
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
