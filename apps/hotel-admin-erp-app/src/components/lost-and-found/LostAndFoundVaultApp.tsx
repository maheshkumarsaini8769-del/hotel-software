import React, { useState, useEffect, useCallback } from 'react';

export interface ICustodyTransfer {
  action: string;
  performedByName?: string;
  fromLocation?: string;
  toLocation?: string;
  timestamp: string;
  notes?: string;
}

export interface IClaimVerification {
  claimantName: string;
  claimantPhone: string;
  claimantEmail?: string;
  idProofType: string;
  idProofNumber: string;
  verificationNotes?: string;
  verifiedAt: string;
  serialNumberMatched?: boolean;
  matchConfidenceScore?: number;
}

export interface ICourierDispatch {
  courierPartner: string;
  waybillNumber: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: {
    street: string;
    city: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  shippingFeePaidBy: string;
  shippingFeeAmount?: number;
  dispatchedAt: string;
  courierStatus: string;
  notes?: string;
}

export interface ILostItem {
  _id: string;
  trackingNumber: string;
  description: string;
  category: string;
  foundLocation: string;
  guestName?: string;
  storageLocation: string;
  secureVaultLocker?: string;
  estimatedValue?: number;
  isHighValue: boolean;
  retentionExpiryDate: string;
  status: string;
  claimedBy?: {
    claimantName: string;
    contactNumber: string;
    idProof: string;
    claimedAt: string;
    notes?: string;
  };
  claimVerification?: IClaimVerification;
  courierDispatch?: ICourierDispatch;
  custodyChain: ICustodyTransfer[];
  createdAt: string;
}

export interface IVaultMetrics {
  totalLogged: number;
  activeInVault: number;
  highValueSecured: number;
  pendingDispatch: number;
  courierDispatched: number;
  claimedInPerson: number;
  disposed: number;
  retentionDueCount: number;
}

interface LostAndFoundVaultAppProps {
  authToken?: string;
  hotelId?: string;
  apiBaseUrl?: string;
}

export const LostAndFoundVaultApp: React.FC<LostAndFoundVaultAppProps> = ({
  authToken,
  hotelId,
  apiBaseUrl = 'http://localhost:5000/api/v1',
}) => {
  const [items, setItems] = useState<ILostItem[]>([]);
  const [metrics, setMetrics] = useState<IVaultMetrics>({
    totalLogged: 0,
    activeInVault: 0,
    highValueSecured: 0,
    pendingDispatch: 0,
    courierDispatched: 0,
    claimedInPerson: 0,
    disposed: 0,
    retentionDueCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isHighValueOnly, setIsHighValueOnly] = useState(false);

  // Modals
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedItemForVerify, setSelectedItemForVerify] = useState<ILostItem | null>(null);
  const [selectedItemForCourier, setSelectedItemForCourier] = useState<ILostItem | null>(null);
  const [selectedItemForHandover, setSelectedItemForHandover] = useState<ILostItem | null>(null);
  const [selectedItemForCustody, setSelectedItemForCustody] = useState<ILostItem | null>(null);

  // Form States
  const [logForm, setLogForm] = useState({
    description: '',
    category: 'ELECTRONICS',
    foundLocation: '',
    guestName: '',
    estimatedValue: 0,
    secureVaultLocker: '',
    isHighValue: false,
    retentionDays: 90,
  });

  const [verifyForm, setVerifyForm] = useState({
    claimantName: '',
    claimantPhone: '',
    claimantEmail: '',
    idProofType: 'AADHAAR',
    idProofNumber: '',
    serialNumberMatched: true,
    matchConfidenceScore: 98,
    verificationNotes: '',
  });

  const [courierForm, setCourierForm] = useState({
    courierPartner: 'BLUE_DART',
    waybillNumber: '',
    recipientName: '',
    recipientPhone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    shippingFeePaidBy: 'GUEST',
    shippingFeeAmount: 0,
    notes: '',
  });

  const [handoverForm, setHandoverForm] = useState({
    claimantName: '',
    contactNumber: '',
    idProof: '',
    notes: '',
  });

  const getHeaders = useCallback(() => {
    const token =
      authToken ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('spicehub_token') || localStorage.getItem('token') || ''
        : '');
    const hId =
      hotelId ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || ''
        : '');

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-hotel-id': hId,
    };
  }, [authToken, hotelId]);

  const fetchVaultData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (categoryFilter !== 'ALL') queryParams.append('category', categoryFilter);
      if (isHighValueOnly) queryParams.append('isHighValue', 'true');
      if (search) queryParams.append('search', search);

      const res = await fetch(`${apiBaseUrl}/housekeeping/lost-and-found/vault?${queryParams.toString()}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to fetch vault data:', err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders, statusFilter, categoryFilter, isHighValueOnly, search, apiBaseUrl]);

  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  // Log Item Handler
  const handleLogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBaseUrl}/housekeeping/lost-and-found`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(logForm),
      });
      const data = await res.json();
      if (data.success) {
        setLogModalOpen(false);
        setLogForm({
          description: '',
          category: 'ELECTRONICS',
          foundLocation: '',
          guestName: '',
          estimatedValue: 0,
          secureVaultLocker: '',
          isHighValue: false,
          retentionDays: 90,
        });
        await fetchVaultData();
      } else {
        alert(data.message || 'Error logging item');
      }
    } catch (err) {
      console.error('Error logging item:', err);
    }
  };

  // Verify Claim Handler
  const handleVerifyClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForVerify) return;
    try {
      const res = await fetch(`${apiBaseUrl}/housekeeping/lost-and-found/${selectedItemForVerify._id}/verify-claim`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(verifyForm),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedItemForVerify(null);
        await fetchVaultData();
      } else {
        alert(data.message || 'Error verifying claim');
      }
    } catch (err) {
      console.error('Error verifying claim:', err);
    }
  };

  // Courier Dispatch Handler
  const handleDispatchCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForCourier) return;
    try {
      const payload = {
        courierPartner: courierForm.courierPartner,
        waybillNumber: courierForm.waybillNumber,
        recipientName: courierForm.recipientName,
        recipientPhone: courierForm.recipientPhone,
        shippingAddress: {
          street: courierForm.street,
          city: courierForm.city,
          state: courierForm.state,
          pincode: courierForm.pincode,
          country: 'India',
        },
        shippingFeePaidBy: courierForm.shippingFeePaidBy,
        shippingFeeAmount: Number(courierForm.shippingFeeAmount) || 0,
        notes: courierForm.notes,
      };

      const res = await fetch(`${apiBaseUrl}/housekeeping/lost-and-found/${selectedItemForCourier._id}/dispatch-courier`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedItemForCourier(null);
        await fetchVaultData();
      } else {
        alert(data.message || 'Error dispatching courier');
      }
    } catch (err) {
      console.error('Error dispatching courier:', err);
    }
  };

  // Handover In-Person Handler
  const handleHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForHandover) return;
    try {
      const res = await fetch(`${apiBaseUrl}/housekeeping/lost-and-found/${selectedItemForHandover._id}/handover`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(handoverForm),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedItemForHandover(null);
        await fetchVaultData();
      } else {
        alert(data.message || 'Error recording handover');
      }
    } catch (err) {
      console.error('Error recording handover:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6 space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔐</span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                Lost & Found Digital Vault
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-widest font-bold">
                  Shift 66 Verified
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Dual-Custody High-Value Locker Registry, Guest Identity Verification & Express Courier Shipping Pipeline
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="btn-log-found-item"
            onClick={() => setLogModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-900/30 transition-all active:scale-95"
          >
            <span>+</span> Log Found Asset
          </button>
        </div>
      </div>

      {/* KPI Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Logged</span>
          <span data-testid="metric-total-logged" className="text-2xl font-black text-slate-100 mt-1">
            {metrics.totalLogged}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 flex flex-col justify-between">
          <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">In Vault</span>
          <span data-testid="metric-active-vault" className="text-2xl font-black text-blue-400 mt-1">
            {metrics.activeInVault}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 flex flex-col justify-between">
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">High Value Vault</span>
          <span data-testid="metric-high-value" className="text-2xl font-black text-amber-400 mt-1">
            {metrics.highValueSecured}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 flex flex-col justify-between">
          <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Pending Dispatch</span>
          <span data-testid="metric-pending-dispatch" className="text-2xl font-black text-purple-400 mt-1">
            {metrics.pendingDispatch}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex flex-col justify-between">
          <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Courier Dispatched</span>
          <span data-testid="metric-courier-dispatched" className="text-2xl font-black text-cyan-400 mt-1">
            {metrics.courierDispatched}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Handed Over</span>
          <span data-testid="metric-claimed-person" className="text-2xl font-black text-emerald-400 mt-1">
            {metrics.claimedInPerson}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 flex flex-col justify-between">
          <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">Retention Due</span>
          <span data-testid="metric-retention-due" className="text-2xl font-black text-rose-400 mt-1">
            {metrics.retentionDueCount}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              data-testid="input-vault-search"
              type="text"
              placeholder="Search tracking #, description, guest, locker, waybill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
          </div>

          {/* Status Filter */}
          <select
            data-testid="select-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="LOGGED">In Vault (Logged)</option>
            <option value="VERIFIED_PENDING_DISPATCH">Verified / Ready for Dispatch</option>
            <option value="COURIER_DISPATCHED">Courier Dispatched</option>
            <option value="CLAIMED_IN_PERSON">Claimed In-Person</option>
            <option value="DISPOSED">Disposed / Auctioned</option>
          </select>

          {/* Category Filter */}
          <select
            data-testid="select-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Categories</option>
            <option value="ELECTRONICS">Electronics</option>
            <option value="JEWELRY">Jewelry & Valuables</option>
            <option value="CLOTHING">Clothing & Accessories</option>
            <option value="DOCUMENTS">Documents & Passports</option>
            <option value="KEYS">Keys & Cards</option>
            <option value="OTHER">Other</option>
          </select>

          {/* High-Value Toggle */}
          <button
            data-testid="btn-toggle-high-value"
            onClick={() => setIsHighValueOnly(!isHighValueOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
              isHighValueOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-950'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            ⭐ High-Value Only
          </button>
        </div>

        <button
          onClick={fetchVaultData}
          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          title="Refresh Vault Items"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Asset Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading Digital Vault Assets...</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <p className="text-3xl mb-2">📦</p>
          <h3 className="text-base font-bold text-slate-300">No Vault Items Found</h3>
          <p className="text-xs text-slate-500 mt-1">Adjust filters or click "+ Log Found Asset" to register an item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isHighVal = item.isHighValue;
            const isDispatched = item.status === 'COURIER_DISPATCHED';
            const isVerified = item.status === 'VERIFIED_PENDING_DISPATCH';
            const isClaimed = item.status === 'CLAIMED' || item.status === 'CLAIMED_IN_PERSON';

            return (
              <div
                key={item._id}
                data-testid={`vault-card-${item.trackingNumber}`}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isHighVal
                    ? 'bg-gradient-to-b from-slate-900 to-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-950/20'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                      {item.trackingNumber}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isHighVal && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1">
                          👑 High Value
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          isDispatched
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : isVerified
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : isClaimed
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Description & Category */}
                  <h3 className="font-bold text-white text-base leading-snug line-clamp-2 mb-1.5">
                    {item.description}
                  </h3>
                  <p className="text-xs text-slate-400 mb-3 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700 text-[11px]">
                      {item.category}
                    </span>
                    {item.estimatedValue && item.estimatedValue > 0 ? (
                      <span className="text-amber-400 font-semibold text-[11px]">
                        Est. ₹{item.estimatedValue.toLocaleString()}
                      </span>
                    ) : null}
                  </p>

                  {/* Location & Locker Info */}
                  <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/70 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Found At:</span>
                      <span className="font-medium text-slate-200">{item.foundLocation}</span>
                    </div>
                    {item.guestName && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Linked Guest:</span>
                        <span className="font-medium text-amber-300">{item.guestName}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Storage / Locker:</span>
                      <span className="font-semibold text-emerald-400">
                        {item.secureVaultLocker || item.storageLocation}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Retention Expiry:</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {new Date(item.retentionExpiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Courier Waybill Badge if Dispatched */}
                  {isDispatched && item.courierDispatch && (
                    <div className="mb-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-xs">
                      <div className="flex items-center justify-between text-cyan-300 font-semibold">
                        <span>🚚 {item.courierDispatch.courierPartner.replace(/_/g, ' ')}</span>
                        <span className="font-mono">{item.courierDispatch.waybillNumber}</span>
                      </div>
                      <p className="text-[11px] text-cyan-200/80 mt-1">
                        To: {item.courierDispatch.recipientName} ({item.courierDispatch.shippingAddress.city})
                      </p>
                    </div>
                  )}

                  {/* Verification Badge if Verified */}
                  {isVerified && item.claimVerification && (
                    <div className="mb-3 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-xs">
                      <div className="flex items-center justify-between text-purple-300 font-semibold">
                        <span>✓ Verified Claimant</span>
                        <span>{item.claimVerification.matchConfidenceScore}% Match</span>
                      </div>
                      <p className="text-[11px] text-purple-200/80 mt-1">
                        {item.claimVerification.claimantName} ({item.claimVerification.idProofType}{' '}
                        {item.claimVerification.idProofNumber})
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    data-testid={`btn-custody-${item.trackingNumber}`}
                    onClick={() => setSelectedItemForCustody(item)}
                    className="text-xs text-slate-400 hover:text-slate-200 underline decoration-dotted transition-colors"
                  >
                    Custody Trail ({item.custodyChain?.length || 1})
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Action buttons depending on state */}
                    {!isClaimed && !isDispatched && (
                      <>
                        {item.status === 'LOGGED' && (
                          <button
                            data-testid={`btn-verify-${item.trackingNumber}`}
                            onClick={() => {
                              setSelectedItemForVerify(item);
                              setVerifyForm((prev) => ({
                                ...prev,
                                claimantName: item.guestName || '',
                              }));
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
                          >
                            Verify Claim
                          </button>
                        )}

                        <button
                          data-testid={`btn-dispatch-${item.trackingNumber}`}
                          onClick={() => {
                            setSelectedItemForCourier(item);
                            setCourierForm((prev) => ({
                              ...prev,
                              recipientName: item.claimVerification?.claimantName || item.guestName || '',
                              recipientPhone: item.claimVerification?.claimantPhone || '',
                            }));
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
                        >
                          Courier
                        </button>

                        <button
                          data-testid={`btn-handover-${item.trackingNumber}`}
                          onClick={() => {
                            setSelectedItemForHandover(item);
                            setHandoverForm((prev) => ({
                              ...prev,
                              claimantName: item.claimVerification?.claimantName || item.guestName || '',
                            }));
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                        >
                          Handover
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Log Found Asset Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔐</span> Log Found Asset into Digital Vault
              </h2>
              <button
                onClick={() => setLogModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Item Description *</label>
                <input
                  data-testid="input-log-description"
                  required
                  type="text"
                  placeholder="e.g. Apple Watch Ultra 2 with Orange Alpine Loop"
                  value={logForm.description}
                  onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
                  <select
                    data-testid="select-log-category"
                    value={logForm.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const isHigh =
                        cat === 'ELECTRONICS' || cat === 'JEWELRY' || logForm.estimatedValue >= 5000;
                      setLogForm({ ...logForm, category: cat, isHighValue: isHigh });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="ELECTRONICS">Electronics</option>
                    <option value="JEWELRY">Jewelry & Valuables</option>
                    <option value="CLOTHING">Clothing & Accessories</option>
                    <option value="DOCUMENTS">Documents & Passports</option>
                    <option value="KEYS">Keys & Cards</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Found Location *</label>
                  <input
                    data-testid="input-log-location"
                    required
                    type="text"
                    placeholder="e.g. Room 304 Bedside Drawer"
                    value={logForm.foundLocation}
                    onChange={(e) => setLogForm({ ...logForm, foundLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Estimated Value (₹ INR)</label>
                  <input
                    data-testid="input-log-value"
                    type="number"
                    min="0"
                    placeholder="e.g. 75000"
                    value={logForm.estimatedValue || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      const isHigh =
                        val >= 5000 || logForm.category === 'ELECTRONICS' || logForm.category === 'JEWELRY';
                      setLogForm({ ...logForm, estimatedValue: val, isHighValue: isHigh });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Secure Vault Locker #</label>
                  <input
                    data-testid="input-log-locker"
                    type="text"
                    placeholder="e.g. VAULT-LOCKER-M3-09"
                    value={logForm.secureVaultLocker}
                    onChange={(e) => setLogForm({ ...logForm, secureVaultLocker: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tagged Guest Name</label>
                  <input
                    data-testid="input-log-guest"
                    type="text"
                    placeholder="e.g. Vikramaditya Singhania"
                    value={logForm.guestName}
                    onChange={(e) => setLogForm({ ...logForm, guestName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Retention Expiry (Days)</label>
                  <input
                    type="number"
                    value={logForm.retentionDays}
                    onChange={(e) => setLogForm({ ...logForm, retentionDays: Number(e.target.value) || 90 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <input
                  type="checkbox"
                  id="highValueCheck"
                  checked={logForm.isHighValue}
                  onChange={(e) => setLogForm({ ...logForm, isHighValue: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="highValueCheck" className="text-xs text-amber-300 font-medium">
                  Classify as High-Value Asset (Assigns to Dual-Custody Digital Vault)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  data-testid="btn-submit-log-item"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950 transition-all"
                >
                  Save & Secure in Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Verify Claim Modal */}
      {selectedItemForVerify && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🛡️</span> Duty Manager Claim Verification
              </h2>
              <button
                onClick={() => setSelectedItemForVerify(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Verifying item: <span className="font-bold text-amber-300">{selectedItemForVerify.description}</span> (
              {selectedItemForVerify.trackingNumber})
            </p>

            <form onSubmit={handleVerifyClaim} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Claimant Full Name *</label>
                  <input
                    data-testid="input-verify-name"
                    required
                    type="text"
                    value={verifyForm.claimantName}
                    onChange={(e) => setVerifyForm({ ...verifyForm, claimantName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
                  <input
                    data-testid="input-verify-phone"
                    required
                    type="text"
                    value={verifyForm.claimantPhone}
                    onChange={(e) => setVerifyForm({ ...verifyForm, claimantPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">ID Proof Type *</label>
                  <select
                    value={verifyForm.idProofType}
                    onChange={(e) => setVerifyForm({ ...verifyForm, idProofType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="AADHAAR">Govt Aadhaar Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                    <option value="OTHER">Other Official ID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">ID Proof Number *</label>
                  <input
                    data-testid="input-verify-id"
                    required
                    type="text"
                    placeholder="e.g. 4829-1029-4491"
                    value={verifyForm.idProofNumber}
                    onChange={(e) => setVerifyForm({ ...verifyForm, idProofNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Verification Notes & Evidence</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Guest provided invoice and unlocked device with passcode."
                  value={verifyForm.verificationNotes}
                  onChange={(e) => setVerifyForm({ ...verifyForm, verificationNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItemForVerify(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  data-testid="btn-submit-verify-claim"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950 transition-all"
                >
                  Approve Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Courier Dispatch Modal */}
      {selectedItemForCourier && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🚚</span> Prepare Courier Shipping Dispatch
              </h2>
              <button
                onClick={() => setSelectedItemForCourier(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Dispatching: <span className="font-bold text-amber-300">{selectedItemForCourier.description}</span> (
              {selectedItemForCourier.trackingNumber})
            </p>

            <form onSubmit={handleDispatchCourier} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Courier Partner *</label>
                  <select
                    data-testid="select-courier-partner"
                    value={courierForm.courierPartner}
                    onChange={(e) => setCourierForm({ ...courierForm, courierPartner: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="BLUE_DART">Blue Dart Express</option>
                    <option value="FEDEX">FedEx Express</option>
                    <option value="DHL">DHL Express</option>
                    <option value="DELHIVERY">Delhivery Logistics</option>
                    <option value="HOTEL_INTERNAL">Hotel Internal Courier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">AWB / Waybill Number *</label>
                  <input
                    data-testid="input-courier-waybill"
                    required
                    type="text"
                    placeholder="e.g. BLUEDART-EXP-889912004"
                    value={courierForm.waybillNumber}
                    onChange={(e) => setCourierForm({ ...courierForm, waybillNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient Name *</label>
                  <input
                    data-testid="input-recipient-name"
                    required
                    type="text"
                    value={courierForm.recipientName}
                    onChange={(e) => setCourierForm({ ...courierForm, recipientName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient Phone *</label>
                  <input
                    data-testid="input-recipient-phone"
                    required
                    type="text"
                    value={courierForm.recipientPhone}
                    onChange={(e) => setCourierForm({ ...courierForm, recipientPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Street Address *</label>
                <input
                  data-testid="input-shipping-street"
                  required
                  type="text"
                  placeholder="e.g. Penthouse 18, Worli Sea Face"
                  value={courierForm.street}
                  onChange={(e) => setCourierForm({ ...courierForm, street: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City *</label>
                  <input
                    data-testid="input-shipping-city"
                    required
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={courierForm.city}
                    onChange={(e) => setCourierForm({ ...courierForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={courierForm.state}
                    onChange={(e) => setCourierForm({ ...courierForm, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pincode</label>
                  <input
                    type="text"
                    placeholder="e.g. 400018"
                    value={courierForm.pincode}
                    onChange={(e) => setCourierForm({ ...courierForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Shipping Fee Borne By</label>
                  <select
                    value={courierForm.shippingFeePaidBy}
                    onChange={(e) => setCourierForm({ ...courierForm, shippingFeePaidBy: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="GUEST">Guest Paid</option>
                    <option value="HOTEL_COMPLIMENTARY">Hotel Complimentary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Shipping Fee Amount (₹)</label>
                  <input
                    data-testid="input-shipping-fee"
                    type="number"
                    min="0"
                    value={courierForm.shippingFeeAmount}
                    onChange={(e) => setCourierForm({ ...courierForm, shippingFeeAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItemForCourier(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  data-testid="btn-submit-courier-dispatch"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950 transition-all"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: In-Person Handover Modal */}
      {selectedItemForHandover && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🤝</span> Front Desk Handover
              </h2>
              <button
                onClick={() => setSelectedItemForHandover(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleHandover} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Claimant Full Name *</label>
                <input
                  data-testid="input-handover-name"
                  required
                  type="text"
                  value={handoverForm.claimantName}
                  onChange={(e) => setHandoverForm({ ...handoverForm, claimantName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone *</label>
                <input
                  data-testid="input-handover-phone"
                  required
                  type="text"
                  value={handoverForm.contactNumber}
                  onChange={(e) => setHandoverForm({ ...handoverForm, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ID Proof Number / Details *</label>
                <input
                  data-testid="input-handover-id"
                  required
                  type="text"
                  placeholder="e.g. DL-0420110099"
                  value={handoverForm.idProof}
                  onChange={(e) => setHandoverForm({ ...handoverForm, idProof: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Handover Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Direct handover at front desk lobby"
                  value={handoverForm.notes}
                  onChange={(e) => setHandoverForm({ ...handoverForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItemForHandover(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  data-testid="btn-submit-handover"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition-all"
                >
                  Confirm Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Custody Chain Audit Modal */}
      {selectedItemForCustody && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📜</span> Chain of Custody Audit Log
              </h2>
              <button
                onClick={() => setSelectedItemForCustody(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Asset: <span className="font-bold text-amber-300">{selectedItemForCustody.description}</span> (
              {selectedItemForCustody.trackingNumber})
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {selectedItemForCustody.custodyChain.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium">By: {entry.performedByName || 'Staff Member'}</p>
                  {entry.notes && <p className="text-xs text-slate-400 italic">"{entry.notes}"</p>}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedItemForCustody(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
