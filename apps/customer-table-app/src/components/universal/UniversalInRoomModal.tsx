import React, { useState } from 'react';

export interface UniversalInRoomModalProps {
  initialRoomNumber?: string;
  initialGuestName?: string;
  onConfirm: (data: {
    roomNumber: string;
    guestName?: string;
    billingPreference: 'POST_TO_ROOM' | 'PAY_ONLINE_NOW';
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const UniversalInRoomModal: React.FC<UniversalInRoomModalProps> = ({
  initialRoomNumber = '',
  initialGuestName = '',
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  const [roomNumber, setRoomNumber] = useState(initialRoomNumber);
  const [guestName, setGuestName] = useState(initialGuestName);
  const [billingPreference, setBillingPreference] = useState<'POST_TO_ROOM' | 'PAY_ONLINE_NOW'>('POST_TO_ROOM');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      setError('Please enter your Room Number');
      return;
    }
    setError(null);
    onConfirm({
      roomNumber: roomNumber.trim(),
      guestName: guestName.trim() || undefined,
      billingPreference,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '440px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            🛏️ Confirm Room Details
          </h3>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#9CA3AF' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '14px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Room Number *
            </label>
            <input
              type="text"
              placeholder="e.g. 101, 204"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '15px',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Guest Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Name as registered on check-in"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '15px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Payment Method
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setBillingPreference('POST_TO_ROOM')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: billingPreference === 'POST_TO_ROOM' ? '2px solid #4F46E5' : '1px solid #E5E7EB',
                  backgroundColor: billingPreference === 'POST_TO_ROOM' ? '#EEF2FF' : '#FFFFFF',
                  color: billingPreference === 'POST_TO_ROOM' ? '#4F46E5' : '#4B5563',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Charge to Room Folio
              </button>
              <button
                type="button"
                onClick={() => setBillingPreference('PAY_ONLINE_NOW')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: billingPreference === 'PAY_ONLINE_NOW' ? '2px solid #4F46E5' : '1px solid #E5E7EB',
                  backgroundColor: billingPreference === 'PAY_ONLINE_NOW' ? '#EEF2FF' : '#FFFFFF',
                  color: billingPreference === 'PAY_ONLINE_NOW' ? '#4F46E5' : '#4B5563',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Pay Online / UPI
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '48px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '48px',
              }}
            >
              {isSubmitting ? 'Verifying...' : 'Start Ordering'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
