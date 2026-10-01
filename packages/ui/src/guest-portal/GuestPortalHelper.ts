import { ConciergeServiceItem } from './types';

export class GuestPortalHelper {
  /**
   * Luxury Concierge Service Catalog for 5-Star Hospitality
   */
  public static getStandardConciergeCatalog(): ConciergeServiceItem[] {
    return [
      {
        id: 'srv_towels',
        title: 'Fresh Towels',
        subtitle: 'Warm, sanitized bath and hand towels',
        icon: '🛎️',
        requestType: 'TOWEL_REPLENISH',
        isPopular: true,
      },
      {
        id: 'srv_water',
        title: 'Spring Water',
        subtitle: 'Complimentary chilled premium glass bottles',
        icon: '💧',
        requestType: 'WATER',
        isPopular: true,
      },
      {
        id: 'srv_cleaning',
        title: 'Room Refresh',
        subtitle: 'Complete linen change & tidy-up service',
        icon: '🧹',
        requestType: 'ROOM_CLEANING',
      },
      {
        id: 'srv_toiletries',
        title: 'Luxury Toiletries',
        subtitle: 'Botanical shampoo, soap & dental kit',
        icon: '🧼',
        requestType: 'EXTRA_TOILETRIES',
      },
      {
        id: 'srv_porter',
        title: 'Luggage Porter',
        subtitle: 'Bellboy assist for luggage check-out',
        icon: '🧳',
        requestType: 'LUGGAGE_ASSIST',
      },
      {
        id: 'srv_wakeup',
        title: 'Wake-Up Call',
        subtitle: 'Personalized concierge morning alert',
        icon: '⏰',
        requestType: 'WAKEUP_CALL',
      },
    ];
  }

  /**
   * Visual progress stepper calculation for in-room dining orders
   */
  public static getOrderStatusProgress(status: string): {
    step: number;
    percentage: number;
    label: string;
    description: string;
    icon: string;
    color: string;
  } {
    switch (status) {
      case 'SERVED':
        return {
          step: 4,
          percentage: 100,
          label: 'Delivered',
          description: 'Order delivered to your room. Enjoy your meal!',
          icon: '🍽️',
          color: 'emerald',
        };
      case 'READY':
        return {
          step: 3,
          percentage: 75,
          label: 'On The Way',
          description: 'Freshly plated and heading to your door',
          icon: '🛎️',
          color: 'sky',
        };
      case 'PREPARING':
        return {
          step: 2,
          percentage: 50,
          label: 'Preparing',
          description: 'Chef is crafting your meal in the kitchen',
          icon: '👨‍🍳',
          color: 'amber',
        };
      case 'PLACED':
      case 'ACCEPTED':
      default:
        return {
          step: 1,
          percentage: 25,
          label: 'Received',
          description: 'Order sent to the kitchen line',
          icon: '📝',
          color: 'amber',
        };
    }
  }
}
