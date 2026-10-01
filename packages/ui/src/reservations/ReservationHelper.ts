import { TableReservationStatus, TableDepositStatus, RoomArrivalBookingDTO } from './types';

export interface ReservationBadge {
  bg: string;
  text: string;
  border: string;
  label: string;
}

export class ReservationHelper {
  public static getTableStatusBadge(status: TableReservationStatus): ReservationBadge {
    switch (status) {
      case 'CONFIRMED':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          label: 'Confirmed',
        };
      case 'SEATED':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          label: 'Seated & Active',
        };
      case 'CANCELLED':
        return {
          bg: 'bg-slate-800',
          text: 'text-slate-400',
          border: 'border-slate-700',
          label: 'Cancelled',
        };
      case 'NO_SHOW':
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          label: 'No-Show',
        };
      default:
        return {
          bg: 'bg-slate-800',
          text: 'text-slate-300',
          border: 'border-slate-700',
          label: status,
        };
    }
  }

  public static getDepositBadge(depositStatus: TableDepositStatus, amount: number): ReservationBadge {
    if (depositStatus === 'PAID') {
      return {
        bg: 'bg-emerald-950/40',
        text: 'text-emerald-300',
        border: 'border-emerald-600/30',
        label: `₹${amount} Guaranteed`,
      };
    }
    if (depositStatus === 'FORFEITED') {
      return {
        bg: 'bg-rose-950/40',
        text: 'text-rose-300',
        border: 'border-rose-600/30',
        label: `₹${amount} Forfeited`,
      };
    }
    return {
      bg: 'bg-slate-900',
      text: 'text-slate-400',
      border: 'border-slate-800',
      label: 'No Deposit',
    };
  }

  public static getRoomArrivalBadge(booking: RoomArrivalBookingDTO): ReservationBadge {
    if (booking.bookingStatus === 'CHECKED_IN') {
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        label: 'In-House (Checked In)',
      };
    }
    if (booking.bookingStatus === 'CONFIRMED') {
      if (!booking.allocatedRoomId) {
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          label: 'Room Unassigned (Action Req.)',
        };
      }
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        label: `Assigned: Room ${booking.allocatedRoomId.roomNumber}`,
      };
    }
    if (booking.bookingStatus === 'CHECKED_OUT') {
      return {
        bg: 'bg-slate-800',
        text: 'text-slate-400',
        border: 'border-slate-700',
        label: 'Checked Out',
      };
    }
    return {
      bg: 'bg-slate-800',
      text: 'text-slate-300',
      border: 'border-slate-700',
      label: booking.bookingStatus,
    };
  }

  public static isSlotUpcoming(timeSlot: string, reservationDate: string): boolean {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const resDateStr = new Date(reservationDate).toISOString().slice(0, 10);
      if (todayStr !== resDateStr) return false;

      const [hours, minutes] = timeSlot.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);

      const diffMinutes = (slotTime.getTime() - Date.now()) / (1000 * 60);
      return diffMinutes >= -15 && diffMinutes <= 45; // within arrival window
    } catch {
      return false;
    }
  }

  public static formatTimeSlot(timeSlot: string): string {
    if (!timeSlot) return '';
    const [h, m] = timeSlot.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m || '00'} ${ampm}`;
  }
}
