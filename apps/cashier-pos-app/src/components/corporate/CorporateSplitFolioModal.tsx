import React, { useEffect, useState } from 'react';
import {
  IGroupBookingUI,
  ICorporateInvoiceUI,
  IIndividualInvoiceUI,
  CorporateHelper,
} from '@spicehub/ui';

interface CorporateSplitFolioModalProps {
  group: IGroupBookingUI;
  fetchInvoices: (groupBookingId: string) => Promise<{
    corporateInvoice: ICorporateInvoiceUI;
    individualInvoices: IIndividualInvoiceUI[];
  }>;
  onSettleCorporate: (group: IGroupBookingUI, amount: number) => Promise<void>;
  onSettleIndividual: (folioId: string, amount: number) => Promise<void>;
  onClose: () => void;
}

export const CorporateSplitFolioModal: React.FC<CorporateSplitFolioModalProps> = ({
  group,
  fetchInvoices,
  onSettleCorporate,
  onSettleIndividual,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [corporateInvoice, setCorporateInvoice] = useState<ICorporateInvoiceUI | null>(null);
  const [individualInvoices, setIndividualInvoices] = useState<IIndividualInvoiceUI[]>([]);
  const [activeTab, setActiveTab] = useState<'SPLIT_VIEW' | 'CORPORATE_B2B' | 'INDIVIDUAL_FOLIOS'>('SPLIT_VIEW');

  const policyInfo = CorporateHelper.getSplitPolicyInfo(group.splitBillingPolicy);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchInvoices(group._id);
      setCorporateInvoice(res.corporateInvoice);
      setIndividualInvoices(res.individualInvoices || []);
    } catch (err: any) {
      console.error('Failed to load group invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [group._id]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#121721] border border-amber-500/30 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs text-zinc-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#0b0e14]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-400 font-bold">{group.groupBookingCode}</span>
              <span className="text-zinc-600">|</span>
              <h2 className="text-lg font-bold text-white">Corporate Master Folio & Split Ledger</h2>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-zinc-400 font-semibold">{group.groupName}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${policyInfo.badgeClass}`}>
                {policyInfo.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700 flex items-center gap-1.5 transition-all"
            >
              <span>🖨️ Print Invoices</span>
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-6 py-2.5 bg-[#0e131d] border-b border-zinc-800/80 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('SPLIT_VIEW')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'SPLIT_VIEW'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            ⚡ Split Overview (B2B + Guests)
          </button>
          <button
            onClick={() => setActiveTab('CORPORATE_B2B')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'CORPORATE_B2B'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            🏢 Corporate B2B Invoice
          </button>
          <button
            onClick={() => setActiveTab('INDIVIDUAL_FOLIOS')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'INDIVIDUAL_FOLIOS'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            👤 Individual Room Folios ({individualInvoices.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-20 text-center">
              <span className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-zinc-400 text-xs mt-3">Compiling split master ledgers...</div>
            </div>
          ) : (
            <>
              {/* TAB 1: SPLIT VIEW (Side by Side) */}
              {activeTab === 'SPLIT_VIEW' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Corporate B2B Account */}
                  <div className="bg-[#0b0e14] p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            Corporate Account (B2B)
                          </h3>
                        </div>
                        <span className="font-mono text-zinc-400 text-[11px]">
                          {corporateInvoice?.folioNumber}
                        </span>
                      </div>

                      <div className="py-3 text-xs space-y-1.5">
                        <div className="text-zinc-200 font-bold text-sm">
                          {corporateInvoice?.companyName || group.companyName || group.groupName}
                        </div>
                        {corporateInvoice?.companyGst && (
                          <div className="font-mono text-amber-300 text-[11px]">
                            GSTIN: {corporateInvoice.companyGst}
                          </div>
                        )}
                        <div className="text-zinc-400 text-[11px]">
                          Authorized Organizer: {group.organizerName} ({group.organizerPhone})
                        </div>
                      </div>

                      {/* Line Item Summary */}
                      <div className="bg-[#121721] p-3.5 rounded-xl border border-zinc-800 space-y-2 mb-4">
                        <div className="flex justify-between text-zinc-400">
                          <span>Total Room Tariffs:</span>
                          <span className="text-zinc-200 font-semibold">
                            ₹{(corporateInvoice?.totalTariff || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Accommodation GST (12% / 18%):</span>
                          <span className="text-zinc-200 font-semibold">
                            ₹{(corporateInvoice?.taxes || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between text-emerald-400/90 font-medium">
                          <span>Advance Deposit Credited:</span>
                          <span>- ₹{(corporateInvoice?.advancePaid || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-sm">
                          <span className="text-zinc-200">Corporate Balance Due:</span>
                          <span className="text-amber-400">
                            ₹{(corporateInvoice?.dueAmount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(corporateInvoice?.dueAmount || 0) > 0 ? (
                      <button
                        onClick={() => onSettleCorporate(group, corporateInvoice?.dueAmount || 0)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg transition-all"
                      >
                        💳 Settle Corporate Master Account
                      </button>
                    ) : (
                      <div className="py-2 text-center text-emerald-400 font-bold bg-emerald-950/40 rounded-xl border border-emerald-800/40">
                        ✓ Corporate Account 100% Settled
                      </div>
                    )}
                  </div>

                  {/* Right: Individual Guest Folios */}
                  <div className="bg-[#0b0e14] p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            Guest Personal Accounts
                          </h3>
                        </div>
                        <span className="text-zinc-400 text-[11px]">
                          {individualInvoices.length} In-House Rooms
                        </span>
                      </div>

                      <div className="py-3 max-h-72 overflow-y-auto space-y-2.5 pr-1">
                        {individualInvoices.length === 0 ? (
                          <div className="py-8 text-center text-zinc-500">
                            No individual room stays checked in yet.
                          </div>
                        ) : (
                          individualInvoices.map((inv, idx) => (
                            <div
                              key={idx}
                              className="bg-[#121721] p-3 rounded-xl border border-zinc-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-zinc-200">
                                    Room {inv.roomNumber || 'TBD'} • {inv.guestName}
                                  </span>
                                  <div className="text-[10px] text-zinc-500 font-mono">
                                    {inv.folioNumber}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold ${inv.dueAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    ₹{inv.dueAmount.toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">
                                    {inv.dueAmount > 0 ? 'Due' : 'Paid'}
                                  </div>
                                </div>
                              </div>

                              {/* Charges breakdown */}
                              {inv.lineItems && inv.lineItems.length > 0 && (
                                <div className="pt-1.5 border-t border-zinc-800/80 space-y-1">
                                  {inv.lineItems.map((li, lIdx) => (
                                    <div key={lIdx} className="flex justify-between text-[11px] text-zinc-400">
                                      <span className="truncate pr-2">{li.description}</span>
                                      <span className="font-mono text-zinc-300">
                                        ₹{li.netAmount.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {inv.dueAmount > 0 && inv.folioNumber && (
                                <div className="pt-1.5 text-right">
                                  <button
                                    onClick={() => onSettleIndividual(inv.folioNumber || '', inv.dueAmount)}
                                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-medium text-[11px] border border-zinc-700"
                                  >
                                    Collect Guest Due
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CORPORATE B2B INVOICE VIEW */}
              {activeTab === 'CORPORATE_B2B' && (
                <div className="bg-[#0b0e14] p-6 rounded-2xl border border-zinc-800 space-y-4 font-sans">
                  <div className="flex justify-between items-start pb-4 border-b border-zinc-800">
                    <div>
                      <h2 className="text-lg font-bold text-white">TAX INVOICE (B2B)</h2>
                      <p className="text-zinc-400 text-xs">SpiceHub Hospitality & Resort ERP</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-amber-400 font-bold">{corporateInvoice?.folioNumber}</div>
                      <div className="text-zinc-500 text-[11px]">Date: {new Date().toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div>
                      <div className="text-zinc-500 font-semibold text-[11px] uppercase">Billed To (Corporate)</div>
                      <div className="text-sm font-bold text-zinc-200 mt-1">
                        {corporateInvoice?.companyName || group.companyName || group.groupName}
                      </div>
                      {corporateInvoice?.companyGst && (
                        <div className="text-xs font-mono text-amber-300">GSTIN: {corporateInvoice.companyGst}</div>
                      )}
                      <div className="text-xs text-zinc-400">Attn: {group.organizerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-zinc-500 font-semibold text-[11px] uppercase">Booking Reference</div>
                      <div className="text-sm font-mono font-bold text-zinc-300 mt-1">{group.groupBookingCode}</div>
                      <div className="text-xs text-zinc-400">Total Rooms: {group.rooms.length}</div>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border border-zinc-800 rounded-xl overflow-hidden">
                    <thead className="bg-[#121721] text-zinc-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Taxable Value</th>
                        <th className="p-3 text-right">GST</th>
                        <th className="p-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-zinc-300">
                      <tr>
                        <td className="p-3">
                          <div className="font-semibold text-zinc-200">Group Room Tariff Package</div>
                          <div className="text-[11px] text-zinc-500">{group.groupName} ({group.rooms.length} Rooms)</div>
                        </td>
                        <td className="p-3 text-right font-mono">{group.rooms.length}</td>
                        <td className="p-3 text-right font-mono">₹{(corporateInvoice?.totalTariff || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono">₹{(corporateInvoice?.taxes || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          ₹{((corporateInvoice?.totalTariff || 0) + (corporateInvoice?.taxes || 0)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex justify-end pt-2">
                    <div className="w-64 space-y-1.5 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span>Advance Paid:</span>
                        <span className="font-mono text-emerald-400">-₹{(corporateInvoice?.advancePaid || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-amber-400 pt-2 border-t border-zinc-800">
                        <span>Balance Payable:</span>
                        <span className="font-mono">₹{(corporateInvoice?.dueAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: INDIVIDUAL ROOM FOLIOS */}
              {activeTab === 'INDIVIDUAL_FOLIOS' && (
                <div className="space-y-4">
                  {individualInvoices.map((inv, idx) => (
                    <div key={idx} className="bg-[#0b0e14] p-4 rounded-xl border border-zinc-800">
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                        <div>
                          <span className="text-sm font-bold text-white">
                            Room {inv.roomNumber || 'TBD'} • {inv.guestName}
                          </span>
                          <span className="text-zinc-500 text-xs ml-2 font-mono">({inv.guestPhone})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-amber-400 font-bold text-sm">
                            Due: ₹{inv.dueAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        {inv.lineItems && inv.lineItems.length > 0 ? (
                          inv.lineItems.map((li, lIdx) => (
                            <div key={lIdx} className="flex justify-between text-xs text-zinc-300">
                              <span>{li.description}</span>
                              <span className="font-mono">₹{li.netAmount.toLocaleString('en-IN')}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-zinc-500 text-xs">No personal incidental charges posted.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
