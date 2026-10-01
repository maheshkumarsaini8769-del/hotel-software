"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupBookingStatus = exports.SplitBillingPolicy = void 0;
var SplitBillingPolicy;
(function (SplitBillingPolicy) {
    SplitBillingPolicy["MASTER_PAYS_ROOM_ONLY"] = "MASTER_PAYS_ROOM_ONLY";
    SplitBillingPolicy["MASTER_PAYS_ALL"] = "MASTER_PAYS_ALL";
    SplitBillingPolicy["INDIVIDUAL_SETTLEMENT"] = "INDIVIDUAL_SETTLEMENT";
})(SplitBillingPolicy || (exports.SplitBillingPolicy = SplitBillingPolicy = {}));
var GroupBookingStatus;
(function (GroupBookingStatus) {
    GroupBookingStatus["CONFIRMED"] = "CONFIRMED";
    GroupBookingStatus["PARTIALLY_CHECKED_IN"] = "PARTIALLY_CHECKED_IN";
    GroupBookingStatus["FULLY_CHECKED_IN"] = "FULLY_CHECKED_IN";
    GroupBookingStatus["COMPLETED"] = "COMPLETED";
    GroupBookingStatus["CANCELLED"] = "CANCELLED";
})(GroupBookingStatus || (exports.GroupBookingStatus = GroupBookingStatus = {}));
