import React, { useState, useEffect } from 'react';
import axios from 'axios';

export interface FrontDeskCheckInAppProps {
  authToken?: string;
  hotelId?: string;
}

interface ExpectedArrival {
  bookingId: string;
  bookingNumber: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  checkInDate: string;
  checkOutDate: string;
  bookingSource: string;
  bookingMode: string;
  totalTariff: number;
  taxAmount: number;
  grandTotal: number;
  advancePaymentAmount: number;
  paymentStatus: string;
  guestCountAdults: number;
}

interface InHouseGuest {
  stayId: string;
  roomNumber: string;
  floor: number;
  guestName: string;
  phone: string;
  vipTier: string;
  totalVisits: number;
  isCouple: boolean;
  verificationMode: string;
  idNumberMasked: string;
  verifiedByReceptionist: boolean;
  checkInTime: string;
  expectedCheckOutTime: string;
  bookingNumber: string;
  folioNumber: string;
  advancePaid: number;
  balanceDue: number;
  receptionistNotes?: string;
  checkoutRequested?: boolean;
  checkoutRequestedAt?: string;
  preferredPaymentMethod?: string;
  feedbackRating?: number;
  checkoutNotes?: string;
  lateCheckOutRecord?: {
    tier: string;
    hoursLate: number;
    surchargeAmount: number;
    totalCharge: number;
    waived: boolean;
    requestedCheckOutTime?: string;
    keycardExtendedTo?: string;
  };
  keycardExpiresAt?: string;
  baseRatePerNight?: number;
  effectiveRatePerNight?: number;
  isComplimentaryWaiver?: boolean;
  activeRateOverride?: {
    originalRate: number;
    newRate: number;
    discountAmount: number;
    discountPercent?: number;
    overrideType: string;
    reason: string;
    justification: string;
    requestedByName?: string;
    approvedByName?: string;
    approvedAt?: string;
    managerPinVerified?: boolean;
    approvalTier?: string;
    status?: string;
  };
}

interface CheckoutPreviewData {
  room: { id: string; roomNumber: string; floor: number; status: string };
  stay: {
    stayId: string;
    guestName: string;
    checkInTimestamp: string;
    expectedCheckOutTimestamp: string;
    checkoutRequested?: boolean;
    checkoutRequestedAt?: string;
    preferredPaymentMethod?: string;
    feedbackRating?: number;
    keyCardIssued?: boolean;
  };
  folio: {
    folioId: string;
    folioNumber: string;
    folioStatus: string;
    totalRoomTariff: number;
    totalFoodAndBeverage: number;
    totalLaundry: number;
    totalPaidServices: number;
    totalTaxes: number;
    advancePaid: number;
    paidAmount: number;
    netAmountPayable: number;
    dueAmount: number;
    lineItems: Array<{
      id: string;
      department: string;
      description: string;
      rate: number;
      taxAmount: number;
      netAmount: number;
      postedAt: string;
    }>;
  };
}

interface GuestProfileHistory {
  guestId: string;
  name: string;
  phone: string;
  email?: string;
  vipTier: string;
  totalVisits: number;
  totalLifetimeSpend: number;
  lastVisitDate?: string;
  idType?: string;
  idNumberMasked?: string;
  isVerified?: boolean;
  specialNotes?: string;
  pastStays: Array<{
    stayId: string;
    roomNumber: string;
    checkIn: string;
    checkOut?: string;
    stayStatus: string;
    isCouple?: boolean;
    verificationMode: string;
    idNumberMasked?: string;
    verifiedByReceptionist?: boolean;
    notes?: string;
  }>;
}

