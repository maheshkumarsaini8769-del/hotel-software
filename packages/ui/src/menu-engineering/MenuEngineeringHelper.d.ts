import { MenuQuadrantUI } from './types';
export declare class MenuEngineeringHelper {
    static formatCurrency(amount: number): string;
    static getQuadrantBadge(quadrant: MenuQuadrantUI): {
        label: string;
        icon: string;
        bg: string;
        text: string;
        border: string;
        description: string;
    };
    static getFoodCostHealth(percentage: number): {
        label: string;
        color: string;
        bg: string;
    };
}
