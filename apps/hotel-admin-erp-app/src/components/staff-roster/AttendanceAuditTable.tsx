import React, { useState } from 'react';
import { IStaffAttendanceLogUI, StaffRosterHelper } from '@spicehub/ui';

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
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>⏱️</span> Daily Attendance Clock Logs & Punctuality Audit
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Showing {filtered.length} of {logs.length} logged shift attendances
          </p>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search staff or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0e121a] text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[11px]">
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
          <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                  No attendance records logged for today yet
                </td>
              </tr>
            ) : (
              filtered.map((log, idx) => {
                const badge = StaffRosterHelper.getAttendanceStatusBadge(log.status);
                const dept = StaffRosterHelper.getDepartmentBadge(log.department);

                return (
                  <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{log.staffName}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold" style={{ color: dept.color }}>
                        {dept.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-zinc-300">
                      {new Date(log.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="px-4 py-3 font-mono text-zinc-300">
                      {log.clockOutTime ? (
                        new Date(log.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span className="text-emerald-400 font-bold animate-pulse">ON DUTY NOW</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-cyan-400">
                      {log.totalHoursWorked ? `${log.totalHoursWorked}h` : '--'}
                    </td>

                    <td className="px-4 py-3 text-right font-mono">
                      {log.lateMinutes > 0 ? (
                        <span className="text-rose-400 font-bold">+{log.lateMinutes} min</span>
                      ) : (
                        <span className="text-emerald-400">On Time</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono">
                      {log.overtimeMinutes > 0 ? (
                        <span className="text-amber-400 font-bold">+{log.overtimeMinutes} min</span>
                      ) : (
                        <span className="text-zinc-500">0</span>
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

                    <td className="px-4 py-3 font-mono text-zinc-400 text-[10px]">
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
