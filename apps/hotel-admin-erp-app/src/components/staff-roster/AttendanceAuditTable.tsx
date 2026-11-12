import React, { useState } from 'react';
import { IStaffAttendanceLogUI, StaffRosterHelper } from '@spicehub/ui';
import { Clock, Search } from 'lucide-react';

interface AttendanceAuditTableProps {
  logs: IStaffAttendanceLogUI[];
}

export const AttendanceAuditTable: React.FC<AttendanceAuditTableProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = logs.filter(
    (l) =>
      l.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Daily Attendance Clock Logs & Punctuality Audit</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filtered.length} of {logs.length} logged shift attendances
          </p>
        </div>

        <div className="w-full sm:w-64 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search staff or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition shadow-2xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Staff Member</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Clock In</th>
              <th className="px-4 py-3">Clock Out</th>
              <th className="px-4 py-3 text-right">Hours Worked</th>
              <th className="px-4 py-3 text-right">Late / Delay</th>
              <th className="px-4 py-3 text-right">Overtime</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  No attendance records logged for today yet
                </td>
              </tr>
            ) : (
              filtered.map((log, idx) => {
                const badge = StaffRosterHelper.getAttendanceStatusBadge(log.status);
                const dept = StaffRosterHelper.getDepartmentBadge(log.department);

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{log.staffName}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold" style={{ color: dept.color }}>
                        {dept.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-600 font-medium">
                      {new Date(log.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-600 font-medium">
                      {log.clockOutTime ? (
                        new Date(log.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ON DUTY NOW
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {log.totalHoursWorked ? `${log.totalHoursWorked}h` : '--'}
                    </td>

                    <td className="px-4 py-3 text-right font-mono">
                      {log.lateMinutes > 0 ? (
                        <span className="text-rose-600 font-bold">+{log.lateMinutes} min</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">On Time</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono">
                      {log.overtimeMinutes > 0 ? (
                        <span className="text-amber-600 font-bold">+{log.overtimeMinutes} min</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: badge.border,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-400 text-[10px]">
                      {log.clockMethod}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
