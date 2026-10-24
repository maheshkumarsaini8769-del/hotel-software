import React, { useState } from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b0e14] border border-cyan-500/40 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-zinc-100 flex flex-col items-center">
        {/* Terminal Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Staff Attendance Terminal
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        {/* Current Time Display */}
        <div className="text-center my-4">
          <div className="text-3xl font-black font-mono text-white tracking-wider">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 my-2 h-10 w-full bg-zinc-900 border border-zinc-800 rounded-2xl">
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`h-3 w-3 rounded-full transition-all ${
                pin.length > idx ? 'bg-cyan-400 scale-125 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`my-2 p-2 rounded-xl text-xs font-semibold text-center w-full ${
              feedback.isError ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
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
              className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-800 text-xl font-bold font-mono text-white active:scale-95 transition-all shadow"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-rose-500/20 text-xs font-bold text-rose-400 active:scale-95 transition-all"
          >
            CLR
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-800 text-xl font-bold font-mono text-white active:scale-95 transition-all shadow"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-sm font-bold text-zinc-400 active:scale-95 transition-all"
          >
            ⌫
          </button>
        </div>

        {/* Actions: Clock-In & Clock-Out */}
        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          <button
            type="button"
            disabled={loading || pin.length < 4}
            onClick={() => handleAction('IN')}
            className="py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-40"
          >
            Clock In 🟢
          </button>
          <button
            type="button"
            disabled={loading || pin.length < 4}
            onClick={() => handleAction('OUT')}
            className="py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-900/30 transition-all disabled:opacity-40"
          >
            Clock Out 🔴
          </button>
        </div>
      </div>
    </div>
  );
};
