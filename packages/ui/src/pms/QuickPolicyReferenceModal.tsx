import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  DoorOpen,
  Receipt,
  Coffee,
  Sparkles,
} from 'lucide-react';

export interface QuickPolicyReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

interface QuickRule {
  id: string;
  category: 'CHECKIN_OUT' | 'KYC' | 'CANCELLATION' | 'BILLING' | 'SAFETY';
  question: string;
  answer: string;
  highlight: string;
}

const QUICK_RULES: QuickRule[] = [
  {
    id: 'qr-1',
    category: 'CHECKIN_OUT',
    question: 'What are standard Check-in and Check-out hours?',
    answer: 'Standard Check-in is 02:00 PM (14:00 hrs). Check-out is 11:00 AM (11:00 hrs). Complimentary 60-minute grace period allowed on prior request.',
    highlight: 'Check-in: 02:00 PM | Check-out: 11:00 AM | Grace: 60 mins',
  },
  {
    id: 'qr-2',
    category: 'CHECKIN_OUT',
    question: 'How are early check-in and late check-out billed?',
    answer: 'Early check-in before 06:00 AM charges 100% full prior night tariff; 06:00 AM – 10:00 AM charges 50% tariff. Late check-out between 12:00 PM – 02:00 PM charges 25%; between 02:00 PM – 06:00 PM charges 50%; past 06:00 PM charges 100% full night.',
    highlight: 'Before 06:00 AM = 100% | 06:00–10:00 AM = 50% | Past 02:00 PM = 50%',
  },
  {
    id: 'qr-3',
    category: 'KYC',
    question: 'What photo identity documents are accepted for domestic guests?',
    answer: 'Accepted domestic IDs: Aadhaar Card, Passport, Driving License, Voter ID Card. PAN Card is strictly NOT accepted as proof of residence or identity for hotel stay under govt regulations.',
    highlight: 'Accepted: Aadhaar, Passport, DL, Voter ID | Rejected: PAN Card',
  },
  {
    id: 'qr-4',
    category: 'KYC',
    question: 'What documents are mandatory for Foreign National guests?',
    answer: 'Foreign guests must produce original valid Passport and valid Indian Visa or OCI card. Reception must submit online Form C to the FRRO within 24 hours of arrival.',
    highlight: 'Original Passport + Indian Visa + Mandatory Form C within 24h',
  },
  {
    id: 'qr-5',
    category: 'CANCELLATION',
    question: 'What is the cancellation and refund policy?',
    answer: 'Cancellations > 48 hours prior to arrival receive 100% refund (less 3% gateway charges). Cancellations between 48 – 24 hours incur 50% penalty. Cancellations under 24 hours or No-Show are 100% non-refundable.',
    highlight: '> 48h = Full Refund | 48–24h = 50% Penalty | < 24h = Non-Refundable',
  },
  {
    id: 'qr-6',
    category: 'BILLING',
    question: 'What are the GST rates on hotel rooms and restaurant dining?',
    answer: 'Room tariff up to ₹7,500/night attracts 12% GST (6% CGST + 6% SGST). Room tariff exceeding ₹7,500 attracts 18% GST (9% CGST + 9% SGST). Restaurant F&B dine-in/takeaway attracts 5% GST without Input Tax Credit.',
    highlight: 'Rooms ≤ ₹7.5k: 12% | Rooms > ₹7.5k: 18% | F&B Dine-In: 5% GST',
  },
  {
    id: 'qr-7',
    category: 'BILLING',
    question: 'Can restaurant F&B bills be charged to a guest room folio?',
    answer: 'Yes, provided the guest has an active validated check-in status, the room is not flagged "No-Post / Cash-Only", and the waiter/cashier verifies the guest surname and collects a physical or digital signature.',
    highlight: 'Active check-in + Verified Surname + Signature required',
  },
  {
    id: 'qr-8',
    category: 'BILLING',
    question: 'What is the acceptable Cashier cash drawer variance?',
    answer: 'Acceptable cash variance is strictly ₹0.00. Any cash drawer discrepancy exceeding ₹100 requires an immediate written explanation and joint manager sign-off.',
    highlight: 'Acceptable: ₹0.00 | Discrepancy > ₹100 requires Manager Audit',
  },
  {
    id: 'qr-9',
    category: 'SAFETY',
    question: 'What is the smoking fine and property damage policy?',
    answer: 'All rooms and indoor areas are 100% Non-Smoking. Violations incur a non-negotiable ₹5,000 deep-cleaning & ozone fine posted to folio. Stained linen ₹1,200, lost keycard ₹300.',
    highlight: 'Smoking Fine: ₹5,000 | Lost Keycard: ₹300 | Stained Linen: ₹1,200',
  },
  {
    id: 'qr-10',
    category: 'SAFETY',
    question: 'How long are Lost & Found items kept in the vault?',
    answer: 'All found items must be logged within 60 minutes into the Digital Vault. Standard items (clothes, chargers) are held for 90 days. High-value items (passports, cash, jewelry) are held for 180 days.',
    highlight: 'Logged within 60 mins | Standard: 90 Days | Valuables: 180 Days',
  },
];

export const QuickPolicyReferenceModal: React.FC<QuickPolicyReferenceModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredRules = QUICK_RULES.filter((rule) => {
    if (selectedCategory !== 'ALL' && rule.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        rule.question.toLowerCase().includes(q) ||
        rule.answer.toLowerCase().includes(q) ||
        rule.highlight.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-3xl rounded-3xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
          isDark ? 'bg-[#0f111a] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight">Front-Line SOP & Quick Policy Reference</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                  Live Guide
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official rules on Check-in/out, KYC IDs, Cancellation penalties, Room GST, and F&B policies.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-800/60 space-y-3 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search e.g. late check out, PAN card, cancellation refund, smoking fine..."
              className="bg-transparent border-none outline-none w-full text-xs placeholder:text-slate-500 font-medium"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-400 hover:text-white text-xs">
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: 'All FAQs' },
              { id: 'CHECKIN_OUT', label: 'Check-In/Out' },
              { id: 'KYC', label: 'KYC & IDs' },
              { id: 'CANCELLATION', label: 'Cancellations' },
              { id: 'BILLING', label: 'Billing & GST' },
              { id: 'SAFETY', label: 'Safety & Damage' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === tab.id
                    ? 'bg-amber-500 text-black shadow-sm'
                    : isDark
                    ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rules Q&A List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredRules.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No policies found matching your search. Please try another keyword.
            </div>
          ) : (
            filteredRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 rounded-2xl border space-y-2 transition ${
                  isDark
                    ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{rule.question}</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 shrink-0">
                    {rule.category}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-5">
                  {rule.answer}
                </p>

                <div className="pl-5 pt-1">
                  <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                    Rule Highlight: {rule.highlight}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <span>Authoritative SpiceHub Hospitality SOP (2026 Edition)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