export interface ConciergeDeskRequest {
  id: string;
  roomNumber: string;
  floor: number;
  guestName: string;
  requestType: string;
  priority: string;
  status: string;
  notes?: string;
  assignedStaffName: string;
  slaMinutes: number;
  isBillable: boolean;
  billableAmount: number;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export interface TurnaroundQueueItem {
  taskId: string;
  room: {
    id: string;
    roomNumber: string;
    floor: number;
    wing: string;
    status: string;
  } | null;
  taskType: string;
  priority: string;
  status: string;
  checklist: Array<{ taskName: string; isDone: boolean }>;
  checklistProgress: string;
  checklistCompleted: boolean;
  assignedAttendant: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  inspectionNotes?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  elapsedMinutes: number;
  slaTargetMinutes: number;
  slaRemainingMinutes: number;
  isSlaBreached: boolean;
}

// Shift 63: Room Maintenance & Out-of-Service Queue Item
export interface MaintenanceDeskTicket {
  ticketId: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: 'ELECTRICAL' | 'PLUMBING' | 'HVAC' | 'CARPENTRY' | 'ELECTRONICS' | 'GENERAL';
  priority: 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  blocksRoom: boolean;
  room: {
    id: string;
    roomNumber: string;
    floor: number;
    wing: string;
    status: string;
  } | null;
  assignedTechnicianName: string | null;
  assignedTechnicianId: string | null;
  slaHours: number;
  slaDeadline: string;
  slaRemainingMinutes: number;
  elapsedMinutes: number;
  isSlaBreached: boolean;
  partsUsed: Array<{ partName: string; cost: number; quantity: number }>;
  totalCost: number;
  resolutionNotes: string;
  resolvedAt: string | null;
  createdAt: string;
}

// Shift 64: In-House Room Move & Upgrade Item
export interface AvailableUpgradeRoom {
  roomId: string;
  roomNumber: string;
  floorNumber: number;
  wing: string;
  roomType: string;
  basePrice: number;
  currentRoomPrice: number;
  suggestedUpgradeFee: number;
  status: string;
}

export interface CashierShift {
  _id: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  terminalId: string;
  status: 'OPEN' | 'CLOSED';
  shiftType: 'MORNING' | 'EVENING' | 'NIGHT' | 'GENERAL';
  openingFloat: number;
  totalCashCollected: number;
  expectedCashInDrawer: number;
  actualCashCounted?: number;
  cashVariance?: number;
  safeDropAmount?: number;
  safeDropReceiptNumber?: string;
  closingFloatRetained?: number;
  discrepancyReason?: string;
  discrepancyStatus?: 'NONE' | 'RESOLVED' | 'UNDER_REVIEW' | 'FLAGGED';
  handoverToCashierName?: string;
  incomingCashierAcknowledged?: boolean;
  supervisorVerified?: boolean;
  supervisorRemarks?: string;
  openedAt: string;
  closedAt?: string;
}

export const FrontDeskCheckInApp: React.FC<FrontDeskCheckInAppProps> = ({
  authToken,
  hotelId: propHotelId,
}) => {
  const [activeTab, setActiveTab] = useState<'CHECKIN' | 'ARRIVALS' | 'IN_HOUSE' | 'HISTORY' | 'CONCIERGE' | 'TURNAROUND' | 'MAINTENANCE' | 'CASHIER'>('CHECKIN');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Loaded Online Pre-Booking (if arriving via online queue)
  const [loadedBooking, setLoadedBooking] = useState<ExpectedArrival | null>(null);

  // Concierge & Housekeeping Desk Requests (Shift 60)
  const [conciergeRequests, setConciergeRequests] = useState<ConciergeDeskRequest[]>([]);

  // Shift 62: Housekeeping Turnaround Queue & Room Inspection State
  const [turnaroundQueue, setTurnaroundQueue] = useState<TurnaroundQueueItem[]>([]);
  const [selectedTurnaroundTask, setSelectedTurnaroundTask] = useState<TurnaroundQueueItem | null>(null);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [activeChecklist, setActiveChecklist] = useState<Array<{ taskName: string; isDone: boolean }>>([]);
  const [turnaroundAttendantName, setTurnaroundAttendantName] = useState('Sunita Sharma (Executive Attendant)');
  const [turnaroundNotes, setTurnaroundNotes] = useState('');
  const [turnaroundSubmitting, setTurnaroundSubmitting] = useState(false);

  // Shift 63: Room Maintenance & Out-of-Service Pipeline
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceDeskTicket[]>([]);
  const [selectedMaintTicket, setSelectedMaintTicket] = useState<MaintenanceDeskTicket | null>(null);
  const [reportDefectModalOpen, setReportDefectModalOpen] = useState(false);
  const [defectRoomNumber, setDefectRoomNumber] = useState('102');
  const [defectTitle, setDefectTitle] = useState('');
  const [defectDescription, setDefectDescription] = useState('');
  const [defectCategory, setDefectCategory] = useState<'ELECTRICAL' | 'PLUMBING' | 'HVAC' | 'CARPENTRY' | 'ELECTRONICS' | 'GENERAL'>('HVAC');
  const [defectPriority, setDefectPriority] = useState<'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [defectBlocksRoom, setDefectBlocksRoom] = useState(true);
  const [defectSubmitting, setDefectSubmitting] = useState(false);

  const [partsModalOpen, setPartsModalOpen] = useState(false);
  const [partsList, setPartsList] = useState<Array<{ partName: string; cost: number; quantity: number }>>([]);
  const [resolutionNotesText, setResolutionNotesText] = useState('');
  const [partsSubmitting, setPartsSubmitting] = useState(false);

  // Shift 64: In-House Room Move & Upgrade Modal State
  const [roomMoveModalOpen, setRoomMoveModalOpen] = useState(false);
  const [selectedMoveGuest, setSelectedMoveGuest] = useState<InHouseGuest | null>(null);
  const [availableUpgradeRooms, setAvailableUpgradeRooms] = useState<AvailableUpgradeRoom[]>([]);
  const [loadingUpgradeRooms, setLoadingUpgradeRooms] = useState(false);
  const [targetRoomNumber, setTargetRoomNumber] = useState('');
  const [moveReason, setMoveReason] = useState<'UPGRADE' | 'MAINTENANCE_DEFECT' | 'NOISE_COMPLAINT' | 'GUEST_REQUEST'>('UPGRADE');
  const [moveUpgradeFee, setMoveUpgradeFee] = useState<number>(0);
  const [moveNotes, setMoveNotes] = useState('');
  const [submittingRoomMove, setSubmittingRoomMove] = useState(false);

  // Shift 65: In-House Late Check-Out Modal State
  const [lateCheckoutModalOpen, setLateCheckoutModalOpen] = useState(false);
  const [selectedLateGuest, setSelectedLateGuest] = useState<InHouseGuest | null>(null);
  const [requestedLateDepartureTime, setRequestedLateDepartureTime] = useState<string>('15:00');
  const [lateCalculation, setLateCalculation] = useState<any | null>(null);
  const [waiveLateFee, setWaiveLateFee] = useState<boolean>(false);
  const [lateWaiverReason, setLateWaiverReason] = useState<string>('');
  const [submittingLateCheckout, setSubmittingLateCheckout] = useState<boolean>(false);

  // Shift 67: In-House Rate Override & PIN Approval Modal State
  const [rateOverrideModalOpen, setRateOverrideModalOpen] = useState(false);
  const [selectedGuestForOverride, setSelectedGuestForOverride] = useState<InHouseGuest | null>(null);
  const [overrideType, setOverrideType] = useState<'PERCENTAGE_DISCOUNT' | 'FIXED_TARIFF' | 'COMPLIMENTARY_WAIVER'>('PERCENTAGE_DISCOUNT');
  const [overrideDiscountPercent, setOverrideDiscountPercent] = useState<number>(15);
  const [overrideFixedRate, setOverrideFixedRate] = useState<number>(3000);
  const [overrideReason, setOverrideReason] = useState<string>('SERVICE_RECOVERY');
  const [overrideJustification, setOverrideJustification] = useState<string>('AC repair delay during stay. Approved customer recovery discount.');
  const [overrideManagerPin, setOverrideManagerPin] = useState<string>('9921');
  const [overrideCalculation, setOverrideCalculation] = useState<any | null>(null);
  const [submittingOverride, setSubmittingOverride] = useState<boolean>(false);

  // Shift 68: Cashier Shift Handover & Drawer Balancing State
  const [activeCashierShift, setActiveCashierShift] = useState<CashierShift | null>(null);
  const [cashierHistory, setCashierHistory] = useState<CashierShift[]>([]);
  const [cashierSummary, setCashierSummary] = useState<any | null>(null);
  const [loadingCashier, setLoadingCashier] = useState<boolean>(false);

  // Denomination breakdown state
  const [denom500, setDenom500] = useState<number>(0);
  const [denom200, setDenom200] = useState<number>(0);
  const [denom100, setDenom100] = useState<number>(0);
  const [denom50, setDenom50] = useState<number>(0);
  const [denom20, setDenom20] = useState<number>(0);
  const [denom10, setDenom10] = useState<number>(0);
  const [denomCoins, setDenomCoins] = useState<number>(0);

  // Safe drop & float allocation state
  const [safeDropAmount, setSafeDropAmount] = useState<number>(0);
  const [closingFloatRetained, setClosingFloatRetained] = useState<number>(5000);
  const [safeDropReceiptNumber, setSafeDropReceiptNumber] = useState<string>('');
  const [handoverToCashierName, setHandoverToCashierName] = useState<string>('Evening Receptionist Rohan');
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [supervisorPin, setSupervisorPin] = useState<string>('9921');
  const [supervisorRemarks, setSupervisorRemarks] = useState<string>('Discrepancy & safe drop verified by duty supervisor.');
  const [showSupervisorPinModal, setShowSupervisorPinModal] = useState<boolean>(false);
  const [cashierSubmitting, setCashierSubmitting] = useState<boolean>(false);

  // New Shift Opening Modal State
  const [openShiftModalVisible, setOpenShiftModalVisible] = useState<boolean>(false);
  const [newShiftFloatAmount, setNewShiftFloatAmount] = useState<number>(5000);
  const [newShiftType, setNewShiftType] = useState<'MORNING' | 'EVENING' | 'NIGHT'>('MORNING');
  const [newCashierName, setNewCashierName] = useState<string>('Morning Receptionist Ananya');

  // Check-In Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [isCouple, setIsCouple] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [verifiedByReceptionist, setVerifiedByReceptionist] = useState(true);
  const [receptionistNotes, setReceptionistNotes] = useState('');
  const [advancePaid, setAdvancePaid] = useState<number>(0);

  // Data states
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [expectedArrivals, setExpectedArrivals] = useState<ExpectedArrival[]>([]);
  const [inHouseGuests, setInHouseGuests] = useState<InHouseGuest[]>([]);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [guestHistoryList, setGuestHistoryList] = useState<GuestProfileHistory[]>([]);

  // Master Folio Departure Settlement State (Shift 61)
  const [settleModalGuest, setSettleModalGuest] = useState<InHouseGuest | null>(null);
  const [settlePreviewData, setSettlePreviewData] = useState<CheckoutPreviewData | null>(null);
  const [settleLoadingPreview, setSettleLoadingPreview] = useState(false);
  const [settleSubmitting, setSettleSubmitting] = useState(false);
  const [settlePaymentMode, setSettlePaymentMode] = useState<string>('UPI');
  const [settleTransactionRef, setSettleTransactionRef] = useState<string>('');
  const [settleKeycardVoid, setSettleKeycardVoid] = useState<boolean>(true);
  const [settleSuccessVoucher, setSettleSuccessVoucher] = useState<any | null>(null);

  const apiBase = 'http://localhost:5000/api/v1';
  const token = authToken || (typeof window !== 'undefined' ? (localStorage.getItem('spicehub_token') || localStorage.getItem('token') || '') : '');
  const hotelId = propHotelId || (typeof window !== 'undefined' ? (localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || '') : '');

  const authHeaders = {
    Authorization: token ? `Bearer ${token}` : '',
    'x-hotel-id': hotelId,
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Expected Online Arrivals Today
      try {
        const arrivalsRes = await axios.get(`${apiBase}/pms/frontdesk/expected-arrivals`, {
          headers: authHeaders,
          params: { hotelId },
        });
        if (arrivalsRes.data.success) {
          setExpectedArrivals(arrivalsRes.data.data || []);
        }
      } catch (err: any) {
        console.warn('Expected arrivals note:', err.message);
      }

      // 2. Fetch In-House Active Guests
      try {
        const inHouseRes = await axios.get(`${apiBase}/pms/frontdesk/active-stays`, {
          headers: authHeaders,
          params: { hotelId },
        });
        if (inHouseRes.data.success) {
          setInHouseGuests(inHouseRes.data.data || []);
        }
      } catch (err: any) {
        console.warn('In-house stays note:', err.message);
      }

      // 3. Fetch Available Physical Rooms for Checkin
      try {
        const roomsRes = await axios.get(`${apiBase}/pms/frontdesk/available-rooms`, {
          headers: authHeaders,
          params: { hotelId },
        });
        if (roomsRes.data.success && Array.isArray(roomsRes.data.data) && roomsRes.data.data.length > 0) {
          const rooms = roomsRes.data.data;
          setAvailableRooms(rooms);
          setSelectedRoomId((prev) => prev || rooms[0].id || rooms[0]._id);
        } else {
          setAvailableRooms([
            { id: 'rm-101', _id: 'rm-101', roomNumber: '101', floorNumber: 1, basePrice: 3900 },
            { id: 'rm-102', _id: 'rm-102', roomNumber: '102', floorNumber: 1, basePrice: 3900 },
            { id: 'rm-201', _id: 'rm-201', roomNumber: '201', floorNumber: 2, basePrice: 4900 },
            { id: 'rm-202', _id: 'rm-202', roomNumber: '202', floorNumber: 2, basePrice: 4900 },
            { id: 'rm-301', _id: 'rm-301', roomNumber: '301', floorNumber: 3, basePrice: 6500 },
          ]);
          setSelectedRoomId('rm-101');
        }
      } catch (err: any) {
        setAvailableRooms([
          { id: 'rm-101', _id: 'rm-101', roomNumber: '101', floorNumber: 1, basePrice: 3900 },
          { id: 'rm-102', _id: 'rm-102', roomNumber: '102', floorNumber: 1, basePrice: 3900 },
          { id: 'rm-201', _id: 'rm-201', roomNumber: '201', floorNumber: 2, basePrice: 4900 },
        ]);
        setSelectedRoomId('rm-101');
      }

      // 4. Fetch Concierge & Housekeeping Desk Requests (Shift 60)
      try {
        const crRes = await axios.get(`${apiBase}/pms/frontdesk/concierge-requests`, {
          headers: authHeaders,
          params: { hotelId },
        });
        if (crRes.data.success) {
          setConciergeRequests(crRes.data.data || []);
        }
      } catch (err: any) {
        console.warn('Concierge requests note:', err.message);
      }

      // 5. Fetch Housekeeping Turnaround Queue (Shift 62)
      try {
        const tRes = await axios.get(`${apiBase}/pms/frontdesk/turnaround-queue`, {
          headers: authHeaders,
          params: { hotelId },
        });
        if (tRes.data.success) {
          setTurnaroundQueue(tRes.data.data || []);
        }
      } catch (err: any) {
        console.warn('Turnaround queue note:', err.message);
      }

      // 6. Fetch Room Maintenance & Out-of-Service Tickets (Shift 63)
      try {
        const mRes = await axios.get(`${apiBase}/pms/frontdesk/maintenance/tickets`, {
          headers: authHeaders,
          params: { hotelId },
        });
        if (mRes.data.success) {
          setMaintenanceTickets(mRes.data.data || []);
        }
      } catch (err: any) {
        console.warn('Maintenance tickets note:', err.message);
      }

      // 7. Fetch Front Desk Cashier Shift & Handover State (Shift 68)
      try {
        const [activeRes, histRes] = await Promise.all([
          axios.get(`${apiBase}/pms/frontdesk/cashier/shift/active`, {
            headers: authHeaders,
            params: { hotelId, terminalId: 'FD_COUNTER_01' },
          }),
          axios.get(`${apiBase}/pms/frontdesk/cashier/shift/history`, {
            headers: authHeaders,
            params: { hotelId },
          }),
        ]);

        if (activeRes.data.success && activeRes.data.data) {
          setActiveCashierShift(activeRes.data.data);
        } else {
          setActiveCashierShift(null);
        }

        if (histRes.data.success && histRes.data.data) {
          setCashierHistory(histRes.data.data.shifts || []);
          setCashierSummary(histRes.data.data.summary || null);
        }
      } catch (err: any) {
        console.warn('Cashier shift load note:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCashierShiftData = async () => {
    try {
      setLoadingCashier(true);
      const [activeRes, histRes] = await Promise.all([
        axios.get(`${apiBase}/pms/frontdesk/cashier/shift/active`, {
          headers: authHeaders,
          params: { hotelId, terminalId: 'FD_COUNTER_01' },
        }),
        axios.get(`${apiBase}/pms/frontdesk/cashier/shift/history`, {
          headers: authHeaders,
          params: { hotelId },
        }),
      ]);

      if (activeRes.data.success && activeRes.data.data) {
        setActiveCashierShift(activeRes.data.data);
      } else {
        setActiveCashierShift(null);
      }

      if (histRes.data.success && histRes.data.data) {
        setCashierHistory(histRes.data.data.shifts || []);
        setCashierSummary(histRes.data.data.summary || null);
      }
    } catch (err: any) {
      console.warn('Cashier shift load note:', err.message);
    } finally {
      setLoadingCashier(false);
    }
  };

  const handleOpenNewShift = async () => {
    try {
      setCashierSubmitting(true);
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/cashier/shift/open`,
        {
          openingFloat: Number(newShiftFloatAmount) || 0,
          shiftType: newShiftType,
          terminalId: 'FD_COUNTER_01',
          cashierName: newCashierName,
          notes: `Shift opened on FD_COUNTER_01 by ${newCashierName}`,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`💼 Cashier shift opened successfully with ₹${newShiftFloatAmount} base float!`);
        setOpenShiftModalVisible(false);
        await loadCashierShiftData();
      }
    } catch (err: any) {
      showToast(`❌ Error opening shift: ${err.response?.data?.message || err.message}`);
    } finally {
      setCashierSubmitting(false);
    }
  };

  // Real-time calculations for drawer reconciliation
  const totalCountedCash =
    (denom500 * 500) +
    (denom200 * 200) +
    (denom100 * 100) +
    (denom50 * 50) +
    (denom20 * 20) +
    (denom10 * 10) +
    Number(denomCoins || 0);

  const totalAllocated = Number(safeDropAmount || 0) + Number(closingFloatRetained || 0);
  const allocationDelta = totalCountedCash - totalAllocated;
  const expectedDrawerCash = activeCashierShift?.expectedCashInDrawer || 0;
  const cashVariance = totalCountedCash - expectedDrawerCash;
  const isSupervisorRequired = Math.abs(cashVariance) > 100 || Number(safeDropAmount || 0) > 5000;

  const handleReconcilePreview = async () => {
    if (!activeCashierShift) return;
    try {
      setCashierSubmitting(true);
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/cashier/shift/reconcile`,
        {
          shiftId: activeCashierShift._id,
          denominationBreakdown: {
            count500: denom500,
            count200: denom200,
            count100: denom100,
            count50: denom50,
            count20: denom20,
            count10: denom10,
            coins: denomCoins,
          },
          safeDropAmount: Number(safeDropAmount || 0),
          closingFloatRetained: Number(closingFloatRetained || 0),
          discrepancyReason: discrepancyReason || undefined,
          supervisorPin: isSupervisorRequired ? supervisorPin : undefined,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`✓ Cash drawer verified! Counted: ₹${res.data.data.actualCashCounted}, Variance: ₹${res.data.data.cashVariance}`);
      }
    } catch (err: any) {
      showToast(`⚠️ Reconciliation note: ${err.response?.data?.message || err.message}`);
    } finally {
      setCashierSubmitting(false);
    }
  };

  const handleExecuteHandover = async () => {
    if (!activeCashierShift) return;
    if (allocationDelta !== 0) {
      showToast(`⚠️ Allocation mismatch: Safe Drop (₹${safeDropAmount}) + Retained (₹${closingFloatRetained}) != Counted (₹${totalCountedCash})`);
      return;
    }
    if (cashVariance !== 0 && (!discrepancyReason || discrepancyReason.trim().length < 3)) {
      showToast(`⚠️ Physical cash discrepancy of ₹${cashVariance} detected. Please document a reason.`);
      return;
    }
    if (isSupervisorRequired && (!supervisorPin || supervisorPin.length < 4)) {
      setShowSupervisorPinModal(true);
      return;
    }

    try {
      setCashierSubmitting(true);
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/cashier/shift/handover`,
        {
          shiftId: activeCashierShift._id,
          denominationBreakdown: {
            count500: denom500,
            count200: denom200,
            count100: denom100,
            count50: denom50,
            count20: denom20,
            count10: denom10,
            coins: denomCoins,
          },
          safeDropAmount: Number(safeDropAmount || 0),
          closingFloatRetained: Number(closingFloatRetained || 0),
          safeDropReceiptNumber: safeDropReceiptNumber || `DROP-${Date.now().toString().slice(-6)}`,
          handoverToCashierName,
          discrepancyReason: discrepancyReason || undefined,
          supervisorPin: isSupervisorRequired ? supervisorPin : undefined,
          supervisorRemarks: isSupervisorRequired ? supervisorRemarks : undefined,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`🎉 Shift ${res.data.data.shiftNumber} closed & handed over to ${handoverToCashierName}! Safe Drop: ₹${safeDropAmount}`);
        setShowSupervisorPinModal(false);
        await loadCashierShiftData();
      }
    } catch (err: any) {
      showToast(`❌ Handover error: ${err.response?.data?.message || err.message}`);
    } finally {
      setCashierSubmitting(false);
    }
  };

  const handleAcknowledgeHandover = async (shiftId: string) => {
    try {
      setCashierSubmitting(true);
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/cashier/shift/acknowledge-handover`,
        {
          shiftId,
          acknowledgedByCashierName: handoverToCashierName || 'Incoming Cashier',
          autoOpenNextShift: true,
          nextShiftType: 'EVENING',
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`✅ Handover accepted! New shift ${res.data.data.nextShift?.shiftNumber || ''} opened with float ₹${res.data.data.previousShift?.closingFloatRetained}.`);
        await loadCashierShiftData();
      }
    } catch (err: any) {
      showToast(`❌ Error acknowledging handover: ${err.response?.data?.message || err.message}`);
    } finally {
      setCashierSubmitting(false);
    }
  };

  const loadMaintenanceTickets = async () => {
    try {
      const res = await axios.get(`${apiBase}/pms/frontdesk/maintenance/tickets`, {
        headers: authHeaders,
        params: { hotelId },
      });
      if (res.data.success) {
        setMaintenanceTickets(res.data.data || []);
      }
    } catch (e) {}
  };

  const handleCreateMaintenanceTicket = async () => {
    if (!defectTitle.trim() || !defectDescription.trim()) {
      showToast('⚠️ Please enter defect title and description.');
      return;
    }
    setDefectSubmitting(true);
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/maintenance/create-ticket`,
        {
          roomNumber: defectRoomNumber,
          title: defectTitle,
          description: defectDescription,
          category: defectCategory,
          priority: defectPriority,
          blocksRoom: defectBlocksRoom,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`🛠️ Ticket ${res.data.data?.ticketNumber || ''} created! ${defectBlocksRoom ? `Room ${defectRoomNumber} locked to OUT_OF_SERVICE.` : ''}`);
        setReportDefectModalOpen(false);
        setDefectTitle('');
        setDefectDescription('');
        loadMaintenanceTickets();
        loadData();
      }
    } catch (err: any) {
      showToast(`Error creating ticket: ${err.response?.data?.message || err.message}`);
    } finally {
      setDefectSubmitting(false);
    }
  };

  const handleAssignMaintenanceTechnician = async (ticketId: string, technicianName: string) => {
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/maintenance/assign-technician`,
        { ticketId, technicianName },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`🔧 Assigned ${technicianName}! Status updated to IN_PROGRESS.`);
        loadMaintenanceTickets();
      }
    } catch (err: any) {
      showToast(`Error assigning technician: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleOpenPartsModal = (ticket: MaintenanceDeskTicket) => {
    setSelectedMaintTicket(ticket);
    setPartsList(
      ticket.partsUsed && ticket.partsUsed.length > 0
        ? [...ticket.partsUsed]
        : [{ partName: '', cost: 0, quantity: 1 }]
    );
    setResolutionNotesText(ticket.resolutionNotes || '');
    setPartsModalOpen(true);
  };

  const handleSavePartsAndCost = async () => {
    if (!selectedMaintTicket) return;
    setPartsSubmitting(true);
    try {
      const filteredParts = partsList.filter((p) => p.partName.trim().length > 0);
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/maintenance/log-parts`,
        {
          ticketId: selectedMaintTicket.ticketId,
          partsUsed: filteredParts,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`💰 Saved parts for ticket ${selectedMaintTicket.ticketNumber}! Total: ₹${res.data.data?.totalCost || 0}`);
        loadMaintenanceTickets();
      }
    } catch (err: any) {
      showToast(`Error saving parts: ${err.response?.data?.message || err.message}`);
    } finally {
      setPartsSubmitting(false);
    }
  };

  const handleResolveAndReleaseRoom = async (ticketId: string, roomNum: string) => {
    setPartsSubmitting(true);
    try {
      const filteredParts = partsList.filter((p) => p.partName.trim().length > 0);
      if (filteredParts.length > 0) {
        await axios.post(
          `${apiBase}/pms/frontdesk/maintenance/log-parts`,
          { ticketId, partsUsed: filteredParts },
          { headers: authHeaders }
        ).catch(() => null);
      }

      const res = await axios.post(
        `${apiBase}/pms/frontdesk/maintenance/resolve-and-release`,
        {
          ticketId,
          resolutionNotes: resolutionNotesText || 'Repairs completed and certified by Engineering.',
          targetRoomStatus: 'AVAILABLE',
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`🎉 Room ${roomNum || ''} repaired & restored to AVAILABLE! Ticket closed.`);
        setPartsModalOpen(false);
        loadMaintenanceTickets();
        loadData();
      }
    } catch (err: any) {
      showToast(`Error resolving ticket: ${err.response?.data?.message || err.message}`);
    } finally {
      setPartsSubmitting(false);
    }
  };

  // Shift 64: Room Move & Upgrade Handlers
  const handleOpenRoomMoveModal = async (guest: InHouseGuest) => {
    setSelectedMoveGuest(guest);
    setTargetRoomNumber('');
    setMoveReason('UPGRADE');
    setMoveUpgradeFee(0);
    setMoveNotes('');
    setRoomMoveModalOpen(true);
    setLoadingUpgradeRooms(true);

    try {
      const res = await axios.get(`${apiBase}/pms/frontdesk/available-upgrade-rooms`, {
        headers: authHeaders,
        params: { currentRoomNumber: guest.roomNumber },
      });
      if (res.data.success) {
        const rooms = res.data.data || [];
        setAvailableUpgradeRooms(rooms);
        if (rooms.length > 0) {
          setTargetRoomNumber(rooms[0].roomNumber);
          setMoveUpgradeFee(rooms[0].suggestedUpgradeFee || 0);
        }
      }
    } catch (err: any) {
      showToast(`Error fetching available upgrade rooms: ${err.message}`);
    } finally {
      setLoadingUpgradeRooms(false);
    }
  };

  const handleSelectTargetRoom = (roomNum: string) => {
    setTargetRoomNumber(roomNum);
    const matched = availableUpgradeRooms.find((r) => r.roomNumber === roomNum);
    if (matched) {
      setMoveUpgradeFee(matched.suggestedUpgradeFee || 0);
    }
  };

  const handleExecuteRoomMove = async () => {
    if (!selectedMoveGuest || !targetRoomNumber) {
      showToast('⚠️ Please select a destination room.');
      return;
    }
    setSubmittingRoomMove(true);
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/room-move`,
        {
          stayId: selectedMoveGuest.stayId,
          currentRoomNumber: selectedMoveGuest.roomNumber,
          targetRoomNumber,
          reason: moveReason,
          upgradeFee: Number(moveUpgradeFee) || 0,
          notes: moveNotes,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`🔄 Room Move Successful! Guest moved to Room ${targetRoomNumber}. New Key: ${res.data.data?.newKeyCard || ''}`);
        setRoomMoveModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      showToast(`Error executing room move: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmittingRoomMove(false);
    }
  };

  // Shift 65: Late Check-Out Surcharge & Keycard Expiry Handlers
  const handleOpenLateCheckoutModal = async (guest: InHouseGuest) => {
    setSelectedLateGuest(guest);
    setRequestedLateDepartureTime('15:00');
    setWaiveLateFee(false);
    setLateWaiverReason('');
    setLateCheckoutModalOpen(true);
    await fetchLateCheckoutCalculation(guest.stayId, guest.roomNumber, '15:00');
  };

  const fetchLateCheckoutCalculation = async (stayId: string, roomNumber: string, timeStr: string) => {
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/late-checkout/calculate`,
        { stayId, roomNumber, requestedCheckOutTime: timeStr },
        { headers: authHeaders }
      );
      if (res.data.success) {
        setLateCalculation(res.data.data);
      }
    } catch (err: any) {
      console.warn('Error calculating late checkout:', err);
    }
  };

  const handleChangeLateTime = async (timeStr: string) => {
    setRequestedLateDepartureTime(timeStr);
    if (selectedLateGuest) {
      await fetchLateCheckoutCalculation(selectedLateGuest.stayId, selectedLateGuest.roomNumber, timeStr);
    }
  };

  const handleExecuteLateCheckout = async () => {
    if (!selectedLateGuest) return;
    setSubmittingLateCheckout(true);
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/late-checkout/approve`,
        {
          stayId: selectedLateGuest.stayId,
          roomNumber: selectedLateGuest.roomNumber,
          requestedCheckOutTime: requestedLateDepartureTime,
          waiveSurcharge: waiveLateFee,
          waiverReason: lateWaiverReason || 'Managerial VIP waiver',
          forceOverride: true,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`🕒 Late Check-Out Approved for Room ${selectedLateGuest.roomNumber} until ${requestedLateDepartureTime}! Keycard validity extended.`);
        setLateCheckoutModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      showToast(`Error approving late check-out: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmittingLateCheckout(false);
    }
  };

  // Shift 67: Front Desk Manager Rate Override Handlers
  const handleOpenRateOverrideModal = async (guest: InHouseGuest) => {
    setSelectedGuestForOverride(guest);
    setOverrideType('PERCENTAGE_DISCOUNT');
    setOverrideDiscountPercent(15);
    const base = guest.baseRatePerNight || guest.effectiveRatePerNight || 3500;
    setOverrideFixedRate(Math.round(base * 0.85));
    setOverrideReason('SERVICE_RECOVERY');
    setOverrideJustification('AC cooling delay service recovery credit');
    setOverrideManagerPin('9921');
    setRateOverrideModalOpen(true);
    await fetchRateOverrideCalculation(guest.stayId, guest.roomNumber, 'PERCENTAGE_DISCOUNT', 15, Math.round(base * 0.85));
  };

  const fetchRateOverrideCalculation = async (
    stayId: string,
    roomNumber: string,
    type: string,
    percent: number,
    fixedRate: number
  ) => {
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/rate-override/calculate`,
        {
          stayId,
          roomNumber,
          overrideType: type,
          discountPercent: percent,
          newFixedRate: fixedRate,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        setOverrideCalculation(res.data.data);
      }
    } catch (err: any) {
      console.warn('Error calculating rate override:', err);
    }
  };

  const handleChangeOverrideType = async (type: 'PERCENTAGE_DISCOUNT' | 'FIXED_TARIFF' | 'COMPLIMENTARY_WAIVER') => {
    setOverrideType(type);
    if (selectedGuestForOverride) {
      await fetchRateOverrideCalculation(
        selectedGuestForOverride.stayId,
        selectedGuestForOverride.roomNumber,
        type,
        overrideDiscountPercent,
        overrideFixedRate
      );
    }
  };

  const handleChangeDiscountPercent = async (pct: number) => {
    setOverrideDiscountPercent(pct);
    if (selectedGuestForOverride) {
      await fetchRateOverrideCalculation(
        selectedGuestForOverride.stayId,
        selectedGuestForOverride.roomNumber,
        'PERCENTAGE_DISCOUNT',
        pct,
        overrideFixedRate
      );
    }
  };

  const handleChangeFixedRate = async (rate: number) => {
    setOverrideFixedRate(rate);
    if (selectedGuestForOverride) {
      await fetchRateOverrideCalculation(
        selectedGuestForOverride.stayId,
        selectedGuestForOverride.roomNumber,
        'FIXED_TARIFF',
        overrideDiscountPercent,
        rate
      );
    }
  };

  const handleExecuteRateOverride = async () => {
    if (!selectedGuestForOverride) return;
    if (!overrideJustification || overrideJustification.trim().length < 3) {
      showToast('⚠️ Mandatory justification note (min 3 chars) is required');
      return;
    }
    if (overrideCalculation?.pinRequired && !overrideManagerPin) {
      showToast('⚠️ Manager Security PIN is required for this discount tier');
      return;
    }
    setSubmittingOverride(true);
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/rate-override/apply`,
        {
          stayId: selectedGuestForOverride.stayId,
          roomNumber: selectedGuestForOverride.roomNumber,
          overrideType,
          discountPercent: overrideDiscountPercent,
          newFixedRate: overrideFixedRate,
          reason: overrideReason,
          justification: overrideJustification,
          managerPin: overrideManagerPin,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`🏷️ Rate Override Approved for Room ${selectedGuestForOverride.roomNumber}! New Rate: ₹${res.data.data?.effectiveRatePerNight}/night. Folio credit synced.`);
        setRateOverrideModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      showToast(`Error applying rate override: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmittingOverride(false);
    }
  };

  const loadConciergeRequests = async () => {
    try {
      const crRes = await axios.get(`${apiBase}/pms/frontdesk/concierge-requests`, {
        headers: authHeaders,
        params: { hotelId },
      });
      if (crRes.data.success) {
        setConciergeRequests(crRes.data.data || []);
      }
    } catch (e) {}
  };

  const loadTurnaroundQueue = async () => {
    try {
      const res = await axios.get(`${apiBase}/pms/frontdesk/turnaround-queue`, {
        headers: authHeaders,
        params: { hotelId },
      });
      if (res.data.success) {
        setTurnaroundQueue(res.data.data || []);
      }
    } catch (e) {}
  };

  const handleAssignTurnaroundAttendant = async (taskId: string, attendantName: string) => {
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/turnaround/assign-attendant`,
        { taskId, attendantName },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`🧹 Assigned ${attendantName} to Room Turnaround! Status updated to CLEANING.`);
        loadTurnaroundQueue();
        loadData();
      }
    } catch (err: any) {
      showToast(`Error assigning attendant: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleOpenTurnaroundChecklist = (task: TurnaroundQueueItem) => {
    setSelectedTurnaroundTask(task);
    setActiveChecklist(
      task.checklist && task.checklist.length > 0
        ? task.checklist
        : [
            { taskName: 'Strip & replace bed linens, pillow covers and duvet', isDone: false },
            { taskName: 'Scrub & sanitize bathroom, replenish towels and toiletries', isDone: false },
            { taskName: 'Vacuum carpet & disinfect all touch points (remote, switches)', isDone: false },
            { taskName: 'Audit minibar & replenish complimentary water bottles', isDone: false },
            { taskName: 'Inspect electricals, AC thermostat and TV connectivity', isDone: false },
            { taskName: 'Verify RFID keycard reader & seal room with door safety band', isDone: false },
          ]
    );
    setTurnaroundNotes(task.inspectionNotes || '');
    setChecklistModalOpen(true);
  };

  const handleToggleChecklistItem = (index: number) => {
    setActiveChecklist((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, isDone: !item.isDone } : item))
    );
  };

  const handleSubmitChecklist = async () => {
    if (!selectedTurnaroundTask) return;
    setTurnaroundSubmitting(true);
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/turnaround/submit-checklist`,
        {
          taskId: selectedTurnaroundTask.taskId,
          checklist: activeChecklist,
          attendantNotes: turnaroundNotes || 'All turnaround checklist items completed and verified.',
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast('✅ 6-Point Checklist submitted! Room moved to INSPECTION.');
        setChecklistModalOpen(false);
        loadTurnaroundQueue();
        loadData();
      }
    } catch (err: any) {
      showToast(`Error submitting checklist: ${err.response?.data?.message || err.message}`);
    } finally {
      setTurnaroundSubmitting(false);
    }
  };

  const handleApproveAndReleaseRoom = async (taskId: string, roomNum: string) => {
    setTurnaroundSubmitting(true);
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/turnaround/approve-ready`,
        {
          taskId,
          supervisorNotes: 'Executive Housekeeper inspection certified. Instant Ready.',
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`🎉 Room ${roomNum} verified & released to AVAILABLE (Instant Ready) in ${res.data.data?.turnaroundMinutes || 12} min!`);
        setChecklistModalOpen(false);
        loadTurnaroundQueue();
        loadData();
      }
    } catch (err: any) {
      showToast(`Error releasing room: ${err.response?.data?.message || err.message}`);
    } finally {
      setTurnaroundSubmitting(false);
    }
  };

  const handleRejectTurnaroundReclean = async (taskId: string, roomNum: string) => {
    try {
      const res = await axios.post(
        `${apiBase}/pms/frontdesk/turnaround/reject-reclean`,
        {
          taskId,
          rejectionReason: 'Supervisor found quality deficiency. Re-clean required.',
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`⚠️ Room ${roomNum} rejected. Reverted to DIRTY for re-cleaning.`);
        setChecklistModalOpen(false);
        loadTurnaroundQueue();
        loadData();
      }
    } catch (err: any) {
      showToast(`Error rejecting: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleAssignStaff = async (requestId: string, staffName: string) => {
    try {
      const res = await axios.patch(
        `${apiBase}/pms/frontdesk/concierge-request/${requestId}/status`,
        {
          status: 'ASSIGNED',
          assignedStaffName: staffName,
          notes: `${staffName} assigned to service task`,
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(`👤 Assigned ${staffName} to task! Status updated to ASSIGNED.`);
        loadConciergeRequests();
      }
    } catch (err: any) {
      showToast(`Error assigning staff: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleUpdateConciergeStatus = async (requestId: string, status: string) => {
    try {
      const res = await axios.patch(
        `${apiBase}/pms/frontdesk/concierge-request/${requestId}/status`,
        {
          status,
          notes: status === 'COMPLETED' ? 'Task fulfilled and delivered to guest room' : 'Task in progress',
        },
        { headers: authHeaders }
      );
      if (res.data.success) {
        showToast(
          status === 'COMPLETED'
            ? '✅ Service request marked FULFILLED & COMPLETED!'
            : `🚀 Service request status updated to ${status}!`
        );
        loadConciergeRequests();
      }
    } catch (err: any) {
      showToast(`Error updating status: ${err.response?.data?.message || err.message}`);
    }
  };

  const loadActiveInHouseStays = async () => {
    try {
      const inHouseRes = await axios.get(`${apiBase}/pms/frontdesk/active-stays`, {
        headers: authHeaders,
        params: { hotelId },
      });
      if (inHouseRes.data.success) {
        setInHouseGuests(inHouseRes.data.data || []);
      }
    } catch (e) {}
  };

  const handleOpenSettleModal = async (guest: InHouseGuest) => {
    setSettleModalGuest(guest);
    setSettlePaymentMode(guest.preferredPaymentMethod || 'UPI');
    setSettleTransactionRef(`UPI-${Date.now().toString().slice(-6)}`);
    setSettleKeycardVoid(true);
    setSettleSuccessVoucher(null);
    setSettleLoadingPreview(true);

    try {
      const res = await axios.get(`${apiBase}/pms/frontdesk/checkout-preview/${guest.roomNumber}`, {
        headers: authHeaders,
        params: { hotelId },
      });
      if (res.data.success) {
        setSettlePreviewData(res.data.data);
      }
    } catch (err: any) {
      showToast(`Error loading checkout preview: ${err.response?.data?.message || err.message}`);
    } finally {
      setSettleLoadingPreview(false);
    }
  };

  const handleConfirmSettleAndCheckOut = async () => {
    if (!settleModalGuest) return;
    setSettleSubmitting(true);
    try {
      const payload = {
        hotelId,
        roomNumber: settleModalGuest.roomNumber,
        stayId: settleModalGuest.stayId,
        paymentMode: settlePaymentMode,
        amount: settlePreviewData?.folio?.dueAmount ?? settleModalGuest.balanceDue ?? 0,
        transactionRef: settleTransactionRef || `TXN-${Date.now().toString().slice(-6)}`,
        keyCardVoided: settleKeycardVoid,
        notes: `Front Desk Departure Settled via ${settlePaymentMode}`,
      };

      const res = await axios.post(`${apiBase}/pms/frontdesk/settle-and-checkout`, payload, {
        headers: authHeaders,
      });

      if (res.data.success) {
        setSettleSuccessVoucher(res.data.data);
        showToast(`✅ Room ${settleModalGuest.roomNumber} settled and checked out! Tax Invoice generated.`);
        loadData();
      }
    } catch (err: any) {
      showToast(`Settlement error: ${err.response?.data?.message || err.message}`);
    } finally {
      setSettleSubmitting(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadConciergeRequests();
      loadActiveInHouseStays();
      loadTurnaroundQueue();
      loadMaintenanceTickets();
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 1-Click Load Online Pre-Booking into Terminal
  const handleLoadPreBookingForCheckIn = (bkg: ExpectedArrival) => {
    setLoadedBooking(bkg);
    setGuestName(bkg.guestName);
    setGuestPhone(bkg.guestPhone);
    setGuestEmail(bkg.guestEmail);
    const guessCouple = bkg.guestName.includes('&') || bkg.guestName.toLowerCase().includes('and') || bkg.guestCountAdults > 1;
    setIsCouple(guessCouple);
    setAdvancePaid(0);
    setReceptionistNotes(`Online pre-booking ${bkg.bookingNumber} arrival. Online advance credited: ₹${bkg.advancePaymentAmount}`);
    setActiveTab('CHECKIN');
    showToast(`✅ Pre-Booking ${bkg.bookingNumber} loaded! Online advance of ₹${bkg.advancePaymentAmount} credited.`);
  };

  const handleSearchHistory = async () => {
    if (!searchHistoryQuery.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/pms/frontdesk/guest-history`, {
        headers: authHeaders,
        params: { hotelId, query: searchHistoryQuery.trim() },
      });
      if (res.data.success) {
        setGuestHistoryList(res.data.data || []);
      }
    } catch (err: any) {
      showToast(`History search: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone) {
      showToast('⚠️ Please enter Guest Name and Phone Number');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        hotelId,
        bookingId: loadedBooking?.bookingId,
        roomId: selectedRoomId || availableRooms[0]?.id || availableRooms[0]?._id,
        guestName,
        guestPhone,
        guestEmail,
        isCouple,
        skipDocuments: !isCouple,
        idType: 'AADHAAR',
        idNumber: isCouple ? idNumber : undefined,
        verifiedByReceptionist: isCouple ? verifiedByReceptionist : false,
        receptionistNotes: isCouple
          ? (receptionistNotes || 'Couple Aadhaar verified by Front Desk Receptionist')
          : (receptionistNotes || 'Direct 1-Click Check-In (No documents required)'),
        advancePaid: Number(advancePaid) || 0,
      };

      const res = await axios.post(`${apiBase}/pms/frontdesk/quick-checkin`, payload, {
        headers: authHeaders,
      });

      if (res.data.success) {
        showToast(`✅ Room ${res.data.data?.room?.roomNumber} checked in for ${guestName}! Keycard issued.`);
        // Reset form
        setLoadedBooking(null);
        setGuestName('');
        setGuestPhone('');
        setGuestEmail('');
        setIsCouple(false);
        setIdNumber('');
        setReceptionistNotes('');
        setAdvancePaid(0);
        loadData();
      }
    } catch (err: any) {
      console.error('Check-in error:', err);
      showToast(`❌ Check-in failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const coupleCount = inHouseGuests.filter((g) => g.isCouple).length;

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100 flex flex-col font-sans p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-amber-300">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Metrics Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl text-xl">
              🛎️
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Front Desk Reception & Pre-Booking Arrival Bridge
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                  Shift 58 • In-Room Portal Binding
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Online Pre-Booking Queue • 1-Click Key Allotment • In-Room Portal (:3004) Live Stay & Folio Hydration
              </p>
            </div>
          </div>
        </div>

        {/* 5 Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div
            data-testid="metric-expected-arrivals"
            className="bg-zinc-950/70 border border-amber-500/40 p-3 rounded-2xl text-center cursor-pointer hover:border-amber-400 transition"
            onClick={() => setActiveTab('ARRIVALS')}
          >
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Expected Arrivals</span>
            <div className="text-xl font-black text-amber-300 mt-0.5">{expectedArrivals.length}</div>
          </div>
          <div
            data-testid="metric-inhouse-stays"
            className="bg-zinc-950/70 border border-zinc-800 p-3 rounded-2xl text-center cursor-pointer hover:border-zinc-700 transition"
            onClick={() => setActiveTab('IN_HOUSE')}
          >
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">In-House Stays</span>
            <div className="text-xl font-black text-white mt-0.5">{inHouseGuests.length}</div>
          </div>
          <div className="bg-zinc-950/70 border border-emerald-500/30 p-3 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Couple Stays</span>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{coupleCount}</div>
          </div>
          <div className="bg-zinc-950/70 border border-cyan-500/30 p-3 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Available Rooms</span>
            <div className="text-xl font-black text-cyan-400 mt-0.5">{availableRooms.length}</div>
          </div>
          <div
            data-testid="metric-concierge-tasks"
            className="bg-zinc-950/70 border border-purple-500/40 p-3 rounded-2xl text-center cursor-pointer hover:border-purple-400 transition"
            onClick={() => setActiveTab('CONCIERGE')}
          >
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Concierge Tasks</span>
            <div className="text-xl font-black text-purple-300 mt-0.5">
              {conciergeRequests.filter((r) => r.status !== 'COMPLETED').length}
            </div>
          </div>
          <div
            data-testid="metric-turnaround-queue"
            className="bg-zinc-950/70 border border-teal-500/40 p-3 rounded-2xl text-center cursor-pointer hover:border-teal-400 transition"
            onClick={() => setActiveTab('TURNAROUND')}
          >
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Turnaround Queue</span>
            <div className="text-xl font-black text-teal-300 mt-0.5">
              {turnaroundQueue.filter((t) => t.status !== 'INSPECTED_PASSED').length}
            </div>
          </div>
          <div
            data-testid="metric-maintenance-tickets"
            className="bg-zinc-950/70 border border-red-500/40 p-3 rounded-2xl text-center cursor-pointer hover:border-red-400 transition"
            onClick={() => setActiveTab('MAINTENANCE')}
          >
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Out-Of-Service (OOS)</span>
            <div className="text-xl font-black text-red-400 mt-0.5">
              {maintenanceTickets.filter((t) => t.status !== 'CLOSED').length}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-0 overflow-x-auto">
        <button
          type="button"
          data-testid="tab-checkin"
          onClick={() => setActiveTab('CHECKIN')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'CHECKIN'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🛎️</span> Quick Check-In Terminal
        </button>
        <button
          type="button"
          data-testid="tab-arrivals"
          onClick={() => setActiveTab('ARRIVALS')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ARRIVALS'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🌐</span> Online Pre-Bookings & Expected Arrivals ({expectedArrivals.length})
        </button>
        <button
          type="button"
          data-testid="tab-in-house"
          onClick={() => setActiveTab('IN_HOUSE')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'IN_HOUSE'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>👥</span> In-House Staying Guests ({inHouseGuests.length})
        </button>
        <button
          type="button"
          data-testid="tab-history"
          onClick={() => setActiveTab('HISTORY')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'HISTORY'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>📜</span> Guest Stay History & Ledger
        </button>
        <button
          type="button"
          data-testid="tab-concierge"
          onClick={() => setActiveTab('CONCIERGE')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'CONCIERGE'
              ? 'border-purple-400 text-purple-400 bg-purple-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🛎️</span> In-Room Concierge & Housekeeping Desk ({conciergeRequests.filter((r) => r.status !== 'COMPLETED').length})
        </button>
        <button
          type="button"
          data-testid="tab-turnaround"
          onClick={() => setActiveTab('TURNAROUND')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'TURNAROUND'
              ? 'border-teal-400 text-teal-400 bg-teal-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🧹</span> Housekeeping Turnaround Desk ({turnaroundQueue.filter((t) => t.status !== 'INSPECTED_PASSED').length})
        </button>
        <button
          type="button"
          data-testid="tab-maintenance"
          onClick={() => setActiveTab('MAINTENANCE')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'MAINTENANCE'
              ? 'border-red-400 text-red-400 bg-red-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🛠️</span> Room Maintenance & OOS Desk ({maintenanceTickets.filter((t) => t.status !== 'CLOSED').length})
        </button>
        <button
          type="button"
          data-testid="tab-cashier"
          onClick={() => {
            setActiveTab('CASHIER');
            loadCashierShiftData();
          }}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'CASHIER'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>💼</span> Cashier Drawer & Shift Handover
        </button>
      </div>

      {/* Main Tab Workspace */}
      <main className="flex-1">
        {/* TAB 1: QUICK CHECK-IN TERMINAL */}
        {activeTab === 'CHECKIN' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white">Guest Arrival & Room Key Allocation</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    1-Click fast check-in for solo/walk-in guests or online pre-booking arrival check-in with advance credit.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  RECEPTIONIST DESK
                </span>
              </div>

              {/* Banner when Online Pre-Booking is Loaded */}
              {loadedBooking && (
                <div
                  data-testid="prebooking-loaded-banner"
                  className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl font-mono font-black text-xs border border-amber-500/30">
                      {loadedBooking.bookingNumber}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span>⚡ Online Pre-Booking Arrival Active</span>
                      </h4>
                      <p className="text-[11px] text-zinc-300 mt-0.5">
                        Reserved Type: <strong className="text-white">{loadedBooking.roomTypeName}</strong> • Grand Total: ₹{loadedBooking.grandTotal}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ₹{loadedBooking.advancePaymentAmount} Paid Online (Advance Credited)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLoadedBooking(null);
                        setGuestName('');
                        setGuestPhone('');
                        setGuestEmail('');
                        setReceptionistNotes('');
                      }}
                      className="text-zinc-500 hover:text-zinc-300 text-xs font-bold"
                    >
                      Clear ✕
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleExecuteCheckIn} className="space-y-5">
                {/* Room Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Select Physical Room To Allot *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {availableRooms.slice(0, 8).map((rm) => (
                      <button
                        key={rm.id || rm._id || rm.roomNumber}
                        type="button"
                        data-testid={`room-select-${rm.roomNumber}`}
                        onClick={() => setSelectedRoomId(rm.id || rm._id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          (selectedRoomId === rm.id || selectedRoomId === rm._id)
                            ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-sm font-black text-white">Room {rm.roomNumber}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          Floor {rm.floorNumber || rm.floor || 1} • ₹{rm.basePrice || 3900}/night
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guest Basic Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Guest Name *
                    </label>
                    <input
                      type="text"
                      required
                      data-testid="input-guest-name"
                      placeholder="e.g. Vikramaditya & Ananya Singhania"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      data-testid="input-guest-phone"
                      placeholder="e.g. 9821098765"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    data-testid="input-guest-email"
                    placeholder="e.g. guest@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* COUPLE VERIFICATION TOGGLE */}
                <div className="bg-zinc-950/80 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="coupleToggle"
                        data-testid="toggle-couple"
                        checked={isCouple}
                        onChange={(e) => setIsCouple(e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-700 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-zinc-900 cursor-pointer"
                      />
                      <label htmlFor="coupleToggle" className="cursor-pointer">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          Couple Check-In (Aadhaar Verification)
                          {isCouple && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              KYC REQUIRED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">
                          {isCouple
                            ? 'Aadhaar Card physically verified by reception for couple compliance.'
                            : 'Unchecked: 1-Click Fast Check-In (No documents required by hotel policy).'}
                        </p>
                      </label>
                    </div>

                    {!isCouple && (
                      <span className="px-3 py-1 rounded-xl text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        ⚡ 1-Click Direct Mode
                      </span>
                    )}
                  </div>

                  {/* Dynamic Couple KYC Fields (Only when isCouple is TRUE) */}
                  {isCouple && (
                    <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                          Aadhaar Number (Last 4 Digits or Full) *
                        </label>
                        <input
                          type="text"
                          required
                          data-testid="input-aadhaar"
                          placeholder="e.g. 8842 or 9821 4412 8842"
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          className="w-full bg-zinc-900 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-400 font-mono"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">
                          Automatically saved as masked format: <strong className="text-zinc-300">XXXX-XXXX-8842</strong>
                        </p>
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2.5 bg-zinc-900/90 border border-emerald-500/30 p-2.5 rounded-xl cursor-pointer">
                          <input
                            type="checkbox"
                            data-testid="checkbox-reception-verified"
                            checked={verifiedByReceptionist}
                            onChange={(e) => setVerifiedByReceptionist(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-500 bg-zinc-800 border-zinc-700"
                          />
                          <span className="text-xs font-bold text-emerald-300">
                            Physical Aadhaar Verified at Reception
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advance Paid & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Additional Advance Paid at Reception (₹)
                    </label>
                    <input
                      type="number"
                      data-testid="input-advance-paid"
                      placeholder="0"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    {loadedBooking && (
                      <p className="text-[10px] text-emerald-400 font-mono mt-1">
                        + Online Advance ₹{loadedBooking.advancePaymentAmount} already credited to Master Folio
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Front Desk Notes / Requests
                    </label>
                    <input
                      type="text"
                      data-testid="input-reception-notes"
                      placeholder="e.g. VIP couple, extra bath sheets requested"
                      value={receptionistNotes}
                      onChange={(e) => setReceptionistNotes(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  data-testid="btn-submit-checkin"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>🛎️</span>
                  <span>{loading ? 'Allocating Key...' : 'Complete Check-In & Issue Keycard'}</span>
                </button>
              </form>
            </div>

            {/* Side Information Panel */}
            <div className="space-y-6">
              <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                  Hotel Policy Guidelines
                </h3>
                <div className="space-y-3 text-xs text-zinc-300">
                  <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl">
                    <strong className="text-white block mb-0.5">⚡ 1-Click Fast Mode</strong>
                    Single, corporate ya known guests ke liye document upload mandatory nahi hai. Receptionist direct check-in kar sakta hai.
                  </div>
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-300">
                    <strong className="text-white block mb-0.5">👫 Couple Policy (Aadhaar Only)</strong>
                    Couple check-in ke waqt toggle ON karein aur Aadhaar number enter karein. System use securely mask karke store karega.
                  </div>
                  <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-amber-300">
                    <strong className="text-white block mb-0.5">📱 In-Room Portal Binding (:3004)</strong>
                    Check-in hote hi physical room live ho jata hai. Guest room ke QR ko scan karke ya `?room=102` par visit karke Wi-Fi aur Master Folio dekh sakta hai.
                  </div>
                </div>
              </div>

              {/* Quick Summary of in-house guests */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Live Rooms Overview
                </h3>
                <div className="space-y-2">
                  {inHouseGuests.slice(0, 3).map((g) => (
                    <div key={g.stayId} className="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800/60 text-xs">
                      <div>
                        <span className="font-bold text-white">Room {g.roomNumber}</span>
                        <span className="text-zinc-500 block text-[10px]">{g.guestName}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        g.isCouple ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {g.isCouple ? 'Couple Verified' : 'Direct'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPECTED ARRIVALS / ONLINE PRE-BOOKINGS */}
        {activeTab === 'ARRIVALS' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-3xl flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Expected Online Arrivals Today</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Guests who booked in advance via public website or OTA. Click Check-In to load details and allot room.
                </p>
              </div>
              <button
                type="button"
                data-testid="btn-refresh-arrivals"
                onClick={loadData}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-all"
              >
                🔄 Refresh Arrivals
              </button>
            </div>

            {expectedArrivals.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800 p-12 text-center rounded-3xl text-zinc-500 text-xs">
                No expected online pre-bookings waiting for arrival today.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expectedArrivals.map((arr) => (
                  <div
                    key={arr.bookingId}
                    data-testid={`arrival-card-${arr.bookingNumber}`}
                    className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-3xl space-y-4 hover:border-amber-500/40 transition-all shadow-xl flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              {arr.bookingNumber}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400">
                              {arr.bookingSource}
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold text-white mt-1.5">{arr.guestName}</h3>
                          <p className="text-xs text-zinc-400 font-mono">{arr.guestPhone}</p>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ₹{arr.advancePaymentAmount} Paid (Adv)
                        </span>
                      </div>

                      <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800/80 space-y-1.5 text-xs">
                        <div className="flex justify-between text-zinc-400">
                          <span>Reserved Type:</span>
                          <strong className="text-zinc-200 font-medium">{arr.roomTypeName}</strong>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Total Tariff:</span>
                          <strong className="text-zinc-200 font-mono">₹{arr.grandTotal}</strong>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Online Advance:</span>
                          <strong className="text-emerald-400 font-mono font-bold">₹{arr.advancePaymentAmount}</strong>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Balance Due at Check-In:</span>
                          <strong className="text-amber-400 font-mono font-bold">
                            ₹{Math.max(0, arr.grandTotal - arr.advancePaymentAmount)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`btn-checkin-arrival-${arr.bookingNumber}`}
                      onClick={() => handleLoadPreBookingForCheckIn(arr)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 transition flex items-center justify-center gap-1.5"
                    >
                      <span>⚡</span>
                      <span>Check-In This Guest</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IN-HOUSE STAYING GUESTS DIRECTORY */}
        {activeTab === 'IN_HOUSE' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-3xl flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Currently In-House Staying Guests</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Live guest register with room numbers, verification tags, balance due, and stay timestamps.
                </p>
              </div>
              <button
                type="button"
                data-testid="btn-refresh-inhouse"
                onClick={loadData}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-all"
              >
                🔄 Refresh Directory
              </button>
            </div>

            {inHouseGuests.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800 p-12 text-center rounded-3xl text-zinc-500 text-xs">
                No active in-house guests currently. Use the Quick Check-In Terminal to check in guests.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inHouseGuests.map((guest) => (
                  <div
                    key={guest.stayId}
                    data-testid={`inhouse-guest-card-${guest.roomNumber}`}
                    className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-3xl space-y-4 hover:border-zinc-700 transition-all shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-white">Room {guest.roomNumber}</span>
                          <span className="text-[10px] font-mono font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                            Floor {guest.floor}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-amber-400 mt-1">{guest.guestName}</h3>
                        <p className="text-xs text-zinc-400 font-mono">{guest.phone}</p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                        guest.isCouple
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      }`}>
                        {guest.isCouple ? '👫 Couple Verified' : '⚡ Direct Check-In'}
                      </span>
                    </div>

                    <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800/80 space-y-1 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span>ID Document:</span>
                        <strong className="text-zinc-200 font-mono">{guest.idNumberMasked}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Folio Ref:</span>
                        <strong className="text-zinc-200 font-mono">{guest.folioNumber}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Advance Paid:</span>
                        <strong className="text-emerald-400 font-mono">₹{guest.advancePaid}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Balance Due:</span>
                        <strong className="text-amber-400 font-mono">₹{guest.balanceDue}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Lifetime Visits:</span>
                        <strong className="text-emerald-400 font-bold">{guest.totalVisits} visit(s)</strong>
                      </div>
                    </div>

                    {guest.receptionistNotes && (
                      <div className="text-[11px] text-zinc-400 italic bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900">
                        "{guest.receptionistNotes}"
                      </div>
                    )}

                    {guest.checkoutRequested && (
                      <div
                        data-testid={`badge-checkout-requested-${guest.roomNumber}`}
                        className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/50 space-y-1.5 animate-pulse"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                            <span>🚨</span> EXPRESS DEPARTURE REQUESTED
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-amber-400 text-zinc-950 px-2 py-0.5 rounded-full uppercase">
                            {guest.preferredPaymentMethod || 'UPI'}
                          </span>
                        </div>
                        {guest.feedbackRating && (
                          <div className="text-[11px] text-amber-200/90 flex items-center gap-1">
                            <span>Rating:</span>
                            <span className="font-bold text-yellow-300">{'★'.repeat(guest.feedbackRating)}{'☆'.repeat(5 - guest.feedbackRating)}</span>
                            <span className="text-zinc-400 text-[10px]">({guest.feedbackRating}/5)</span>
                          </div>
                        )}
                        {guest.checkoutNotes && (
                          <div className="text-[11px] text-zinc-300 italic">
                            "{guest.checkoutNotes}"
                          </div>
                        )}
                      </div>
                    )}

                    {guest.lateCheckOutRecord && (
                      <div
                        data-testid={`badge-late-checkout-${guest.roomNumber}`}
                        className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/40 text-purple-200 text-xs flex items-center justify-between shadow-lg"
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>🕒</span>
                          <span>Late Departure: {new Date(guest.lateCheckOutRecord.requestedCheckOutTime || guest.expectedCheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                          {guest.lateCheckOutRecord.waived ? 'COMPLIMENTARY' : `+₹${guest.lateCheckOutRecord.totalCharge}`}
                        </span>
                      </div>
                    )}

                    {guest.activeRateOverride && (
                      <div
                        data-testid={`badge-rate-override-${guest.roomNumber}`}
                        className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between shadow-lg"
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>🏷️</span>
                          <span>
                            {guest.activeRateOverride.overrideType === 'COMPLIMENTARY_WAIVER'
                              ? '100% Complimentary Waiver'
                              : `Override: ₹${guest.activeRateOverride.newRate}/nt`}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                          {guest.activeRateOverride.overrideType === 'PERCENTAGE_DISCOUNT'
                            ? `-${guest.activeRateOverride.discountPercent}% OFF`
                            : guest.activeRateOverride.approvalTier}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        data-testid={`btn-rate-override-${guest.roomNumber}`}
                        onClick={() => handleOpenRateOverrideModal(guest)}
                        className="py-2.5 rounded-xl font-bold text-[11px] bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700/80 transition flex items-center justify-center gap-1 hover:border-amber-500/50"
                      >
                        <span>🏷️</span>
                        <span>Override</span>
                      </button>
                      <button
                        type="button"
                        data-testid={`btn-late-checkout-${guest.roomNumber}`}
                        onClick={() => handleOpenLateCheckoutModal(guest)}
                        className="py-2.5 rounded-xl font-bold text-[11px] bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-zinc-700/80 transition flex items-center justify-center gap-1 hover:border-purple-500/50"
                      >
                        <span>🕒</span>
                        <span>Late Out</span>
                      </button>
                      <button
                        type="button"
                        data-testid={`btn-room-move-${guest.roomNumber}`}
                        onClick={() => handleOpenRoomMoveModal(guest)}
                        className="py-2.5 rounded-xl font-bold text-[11px] bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700/80 transition flex items-center justify-center gap-1 hover:border-cyan-500/50"
                      >
                        <span>🔄</span>
                        <span>Move</span>
                      </button>
                      <button
                        type="button"
                        data-testid={`btn-settle-checkout-${guest.roomNumber}`}
                        onClick={() => handleOpenSettleModal(guest)}
                        className={`py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-1 ${
                          guest.checkoutRequested
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-amber-500/30 ring-2 ring-amber-400/50'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                        }`}
                      >
                        <span>{guest.checkoutRequested ? '⚡' : '✨'}</span>
                        <span>{guest.checkoutRequested ? 'Settle' : 'Out'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: GUEST STAY HISTORY & LIFETIME LEDGER */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-4">
              <div>
                <h2 className="text-base font-black text-white">Search Guest Lifetime Stay History</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Type phone number or guest name to inspect previous visits, rooms stayed, and lifetime spend.
                </p>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  data-testid="input-search-history"
                  placeholder="Enter phone number (e.g. 9821098765) or guest name..."
                  value={searchHistoryQuery}
                  onChange={(e) => setSearchHistoryQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchHistory()}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  data-testid="btn-search-history"
                  onClick={handleSearchHistory}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  {loading ? 'Searching...' : 'Search History 🔍'}
                </button>
              </div>
            </div>

            {guestHistoryList.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800 p-12 text-center rounded-3xl text-zinc-500 text-xs">
                Search by phone number or name above to view historical guest records.
              </div>
            ) : (
              <div className="space-y-6">
                {guestHistoryList.map((gp) => (
                  <div key={gp.guestId} className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-6">
                    {/* Guest Summary Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black text-white">{gp.name}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {gp.vipTier}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">{gp.phone} • {gp.email || 'No email'}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Stays</span>
                          <span className="text-lg font-black text-emerald-400">{gp.totalVisits} Visits</span>
                        </div>
                        <div className="text-right border-l border-zinc-800 pl-4">
                          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Lifetime Spend</span>
                          <span className="text-lg font-black text-amber-400">₹{gp.totalLifetimeSpend}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline of Past Stays */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Past Stays Timeline ({gp.pastStays.length})
                      </h4>
                      <div className="space-y-2">
                        {gp.pastStays.map((st, idx) => (
                          <div
                            key={st.stayId || idx}
                            className="bg-zinc-950/70 border border-zinc-800/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-4">
                              <span className="p-2 bg-zinc-900 text-zinc-300 rounded-xl text-xs font-mono font-bold">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-white text-sm">Room {st.roomNumber}</span>
                                <div className="text-[11px] text-zinc-400 mt-0.5">
                                  Checked in: {new Date(st.checkIn).toLocaleDateString('en-GB')}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border ${
                                st.isCouple
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              }`}>
                                {st.isCouple ? `Couple (${st.idNumberMasked})` : 'Direct Check-In'}
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                st.stayStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {st.stayStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: IN-ROOM CONCIERGE & HOUSEKEEPING DESK (Shift 60) */}
        {activeTab === 'CONCIERGE' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛎️</span>
                  <h2 className="text-lg font-black text-white">Digital Concierge & Housekeeping Dispatch Desk</h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Real-time room service and housekeeping requests dispatched from In-Room Guest Portal (:3004). Assign staff attendants and monitor resolution SLAs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="refresh-concierge-btn"
                  onClick={loadConciergeRequests}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <span>🔄</span> Refresh Desk
                </button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-zinc-900/80 border border-purple-500/30 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Active In-Flight</span>
                <div className="text-2xl font-black text-purple-300 mt-1">
                  {conciergeRequests.filter((r) => r.status !== 'COMPLETED').length}
                </div>
              </div>
              <div className="bg-zinc-900/80 border border-amber-500/30 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Billable / Laundry</span>
                <div className="text-2xl font-black text-amber-300 mt-1">
                  {conciergeRequests.filter((r) => r.isBillable).length}
                </div>
              </div>
              <div className="bg-zinc-900/80 border border-blue-500/30 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Assigned Staff</span>
                <div className="text-2xl font-black text-blue-300 mt-1">
                  {conciergeRequests.filter((r) => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS').length}
                </div>
              </div>
              <div className="bg-zinc-900/80 border border-emerald-500/30 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Fulfilled Today</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {conciergeRequests.filter((r) => r.status === 'COMPLETED').length}
                </div>
              </div>
            </div>

            {/* Requests Cards List */}
            {conciergeRequests.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-12 rounded-3xl text-center">
                <span className="text-4xl block mb-3">🛎️</span>
                <h3 className="text-sm font-bold text-zinc-300">No Concierge or Housekeeping Requests Active</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  When guests submit towel replenishment, room cleaning, or laundry requests via the room portal (:3004), they will appear here live.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {conciergeRequests.map((req) => (
                  <div
                    key={req.id}
                    data-testid={`concierge-card-${req.roomNumber}`}
                    className="bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/40 p-5 rounded-3xl transition flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                  >
                    {/* Left: Room & Request Information */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black font-mono">
                          ROOM {req.roomNumber}
                        </span>
                        <span className="text-sm font-black text-white">{req.guestName}</span>
                        <span className="text-xs text-zinc-500">• Fl {req.floor}</span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            req.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : req.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          }`}
                        >
                          {req.priority} Priority
                        </span>

                        {req.isBillable && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            💰 ₹{req.billableAmount} + 5% GST (Posted to Master Folio)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {req.requestType === 'TOWEL_REPLENISH'
                            ? '🧴'
                            : req.requestType === 'LAUNDRY'
                            ? '🧺'
                            : req.requestType === 'ROOM_CLEANING'
                            ? '🧹'
                            : req.requestType === 'TOILETRIES'
                            ? '🪥'
                            : req.requestType === 'LUGGAGE_ASSIST'
                            ? '🧳'
                            : '🛎️'}
                        </span>
                        <span className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                          {req.requestType.replace('_', ' ')}
                        </span>
                        {req.notes && (
                          <span className="text-xs text-zinc-300 italic font-medium ml-2">
                            "{req.notes}"
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                        <span>Requested: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>• SLA Target: {req.slaMinutes}m</span>
                        {req.assignedStaffName && req.assignedStaffName !== 'Unassigned' && (
                          <span className="text-purple-300 font-bold">
                            • Assigned Attendant: {req.assignedStaffName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Status Pill & Interactive Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <span
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase text-center border ${
                          req.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : req.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                            : req.status === 'ASSIGNED'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {req.status === 'COMPLETED'
                          ? '✅ Fulfilled'
                          : req.status === 'IN_PROGRESS'
                          ? '🚀 On The Way'
                          : req.status === 'ASSIGNED'
                          ? '👤 Staff Assigned'
                          : '⏳ Pending Dispatch'}
                      </span>

                      {req.status !== 'COMPLETED' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {req.status === 'CREATED' && (
                            <>
                              <button
                                type="button"
                                data-testid={`assign-sunita-${req.roomNumber}`}
                                onClick={() => handleAssignStaff(req.id, 'Sunita Sharma (Housekeeping)')}
                                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition"
                              >
                                👤 Assign Sunita
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAssignStaff(req.id, 'Ramesh Kumar (Captain)')}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition"
                              >
                                👤 Assign Ramesh
                              </button>
                            </>
                          )}

                          {req.status === 'ASSIGNED' && (
                            <button
                              type="button"
                              data-testid={`inprogress-btn-${req.roomNumber}`}
                              onClick={() => handleUpdateConciergeStatus(req.id, 'IN_PROGRESS')}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                            >
                              🚀 Mark In-Progress
                            </button>
                          )}

                          <button
                            type="button"
                            data-testid={`fulfill-btn-${req.roomNumber}`}
                            onClick={() => handleUpdateConciergeStatus(req.id, 'COMPLETED')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition"
                          >
                            ✅ Fulfill & Deliver
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: HOUSEKEEPING TURNAROUND & INSTANT READY PIPELINE (Shift 62) */}
        {activeTab === 'TURNAROUND' && (
          <div className="space-y-6" data-testid="turnaround-desk-workspace">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">Housekeeping Turnaround & Instant Ready Pipeline</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    30-MIN SLA ENGINE
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Manage vacated dirty rooms, dispatch attendants, verify 6-point room hygiene inspections, and execute 1-tap supervisor certification for instant ready guest release.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-refresh-turnaround"
                  onClick={loadTurnaroundQueue}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition flex items-center gap-1.5"
                >
                  <span>🔄</span> Refresh Queue
                </button>
              </div>
            </div>

            {/* Turnaround Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Queue Total</span>
                <div className="text-xl font-black text-white mt-0.5">{turnaroundQueue.length}</div>
              </div>
              <div className="bg-zinc-900/60 border border-orange-500/30 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Dirty / Pending</span>
                <div className="text-xl font-black text-orange-400 mt-0.5">
                  {turnaroundQueue.filter((t) => t.status === 'PENDING').length}
                </div>
              </div>
              <div className="bg-zinc-900/60 border border-blue-500/30 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">In Cleaning</span>
                <div className="text-xl font-black text-blue-400 mt-0.5">
                  {turnaroundQueue.filter((t) => t.status === 'IN_PROGRESS').length}
                </div>
              </div>
              <div className="bg-zinc-900/60 border border-emerald-500/30 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Passed / Released</span>
                <div className="text-xl font-black text-emerald-400 mt-0.5">
                  {turnaroundQueue.filter((t) => t.status === 'INSPECTED_PASSED').length}
                </div>
              </div>
            </div>

            {/* Room Queue List */}
            {turnaroundQueue.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
                <div className="text-4xl">✨</div>
                <h3 className="text-base font-bold text-zinc-300">No Rooms in Turnaround Queue</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  All guest rooms are currently clean, certified, or occupied. When a guest departs or settles their folio, the room will automatically appear here with a 30-minute turnaround SLA timer.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="turnaround-room-grid">
                {turnaroundQueue.map((item) => {
                  const isBreached = item.isSlaBreached;
                  const isPassed = item.status === 'INSPECTED_PASSED';
                  const isInspection = item.status === 'COMPLETED';
                  const isCleaning = item.status === 'IN_PROGRESS';
                  const isPending = item.status === 'PENDING';

                  return (
                    <div
                      key={item.taskId}
                      data-testid={`turnaround-card-${item.room?.roomNumber || item.taskId}`}
                      className={`bg-zinc-900/90 border rounded-3xl p-5 space-y-4 transition shadow-lg relative overflow-hidden flex flex-col justify-between ${
                        isPassed
                          ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-zinc-900/90'
                          : isBreached
                          ? 'border-red-500/50 bg-gradient-to-b from-red-950/20 to-zinc-900/90'
                          : isCleaning
                          ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/15 to-zinc-900/90'
                          : isInspection
                          ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-950/15 to-zinc-900/90'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Top bar: Room & Status */}
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-black text-white">Room {item.room?.roomNumber || 'N/A'}</span>
                              <span className="text-xs font-mono text-zinc-400">Floor {item.room?.floor ?? 1}</span>
                            </div>
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mt-0.5">
                              {item.priority} Priority Turnaround
                            </span>
                          </div>

                          <div className="text-right">
                            {isPassed ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                                INSTANT READY
                              </span>
                            ) : isInspection ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 uppercase">
                                INSPECTION
                              </span>
                            ) : isCleaning ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">
                                CLEANING
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-orange-500/20 text-orange-400 border border-orange-500/40 uppercase">
                                DIRTY • PENDING
                              </span>
                            )}
                          </div>
                        </div>

                        {/* SLA Countdown pill & progress */}
                        <div className="mt-3 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                              <span>⏱️</span> SLA Timer (30 min):
                            </span>
                            <span
                              className={`font-mono font-black ${
                                isPassed
                                  ? 'text-emerald-400'
                                  : isBreached
                                  ? 'text-red-400 animate-pulse'
                                  : 'text-amber-400'
                              }`}
                            >
                              {isPassed
                                ? `Completed in ${item.elapsedMinutes}m`
                                : isBreached
                                ? `Breached by ${Math.abs(item.slaRemainingMinutes)}m`
                                : `${item.slaRemainingMinutes} min remaining`}
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isPassed
                                  ? 'bg-emerald-500 w-full'
                                  : isBreached
                                  ? 'bg-red-500 w-full'
                                  : 'bg-amber-500'
                              }`}
                              style={{
                                width: isPassed
                                  ? '100%'
                                  : `${Math.min(100, Math.max(10, (item.elapsedMinutes / item.slaTargetMinutes) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Checklist progress */}
                        <div className="mt-3 flex items-center justify-between text-xs px-1">
                          <span className="text-zinc-400 font-medium">6-Point Inspection:</span>
                          <span className="font-mono font-bold text-zinc-200">
                            {item.checklistProgress || '0/6'} items
                            {item.checklistCompleted && <span className="ml-1 text-emerald-400">✓</span>}
                          </span>
                        </div>

                        {/* Attendant assignment section */}
                        <div className="mt-3 bg-zinc-950/40 p-2.5 rounded-2xl border border-zinc-800/60 text-xs">
                          {item.assignedAttendant ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase block font-bold">Attendant</span>
                                <span className="font-bold text-zinc-200">{item.assignedAttendant.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {item.startedAt ? `Started ${new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Assigned'}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-zinc-500 uppercase block font-bold">Assign Attendant</span>
                              <div className="flex gap-1.5 flex-wrap">
                                {['Sunita Sharma', 'Ramesh Kumar', 'Priya Verma'].map((attendant) => (
                                  <button
                                    key={attendant}
                                    type="button"
                                    data-testid={`btn-assign-${attendant.split(' ')[0].toLowerCase()}-${item.room?.roomNumber}`}
                                    onClick={() => handleAssignTurnaroundAttendant(item.taskId, attendant)}
                                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[11px] font-bold transition border border-zinc-700"
                                  >
                                    + {attendant}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          data-testid={`btn-open-checklist-${item.room?.roomNumber || item.taskId}`}
                          onClick={() => handleOpenTurnaroundChecklist(item)}
                          className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider transition border border-zinc-700 flex items-center justify-center gap-1.5"
                        >
                          <span>📋</span> 6-Point Inspection Checklist ({item.checklistProgress || '0/6'})
                        </button>

                        {!isPassed && (
                          <button
                            type="button"
                            data-testid={`btn-instant-ready-${item.room?.roomNumber || item.taskId}`}
                            onClick={() => handleApproveAndReleaseRoom(item.taskId, item.room?.roomNumber || '')}
                            disabled={turnaroundSubmitting}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <span>⚡</span> Instant Ready (Release to Available)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: ROOM MAINTENANCE & OUT-OF-SERVICE (OOS) DESK (Shift 63) */}
        {activeTab === 'MAINTENANCE' && (
          <div className="space-y-6" data-testid="maintenance-desk-workspace">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">Room Maintenance & Out-of-Service (OOS) Inventory Locker</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                    OOS INVENTORY LOCKER
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Log guest room physical defects, lock defective rooms out of check-in inventory, dispatch engineering specialists, track spare parts & repair costs, and 1-tap restore to AVAILABLE upon completion.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-testid="btn-open-report-defect"
                  onClick={() => {
                    setDefectRoomNumber('102');
                    setDefectTitle('');
                    setDefectDescription('');
                    setReportDefectModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl border border-red-500/40 shadow-lg shadow-red-950/40 transition flex items-center gap-1.5"
                >
                  <span>⚠️</span> + Report Defect & Lock OOS
                </button>
                <button
                  type="button"
                  data-testid="btn-refresh-maintenance"
                  onClick={loadMaintenanceTickets}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition flex items-center gap-1.5"
                >
                  <span>🔄</span> Refresh
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Tickets</span>
                <div className="text-xl font-black text-white mt-0.5">{maintenanceTickets.length}</div>
              </div>
              <div className="bg-zinc-900/60 border border-red-500/30 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Locked Out-of-Service</span>
                <div className="text-xl font-black text-red-400 mt-0.5">
                  {maintenanceTickets.filter((t) => t.blocksRoom && t.status !== 'CLOSED').length}
                </div>
              </div>
              <div className="bg-zinc-900/60 border border-blue-500/30 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">In Progress</span>
                <div className="text-xl font-black text-blue-400 mt-0.5">
                  {maintenanceTickets.filter((t) => t.status === 'IN_PROGRESS').length}
                </div>
              </div>
              <div className="bg-zinc-900/60 border border-emerald-500/30 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Closed & Restored</span>
                <div className="text-xl font-black text-emerald-400 mt-0.5">
                  {maintenanceTickets.filter((t) => t.status === 'CLOSED').length}
                </div>
              </div>
            </div>

            {/* Tickets Grid */}
            {maintenanceTickets.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
                <div className="text-4xl">🛠️</div>
                <h3 className="text-base font-bold text-zinc-300">No Active Maintenance Tickets</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  All hotel rooms and assets are operational. To lock a defective room out of service and dispatch engineering, click "+ Report Defect & Lock OOS".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="maintenance-room-grid">
                {maintenanceTickets.map((ticket) => {
                  const isClosed = ticket.status === 'CLOSED';
                  const isBreached = ticket.isSlaBreached;
                  const isOOS = ticket.blocksRoom && !isClosed;

                  return (
                    <div
                      key={ticket.ticketId}
                      data-testid={`maint-card-${ticket.room?.roomNumber || ticket.ticketNumber}`}
                      className={`bg-zinc-900/90 border rounded-3xl p-5 space-y-4 transition shadow-lg relative overflow-hidden flex flex-col justify-between ${
                        isClosed
                          ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-zinc-900/90'
                          : isOOS
                          ? 'border-red-500/50 bg-gradient-to-b from-red-950/20 to-zinc-900/90'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Top Bar: Room + Category + Status */}
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-black text-white">
                                {ticket.room ? `Room ${ticket.room.roomNumber}` : 'General Asset'}
                              </span>
                              {ticket.room && (
                                <span className="text-xs font-mono text-zinc-400">Floor {ticket.room.floor}</span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                              {ticket.ticketNumber} • {ticket.category}
                            </span>
                          </div>

                          <div className="text-right flex flex-col items-end gap-1">
                            {isClosed ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                                RESOLVED • CLOSED
                              </span>
                            ) : isOOS ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-red-500/20 text-red-400 border border-red-500/40 uppercase animate-pulse">
                                OUT OF SERVICE
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-blue-500/20 text-blue-400 border border-blue-500/40 uppercase">
                                {ticket.status}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ticket.priority === 'EMERGENCY'
                                  ? 'bg-red-900/60 text-red-300'
                                  : ticket.priority === 'HIGH'
                                  ? 'bg-orange-900/60 text-orange-300'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {ticket.priority} PRIORITY
                            </span>
                          </div>
                        </div>

                        {/* Defect Title & Description */}
                        <div className="mt-3 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80 space-y-1">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{ticket.title}</h4>
                          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                            {ticket.description}
                          </p>
                        </div>

                        {/* SLA Countdown Timer */}
                        <div className="mt-3 bg-zinc-950/40 p-2.5 rounded-2xl border border-zinc-800/60 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400 flex items-center gap-1 font-bold">
                              <span>⏱️</span> SLA Timer ({ticket.slaHours}h target):
                            </span>
                            <span
                              className={`font-mono font-black ${
                                isClosed
                                  ? 'text-emerald-400'
                                  : isBreached
                                  ? 'text-red-400 animate-pulse'
                                  : 'text-amber-400'
                              }`}
                            >
                              {isClosed
                                ? 'Repairs Complete'
                                : isBreached
                                ? `Breached by ${Math.abs(ticket.slaRemainingMinutes)}m`
                                : `${ticket.slaRemainingMinutes} min remaining`}
                            </span>
                          </div>
                        </div>

                        {/* Technician Assignment */}
                        <div className="mt-3 bg-zinc-950/40 p-2.5 rounded-2xl border border-zinc-800/60 text-xs">
                          {ticket.assignedTechnicianName ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase block font-bold">Technician</span>
                                <span className="font-bold text-zinc-200">{ticket.assignedTechnicianName}</span>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                                {ticket.status}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-zinc-500 uppercase block font-bold">Assign Specialist</span>
                              <div className="flex gap-1.5 flex-wrap">
                                {[
                                  'Rajesh Sharma (HVAC Specialist)',
                                  'Deepak Verma (Plumber)',
                                  'Amit Kumar (Electrician)',
                                ].map((tech) => (
                                  <button
                                    key={tech}
                                    type="button"
                                    data-testid={`btn-assign-tech-${tech.split(' ')[0].toLowerCase()}-${ticket.room?.roomNumber || ticket.ticketId}`}
                                    onClick={() => handleAssignMaintenanceTechnician(ticket.ticketId, tech)}
                                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[11px] font-bold transition border border-zinc-700"
                                  >
                                    + {tech.split(' ')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Parts & Cost Counter */}
                        <div className="mt-3 flex items-center justify-between text-xs px-1">
                          <span className="text-zinc-400 font-medium">Parts & Expenses:</span>
                          <span className="font-mono font-bold text-amber-400">
                            {ticket.partsUsed?.length || 0} parts • ₹{ticket.totalCost}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          data-testid={`btn-log-parts-${ticket.room?.roomNumber || ticket.ticketId}`}
                          onClick={() => handleOpenPartsModal(ticket)}
                          className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider transition border border-zinc-700 flex items-center justify-center gap-1.5"
                        >
                          <span>🔧</span> Log Parts & Notes (₹{ticket.totalCost})
                        </button>

                        {!isClosed && (
                          <button
                            type="button"
                            data-testid={`btn-resolve-maintenance-${ticket.room?.roomNumber || ticket.ticketId}`}
                            onClick={() => handleResolveAndReleaseRoom(ticket.ticketId, ticket.room?.roomNumber || '')}
                            disabled={partsSubmitting}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <span>⚡</span> Resolve & Unblock Room (Restore AVAILABLE)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: FRONT DESK CASHIER SHIFT HANDOVER & DRAWER BALANCING (SHIFT 68) */}
        {activeTab === 'CASHIER' && (
          <div className="space-y-6" data-testid="cashier-shift-workspace">
            {/* Header banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">Front Desk Cashier Shift Handover & Physical Drawer Balancing</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    SHIFT 68 • SAFE DROP AUDIT
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Physical currency denomination counting, drop-safe envelope sealing, dual-cashier shift handover signoff & supervisor PIN discrepancy authorization.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-testid="btn-refresh-cashier-drawer"
                  onClick={loadCashierShiftData}
                  disabled={loadingCashier}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider transition border border-zinc-700 flex items-center gap-1.5"
                >
                  <span>🔄</span> Refresh Drawer
                </button>
                {!activeCashierShift && (
                  <button
                    type="button"
                    data-testid="btn-open-new-shift-modal"
                    onClick={() => setOpenShiftModalVisible(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    <span>➕</span> Open Shift Float
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Current Shift</span>
                <p className="text-sm font-black text-amber-400 mt-0.5" data-testid="badge-active-shift-number">
                  {activeCashierShift ? activeCashierShift.shiftNumber : 'NO ACTIVE SHIFT'}
                </p>
                <span className="text-[10px] text-zinc-400">
                  {activeCashierShift ? `${activeCashierShift.cashierName} (${activeCashierShift.shiftType})` : 'Drawer is locked'}
                </span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Expected Drawer Cash</span>
                <p className="text-xl font-black text-white mt-0.5" data-testid="badge-drawer-expected-cash">
                  ₹{expectedDrawerCash.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-emerald-400">Base Float + Folio Advances</span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Counted Physical Cash</span>
                <p className="text-xl font-black text-amber-300 mt-0.5" data-testid="badge-drawer-counted-cash">
                  ₹{totalCountedCash.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-zinc-400">Sum of notes & coins</span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Physical Variance</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p
                    className={`text-xl font-black ${
                      cashVariance === 0 ? 'text-emerald-400' : cashVariance > 0 ? 'text-blue-400' : 'text-red-400'
                    }`}
                    data-testid="badge-drawer-variance"
                  >
                    {cashVariance === 0 ? '₹0' : cashVariance > 0 ? `+₹${cashVariance}` : `-₹${Math.abs(cashVariance)}`}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    cashVariance === 0 ? 'text-emerald-400' : cashVariance > 0 ? 'text-blue-400' : 'text-red-400'
                  }`}
                >
                  {cashVariance === 0 ? '✓ Exact Match' : cashVariance > 0 ? 'Surplus (Excess Cash)' : 'Shortage (Requires Reason)'}
                </span>
              </div>
            </div>

            {/* Main Interactive Reconciliation Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Physical Currency Denomination Counter */}
              <div className="lg:col-span-7 bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>💵</span> Physical Cash Currency Denominations
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Count each denomination note from the physical cash drawer and enter the quantity.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-preset-float-5000"
                    onClick={() => {
                      setDenom500(10); // 5000
                      setDenom200(0);
                      setDenom100(0);
                      setDenom50(0);
                      setDenom20(0);
                      setDenom10(0);
                      setDenomCoins(0);
                      setSafeDropAmount(0);
                      setClosingFloatRetained(5000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 transition"
                  >
                    Preset Standard Float (10x ₹500)
                  </button>
                </div>

                {/* Denominations Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* ₹500 */}
                  <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-black text-amber-400">₹500 Notes</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Subtotal: ₹{(denom500 * 500).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-bold">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        data-testid="input-denom-500"
                        value={denom500}
                        onChange={(e) => setDenom500(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-sm text-right focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* ₹200 */}
                  <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-black text-amber-400">₹200 Notes</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Subtotal: ₹{(denom200 * 200).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-bold">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        data-testid="input-denom-200"
                        value={denom200}
                        onChange={(e) => setDenom200(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-sm text-right focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* ₹100 */}
                  <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-black text-amber-400">₹100 Notes</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Subtotal: ₹{(denom100 * 100).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-bold">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        data-testid="input-denom-100"
                        value={denom100}
                        onChange={(e) => setDenom100(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-sm text-right focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* ₹50 */}
                  <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-black text-amber-400">₹50 Notes</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Subtotal: ₹{(denom50 * 50).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-bold">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        data-testid="input-denom-50"
                        value={denom50}
                        onChange={(e) => setDenom50(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-sm text-right focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* ₹20 */}
                  <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-black text-amber-400">₹20 Notes</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Subtotal: ₹{(denom20 * 20).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-bold">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        data-testid="input-denom-20"
                        value={denom20}
                        onChange={(e) => setDenom20(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-sm text-right focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* ₹10 */}
                  <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-black text-amber-400">₹10 Notes</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Subtotal: ₹{(denom10 * 10).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-bold">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        data-testid="input-denom-10"
                        value={denom10}
                        onChange={(e) => setDenom10(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-sm text-right focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Coins Total */}
                  <div className="sm:col-span-2 bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-black text-amber-400">🪙 Loose Coins Total (₹1, ₹2, ₹5, ₹10)</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Total loose change in cash tray</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-bold">₹:</span>
                      <input
                        type="number"
                        min="0"
                        data-testid="input-denom-coins"
                        value={denomCoins}
                        onChange={(e) => setDenomCoins(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-24 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-sm text-right focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Subtotal Summary footer */}
                <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-2xl">
                  <span className="text-xs font-bold text-zinc-300">Total Counted Physical Currency:</span>
                  <span className="text-lg font-black text-amber-400 font-mono">₹{totalCountedCash.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Right Column (5 cols): Safe Drop, Handover & Supervisor Signoff */}
              <div className="lg:col-span-5 bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-5">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>🔐</span> Safe Drop & Float Allocation
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Allocate counted cash into treasury drop safe vs retained drawer float.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Safe Drop Amount */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>Safe Drop Amount (Deposit to Safe)</span>
                      <span className="text-[10px] text-zinc-400">Envelope Voucher</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-zinc-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min="0"
                        data-testid="input-safe-drop-amount"
                        value={safeDropAmount}
                        onChange={(e) => setSafeDropAmount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-8 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono font-bold text-sm focus:border-amber-400 focus:outline-none"
                        placeholder="e.g. 15000"
                      />
                    </div>
                  </div>

                  {/* Safe Drop Voucher # */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      Safe Drop Receipt / Envelope Tracking ID
                    </label>
                    <input
                      type="text"
                      data-testid="input-safe-drop-receipt"
                      value={safeDropReceiptNumber}
                      onChange={(e) => setSafeDropReceiptNumber(e.target.value)}
                      placeholder="e.g. DROP-20261006-001"
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Retained Float for Next Shift */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>Retained Float (Left in Drawer)</span>
                      <span className="text-[10px] text-amber-400">Standard: ₹5,000</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-zinc-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min="0"
                        data-testid="input-retained-float"
                        value={closingFloatRetained}
                        onChange={(e) => setClosingFloatRetained(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-8 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono font-bold text-sm focus:border-amber-400 focus:outline-none"
                        placeholder="e.g. 5000"
                      />
                    </div>
                  </div>

                  {/* Allocation Check Alert */}
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      allocationDelta === 0
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <span>Allocated: ₹{totalAllocated.toLocaleString('en-IN')} / Counted: ₹{totalCountedCash.toLocaleString('en-IN')}</span>
                    <span>{allocationDelta === 0 ? '✓ Balanced' : `⚠️ Mismatch: ₹${Math.abs(allocationDelta)}`}</span>
                  </div>

                  {/* Handover to Cashier */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      Incoming Cashier Name (Handover Signoff)
                    </label>
                    <input
                      type="text"
                      data-testid="input-handover-cashier-name"
                      value={handoverToCashierName}
                      onChange={(e) => setHandoverToCashierName(e.target.value)}
                      placeholder="e.g. Evening Receptionist Rohan"
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Discrepancy Reason (Mandatory if variance != 0) */}
                  {cashVariance !== 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl space-y-2">
                      <label className="block text-xs font-bold text-red-300 flex items-center justify-between">
                        <span>Discrepancy Justification Reason *</span>
                        <span className="text-[10px] font-mono text-red-400">Required</span>
                      </label>
                      <input
                        type="text"
                        data-testid="input-discrepancy-reason"
                        value={discrepancyReason}
                        onChange={(e) => setDiscrepancyReason(e.target.value)}
                        placeholder="e.g. Guest short change ₹10 uncollected, approved by manager"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-red-500/40 text-white text-xs focus:outline-none focus:border-red-400"
                      />
                    </div>
                  )}

                  {/* Supervisor PIN Terminal (If Variance > 100 or Safe Drop > 5000) */}
                  {isSupervisorRequired && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                          <span>🛡️</span> Supervisor Authorization PIN
                        </span>
                        <button
                          type="button"
                          onClick={() => setSupervisorPin('9921')}
                          className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30"
                        >
                          Quick PIN: 9921
                        </button>
                      </div>
                      <input
                        type="password"
                        maxLength={6}
                        data-testid="input-cashier-supervisor-pin"
                        value={supervisorPin}
                        onChange={(e) => setSupervisorPin(e.target.value)}
                        placeholder="Enter Supervisor PIN"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-amber-500/40 text-amber-400 font-mono font-bold tracking-widest text-center text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      type="button"
                      data-testid="btn-verify-reconcile-drawer"
                      onClick={handleReconcilePreview}
                      disabled={cashierSubmitting || !activeCashierShift}
                      className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider transition border border-zinc-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <span>🔍</span> Verify & Preview Drawer Balancing
                    </button>

                    <button
                      type="button"
                      data-testid="btn-execute-shift-handover"
                      onClick={handleExecuteHandover}
                      disabled={cashierSubmitting || !activeCashierShift || allocationDelta !== 0}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>🔐</span> Finalize Shift Handover & Lock Drawer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Shift History & Safe Drop Audit Log Table */}
            <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>📜</span> Cashier Shift Handover & Safe Drop Audit Register
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Comprehensive audit trail of closed cashier shifts, physical variances, and safe deposit receipts.
                  </p>
                </div>
                {cashierSummary && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-xl">
                      Safe Dropped: ₹{cashierSummary.totalSafeDropped?.toLocaleString('en-IN') || 0}
                    </span>
                    <span className="text-xs font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-1 rounded-xl">
                      Closed Shifts: {cashierSummary.totalClosedShifts || 0}
                    </span>
                  </div>
                )}
              </div>

              {cashierHistory.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  No previous cashier shifts logged.
                </div>
              ) : (
                <div className="overflow-x-auto" data-testid="table-cashier-history">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Shift #</th>
                        <th className="py-2.5 px-3">Cashier</th>
                        <th className="py-2.5 px-3">Handover To</th>
                        <th className="py-2.5 px-3 text-right">Opening Float</th>
                        <th className="py-2.5 px-3 text-right">Counted Cash</th>
                        <th className="py-2.5 px-3 text-right">Safe Drop</th>
                        <th className="py-2.5 px-3 text-right">Retained Float</th>
                        <th className="py-2.5 px-3 text-right">Variance</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {cashierHistory.map((shift) => (
                        <tr key={shift._id} className="hover:bg-zinc-800/40 transition">
                          <td className="py-3 px-3 font-bold text-amber-400">{shift.shiftNumber}</td>
                          <td className="py-3 px-3 text-zinc-200 font-sans">{shift.cashierName}</td>
                          <td className="py-3 px-3 text-zinc-300 font-sans">{shift.handoverToCashierName || '—'}</td>
                          <td className="py-3 px-3 text-right text-zinc-300">₹{shift.openingFloat}</td>
                          <td className="py-3 px-3 text-right text-zinc-200">₹{shift.actualCashCounted ?? '—'}</td>
                          <td className="py-3 px-3 text-right text-amber-300">
                            {shift.safeDropAmount ? `₹${shift.safeDropAmount}` : '₹0'}
                            {shift.safeDropReceiptNumber && (
                              <span className="block text-[9px] text-zinc-400 font-sans">{shift.safeDropReceiptNumber}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-300">₹{shift.closingFloatRetained ?? '—'}</td>
                          <td
                            className={`py-3 px-3 text-right font-bold ${
                              (shift.cashVariance || 0) === 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {(shift.cashVariance || 0) === 0 ? '₹0' : `₹${shift.cashVariance}`}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                shift.status === 'OPEN'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                              }`}
                            >
                              {shift.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {shift.status === 'CLOSED' && !shift.incomingCashierAcknowledged && (
                              <button
                                type="button"
                                data-testid={`btn-ack-handover-${shift.shiftNumber}`}
                                onClick={() => handleAcknowledgeHandover(shift._id)}
                                className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-sans font-bold text-[10px] border border-amber-500/30 transition"
                              >
                                Accept Float
                              </button>
                            )}
                            {shift.incomingCashierAcknowledged && (
                              <span className="text-[10px] text-emerald-400 font-sans font-bold">✓ Accepted</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SHIFT 68: OPEN NEW CASHIER SHIFT MODAL */}
        {openShiftModalVisible && (
          <div
            data-testid="modal-open-cashier-shift"
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-zinc-100">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>💼</span> Open New Cashier Shift
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenShiftModalVisible(false)}
                  className="text-zinc-400 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Cashier Name</label>
                  <input
                    type="text"
                    value={newCashierName}
                    onChange={(e) => setNewCashierName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Shift Type</label>
                  <select
                    value={newShiftType}
                    onChange={(e) => setNewShiftType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="MORNING">Morning Shift (06:00 - 14:00)</option>
                    <option value="EVENING">Evening Shift (14:00 - 22:00)</option>
                    <option value="NIGHT">Night Audit Shift (22:00 - 06:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Base Drawer Float (₹)</label>
                  <input
                    type="number"
                    min="0"
                    data-testid="input-new-shift-float"
                    value={newShiftFloatAmount}
                    onChange={(e) => setNewShiftFloatAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenShiftModalVisible(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-open-shift"
                  onClick={handleOpenNewShift}
                  disabled={cashierSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  Open Shift Float
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SHIFT 61: MASTER FOLIO DEPARTURE SETTLEMENT MODAL */}
        {settleModalGuest && (
          <div
            data-testid="front-desk-departure-modal"
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto relative text-zinc-100">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-white">Room {settleModalGuest.roomNumber}</span>
                    <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Folio: {settlePreviewData?.folio?.folioNumber || settleModalGuest.folioNumber}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-amber-400 mt-1">
                    Master Folio Settlement & Guest Departure • {settleModalGuest.guestName}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Phone: {settleModalGuest.phone} • Floor {settleModalGuest.floor}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="btn-close-settle-modal"
                  onClick={() => {
                    setSettleModalGuest(null);
                    setSettleSuccessVoucher(null);
                  }}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              {settleLoadingPreview ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-zinc-400">Consolidating Master Folio & sweeping pending restaurant orders...</p>
                </div>
              ) : settleSuccessVoucher ? (
                /* SUCCESS TAX INVOICE VOUCHER */
                <div data-testid="departure-settled-voucher-admin" className="space-y-5">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl text-center space-y-2">
                    <div className="text-3xl">🎉</div>
                    <h3 className="text-base font-black text-emerald-300">Room Vacated & Folio Settled in Full</h3>
                    <p className="text-xs text-zinc-300">
                      Tax Invoice has been generated, stay closed, keycard voided, and room scheduled for Housekeeping.
                    </p>
                  </div>

                  <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl space-y-3 font-mono text-xs">
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-400">Tax Invoice Number:</span>
                      <strong className="text-amber-300 font-bold">{settleSuccessVoucher.invoiceNumber}</strong>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-400">Room Status Transition:</span>
                      <strong className="text-orange-400 font-bold">DIRTY (Queued for Turnaround)</strong>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-400">Payment Mode / Txn:</span>
                      <strong className="text-emerald-400">{settleSuccessVoucher.paymentMode} ({settleSuccessVoucher.transactionRef})</strong>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-400">Total Paid:</span>
                      <strong className="text-emerald-400 font-bold">₹{settleSuccessVoucher.totalPaid}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Master Folio Due Balance:</span>
                      <strong className="text-emerald-400 font-bold">₹0 (ZERO DUE)</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="btn-dismiss-success-modal"
                    onClick={() => {
                      setSettleModalGuest(null);
                      setSettleSuccessVoucher(null);
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
                  >
                    Done & Return to Front Desk
                  </button>
                </div>
              ) : (
                /* SETTLEMENT FORM */
                <div className="space-y-5">
                  {/* Express departure banner if requested */}
                  {settleModalGuest.checkoutRequested && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                          <span>🚨</span> 1-Tap Express Departure Requested by Guest
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-amber-400 text-zinc-950 px-2 py-0.5 rounded-full uppercase">
                          Prefers: {settleModalGuest.preferredPaymentMethod || 'UPI'}
                        </span>
                      </div>
                      {settleModalGuest.feedbackRating && (
                        <div className="text-xs text-amber-200 flex items-center gap-1">
                          <span>Guest Experience Rating:</span>
                          <span className="text-yellow-300 font-bold">{'★'.repeat(settleModalGuest.feedbackRating)}{'☆'.repeat(5 - settleModalGuest.feedbackRating)}</span>
                          <span className="text-zinc-400 text-[10px]">({settleModalGuest.feedbackRating}/5 stars)</span>
                        </div>
                      )}
                      {settleModalGuest.checkoutNotes && (
                        <p className="text-xs text-zinc-300 italic">"{settleModalGuest.checkoutNotes}"</p>
                      )}
                    </div>
                  )}

                  {/* Financial Overview Grid */}
                  <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl space-y-2 text-xs">
                    <h4 className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] mb-2">Master Folio Statement Breakdown</h4>
                    <div className="grid grid-cols-2 gap-2 text-zinc-400">
                      <div>Room Tariff: <strong className="text-zinc-200 font-mono">₹{settlePreviewData?.folio?.totalRoomTariff || 0}</strong></div>
                      <div>Dining & F&B: <strong className="text-zinc-200 font-mono">₹{settlePreviewData?.folio?.totalFoodAndBeverage || 0}</strong></div>
                      <div>Services & Laundry: <strong className="text-zinc-200 font-mono">₹{(settlePreviewData?.folio?.totalLaundry || 0) + (settlePreviewData?.folio?.totalPaidServices || 0)}</strong></div>
                      <div>Applicable Taxes (GST): <strong className="text-zinc-200 font-mono">₹{settlePreviewData?.folio?.totalTaxes || 0}</strong></div>
                    </div>
                    <div className="border-t border-zinc-800 pt-2 flex justify-between items-center text-zinc-400">
                      <span>Total Gross Billed:</span>
                      <strong className="text-zinc-200 font-mono">₹{settlePreviewData?.folio?.netAmountPayable || 0}</strong>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Advance Credited at Check-In:</span>
                      <strong className="text-emerald-400 font-mono">-₹{settlePreviewData?.folio?.advancePaid || 0}</strong>
                    </div>
                    <div className="border-t border-zinc-800 pt-2.5 flex justify-between items-center bg-zinc-950/80 p-3 rounded-xl">
                      <span className="text-sm font-black text-amber-400">Net Balance Due to Settle:</span>
                      <span className="text-lg font-black text-amber-300 font-mono">
                        ₹{settlePreviewData?.folio?.dueAmount ?? settleModalGuest.balanceDue ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Folio Line Items breakdown */}
                  {settlePreviewData?.folio?.lineItems && settlePreviewData.folio.lineItems.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Itemized Folio Transactions</h4>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {settlePreviewData.folio.lineItems.map((li) => (
                          <div key={li.id} className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-medium text-zinc-200">{li.description}</div>
                              <div className="text-[10px] text-zinc-500 font-mono uppercase">{li.department}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-zinc-100">₹{li.netAmount}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">incl. ₹{li.taxAmount} GST</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 block">Settlement Payment Mode</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'UPI', label: '📱 UPI' },
                        { id: 'CASH', label: '💵 Cash' },
                        { id: 'CREDIT_CARD', label: '💳 Card' },
                        { id: 'CORPORATE', label: '🏢 Direct Bill' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          data-testid={`paymode-btn-${m.id}`}
                          onClick={() => setSettlePaymentMode(m.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                            settlePaymentMode === m.id
                              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transaction Ref input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">Transaction Reference / UTR Number</label>
                    <input
                      type="text"
                      data-testid="input-settle-txn-ref"
                      value={settleTransactionRef}
                      onChange={(e) => setSettleTransactionRef(e.target.value)}
                      placeholder="e.g. UPI-9821345 or CASH-REC-01"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  {/* Void Keycard and Room Turnaround toggle */}
                  <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 space-y-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        data-testid="checkbox-void-keycard"
                        checked={settleKeycardVoid}
                        onChange={(e) => setSettleKeycardVoid(e.target.checked)}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="font-bold text-zinc-200">Deactivate & Void RFID / Digital Keycard Immediately</span>
                    </label>
                    <p className="text-[11px] text-zinc-500 pl-6">
                      Room {settleModalGuest.roomNumber} will automatically transition to <strong className="text-orange-400">DIRTY</strong> status and a high-priority Housekeeping turnaround cleaning task will be dispatched.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      data-testid="btn-cancel-settle"
                      onClick={() => setSettleModalGuest(null)}
                      className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="btn-confirm-settle-checkout"
                      disabled={settleSubmitting}
                      onClick={handleConfirmSettleAndCheckOut}
                      className="flex-2 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                    >
                      {settleSubmitting
                        ? 'Settling Folio...'
                        : `Complete Departure & Settle ₹${settlePreviewData?.folio?.dueAmount ?? settleModalGuest.balanceDue ?? 0}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SHIFT 62: 6-POINT INSPECTION CHECKLIST & CERTIFICATION MODAL */}
        {checklistModalOpen && selectedTurnaroundTask && (
          <div
            data-testid="turnaround-checklist-modal"
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto relative text-zinc-100">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-white">
                      Room {selectedTurnaroundTask.room?.roomNumber}
                    </span>
                    <span className="text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                      Floor {selectedTurnaroundTask.room?.floor ?? 1}
                    </span>
                    <span className="text-xs font-mono font-bold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                      Status: {selectedTurnaroundTask.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-teal-400 mt-1">
                    Housekeeping 6-Point Quality Assurance & Turnaround Protocol
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Attendant: {selectedTurnaroundTask.assignedAttendant?.name || 'Unassigned'} • Target SLA: 30 minutes
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="btn-close-checklist-modal"
                  onClick={() => setChecklistModalOpen(false)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              {/* Quick Action: Mark All Completed */}
              <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
                <div className="text-xs text-zinc-300">
                  Completed items: <strong className="text-teal-400">{activeChecklist.filter((c) => c.isDone).length} of {activeChecklist.length}</strong>
                </div>
                <button
                  type="button"
                  data-testid="btn-check-all-items"
                  onClick={() => setActiveChecklist((prev) => prev.map((item) => ({ ...item, isDone: true })))}
                  className="px-3 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold transition"
                >
                  ✓ Check All 6 Points
                </button>
              </div>

              {/* 6-Point Inspection Checklist Items */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Mandatory Turnaround Standards
                </h4>
                {activeChecklist.map((item, idx) => (
                  <label
                    key={idx}
                    data-testid={`checklist-item-${idx}`}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                      item.isDone
                        ? 'bg-teal-950/20 border-teal-500/40 text-zinc-200'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      data-testid={`checkbox-checklist-${idx}`}
                      checked={item.isDone}
                      onChange={() => handleToggleChecklistItem(idx)}
                      className="mt-0.5 rounded border-zinc-700 text-teal-500 focus:ring-teal-500 h-4 w-4"
                    />
                    <div className="text-xs leading-relaxed flex-1">
                      <span className={item.isDone ? 'line-through text-zinc-400' : 'font-medium'}>
                        {idx + 1}. {item.taskName}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Attendant & Supervisor Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">
                  Attendant / Supervisor Inspection Notes
                </label>
                <textarea
                  rows={2}
                  data-testid="input-turnaround-notes"
                  value={turnaroundNotes}
                  onChange={(e) => setTurnaroundNotes(e.target.value)}
                  placeholder="e.g. Linen changed, minibar audited, fragrance spritzed, sanitized for arrival."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  data-testid="btn-modal-reject-reclean"
                  onClick={() => handleRejectTurnaroundReclean(selectedTurnaroundTask.taskId, selectedTurnaroundTask.room?.roomNumber || '')}
                  className="py-3 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800 font-bold text-xs uppercase tracking-wider transition"
                >
                  ⚠️ Quality Reject (Re-Clean)
                </button>
                <button
                  type="button"
                  data-testid="btn-submit-checklist"
                  disabled={turnaroundSubmitting}
                  onClick={handleSubmitChecklist}
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs uppercase tracking-wider transition"
                >
                  Save Checklist & Move to Inspection
                </button>
                <button
                  type="button"
                  data-testid="btn-modal-instant-ready"
                  disabled={turnaroundSubmitting}
                  onClick={() => handleApproveAndReleaseRoom(selectedTurnaroundTask.taskId, selectedTurnaroundTask.room?.roomNumber || '')}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {turnaroundSubmitting ? 'Certifying...' : '⚡ Approve & Release (Instant Ready)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SHIFT 63: REPORT ROOM DEFECT & LOCK OOS MODAL */}
        {reportDefectModalOpen && (
          <div
            data-testid="report-defect-modal"
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative text-zinc-100">
              <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>⚠️</span> Report Room Defect & Lock Out-of-Service
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Dispatch engineering technician and lock room from PMS available inventory.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="btn-close-defect-modal"
                  onClick={() => setReportDefectModalOpen(false)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Room Number & Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">Target Room Number</label>
                    <input
                      type="text"
                      data-testid="input-defect-room"
                      value={defectRoomNumber}
                      onChange={(e) => setDefectRoomNumber(e.target.value)}
                      placeholder="e.g. 102"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">Category</label>
                    <select
                      data-testid="select-defect-category"
                      value={defectCategory}
                      onChange={(e: any) => setDefectCategory(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="HVAC">HVAC / Air Conditioning</option>
                      <option value="PLUMBING">Plumbing & Water</option>
                      <option value="ELECTRICAL">Electrical & Lighting</option>
                      <option value="CARPENTRY">Carpentry & Furniture</option>
                      <option value="ELECTRONICS">TV / Wi-Fi / Keycard</option>
                      <option value="GENERAL">General Maintenance</option>
                    </select>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Priority & SLA</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'EMERGENCY', label: '🚨 2h SLA' },
                      { id: 'HIGH', label: '🔥 6h SLA' },
                      { id: 'MEDIUM', label: '⚡ 24h SLA' },
                      { id: 'LOW', label: '⏳ 72h SLA' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        data-testid={`btn-priority-${p.id.toLowerCase()}`}
                        onClick={() => setDefectPriority(p.id as any)}
                        className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition ${
                          defectPriority === p.id
                            ? 'bg-red-500/20 text-red-300 border-red-500/50'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Defect Title */}
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Defect Title</label>
                  <input
                    type="text"
                    data-testid="input-defect-title"
                    value={defectTitle}
                    onChange={(e) => setDefectTitle(e.target.value)}
                    placeholder="e.g. AC compressor failure - room not cooling"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Defect Description */}
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Detailed Defect Description</label>
                  <textarea
                    rows={2}
                    data-testid="input-defect-description"
                    value={defectDescription}
                    onChange={(e) => setDefectDescription(e.target.value)}
                    placeholder="e.g. Temperature stuck at 31C, vibration noise from outdoor unit."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                {/* Lock Room Checkbox */}
                <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Lock Room Out-of-Service (OOS)</span>
                    <span className="text-[11px] text-zinc-400">Excludes room from available check-in inventory.</span>
                  </div>
                  <input
                    type="checkbox"
                    data-testid="checkbox-blocks-room"
                    checked={defectBlocksRoom}
                    onChange={(e) => setDefectBlocksRoom(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 text-red-500 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  data-testid="btn-cancel-report-defect"
                  onClick={() => setReportDefectModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-submit-report-defect"
                  disabled={defectSubmitting}
                  onClick={handleCreateMaintenanceTicket}
                  className="flex-2 py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-red-950/40 disabled:opacity-50"
                >
                  {defectSubmitting ? 'Creating Ticket...' : 'Dispatch Ticket & Lock Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SHIFT 63: LOG SPARE PARTS, EXPENSES & RESOLUTION MODAL */}
        {partsModalOpen && selectedMaintTicket && (
          <div
            data-testid="parts-resolution-modal"
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative text-zinc-100">
              <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white">
                      {selectedMaintTicket.room ? `Room ${selectedMaintTicket.room.roomNumber}` : 'General Asset'}
                    </span>
                    <span className="text-xs font-mono font-bold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                      {selectedMaintTicket.ticketNumber}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-amber-400 mt-1">
                    Log Spare Parts, Repair Cost & Engineering Resolution
                  </h3>
                </div>
                <button
                  type="button"
                  data-testid="btn-close-parts-modal"
                  onClick={() => setPartsModalOpen(false)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              {/* Parts Table */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px]">Replacement Parts Used</span>
                  <button
                    type="button"
                    data-testid="btn-add-part-row"
                    onClick={() => setPartsList((prev) => [...prev, { partName: '', cost: 0, quantity: 1 }])}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[11px] font-bold transition border border-zinc-700"
                  >
                    + Add Part
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {partsList.map((part, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                      <input
                        type="text"
                        data-testid={`input-part-name-${idx}`}
                        value={part.partName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPartsList((prev) => prev.map((p, i) => (i === idx ? { ...p, partName: val } : p)));
                        }}
                        placeholder="Part name (e.g. AC Capacitor)"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-zinc-500 text-xs">₹</span>
                        <input
                          type="number"
                          data-testid={`input-part-cost-${idx}`}
                          value={part.cost || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPartsList((prev) => prev.map((p, i) => (i === idx ? { ...p, cost: val } : p)));
                          }}
                          placeholder="Cost"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="flex items-center gap-1 w-16">
                        <span className="text-zinc-500 text-xs">Qty</span>
                        <input
                          type="number"
                          data-testid={`input-part-qty-${idx}`}
                          value={part.quantity || 1}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value));
                            setPartsList((prev) => prev.map((p, i) => (i === idx ? { ...p, quantity: val } : p)));
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPartsList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300 px-2 py-1 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800">
                  <span className="text-zinc-400">Total Repair Expense:</span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    ₹{partsList.reduce((sum, p) => sum + (Number(p.cost || 0) * Number(p.quantity || 1)), 0)}
                  </span>
                </div>

                {/* Resolution Notes */}
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Engineering Resolution Notes</label>
                  <textarea
                    rows={2}
                    data-testid="input-resolution-notes"
                    value={resolutionNotesText}
                    onChange={(e) => setResolutionNotesText(e.target.value)}
                    placeholder="e.g. Capacitor replaced, gas recharged. Tested and operational at 18C."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  data-testid="btn-save-parts-only"
                  disabled={partsSubmitting}
                  onClick={handleSavePartsAndCost}
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-bold text-xs uppercase tracking-wider transition"
                >
                  Save Parts & Cost
                </button>
                <button
                  type="button"
                  data-testid="btn-resolve-and-restore-room"
                  disabled={partsSubmitting}
                  onClick={() => handleResolveAndReleaseRoom(selectedMaintTicket.ticketId, selectedMaintTicket.room?.roomNumber || '')}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {partsSubmitting ? 'Restoring Room...' : '⚡ Resolve & Restore to AVAILABLE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SHIFT 64: IN-HOUSE GUEST ROOM MOVE & UPGRADE MODAL */}
        {roomMoveModalOpen && selectedMoveGuest && (
          <div
            data-testid="room-move-modal"
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative text-zinc-100">
              <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white">Room Move & Suite Upgrade</span>
                    <span className="text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full">
                      SHIFT 64
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Transfer guest <strong className="text-amber-300">{selectedMoveGuest.guestName}</strong> from Room <strong className="text-white">{selectedMoveGuest.roomNumber}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="btn-close-room-move-modal"
                  onClick={() => setRoomMoveModalOpen(false)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Source Room Overview */}
                <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Current Room</span>
                    <div className="text-sm font-black text-white mt-0.5">Room {selectedMoveGuest.roomNumber} (Floor {selectedMoveGuest.floor})</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Folio Due</span>
                    <div className="text-sm font-black text-amber-400 mt-0.5">₹{selectedMoveGuest.balanceDue}</div>
                  </div>
                </div>

                {/* Destination Room Selection */}
                <div>
                  <label className="text-zinc-300 font-bold block mb-1.5 flex items-center justify-between">
                    <span>Select Destination Room</span>
                    {loadingUpgradeRooms && <span className="text-[10px] text-cyan-400 animate-pulse">Loading rooms...</span>}
                  </label>
                  {availableUpgradeRooms.length === 0 && !loadingUpgradeRooms ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      ⚠️ No other available rooms in ready state right now.
                    </div>
                  ) : (
                    <select
                      data-testid="select-target-room"
                      value={targetRoomNumber}
                      onChange={(e) => handleSelectTargetRoom(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-500"
                    >
                      {availableUpgradeRooms.map((r) => (
                        <option key={r.roomId} value={r.roomNumber}>
                          Room {r.roomNumber} (Floor {r.floorNumber}) — {r.roomType} [₹{r.basePrice}/night] {r.suggestedUpgradeFee > 0 ? `(+₹${r.suggestedUpgradeFee} Upgrade)` : '(Even Move)'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Reason Selector */}
                <div>
                  <label className="text-zinc-300 font-bold block mb-1.5">Move Reason</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'UPGRADE', label: '⭐ Room Upgrade', desc: 'Paid / VIP terrace suite' },
                      { id: 'MAINTENANCE_DEFECT', label: '🛠️ AC / Defect Move', desc: 'Technical room defect' },
                      { id: 'NOISE_COMPLAINT', label: '🔇 Noise Complaint', desc: 'Quiet floor reassignment' },
                      { id: 'GUEST_REQUEST', label: '👤 Guest Request', desc: 'General preference' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`btn-reason-${opt.id}`}
                        onClick={() => setMoveReason(opt.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          moveReason === opt.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold text-xs">{opt.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upgrade Surcharge & GST */}
                <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-300 font-bold">Upgrade Tariff Surcharge (₹)</label>
                    <span className="text-[10px] text-zinc-400 font-mono">12% GST Auto-Calculated</span>
                  </div>
                  <input
                    type="number"
                    data-testid="input-upgrade-fee"
                    min="0"
                    value={moveUpgradeFee}
                    onChange={(e) => setMoveUpgradeFee(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  {moveUpgradeFee > 0 && (
                    <div className="flex justify-between items-center text-[11px] pt-1 border-t border-zinc-800 text-zinc-400 font-mono">
                      <span>Surcharge: ₹{moveUpgradeFee} + GST: ₹{Math.round(moveUpgradeFee * 0.12)}</span>
                      <span className="text-emerald-400 font-bold">Total Posted: ₹{moveUpgradeFee + Math.round(moveUpgradeFee * 0.12)}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Receptionist Notes</label>
                  <input
                    type="text"
                    data-testid="input-move-notes"
                    value={moveNotes}
                    onChange={(e) => setMoveNotes(e.target.value)}
                    placeholder="e.g. Upgraded to Presidential Suite as VIP Platinum gesture."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Operational Impact Notice */}
                <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-800/50 text-[11px] text-cyan-200/90 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                    <span>ℹ️</span> Operational Workflow Automation:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-zinc-400 text-[10px]">
                    <li>Room {selectedMoveGuest.roomNumber} will automatically vacate to <strong>DIRTY</strong> and queue for Housekeeping Turnaround.</li>
                    <li>Target Room <strong>{targetRoomNumber || '...'}</strong> will atomically become <strong>OCCUPIED</strong>.</li>
                    <li>New digital keycard token will be generated, invalidating old access.</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  data-testid="btn-cancel-room-move"
                  onClick={() => setRoomMoveModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-submit-room-move"
                  disabled={submittingRoomMove || !targetRoomNumber}
                  onClick={handleExecuteRoomMove}
                  className="flex-2 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-950/40 disabled:opacity-50"
                >
                  {submittingRoomMove ? 'Transferring...' : 'Execute Room Move & Re-Issue Key'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SHIFT 65: LATE CHECK-OUT & DIGITAL KEYCARD EXTENSION MODAL */}
        {lateCheckoutModalOpen && selectedLateGuest && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div
              data-testid="modal-late-checkout"
              className="bg-zinc-950 border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-xs relative max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-2xl bg-purple-500/20 text-purple-400 text-lg">🕒</span>
                  <div>
                    <h3 className="text-base font-black text-white">Late Check-Out & Keycard Extension</h3>
                    <p className="text-[11px] text-zinc-400">Tiered surcharge calculation, automated folio charge & door key sync</p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="btn-close-late-checkout-modal"
                  onClick={() => setLateCheckoutModalOpen(false)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Guest & Room Context Banner */}
              <div className="bg-purple-950/20 border border-purple-500/30 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white">Room {selectedLateGuest.roomNumber}</span>
                    <span className="text-[10px] font-mono font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                      Floor {selectedLateGuest.floor}
                    </span>
                    {selectedLateGuest.vipTier !== 'REGULAR' && (
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        ⭐ {selectedLateGuest.vipTier} VIP
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-300 font-bold mt-0.5">{selectedLateGuest.guestName}</div>
                  <div className="text-[11px] text-zinc-400 font-mono">Current Check-Out: 11:00 AM</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-black text-purple-400 block">Folio Balance</span>
                  <span className="text-base font-black text-amber-400 font-mono">₹{selectedLateGuest.balanceDue}</span>
                </div>
              </div>

              {/* Extension Time Selector */}
              <div className="space-y-2">
                <label className="text-zinc-300 font-bold block">Select Extended Departure Time</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { time: '13:00', label: '1:00 PM', tag: 'Grace (Free)' },
                    { time: '15:00', label: '3:00 PM', tag: 'Half-Day (50%)' },
                    { time: '18:00', label: '6:00 PM', tag: 'Full-Day (100%)' },
                  ].map((preset) => (
                    <button
                      key={preset.time}
                      type="button"
                      data-testid={`btn-late-time-${preset.time.replace(':', '')}`}
                      onClick={() => handleChangeLateTime(preset.time)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        requestedLateDepartureTime === preset.time
                          ? 'bg-purple-500/20 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-black text-sm">{preset.label}</div>
                      <div className="text-[10px] text-purple-300/80 mt-0.5 font-bold">{preset.tag}</div>
                    </button>
                  ))}
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <span className="text-zinc-400 text-xs">Or custom departure time:</span>
                  <input
                    type="time"
                    data-testid="input-custom-late-time"
                    value={requestedLateDepartureTime}
                    onChange={(e) => handleChangeLateTime(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Live Surcharge & Tax Calculation Breakdown */}
              {lateCalculation && (
                <div
                  data-testid="box-late-calculation"
                  className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/90 space-y-2 font-mono"
                >
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span>Applicable Pricing Tier:</span>
                    <strong className="text-purple-300 font-bold uppercase">{lateCalculation.tier} ({lateCalculation.percent}%)</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span>Extension Granted:</span>
                    <strong className="text-zinc-200">+{lateCalculation.hoursLate} Hours beyond 11:00 AM</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span>Room Tariff Surcharge:</span>
                    <strong className="text-zinc-200">{waiveLateFee ? '₹0 (Waived)' : `₹${lateCalculation.surchargeAmount}`}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span>Applicable GST (12%):</span>
                    <strong className="text-zinc-200">{waiveLateFee ? '₹0' : `₹${lateCalculation.taxAmount}`}</strong>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-sm font-black">
                    <span className="text-white">Total Folio Charge:</span>
                    <span className="text-emerald-400 text-base">
                      {waiveLateFee ? '₹0 (Waived)' : `₹${lateCalculation.totalCharge}`}
                    </span>
                  </div>

                  {lateCalculation.vipBenefitApplied && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-sans">
                      ⭐ VIP Benefit Applied: Complimentary late checkout privilege applied to this booking.
                    </div>
                  )}
                </div>
              )}

              {/* Managerial Waiver Toggle */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="checkbox-waive-late-fee"
                    checked={waiveLateFee}
                    onChange={(e) => setWaiveLateFee(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-zinc-900 border-zinc-700 focus:ring-0"
                  />
                  <span className="text-zinc-300 font-bold">Waive Late Check-Out Surcharge (GM / VIP Discretion)</span>
                </label>
                {waiveLateFee && (
                  <input
                    type="text"
                    data-testid="input-late-waiver-reason"
                    value={lateWaiverReason}
                    onChange={(e) => setLateWaiverReason(e.target.value)}
                    placeholder="Enter reason for complimentary waiver (e.g. Flight delay / VIP courtesy)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500 font-sans"
                  />
                )}
              </div>

              {/* Automation & Safety Advisory */}
              <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200/90 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-purple-300">
                  <span>⚡</span> Automated Actions Upon Approval:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-zinc-400 text-[10px]">
                  <li>Digital keycard validity automatically extended until <strong>{requestedLateDepartureTime}</strong>.</li>
                  <li>Housekeeping turnaround schedule rebalanced to avoid premature room knocks.</li>
                  <li>Surcharge posted to active Master Folio with itemized GST audit entry.</li>
                </ul>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  data-testid="btn-cancel-late-checkout"
                  onClick={() => setLateCheckoutModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-late-checkout"
                  disabled={submittingLateCheckout}
                  onClick={handleExecuteLateCheckout}
                  className="flex-2 py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-purple-950/40 disabled:opacity-50"
                >
                  {submittingLateCheckout ? 'Extending Keycard...' : 'Approve Late Departure & Sync Keycard'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SHIFT 67: MANAGER RATE OVERRIDE & SECURITY PIN APPROVAL MODAL */}
        {rateOverrideModalOpen && selectedGuestForOverride && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div
              data-testid="modal-rate-override"
              className="bg-zinc-950 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-xs relative max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 text-lg">🏷️</span>
                  <div>
                    <h3 className="text-base font-black text-white">Manager Rate Override & Security PIN Terminal</h3>
                    <p className="text-[11px] text-zinc-400">Tiered discount matrix, complimentary waiver & live Master Folio adjustment</p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="btn-close-rate-override-modal"
                  onClick={() => setRateOverrideModalOpen(false)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Guest & Room Context Banner */}
              <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white">Room {selectedGuestForOverride.roomNumber}</span>
                    <span className="text-[10px] font-mono font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                      Floor {selectedGuestForOverride.floor}
                    </span>
                    {selectedGuestForOverride.vipTier !== 'REGULAR' && (
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        ⭐ {selectedGuestForOverride.vipTier} VIP
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-300 font-bold mt-0.5">{selectedGuestForOverride.guestName}</div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    Base Rate: ₹{selectedGuestForOverride.baseRatePerNight || selectedGuestForOverride.effectiveRatePerNight || 3500}/night
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-black text-amber-400 block">Folio Balance Due</span>
                  <span className="text-base font-black text-white font-mono">₹{selectedGuestForOverride.balanceDue}</span>
                </div>
              </div>

              {/* Override Type Mode Selector */}
              <div className="space-y-2">
                <label className="text-zinc-300 font-bold block">Select Rate Override Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    data-testid="btn-override-type-PERCENTAGE_DISCOUNT"
                    onClick={() => handleChangeOverrideType('PERCENTAGE_DISCOUNT')}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      overrideType === 'PERCENTAGE_DISCOUNT'
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-black text-xs">Percentage (%)</div>
                    <div className="text-[10px] text-amber-300/80 mt-0.5 font-bold">Tiered Discount</div>
                  </button>
                  <button
                    type="button"
                    data-testid="btn-override-type-FIXED_TARIFF"
                    onClick={() => handleChangeOverrideType('FIXED_TARIFF')}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      overrideType === 'FIXED_TARIFF'
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-black text-xs">Fixed Rate (₹)</div>
                    <div className="text-[10px] text-amber-300/80 mt-0.5 font-bold">Custom Nightly</div>
                  </button>
                  <button
                    type="button"
                    data-testid="btn-override-type-COMPLIMENTARY_WAIVER"
                    onClick={() => handleChangeOverrideType('COMPLIMENTARY_WAIVER')}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      overrideType === 'COMPLIMENTARY_WAIVER'
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-black text-xs">Complimentary</div>
                    <div className="text-[10px] text-amber-300/80 mt-0.5 font-bold">100% Waiver (₹0)</div>
                  </button>
                </div>
              </div>

              {/* Mode Input Controls */}
              {overrideType === 'PERCENTAGE_DISCOUNT' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-zinc-300 font-bold block">Discount Percentage</label>
                    <span className="text-amber-400 font-mono font-bold text-sm">{overrideDiscountPercent}% OFF</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[5, 10, 15, 25, 50, 75].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        data-testid={`btn-quick-pct-${pct}`}
                        onClick={() => handleChangeDiscountPercent(pct)}
                        className={`py-2 rounded-xl border text-center font-bold text-xs transition ${
                          overrideDiscountPercent === pct
                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-zinc-400 text-xs">Custom percentage:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      data-testid="input-discount-percent"
                      value={overrideDiscountPercent}
                      onChange={(e) => handleChangeDiscountPercent(Number(e.target.value) || 0)}
                      className="w-24 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-zinc-400 text-xs">%</span>
                  </div>
                </div>
              )}

              {overrideType === 'FIXED_TARIFF' && (
                <div className="space-y-2">
                  <label className="text-zinc-300 font-bold block">New Fixed Tariff Per Night (₹)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold text-base">₹</span>
                    <input
                      type="number"
                      min={0}
                      data-testid="input-fixed-tariff"
                      value={overrideFixedRate}
                      onChange={(e) => handleChangeFixedRate(Number(e.target.value) || 0)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-amber-500"
                      placeholder="e.g. 2800"
                    />
                  </div>
                </div>
              )}

              {overrideType === 'COMPLIMENTARY_WAIVER' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <span>👑</span> 100% Complimentary Tariff Waiver Active
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    The entire room tariff will be adjusted to ₹0/night. Applicable GST will also be reduced to ₹0.
                    Requires General Manager authorization PIN.
                  </p>
                </div>
              )}

              {/* Reason & Justification */}
              <div className="space-y-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Approval Category / Reason</label>
                  <select
                    data-testid="select-override-reason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="SERVICE_RECOVERY">Service Recovery / Inconvenience Compensation</option>
                    <option value="VIP_MANAGEMENT_GUEST">VIP / Management Guest Courtesy</option>
                    <option value="CORPORATE_NEGOTIATED">Corporate Negotiated Discretion</option>
                    <option value="LONG_STAY_CONCESSION">Long Stay Concession</option>
                    <option value="MANAGEMENT_COURTESY">General Manager Discretionary Waiver</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">
                    Audit Justification Note <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    data-testid="input-override-justification"
                    value={overrideJustification}
                    onChange={(e) => setOverrideJustification(e.target.value)}
                    placeholder="Enter mandatory justification for financial audit (min 3 chars)"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              </div>

              {/* Real-time Calculation Breakdown Box */}
              {overrideCalculation && (
                <div
                  data-testid="box-override-calculation"
                  className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/90 space-y-2 font-mono"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Approval Tier:</span>
                    <span
                      data-testid="badge-approval-tier"
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        overrideCalculation.approvalTier === 'AGENT_SELF'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : overrideCalculation.approvalTier === 'SUPERVISOR'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : overrideCalculation.approvalTier === 'DUTY_MANAGER'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {overrideCalculation.approvalTier}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span>Base Tariff / Night:</span>
                    <strong className="text-zinc-200">₹{overrideCalculation.baseRatePerNight}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span>Discount Impact:</span>
                    <strong className="text-amber-400">-₹{overrideCalculation.discountAmount} ({overrideCalculation.discountPercent}%)</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span>GST Savings (12%):</span>
                    <strong className="text-emerald-400">-₹{overrideCalculation.taxSavings}</strong>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-sm font-black">
                    <span className="text-white">New Effective Rate:</span>
                    <span className="text-amber-300 text-base">₹{overrideCalculation.newRatePerNight} / night</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-sans mt-1">
                    {overrideCalculation.tierDescription}
                  </div>
                </div>
              )}

              {/* Manager Security PIN Authorization Input */}
              {overrideCalculation?.pinRequired && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                      <span>🔒</span>
                      <span>Manager Security PIN Required ({overrideCalculation.approvalTier})</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">Master: 9921</span>
                  </div>
                  <input
                    type="password"
                    data-testid="input-manager-pin"
                    maxLength={6}
                    value={overrideManagerPin}
                    onChange={(e) => setOverrideManagerPin(e.target.value)}
                    placeholder="Enter Manager PIN (e.g. 9921)"
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  data-testid="btn-cancel-rate-override"
                  onClick={() => setRateOverrideModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-rate-override"
                  disabled={submittingOverride}
                  onClick={handleExecuteRateOverride}
                  className="flex-2 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-950/40 disabled:opacity-50"
                >
                  {submittingOverride ? 'Authorizing & Updating Folio...' : 'Authorize Rate Override & Update Folio'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
