import React, { useState } from 'react';
import { ConciergeServiceItem } from '../../../../packages/ui/src/guest-portal/types';
import { GuestPortalHelper } from '../../../../packages/ui/src/guest-portal/GuestPortalHelper';

export interface GuestConciergeGridProps {
  recentRequests?: Array<{ id: string; requestType: string; status: string; createdAt: string }>;
  onRequestSubmit: (requestType: string, notes?: string) => Promise<void> | void;
}

export const GuestConciergeGrid: React.FC<GuestConciergeGridProps> = ({
  recentRequests = [],
  onRequestSubmit,
}) => {
  const catalog = GuestPortalHelper.getStandardConciergeCatalog();
  const [selectedService, setSelectedService] = useState<ConciergeServiceItem | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOpenPrompt = (service: ConciergeServiceItem) => {
    setSelectedService(service);
    setNotes('');
    setSuccessMessage(null);
  };

  const handleConfirmSubmit = async () => {
    if (!selectedService) return;
    try {
      setIsSubmitting(true);
      await onRequestSubmit(selectedService.requestType, notes.trim() || undefined);
      setSuccessMessage(`Your request for ${selectedService.title} has been received by our housekeeping staff.`);
      setTimeout(() => {
        setSelectedService(null);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-5 space-y-6">
      {/* Section Title */}
      <div>
        <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
          <span>🛎️</span>
          <span>1-Tap In-Room Concierge & Housekeeping</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Tap any service below to notify our housekeeping team immediately.
        </p>
      </div>

      {/* Luxury Service Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalog.map((service) => (
          <div
            key={service.id}
            onClick={() => handleOpenPrompt(service)}
            className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-950/20 transition cursor-pointer select-none active:scale-[0.98] group flex flex-col justify-between h-40"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-3xl p-2 rounded-xl bg-slate-850 group-hover:scale-110 transition">
                  {service.icon}
                </span>
                {service.isPopular && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
              </div>
              <h3 className="text-sm font-extrabold text-white mt-3 group-hover:text-amber-300 transition">
                {service.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{service.subtitle}</p>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] font-bold text-amber-400">
              <span>Request Now</span>
              <span>➔</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent In-Flight Requests (if any) */}
      {recentRequests.length > 0 && (
        <div className="pt-4 border-t border-slate-900">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Recent In-Room Requests
          </h3>
          <div className="space-y-2">
            {recentRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🛎️</span>
                  <div>
                    <span className="font-bold text-white block">{req.requestType}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase">
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Confirmation Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{selectedService.icon}</span>
              <div>
                <h3 className="text-base font-extrabold">{selectedService.title}</h3>
                <p className="text-xs text-slate-400">{selectedService.subtitle}</p>
              </div>
            </div>

            {successMessage ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                ✅ {successMessage}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                    Special Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Leave outside door, please knock softly"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-amber-400 outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-950/40 transition active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending...' : 'Confirm Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
