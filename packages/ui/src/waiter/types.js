"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaiterRequestLifecycle = void 0;
var WaiterRequestLifecycle;
(function (WaiterRequestLifecycle) {
    WaiterRequestLifecycle["PENDING"] = "PENDING";
    WaiterRequestLifecycle["ASSIGNED"] = "ASSIGNED";
    WaiterRequestLifecycle["ACCEPTED"] = "ACCEPTED";
    WaiterRequestLifecycle["COMPLETED"] = "COMPLETED";
    WaiterRequestLifecycle["CANCELLED"] = "CANCELLED";
})(WaiterRequestLifecycle || (exports.WaiterRequestLifecycle = WaiterRequestLifecycle = {}));
