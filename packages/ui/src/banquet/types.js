"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatingLayoutType = exports.BanquetBookingStatus = exports.BanquetTimeSlot = exports.BanquetEventType = void 0;
var BanquetEventType;
(function (BanquetEventType) {
    BanquetEventType["WEDDING_RECEPTION"] = "WEDDING_RECEPTION";
    BanquetEventType["CORPORATE_CONFERENCE"] = "CORPORATE_CONFERENCE";
    BanquetEventType["COCKTAIL_DINNER"] = "COCKTAIL_DINNER";
    BanquetEventType["BIRTHDAY_ANNIVERSARY"] = "BIRTHDAY_ANNIVERSARY";
    BanquetEventType["EXHIBITION_SEMINAR"] = "EXHIBITION_SEMINAR";
    BanquetEventType["SOCIAL_GATHERING"] = "SOCIAL_GATHERING";
})(BanquetEventType || (exports.BanquetEventType = BanquetEventType = {}));
var BanquetTimeSlot;
(function (BanquetTimeSlot) {
    BanquetTimeSlot["MORNING"] = "MORNING";
    BanquetTimeSlot["EVENING"] = "EVENING";
    BanquetTimeSlot["FULL_DAY"] = "FULL_DAY";
})(BanquetTimeSlot || (exports.BanquetTimeSlot = BanquetTimeSlot = {}));
var BanquetBookingStatus;
(function (BanquetBookingStatus) {
    BanquetBookingStatus["ENQUIRY"] = "ENQUIRY";
    BanquetBookingStatus["PROVISIONAL"] = "PROVISIONAL";
    BanquetBookingStatus["CONFIRMED"] = "CONFIRMED";
    BanquetBookingStatus["IN_PROGRESS"] = "IN_PROGRESS";
    BanquetBookingStatus["COMPLETED"] = "COMPLETED";
    BanquetBookingStatus["CANCELLED"] = "CANCELLED";
})(BanquetBookingStatus || (exports.BanquetBookingStatus = BanquetBookingStatus = {}));
var SeatingLayoutType;
(function (SeatingLayoutType) {
    SeatingLayoutType["THEATER"] = "THEATER";
    SeatingLayoutType["ROUND_TABLE_CLUSTERS"] = "ROUND_TABLE_CLUSTERS";
    SeatingLayoutType["U_SHAPE"] = "U_SHAPE";
    SeatingLayoutType["CLASSROOM"] = "CLASSROOM";
    SeatingLayoutType["HOLLOW_SQUARE"] = "HOLLOW_SQUARE";
    SeatingLayoutType["COCKTAIL_STANDING"] = "COCKTAIL_STANDING";
})(SeatingLayoutType || (exports.SeatingLayoutType = SeatingLayoutType = {}));
