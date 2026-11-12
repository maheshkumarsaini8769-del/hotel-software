import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, Utensils, ArrowRight } from 'lucide-react';
import { io } from 'socket.io-client';

export type HelpCategory = 'ROOM' | 'DINING';

export interface ChatMessage {
  id: string;
  sender: 'guest' | 'staff' | 'system';
  senderName?: string;
  category: HelpCategory;
  text: string;
  location?: string;
  timestamp: string;
  status?: 'SENDING' | 'SENT' | 'ACCEPTED' | 'COMPLETED';
}

export interface CustomerNeedHelpChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotelId: string;
  hotelName?: string;
  currentRoomNumber?: string;
  currentTableNumber?: string;
  guestName?: string;
  guestPhone?: string;
  apiBaseUrl?: string;
  socketUrl?: string;
  initialCategory?: HelpCategory;
}

const ROOM_QUICK_CHIPS = [
  { id: 'HOUSEKEEPING', label: 'Room Cleaning' },
  { id: 'TOWEL_REPLENISH', label: 'Fresh Towels & Toiletries' },
  { id: 'MAINTENANCE', label: 'AC / Electrical Issue' },
  { id: 'KEYCARD', label: 'Keycard / Door Lock Help' },
  { id: 'LUGGAGE_ASSIST', label: 'Luggage & Bellboy Assist' },
  { id: 'RECEPTION_CALL', label: 'Speak with Front Desk' },
];

const DINING_QUICK_CHIPS = [
  { id: 'CALL_WAITER', label: 'Call Waiter to Table' },
  { id: 'WATER', label: 'Drinking Water Needed' },
  { id: 'FOOD_DELAY', label: 'Food Delayed / Order Status' },
  { id: 'CUTLERY', label: 'Extra Plates & Cutlery' },
  { id: 'BILL', label: 'Bill & Payment Assistance' },
  { id: 'CUSTOMIZATION', label: 'Food Customization Note' },
];

