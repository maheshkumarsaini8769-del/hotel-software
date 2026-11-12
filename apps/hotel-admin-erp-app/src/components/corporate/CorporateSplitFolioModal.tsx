import React, { useState, useEffect } from 'react';
import {
  IGroupBookingUI,
  ICorporateInvoiceUI,
  IIndividualInvoiceUI,
  CorporateHelper,
} from '@spicehub/ui';
import { Printer, CreditCard, CheckCircle2 } from 'lucide-react';

export interface CorporateSplitInvoiceResponse {
  corporateInvoice?: ICorporateInvoiceUI;
  individualInvoices?: IIndividualInvoiceUI[];
}

interface CorporateSplitFolioModalProps {
  group: IGroupBookingUI;
  splitData?: CorporateSplitInvoiceResponse | null;
  fetchInvoices?: (groupBookingId: string) => Promise<{ corporateInvoice: any; individualInvoices: any; }>;
  onClose: () => void;
  onSettleCorporate: (group: IGroupBookingUI, dueAmount: number) => void;
  onSettleIndividual: (folioNumber: string, dueAmount: number) => void;
  loading?: boolean;
}

export const CorporateSplitFolioModal: React.FC<CorporateSplitFolioModalProps> = ({
  group,
  splitData,
  fetchInvoices,
  onClose,
  onSettleCorporate,
  onSettleIndividual,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'SPLIT_VIEW' | 'CORPORATE_B2B' | 'INDIVIDUAL_FOLIOS'>(
    'SPLIT_VIEW'
  );

  const [localSplitData, setLocalSplitData] = useState<CorporateSplitInvoiceResponse | null>(splitData || null);
  const [isLoading, setIsLoading] = useState(loading);

  useEffect(() => {
    if (splitData) {
      setLocalSplitData(splitData);
    } else if (fetchInvoices && group._id) {
      setIsLoading(true);
      fetchInvoices(group._id)
        .then((data) => setLocalSplitData(data))
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [group._id, splitData, fetchInvoices]);

  const policyInfo = CorporateHelper.getSplitPolicyInfo(group.splitBillingPolicy);
  const corporateInvoice = localSplitData?.corporateInvoice;
  const individualInvoices = localSplitData?.individualInvoices || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden text-xs text-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-700 font-bold">{group.groupBookingCode}</span>
              <span className="text-slate-300">|</span>
              <h2 className="text-base font-bold text-slate-900">Corporate Master Folio & Split Ledger</h2>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-600 font-semibold">{group.groupName}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${policyInfo.badgeClass}`}>
                {policyInfo.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Invoices</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('SPLIT_VIEW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'SPLIT_VIEW'
                ? 'btn-glass-green'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Split Overview (B2B + Guests)
          </button>
          <button
            onClick={() => setActiveTab('CORPORATE_B2B')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'CORPORATE_B2B'
                ? 'btn-glass-green'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Corporate B2B Invoice
          </button>
          <button
            onClick={() => setActiveTab('INDIVIDUAL_FOLIOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'INDIVIDUAL_FOLIOS'
                ? 'btn-glass-green'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Individual Room Folios ({individualInvoices.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-20 text-center">
              <span className="inline-block w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-slate-500 text-xs mt-3">Compiling split master ledgers...</div>
            </div>
          ) : (
            <>
              {/* TAB 1: SPLIT VIEW (Side by Side) */}
              {activeTab === 'SPLIT_VIEW' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Corporate B2B Account */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Corporate Account (B2B)
                          </h3>
                        </div>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {corporateInvoice?.folioNumber}
                        </span>
                      </div>

                      <div className="py-3 text-xs space-y-1.5">
                        <div className="text-slate-900 font-bold text-sm">
                          {corporateInvoice?.companyName || group.companyName || group.groupName}
                        </div>
                        {corporateInvoice?.companyGst && (
                          <div className="font-mono text-emerald-700 text-[11px] font-medium">
                            GSTIN: {corporateInvoice.companyGst}
                          </div>
                        )}
                        <div className="text-slate-500 text-[11px]">
                          Authorized Organizer: {group.organizerName} ({group.organizerPhone})
                        </div>
                      </div>

                      {/* Line Item Summary */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 mb-4">
                        <div className="flex justify-between text-slate-600">
                          <span>Total Room Tariffs:</span>
                          <span className="text-slate-900 font-semibold font-mono">
                            ₹{(corporateInvoice?.totalTariff || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Accommodation GST (12% / 18%):</span>
                          <span className="text-slate-900 font-semibold font-mono">
                            ₹{(corporateInvoice?.taxes || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>Advance Deposit Credited:</span>
                          <span className="font-mono">- ₹{(corporateInvoice?.advancePaid || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                          <span className="text-slate-900">Corporate Balance Due:</span>
                          <span className="text-emerald-700 font-mono">
                            ₹{(corporateInvoice?.dueAmount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(corporateInvoice?.dueAmount || 0) > 0 ? (
                      <button
                        onClick={() => onSettleCorporate(group, corporateInvoice?.dueAmount || 0)}
                        className="btn-glass-green w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Settle Corporate Master Account</span>
                      </button>
                    ) : (
                      <div className="py-2.5 text-center text-emerald-800 font-bold bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Corporate Account 100% Settled</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Individual Guest Folios */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Guest Personal Accounts
                          </h3>
                        </div>
                        <span className="text-slate-500 text-[11px]">
                          {individualInvoices.length} In-House Rooms
                        </span>
                      </div>

                      <div className="py-3 max-h-72 overflow-y-auto space-y-2.5 pr-1">
                        {individualInvoices.length === 0 ? (
                          <div className="py-8 text-center text-slate-400">
                            No individual room stays checked in yet.
                          </div>
                        ) : (
                          individualInvoices.map((inv, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-slate-900">
                                    Room {inv.roomNumber || 'TBD'} • {inv.guestName}
                                  </span>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {inv.folioNumber}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold font-mono ${inv.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                    ₹{inv.dueAmount.toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {inv.dueAmount > 0 ? 'Due' : 'Paid'}
                                  </div>
                                </div>
                              </div>

                              {/* Charges breakdown */}
                              {inv.lineItems && inv.lineItems.length > 0 && (
                                <div className="pt-1.5 border-t border-slate-200 space-y-1">
                                  {inv.lineItems.map((li, lIdx) => (
                                    <div key={lIdx} className="flex justify-between text-[11px] text-slate-600">
                                      <span className="truncate pr-2">{li.description}</span>
                                      <span className="font-mono text-slate-800">
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
                                    className="btn-glass-green-subtle px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer"
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
                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 font-sans shadow-xs">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">TAX INVOICE (B2B)</h2>
                      <p className="text-slate-500 text-xs">SpiceHub Hospitality & Resort ERP</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-emerald-700 font-bold">{corporateInvoice?.folioNumber}</div>
                      <div className="text-slate-500 text-[11px]">Date: {new Date().toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div>
                      <div className="text-slate-500 font-semibold text-[11px] uppercase">Billed To (Corporate)</div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {corporateInvoice?.companyName || group.companyName || group.groupName}
                      </div>
                      {corporateInvoice?.companyGst && (
                        <div className="text-xs font-mono text-emerald-700 font-medium">GSTIN: {corporateInvoice.companyGst}</div>
                      )}
                      <div className="text-xs text-slate-500">Attn: {group.organizerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500 font-semibold text-[11px] uppercase">Booking Reference</div>
                      <div className="text-sm font-mono font-bold text-slate-800 mt-1">{group.groupBookingCode}</div>
                      <div className="text-xs text-slate-500">Total Rooms: {group.rooms.length}</div>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Taxable Value</th>
                        <th className="p-3 text-right">GST</th>
                        <th className="p-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      <tr>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">Group Room Tariff Package</div>
                          <div className="text-[11px] text-slate-500">{group.groupName} ({group.rooms.length} Rooms)</div>
                        </td>
                        <td className="p-3 text-right font-mono">{group.rooms.length}</td>
                        <td className="p-3 text-right font-mono">₹{(corporateInvoice?.totalTariff || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono">₹{(corporateInvoice?.taxes || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          ₹{((corporateInvoice?.totalTariff || 0) + (corporateInvoice?.taxes || 0)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex justify-end pt-2">
                    <div className="w-64 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Advance Paid:</span>
                        <span className="font-mono text-emerald-700 font-semibold">-₹{(corporateInvoice?.advancePaid || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                        <span>Balance Payable:</span>
                        <span className="font-mono text-emerald-700">₹{(corporateInvoice?.dueAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: INDIVIDUAL ROOM FOLIOS */}
              {activeTab === 'INDIVIDUAL_FOLIOS' && (
                <div className="space-y-4">
                  {individualInvoices.map((inv, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <div>
                          <span className="text-sm font-bold text-slate-900">
                            Room {inv.roomNumber || 'TBD'} • {inv.guestName}
                          </span>
                          <span className="text-slate-500 text-xs ml-2 font-mono">({inv.guestPhone})</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold text-sm ${inv.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            Due: ₹{inv.dueAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        {inv.lineItems && inv.lineItems.length > 0 ? (
                          inv.lineItems.map((li, lIdx) => (
                            <div key={lIdx} className="flex justify-between text-xs text-slate-600">
                              <span>{li.description}</span>
                              <span className="font-mono text-slate-800">₹{li.netAmount.toLocaleString('en-IN')}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-400 text-xs">No personal incidental charges posted.</div>
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
