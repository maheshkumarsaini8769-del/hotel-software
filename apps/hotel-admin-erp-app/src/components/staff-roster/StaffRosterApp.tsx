import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  StaffRosterStore,
  StaffRosterHelper,
} from '@spicehub/ui';
import { StaffRosterHeader } from './StaffRosterHeader';
import { WeeklyRosterCalendarView } from './WeeklyRosterCalendarView';
import { StaffClockPinTerminalModal } from './StaffClockPinTerminalModal';
import { TipPoolDistributionModal } from './TipPoolDistributionModal';
import { AttendanceAuditTable } from './AttendanceAuditTable';

interface StaffRosterAppProps {
  apiBaseUrl?: string;
  authToken?: string;
  hotelId?: string;
}

export const StaffRosterApp: React.FC<StaffRosterAppProps> = ({
  apiBaseUrl = 'http://localhost:5000/api/v1',
  authToken,
  hotelId,
}) => {
  const store = useMemo(() => new StaffRosterStore(), []);
  const [state, setState] = useState(store.getState());

  const [activeTab, setActiveTab] = useState<'ROSTER' | 'ATTENDANCE' | 'TIP_POOL'>('ROSTER');
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState('ALL');

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, [store]);

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (hotelId) headers['x-hotel-id'] = hotelId;
    return headers;
  }, [authToken, hotelId]);

  const fetchData = async () => {
    store.setLoading(true);
    try {
      // 1. Fetch Schedules
      const schedRes = await axios.get(`${apiBaseUrl}/staff-roster/schedules`, {
        headers: authHeaders,
      });
      if (schedRes.data.success && schedRes.data.schedules) {
        store.setSchedules(schedRes.data.schedules);
      }

      // 2. Fetch Attendance Logs
      const attendRes = await axios.get(`${apiBaseUrl}/staff-roster/attendance/logs`, {
        headers: authHeaders,
      });
      if (attendRes.data.success && attendRes.data.logs) {
        store.setAttendanceLogs(attendRes.data.logs);
      }

      // 3. Fetch Tip Sessions
      const tipRes = await axios.get(`${apiBaseUrl}/staff-roster/tips/sessions`, {
        headers: authHeaders,
      });
      if (tipRes.data.success && tipRes.data.sessions) {
        store.setTipSessions(tipRes.data.sessions);
      }
    } catch (err: any) {
      console.error('Error fetching staff roster data:', err);
      store.setError(err.response?.data?.message || err.message);
    } finally {
      store.setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClockIn = async (pin: string) => {
    const res = await axios.post(
      `${apiBaseUrl}/staff-roster/attendance/clock-in`,
      { staffPin: pin },
      { headers: authHeaders }
    );
    fetchData();
    return res.data;
  };

  const handleClockOut = async (pin: string) => {
    const res = await axios.post(
      `${apiBaseUrl}/staff-roster/attendance/clock-out`,
      { staffPin: pin },
      { headers: authHeaders }
    );
    fetchData();
    return res.data;
  };

  const handleCreateTipSession = async (payload: any) => {
    store.setLoading(true);
    try {
      const res = await axios.post(
        `${apiBaseUrl}/staff-roster/tips/sessions`,
        payload,
        { headers: authHeaders }
      );
      if (res.data.success) {
        fetchData();
      }
    } catch (err: any) {
      console.error('Error generating tip pool:', err);
      alert(err.response?.data?.message || 'Failed to generate tip pool');
    } finally {
      store.setLoading(false);
    }
  };

  const handleApproveTipPayout = async (sessionId: string) => {
    store.setLoading(true);
    try {
      const res = await axios.patch(
        `${apiBaseUrl}/staff-roster/tips/sessions/${sessionId}/approve`,
        {},
        { headers: authHeaders }
      );
      if (res.data.success) {
        fetchData();
      }
    } catch (err: any) {
      console.error('Error approving tip payout:', err);
      alert(err.response?.data?.message || 'Failed to approve payout');
    } finally {
      store.setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100 flex flex-col font-sans">
      {/* Header */}
      <StaffRosterHeader
        metrics={state.metrics}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenClockTerminal={() => setIsClockModalOpen(true)}
        onOpenNewShiftModal={() => alert('Quick shift creator: Add shifts in Roster Planner')}
        onOpenTipPoolModal={() => setIsTipModalOpen(true)}
        onRefresh={fetchData}
        loading={state.isLoading}
      />

      {/* Main Workspace */}
      <main className="flex-1 p-6 space-y-6">
        {/* Tab 1: Roster Schedule */}
        {activeTab === 'ROSTER' && (
          <WeeklyRosterCalendarView
            schedules={state.schedules}
            selectedDepartment={selectedDept}
            onDepartmentChange={setSelectedDept}
            onNewShiftClick={() => alert('Use schedule creator to add shifts')}
          />
        )}

        {/* Tab 2: Attendance Clock Logs */}
        {activeTab === 'ATTENDANCE' && (
          <AttendanceAuditTable logs={state.attendanceLogs} />
        )}

        {/* Tab 3: Tip Pool Distribution */}
        {activeTab === 'TIP_POOL' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl">
              <div>
                <h3 className="text-sm font-bold text-emerald-300">
                  Gratuity & Tip Pool Settlement Sessions
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Daily service charge & tips collected with hours-weighted payout approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTipModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                + New Tip Split Session
              </button>
            </div>

            {state.tipSessions.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-400 text-xs">
                No tip pool sessions generated yet. Click "+ New Tip Split Session" to calculate today's pool.
              </div>
            ) : (
              <div className="space-y-4">
                {state.tipSessions.map((session) => (
                  <div
                    key={session._id}
                    className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold text-emerald-400">
                            {session.sessionNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                            {session.status}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          Date: {new Date(session.poolDate).toLocaleDateString('en-GB')} • Total Pool:{' '}
                          <strong className="text-white">
                            {StaffRosterHelper.formatCurrency(session.totalTipsCollected)}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {session.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => handleApproveTipPayout(session._id)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                          >
                            ✓ Approve Disbursement
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Breakdown Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="bg-zinc-800/60 p-2 rounded-xl">
                        <span className="text-zinc-500 text-[10px] block">FOH Share ({session.fohPercentage}%)</span>
                        <strong className="text-blue-400">{StaffRosterHelper.formatCurrency(session.fohPoolAmount)}</strong>
                      </div>
                      <div className="bg-zinc-800/60 p-2 rounded-xl">
                        <span className="text-zinc-500 text-[10px] block">BOH Share ({session.bohPercentage}%)</span>
                        <strong className="text-amber-400">{StaffRosterHelper.formatCurrency(session.bohPoolAmount)}</strong>
                      </div>
                      <div className="bg-zinc-800/60 p-2 rounded-xl">
                        <span className="text-zinc-500 text-[10px] block">Eligible Staff</span>
                        <strong className="text-white">{session.payouts?.length || 0} Staff</strong>
                      </div>
                      <div className="bg-zinc-800/60 p-2 rounded-xl">
                        <span className="text-zinc-500 text-[10px] block">Total Hours</span>
                        <strong className="text-cyan-400">{session.totalEligibleHours}h</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Clock-In Terminal Modal */}
      <StaffClockPinTerminalModal
        isOpen={isClockModalOpen}
        onClose={() => setIsClockModalOpen(false)}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        loading={state.isLoading}
      />

      {/* Tip Pool Split Modal */}
      <TipPoolDistributionModal
        isOpen={isTipModalOpen}
        onClose={() => setIsTipModalOpen(false)}
        onSubmit={handleCreateTipSession}
        loading={state.isLoading}
      />
    </div>
  );
};
