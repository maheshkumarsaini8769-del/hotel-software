import React, { useState } from 'react';
import { IVendorUI, VendorCategoryUI, PaymentTermsUI } from '@spicehub/ui';

interface VendorDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVendor: (vendor: Partial<IVendorUI>) => Promise<void>;
  loading: boolean;
}

export const VendorDirectoryModal: React.FC<VendorDirectoryModalProps> = ({
  isOpen,
  onClose,
  onSaveVendor,
  loading,
}) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [category, setCategory] = useState<VendorCategoryUI>('FOOD_BEVERAGE');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermsUI>('NET_30');
  const [address, setAddress] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactPerson || !phone || !email) return;

    await onSaveVendor({
      name,
      contactPerson,
      phone,
      email,
      gstin,
      category,
      paymentTerms,
      address,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f131a] border-2 border-blue-500/40 rounded-3xl w-full max-w-2xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.2)] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#10141e] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏢</span>
            <div>
              <h2 className="text-lg font-bold text-white">Register Supplier / Vendor Profile</h2>
              <p className="text-xs text-zinc-400">
                Onboard approved supplier with GSTIN and payment terms for PO generation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Company / Supplier Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Metro Wholesale Foods Ltd."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Primary Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Khurana"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-blue-400"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9811122334"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. orders@metrowholesale.in"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-blue-400"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                GSTIN Number
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="07AAAAA0000A1Z5"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white font-mono uppercase outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Supply Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VendorCategoryUI)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-blue-400"
              >
                <option value="FOOD_BEVERAGE">Food & Beverage</option>
                <option value="DAIRY">Dairy & Milk Products</option>
                <option value="MEAT_POULTRY">Fresh Meat & Poultry</option>
                <option value="DRY_GROCERY">Dry Grocery & Pulses</option>
                <option value="HOUSEKEEPING_CHEMICALS">Housekeeping Chemicals</option>
                <option value="PACKAGING">Packaging & Disposables</option>
                <option value="GENERAL_SUPPLIES">General Hotel Supplies</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTermsUI)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-blue-400"
              >
                <option value="IMMEDIATE">Immediate Cash/UPI</option>
                <option value="NET_15">Net 15 Days</option>
                <option value="NET_30">Net 30 Days Credit</option>
                <option value="NET_60">Net 60 Days Credit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Registered Warehouse / Billing Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Shed 14, APMC Wholesale Market, New Delhi"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-blue-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name || !contactPerson}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              {loading ? 'Saving Vendor...' : 'Register Vendor Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
