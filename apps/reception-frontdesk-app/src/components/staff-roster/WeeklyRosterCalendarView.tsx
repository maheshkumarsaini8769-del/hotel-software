import React from 'react';
import { IStaffShiftRosterUI, StaffRosterHelper } from '@spicehub/ui';

interface WeeklyRosterCalendarViewProps {
  schedules: IStaffShiftRosterUI[];
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  onNewShiftClick: () => void;
}

export const WeeklyRosterCalendarView: React.FC<WeeklyRosterCalendarViewProps> = ({
  schedules,
  selectedDepartment,
  onDepartmentChange,
  onNewShiftClick,
}) => {
  const departments = [
    { id: 'ALL', label: 'All Departments' },
    { id: 'FRONT_OF_HOUSE_SERVICE', label: 'FOH Service (Waitstaff)' },
    { id: 'BAR_BEVERAGE', label: 'Bar & Lounge' },
    { id: 'KITCHEN_CULINARY', label: 'Kitchen Brigade (BOH)' },
    { id: 'HOUSEKEEPING', label: 'Housekeeping' },
    { id: 'FRONT_OFFICE', label: 'Front Office' },
  ];

  const filtered = schedules.filter(
    (s) => selectedDepartment === 'ALL' || s.department === selectedDepartment
  );

  return (
    <div className="space-y-4">
      {/* Department Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => onDepartmentChange(dept.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedDepartment === dept.id
                  ? 'bg-cyan-500 text-zinc-900 shadow-md shadow-cyan-950/40'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {dept.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onNewShiftClick}
          className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-cyan-500/30 text-xs font-semibold rounded-xl"
        >
          + Add Staff Shift
        </button>
      </div>

      {/* Roster Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center">
          <span className="text-4xl">📅</span>
          <h3 className="text-base font-bold text-white mt-3">No Shifts Scheduled</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            No roster entries found for the selected department. Click "+ Add Staff Shift" to plan rosters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((shift) => {
            const shiftBadge = StaffRosterHelper.getShiftTypeBadge(shift.shiftType);
            const deptInfo = StaffRosterHelper.getDepartmentBadge(shift.department);

            return (
              <div
                key={shift._id}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white">{shift.staffName}</h4>
                    <span
                      className="text-[11px] font-semibold mt-0.5 block"
                      style={{ color: deptInfo.color }}
                    >
                      {deptInfo.label}
                    </span>
                  </div>

                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: shiftBadge.bg,
                      color: shiftBadge.text,
                      border: shiftBadge.border,
                    }}
                  >
                    {shiftBadge.label}
                  </span>
                </div>

                <div className="bg-[#0c0f16] border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <span>⏰</span>
                    <span>
                      {shift.plannedStartTime} - {shift.plannedEndTime}
                    </span>
                  </div>
                  <span className="text-cyan-400 font-bold">{shift.plannedHours}h</span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/80">
                  <span className="text-zinc-500">
                    Status: <strong className="text-zinc-300">{shift.status}</strong>
                  </span>
                  <span className="text-zinc-500">
                    Date: {new Date(shift.shiftDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
