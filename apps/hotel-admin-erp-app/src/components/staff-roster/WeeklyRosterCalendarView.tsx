import React from 'react';
import { IStaffShiftRosterUI, StaffRosterHelper } from '@spicehub/ui';
import { CalendarDays, Clock, Plus } from 'lucide-react';

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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => onDepartmentChange(dept.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedDepartment === dept.id
                  ? 'btn-glass-green text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              {dept.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onNewShiftClick}
          className="btn-glass-green-subtle px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Staff Shift</span>
        </button>
      </div>

      {/* Roster Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 mt-3">No Shifts Scheduled</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
                className="bg-white border border-slate-200 hover:border-slate-300 p-4 rounded-2xl transition-all space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{shift.staffName}</h4>
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

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {shift.plannedStartTime} - {shift.plannedEndTime}
                    </span>
                  </div>
                  <span className="text-emerald-700 font-bold">{shift.plannedHours}h</span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                  <span className="text-slate-500">
                    Status: <strong className="text-slate-800">{shift.status}</strong>
                  </span>
                  <span className="text-slate-500">
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