export const CustomerNeedHelpChatModal: React.FC<CustomerNeedHelpChatModalProps> = ({
  isOpen,
  onClose,
  hotelId,
  hotelName = 'SpiceHub Hotel',
  currentRoomNumber = '',
  currentTableNumber = '',
  guestName = 'Valued Guest',
  guestPhone = '',
  apiBaseUrl = 'http://localhost:5000',
  socketUrl = 'http://localhost:5000',
  initialCategory,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(() => {
    if (initialCategory) return initialCategory;
    if (currentTableNumber && !currentRoomNumber) return 'DINING';
    if (currentRoomNumber && !currentTableNumber) return 'ROOM';
    return null;
  });

  const [roomNumber, setRoomNumber] = useState(currentRoomNumber);
  const [tableNumber, setTableNumber] = useState(currentTableNumber);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync props to state
  useEffect(() => {
    if (currentRoomNumber) setRoomNumber(currentRoomNumber);
    if (currentTableNumber) setTableNumber(currentTableNumber);
  }, [currentRoomNumber, currentTableNumber]);

  // Load chat history from localStorage
  useEffect(() => {
    if (!hotelId) return;
    try {
      const stored = localStorage.getItem(`spicehub_help_chat_${hotelId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}

    // Initial greeting if no messages
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'system',
        category: 'ROOM',
        text: `Welcome to ${hotelName} Concierge & Support! Please choose your issue category below so we can route your message directly to Reception or your Floor Waiter.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'COMPLETED',
      },
    ]);
  }, [hotelId, hotelName]);

  // Persist messages to localStorage
  useEffect(() => {
    if (!hotelId || messages.length === 0) return;
    try {
      localStorage.setItem(`spicehub_help_chat_${hotelId}`, JSON.stringify(messages));
    } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, hotelId]);

  // Socket listener for live status updates from Reception & Waiter
  useEffect(() => {
    if (!isOpen || !hotelId) return;
    let socket: any = null;
    try {
      socket = io(socketUrl, { transports: ['websocket', 'polling'] });
      const channel = `${hotelId}_global`;
      socket.emit('join:room', { hotelId, room: channel });

      socket.on('request:status_updated', (data: any) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.requestId
              ? {
                  ...m,
                  status: data.status,
                  text: m.text + (data.status === 'ACCEPTED' ? '\n\nStaff member accepted your request and is en route.' : ''),
                }
              : m
          )
        );
      });

      socket.on('pms:concierge_request_updated', (data: any) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.requestId
              ? { ...m, status: data.status }
              : m
          )
        );
      });
    } catch (err) {
      console.warn('Socket connection error in chat modal:', err);
    }

    return () => {
      try {
        if (socket) socket.disconnect();
      } catch {}
    };
  }, [isOpen, hotelId, socketUrl]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string, requestType = 'ASSISTANCE') => {
    const finalContent = (textToSend || inputText).trim();
    if (!finalContent) return;

    const category = selectedCategory || 'ROOM';
    const loc = category === 'ROOM' ? `Room ${roomNumber || 'Guest'}` : `Table ${tableNumber || 'Floor'}`;

    const guestMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'guest',
      senderName: guestName,
      category,
      text: finalContent,
      location: loc,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'SENDING',
    };

    setMessages((prev) => [...prev, guestMsg]);
    setInputText('');
    setIsSubmitting(true);

    try {
      const payload: any = {
        hotelId,
        requestType,
        notes: `${category === 'ROOM' ? `[Room Issue - ${loc}]` : `[Dining Issue - ${loc}]`} ${finalContent}`,
        priority: 'HIGH',
      };

      if (category === 'ROOM') {
        payload.sourceType = 'HOTEL_STAY';
        payload.roomNumber = roomNumber || 'General';
      } else {
        payload.sourceType = 'TABLE_SESSION';
        payload.tableNumber = tableNumber || 'T-01';
      }

      const res = await fetch(`${apiBaseUrl}/api/v1/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        const assignedStaff = json.data?.assignedStaffName;
        const confirmText =
          category === 'ROOM'
            ? `Your room request has been received by Front Desk Reception! A team member is being dispatched to ${loc}.`
            : `Your table request has been paged to the Restaurant Captain & Floor Waiter! ${assignedStaff ? `${assignedStaff} has been notified and is` : 'Staff is'} arriving at ${loc}.`;

        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'staff',
          senderName: category === 'ROOM' ? 'Front Desk Reception' : 'Floor Captain / Waiter',
          category,
          text: confirmText,
          location: loc,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'SENT',
        };

        setMessages((prev) =>
          prev
            .map((m): ChatMessage => (m.id === guestMsg.id ? { ...m, status: 'SENT' as const, id: String(json.data?._id || m.id) } : m))
            .concat(botReply)
        );
      } else {
        throw new Error(json?.message || 'Could not dispatch request');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'system',
        category,
        text: `We could not deliver your request to staff right now (${err.message}). Please alert front desk or retry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'COMPLETED',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="need-help-title"
      data-testid="customer-need-help-chat-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-lg h-[90dvh] max-h-[720px] bg-white rounded-3xl shadow-2xl border border-[#D7E5D9] flex flex-col overflow-hidden text-[#123C2B]">
        {/* Header */}
        <header className="px-5 py-3.5 bg-[#123C2B] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#E4F1E6] text-[#123C2B] font-black flex items-center justify-center text-lg shrink-0">
              S
            </div>
            <div className="min-w-0">
              <h2 id="need-help-title" className="text-base font-bold truncate">
                {hotelName} • Guest Support
              </h2>
              <p className="text-[11px] text-[#A2C4B0] flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>Live Staff Online • 24/7 Desk & Floor</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Chat"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Category Switcher Tabs */}
        <div className="px-4 py-2 bg-[#F2F7F2] border-b border-[#D7E5D9] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E7163]">
            Issue Route:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="chat-cat-room"
              onClick={() => setSelectedCategory('ROOM')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedCategory === 'ROOM'
                  ? 'bg-[#123C2B] text-[#F3D79B] shadow-xs'
                  : 'bg-white text-[#5E7163] hover:text-[#123C2B] border border-[#D7E5D9]'
              }`}
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>Room Issue</span>
              <ArrowRight className="w-3 h-3 opacity-60" />
              <span>Reception</span>
            </button>
            <button
              type="button"
              data-testid="chat-cat-dining"
              onClick={() => setSelectedCategory('DINING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedCategory === 'DINING'
                  ? 'bg-[#123C2B] text-[#F3D79B] shadow-xs'
                  : 'bg-white text-[#5E7163] hover:text-[#123C2B] border border-[#D7E5D9]'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 shrink-0" />
              <span>Dining Issue</span>
              <ArrowRight className="w-3 h-3 opacity-60" />
              <span>Waiter</span>
            </button>
          </div>
        </div>

        {/* Location Number Bar (Room # or Table #) */}
        <div className="px-4 py-2 bg-white border-b border-[#E8F1E9] flex items-center gap-3 text-xs shrink-0">
          <span className="font-semibold text-[#5E7163] shrink-0">
            {selectedCategory === 'ROOM' ? 'Room Number:' : 'Table Number:'}
          </span>
          {selectedCategory === 'ROOM' ? (
            <input
              type="text"
              data-testid="chat-room-number-input"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. 101, 204"
              className="flex-1 px-3 py-1 bg-[#F8FBF8] border border-[#D7E5D9] rounded-lg text-xs font-bold text-[#123C2B] focus:outline-none focus:border-[#123C2B]"
            />
          ) : (
            <input
              type="text"
              data-testid="chat-table-number-input"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. T-01, 5"
              className="flex-1 px-3 py-1 bg-[#F8FBF8] border border-[#D7E5D9] rounded-lg text-xs font-bold text-[#123C2B] focus:outline-none focus:border-[#123C2B]"
            />
          )}
          <span className="text-[10px] text-[#5E7163] shrink-0 flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span>{selectedCategory === 'ROOM' ? 'Sent to Reception PMS' : 'Paged to Floor Staff'}</span>
          </span>
        </div>

        {/* Chat Feed Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFDF9]">
          {/* If no category picked yet, show welcoming choice cards */}
          {!selectedCategory && (
            <div className="p-4 bg-white rounded-2xl border border-[#D7E5D9] space-y-3 shadow-xs">
              <p className="text-xs font-bold text-[#123C2B]">
                Please select where you need assistance:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ROOM')}
                  className="p-3.5 rounded-xl border-2 border-[#123C2B]/20 hover:border-[#123C2B] bg-[#F2F7F2] text-left transition flex flex-col gap-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#E8F1E9] flex items-center justify-center text-[#123C2B] mb-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-[#123C2B]">Room & Stay Issue</span>
                  <span className="text-[11px] text-[#5E7163]">
                    Dispatches directly to Front Desk Reception & Housekeeping.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('DINING')}
                  className="p-3.5 rounded-xl border-2 border-amber-600/20 hover:border-amber-600 bg-amber-50/50 text-left transition flex flex-col gap-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 mb-0.5">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-[#123C2B]">Dining & Table Issue</span>
                  <span className="text-[11px] text-[#5E7163]">
                    Pages Floor Waiters and Restaurant Captain instantly.
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((m) => {
            const isGuest = m.sender === 'guest';
            const isSystem = m.sender === 'system';

            if (isSystem) {
              return (
                <div key={m.id} className="text-center my-2">
                  <span className="inline-block px-3 py-1.5 rounded-full text-[11px] bg-[#E8F1E9] text-[#123C2B] font-medium leading-relaxed max-w-sm">
                    {m.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isGuest ? 'items-end' : 'items-start'} gap-1`}
              >
                <span className="text-[10px] font-semibold text-[#5E7163] px-1">
                  {isGuest ? `${guestName} (${m.location || 'Guest'})` : m.senderName || 'Hotel Staff'} • {m.timestamp}
                </span>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-xs ${
                    isGuest
                      ? 'bg-[#123C2B] text-white rounded-tr-none'
                      : 'bg-white text-[#123C2B] border border-[#D7E5D9] rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px] opacity-80 font-bold">
                    <span className="flex items-center gap-1">
                      {m.category === 'ROOM' ? (
                        <>
                          <Bell className="w-2.5 h-2.5" />
                          <span>Reception</span>
                        </>
                      ) : (
                        <>
                          <Utensils className="w-2.5 h-2.5" />
                          <span>Waiter</span>
                        </>
                      )}
                    </span>
                    {m.status && (
                      <span className="uppercase tracking-wide">
                        • {m.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Issue Chips */}
        {selectedCategory && (
          <div className="px-3 py-2 bg-white border-t border-[#E8F1E9] shrink-0">
            <span className="text-[10px] font-bold text-[#5E7163] uppercase tracking-wider block mb-1.5">
              Quick Select Issues:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {(selectedCategory === 'ROOM' ? ROOM_QUICK_CHIPS : DINING_QUICK_CHIPS).map(
                (chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSendMessage(chip.label, chip.id)}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EDF5EE] hover:bg-[#DCEEE0] text-[#123C2B] border border-[#B8D7C1] transition active:scale-95 disabled:opacity-50"
                  >
                    + {chip.label}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Text Input & Send */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-[#D7E5D9] flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            data-testid="chat-message-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSubmitting}
            placeholder={
              selectedCategory === 'ROOM'
                ? 'Type room issue for Reception (e.g. AC leaking, need towel)...'
                : 'Type table issue for Waiter (e.g. extra spoon, food delayed)...'
            }
            className="flex-1 px-4 py-2.5 bg-[#F8FBF8] border border-[#D7E5D9] rounded-xl text-xs font-medium text-[#123C2B] placeholder-[#7D8F81] focus:outline-none focus:border-[#123C2B]"
          />

          <button
            type="submit"
            data-testid="chat-send-btn"
            disabled={!inputText.trim() || isSubmitting}
            className="px-4 py-2.5 bg-[#123C2B] hover:bg-[#0E2A1E] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-40"
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};
