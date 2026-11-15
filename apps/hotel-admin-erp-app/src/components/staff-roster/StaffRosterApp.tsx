import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
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
import { Check, Plus } from 'lucide-react';

interface StaffRosterAppProps {
  apiBaseUrl?: string;
  authToken?: string;
  hotelId?: string;
}

export const StaffRosterApp: React.FC<StaffRosterAppProps> = ({
  apiBaseUrl = API_BASE_URL,
  authToken,
  hotelId,
}) => {
  const store = useMemo(() => new StaffRosterStore(), []);
  const [state, setState] = useState(store.getState());

  const [activeTab, setActiveTab] = useState<'ROSTER' | 'ATTENDANCE' | 'TIP_POOL'>('ROSTER');
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'info' | 'error'; message: string } | null>(null);

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
      setFeedbackBanner({ type: 'error', message: err.response?.data?.message || 'Failed to generate tip pool' });
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
      setFeedbackBanner({ type: 'error', message: err.response?.data?.message || 'Failed to approve payout' });
    } finally {
      store.setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <StaffRosterHeader
        metrics={state.metrics}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenClockTerminal={() => setIsClockModalOpen(true)}
        onOpenNewShiftModal={() => setFeedbackBanner({ type: 'info', message: 'Quick shift creator: Select a shift slot below in the Roster Planner.' })}
        onOpenTipPoolModal={() => setIsTipModalOpen(true)}
        onRefresh={fetchData}
        loading={state.isLoading}
      />

      {/* Main Workspace */}
      <main className="flex-1 p-6 space-y-6">
        {feedbackBanner && (
          <div
            className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              feedbackBanner.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            <span>{feedbackBanner.message}</span>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="ml-4 font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* Tab 1: Roster Schedule */}
        {activeTab === 'ROSTER' && (
          <WeeklyRosterCalendarView
            schedules={state.schedules}
            selectedDepartment={selectedDept}
            onDepartmentChange={setSelectedDept}
            onNewShiftClick={() => setFeedbackBanner({ type: 'info', message: 'Use the roster table slots to add or assign shifts.' })}
          />
        )}

        {/* Tab 2: Attendance Clock Logs */}
        {activeTab === 'ATTENDANCE' && (
          <AttendanceAuditTable logs={state.attendanceLogs} />
        )}

        {/* Tab 3: Tip Pool Distribution */}
        {activeTab === 'TIP_POOL' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-emerald-900">
                  Gratuity & Tip Pool Settlement Sessions
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Daily service charge & tips collected with hours-weighted payout approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTipModalOpen(true)}
                className="btn-glass-green px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Tip Split Session</span>
              </button>
            </div>

            {state.tipSessions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-xs">
                No tip pool sessions generated yet. Click "+ New Tip Split Session" to calculate today's pool.
              </div>
            ) : (
              <div className="space-y-4">
                {state.tipSessions.map((session) => (
                  <div
                    key={session._id}
                    className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold text-emerald-700">
                            {session.sessionNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {session.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Date: {new Date(session.poolDate).toLocaleDateString('en-GB')} • Total Pool:{' '}
                          <strong className="text-slate-900">
                            {StaffRosterHelper.formatCurrency(session.totalTipsCollected)}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {session.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => handleApproveTipPayout(session._id)}
                            className="btn-glass-green px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve Disbursement</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Breakdown Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                        <span className="text-slate-500 text-[10px] block">FOH Share ({session.fohPercentage}%)</span>
                        <strong className="text-sky-700">{StaffRosterHelper.formatCurrency(session.fohPoolAmount)}</strong>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                        <span className="text-slate-500 text-[10px] block">BOH Share ({session.bohPercentage}%)</span>
                        <strong className="text-amber-700">{StaffRosterHelper.formatCurrency(session.bohPoolAmount)}</strong>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                        <span className="text-slate-500 text-[10px] block">Eligible Staff</span>
                        <strong className="text-slate-900">{session.payouts?.length || 0} Staff</strong>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                        <span className="text-slate-500 text-[10px] block">Total Hours</span>
                        <strong className="text-slate-900">{session.totalEligibleHours}h</strong>
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
        staffList={(state.attendanceLogs || []).map((l) => ({
          staffName: l.staffName,
          department: l.department,
          hoursWorked: Number(l.totalHoursWorked || 8),
        }))}
      />
    </div>
  );
};
