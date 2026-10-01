"use strict";
// ==========================================
// SPICEHUB UNIFIED SHARED TYPES CONTRACT
// ==========================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.WasteDisposition = exports.KotVoidReason = exports.Item86Reason = exports.VIPTier = exports.PaymentMethod = exports.RequestStatus = exports.RequestType = exports.AllergenType = exports.DietaryType = exports.FoodType = exports.OrderStatus = exports.RoomStatus = exports.TableStatus = exports.ShiftStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["SUPERADMIN"] = "SUPERADMIN";
    UserRole["HOTEL_ADMIN"] = "HOTEL_ADMIN";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["CASHIER"] = "CASHIER";
    UserRole["WAITER"] = "WAITER";
    UserRole["CHEF"] = "CHEF";
    UserRole["HOUSEKEEPING"] = "HOUSEKEEPING";
    UserRole["MAINTENANCE"] = "MAINTENANCE";
    UserRole["GUEST"] = "GUEST";
})(UserRole || (exports.UserRole = UserRole = {}));
var ShiftStatus;
(function (ShiftStatus) {
    ShiftStatus["ON_DUTY"] = "ON_DUTY";
    ShiftStatus["BUSY"] = "BUSY";
    ShiftStatus["DO_NOT_ASSIGN"] = "DO_NOT_ASSIGN";
    ShiftStatus["LOCATION_RECHECKING"] = "LOCATION_RECHECKING";
    ShiftStatus["OUT_OF_AREA"] = "OUT_OF_AREA";
    ShiftStatus["OFFLINE"] = "OFFLINE";
})(ShiftStatus || (exports.ShiftStatus = ShiftStatus = {}));
var TableStatus;
(function (TableStatus) {
    TableStatus["AVAILABLE"] = "AVAILABLE";
    TableStatus["PARTIALLY_OCCUPIED"] = "PARTIALLY_OCCUPIED";
    TableStatus["OCCUPIED"] = "OCCUPIED";
    TableStatus["BILLING"] = "BILLING";
    TableStatus["PAYMENT_SETTLED"] = "PAYMENT_SETTLED";
    TableStatus["DIRTY"] = "DIRTY";
    TableStatus["CLEANING"] = "CLEANING";
    TableStatus["RESERVED"] = "RESERVED";
    TableStatus["MERGED"] = "MERGED";
})(TableStatus || (exports.TableStatus = TableStatus = {}));
var RoomStatus;
(function (RoomStatus) {
    RoomStatus["AVAILABLE"] = "AVAILABLE";
    RoomStatus["RESERVED"] = "RESERVED";
    RoomStatus["OCCUPIED"] = "OCCUPIED";
    RoomStatus["DIRTY"] = "DIRTY";
    RoomStatus["CLEANING"] = "CLEANING";
    RoomStatus["INSPECTION"] = "INSPECTION";
    RoomStatus["OUT_OF_SERVICE"] = "OUT_OF_SERVICE";
})(RoomStatus || (exports.RoomStatus = RoomStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["SUBMITTED"] = "SUBMITTED";
    OrderStatus["IN_PREPARATION"] = "IN_PREPARATION";
    OrderStatus["READY_TO_SERVE"] = "READY_TO_SERVE";
    OrderStatus["SERVED"] = "SERVED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var FoodType;
(function (FoodType) {
    FoodType["VEG"] = "VEG";
    FoodType["NON_VEG"] = "NON_VEG";
    FoodType["EGG"] = "EGG";
    FoodType["BEVERAGE"] = "BEVERAGE";
})(FoodType || (exports.FoodType = FoodType = {}));
var DietaryType;
(function (DietaryType) {
    DietaryType["VEG"] = "VEG";
    DietaryType["NON_VEG"] = "NON_VEG";
    DietaryType["JAIN"] = "JAIN";
    DietaryType["VEGAN"] = "VEGAN";
    DietaryType["NO_ONION_GARLIC"] = "NO_ONION_GARLIC";
    DietaryType["EGG"] = "EGG";
    DietaryType["HALAL"] = "HALAL";
})(DietaryType || (exports.DietaryType = DietaryType = {}));
var AllergenType;
(function (AllergenType) {
    AllergenType["NUTS"] = "NUTS";
    AllergenType["PEANUT"] = "PEANUT";
    AllergenType["TREE_NUTS"] = "TREE_NUTS";
    AllergenType["DAIRY"] = "DAIRY";
    AllergenType["GLUTEN"] = "GLUTEN";
    AllergenType["EGGS"] = "EGGS";
    AllergenType["SHELLFISH"] = "SHELLFISH";
    AllergenType["SOY"] = "SOY";
    AllergenType["JAIN_NO_ROOT"] = "JAIN_NO_ROOT";
})(AllergenType || (exports.AllergenType = AllergenType = {}));
var RequestType;
(function (RequestType) {
    RequestType["WATER"] = "WATER";
    RequestType["CUTLERY"] = "CUTLERY";
    RequestType["BILL"] = "BILL";
    RequestType["CALL_WAITER"] = "CALL_WAITER";
    RequestType["CLEANING"] = "CLEANING";
    RequestType["ROOM_CLEANING"] = "ROOM_CLEANING";
    RequestType["TOWEL_REPLENISH"] = "TOWEL_REPLENISH";
    RequestType["LUGGAGE_ASSIST"] = "LUGGAGE_ASSIST";
})(RequestType || (exports.RequestType = RequestType = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["PENDING"] = "PENDING";
    RequestStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    RequestStatus["RESOLVED"] = "RESOLVED";
    RequestStatus["CANCELLED"] = "CANCELLED";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["ROOM_FOLIO"] = "ROOM_FOLIO";
    PaymentMethod["SPLIT"] = "SPLIT";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var VIPTier;
(function (VIPTier) {
    VIPTier["REGULAR"] = "REGULAR";
    VIPTier["SILVER"] = "SILVER";
    VIPTier["GOLD"] = "GOLD";
    VIPTier["PLATINUM"] = "PLATINUM";
    VIPTier["VIP"] = "VIP";
})(VIPTier || (exports.VIPTier = VIPTier = {}));
var Item86Reason;
(function (Item86Reason) {
    Item86Reason["INGREDIENT_EXHAUSTED"] = "INGREDIENT_EXHAUSTED";
    Item86Reason["CHEF_SPECIAL_SOLD_OUT"] = "CHEF_SPECIAL_SOLD_OUT";
    Item86Reason["SEASONAL_UNAVAILABLE"] = "SEASONAL_UNAVAILABLE";
    Item86Reason["EQUIPMENT_BREAKDOWN"] = "EQUIPMENT_BREAKDOWN";
    Item86Reason["QUALITY_HOLD"] = "QUALITY_HOLD";
    Item86Reason["OTHER"] = "OTHER";
})(Item86Reason || (exports.Item86Reason = Item86Reason = {}));
// ==========================================
// SHIFT 50: KOT LOCK & MANAGER VOID TYPES
// ==========================================
var KotVoidReason;
(function (KotVoidReason) {
    KotVoidReason["CUSTOMER_CANCELLED"] = "CUSTOMER_CANCELLED";
    KotVoidReason["WRONG_ITEM_PUNCHED"] = "WRONG_ITEM_PUNCHED";
    KotVoidReason["QUALITY_REJECTED"] = "QUALITY_REJECTED";
    KotVoidReason["OUT_OF_STOCK"] = "OUT_OF_STOCK";
    KotVoidReason["DELAYED_PREPARATION"] = "DELAYED_PREPARATION";
    KotVoidReason["ACCIDENTAL_DOUBLE_PUNCH"] = "ACCIDENTAL_DOUBLE_PUNCH";
})(KotVoidReason || (exports.KotVoidReason = KotVoidReason = {}));
var WasteDisposition;
(function (WasteDisposition) {
    WasteDisposition["WASTED_SCRAPPED"] = "WASTED_SCRAPPED";
    WasteDisposition["REUSABLE_RETURNED_TO_STORE"] = "REUSABLE_RETURNED_TO_STORE";
    WasteDisposition["CANCELLED_BEFORE_COOKING"] = "CANCELLED_BEFORE_COOKING";
})(WasteDisposition || (exports.WasteDisposition = WasteDisposition = {}));
