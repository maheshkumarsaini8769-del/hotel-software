import { Types } from 'mongoose';
import { TipPoolSession, TipPoolStatus, ITipStaffPayout } from '../models/TipPoolSession';
import { StaffDepartment } from '../models/StaffShiftRoster';

export interface StaffDutyItem {
  userId: string | Types.ObjectId;
  staffName: string;
  department: StaffDepartment;
  hoursWorked: number;
}

export class TipPoolService {
  /**
   * Distributes total collected tips at shift close:
   * Front-of-House (Waiters / Captains / Cashiers) = 60%
   * Back-of-House (Chefs / Kitchen / Stewards) = 40%
   */
  public static async distributeTipPool(
    hotelId: string | Types.ObjectId,
    totalTips: number,
    staffList: StaffDutyItem[],
    fohPercentage = 60,
    bohPercentage = 40
  ) {
    const hId = new Types.ObjectId(hotelId);
    const safeTotal = Math.max(0, Number(totalTips) || 0);

    const fohPool = Math.round((safeTotal * fohPercentage) / 100);
    const bohPool = safeTotal - fohPool;

    // Filter staff by department
    const fohStaff = staffList.filter((s) => s.department === StaffDepartment.FRONT_OF_HOUSE_SERVICE || s.department === StaffDepartment.BAR_BEVERAGE);
    const bohStaff = staffList.filter((s) => s.department === StaffDepartment.KITCHEN_CULINARY || s.department === StaffDepartment.HOUSEKEEPING);

    const totalFohHours = fohStaff.reduce((acc, s) => acc + (s.hoursWorked || 1), 0);
    const totalBohHours = bohStaff.reduce((acc, s) => acc + (s.hoursWorked || 1), 0);

    const payouts: ITipStaffPayout[] = [];

    // FOH Distribution
    for (const staff of fohStaff) {
      const hours = staff.hoursWorked || 1;
      const share = totalFohHours > 0 ? Math.round((hours / totalFohHours) * fohPool) : 0;
      payouts.push({
        userId: new Types.ObjectId(staff.userId),
        staffName: staff.staffName,
        department: staff.department,
        hoursWorked: hours,
        tipShareAmount: share,
        payoutStatus: 'PENDING_APPROVAL',
      });
    }

    // BOH Distribution
    for (const staff of bohStaff) {
      const hours = staff.hoursWorked || 1;
      const share = totalBohHours > 0 ? Math.round((hours / totalBohHours) * bohPool) : 0;
      payouts.push({
        userId: new Types.ObjectId(staff.userId),
        staffName: staff.staffName,
        department: staff.department,
        hoursWorked: hours,
        tipShareAmount: share,
        payoutStatus: 'PENDING_APPROVAL',
      });
    }

    const sessionNumber = `TIP-${Date.now().toString().slice(-6)}`;
    const session = await TipPoolSession.create({
      hotelId: hId,
      sessionNumber,
      poolDate: new Date(),
      totalTipsCollected: safeTotal,
      fohPercentage,
      bohPercentage,
      fohPoolAmount: fohPool,
      bohPoolAmount: bohPool,
      payouts,
      totalEligibleHours: totalFohHours + totalBohHours,
      status: TipPoolStatus.DRAFT,
    });

    return {
      sessionNumber,
      totalTipsCollected: safeTotal,
      fohPoolAmount: fohPool,
      bohPoolAmount: bohPool,
      payouts,
      sessionId: session._id,
    };
  }
}
