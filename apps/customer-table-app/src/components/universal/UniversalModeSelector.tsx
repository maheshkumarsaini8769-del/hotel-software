import React from 'react';
import { CustomerServiceMode } from '@spicehub/ui';

export interface UniversalModeSelectorProps {
  currentMode?: CustomerServiceMode;
  onSelectMode: (mode: CustomerServiceMode) => void;
}

export const UniversalModeSelector: React.FC<UniversalModeSelectorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  const modes: Array<{
    mode: CustomerServiceMode;
    title: string;
    description: string;
    icon: string;
    color: string;
  }> = [
    {
      mode: 'IN_ROOM_DINING',
      title: 'In-Room Dining',
      description: 'Delivered directly to your hotel room. Charge to room folio or pay UPI.',
      icon: '🛏️',
      color: '#4F46E5', // Indigo
    },
    {
      mode: 'DINE_IN_RESTAURANT',
      title: 'Restaurant Dine-In',
      description: 'Table-side service in dining hall, garden or rooftop. Direct KOT to kitchen.',
      icon: '🍽️',
      color: '#059669', // Emerald Green
    },
    {
      mode: 'TAKEAWAY_PICKUP',
      title: 'Takeaway & Pickup',
      description: 'Order ahead and collect freshly prepared food at the express counter.',
      icon: '🛍️',
      color: '#D97706', // Amber
    },
  ];

  return (
    <div style={{ padding: '16px', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111827' }}>
          Welcome to SpiceHub Guest Dining
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#6B7280' }}>
          Where would you like your food served today?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {modes.map((m) => {
          const isSelected = currentMode === m.mode;
          return (
            <button
              key={m.mode}
              onClick={() => onSelectMode(m.mode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: isSelected ? `2px solid ${m.color}` : '1px solid #E5E7EB',
                backgroundColor: isSelected ? '#EEF2FF' : '#FFFFFF',
                boxShadow: isSelected
                  ? '0 4px 6px -1px rgba(79, 70, 229, 0.15)'
                  : '0 1px 3px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: '64px',
                transition: 'all 0.15s ease-in-out',
              }}
            >
              <span style={{ fontSize: '32px', flexShrink: 0 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                    {m.title}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: m.color,
                        color: '#FFFFFF',
                        fontWeight: 600,
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                  {m.description}
                </div>
              </div>
              <span style={{ fontSize: '18px', color: '#9CA3AF' }}>➔</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
