import React, { useState } from 'react';
import { X, Clock, LogIn, LogOut, Delete } from 'lucide-react';

interface StaffClockPinTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClockIn: (pin: string) => Promise<any>;
  onClockOut: (pin: string) => Promise<any>;
  loading: boolean;
}

export const StaffClockPinTerminalModal: React.FC<StaffClockPinTerminalModalProps> = ({
  isOpen,
  onClose,
  onClockIn,
  onClockOut,
  loading,
}) => {
  const [pin, setPin] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setFeedback(null);
    }
  };

  const handleClear = () => {
    setPin('');
    setFeedback(null);
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setFeedback(null);
  };

  const handleAction = async (action: 'IN' | 'OUT') => {
    if (pin.length < 4) {
      setFeedback({ message: 'Please enter a 4-digit PIN code', isError: true });
      return;
    }

    try {
      if (action === 'IN') {
        const res = await onClockIn(pin);
        setFeedback({ message: res?.message || 'Clocked in successfully!', isError: false });
      } else {
        const res = await onClockOut(pin);
        setFeedback({ message: res?.message || 'Clocked out successfully!', isError: false });
      }
      setPin('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback({ message: err?.message || 'Staff PIN not recognized', isError: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-slate-900 flex flex-col items-center animate-in zoom-in-95">
        {/* Terminal Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Staff Attendance Terminal
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Time Display */}
        <div className="text-center my-4">
          <div className="text-3xl font-black font-mono text-slate-900 tracking-wider">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 my-2 h-10 w-full bg-slate-50 border border-slate-200 rounded-2xl">
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`h-3 w-3 rounded-full transition-all ${
                pin.length > idx ? 'bg-emerald-600 scale-125 shadow-xs' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`my-2 p-2 rounded-xl text-xs font-semibold text-center w-full ${
              feedback.isError
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* 10-Key Numpad */}
        <div className="grid grid-cols-3 gap-2.5 w-full my-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-xl font-bold font-mono text-slate-900 active:scale-95 transition-all shadow-xs"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-rose-50 text-xs font-bold text-rose-600 active:scale-95 transition-all shadow-xs"
          >
            CLR
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-xl font-bold font-mono text-slate-900 active:scale-95 transition-all shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-sm font-bold text-slate-500 active:scale-95 transition-all shadow-xs flex items-center justify-center"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Actions: Clock-In & Clock-Out */}
        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          <button
            type="button"
            disabled={loading || pin.length < 4}
            onClick={() => handleAction('IN')}
            className="btn-glass-green py-3 rounded-2xl text-xs font-bold uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-4 h-4" />
            <span>Clock In</span>
          </button>
          <button
            type="button"
            disabled={loading || pin.length < 4}
            onClick={() => handleAction('OUT')}
            className="bg-rose-600 hover:bg-rose-700 py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Clock Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
