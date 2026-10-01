export interface AlertCategoryMeta {
    key: string;
    label: string;
    description: string;
    defaultThresholdUnit: string;
    defaultThreshold: number;
    icon: string;
}
export declare const ALERT_CATEGORY_METAS: Record<string, AlertCategoryMeta>;
export declare const NOTIFICATION_CHANNELS: {
    id: string;
    label: string;
    icon: string;
}[];
export declare function getSeverityStyle(severity: string): {
    bg: string;
    text: string;
    border: string;
    badge: string;
};
export declare function buildSoundboxSpeechAnnouncement(alert: {
    category: string;
    title: string;
    message: string;
    payload?: any;
}): string;
export declare function playAlertChime(severity?: string): void;
