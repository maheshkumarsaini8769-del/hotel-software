export declare const POSITIVE_FEEDBACK_TAGS: string[];
export declare const CONSTRUCTIVE_FEEDBACK_TAGS: string[];
export declare function getStarColor(rating: number): string;
export declare function getRecoveryStatusBadge(status: string): {
    label: string;
    bg: string;
    text: string;
    icon: string;
};
export declare function shouldTriggerServiceRecovery(overallRating: number): boolean;
export declare function getGoogleReviewDeepLink(propertySlug?: string): string;
