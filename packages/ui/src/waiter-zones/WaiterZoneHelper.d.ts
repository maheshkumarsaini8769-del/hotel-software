import { AlertPriority, AlertRoutingType, AlertStatus } from './types';
export declare class WaiterZoneHelper {
    /**
     * Returns human-readable high-contrast badge colors for alert priorities
     */
    static getPriorityColor(priority: AlertPriority): {
        bg: string;
        text: string;
        border: string;
    };
    /**
     * Returns color code for alert status
     */
    static getStatusColor(status: AlertStatus): {
        bg: string;
        text: string;
    };
    /**
     * Checks if an alert belongs to this waiter (or is an escalation to captain)
     */
    static isAlertRelevant(targetWaiterId: string | undefined, currentWaiterId: string, routingType: AlertRoutingType, isCaptain?: boolean): boolean;
    /**
     * Formats table list concisely (e.g. "T-01 to T-10" or "T-01, T-02, T-03")
     */
    static formatTableList(tableNumbers: string[]): string;
}
