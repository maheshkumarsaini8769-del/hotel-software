import React, { useState } from 'react';
import {
  ServiceRequestDTO,
  ServiceRequestType,
  CustomerServiceMode,
  CustomerPortalHelper,
} from '@spicehub/ui';

export interface UniversalServiceTrackerProps {
  serviceMode: CustomerServiceMode;
  serviceRequests: ServiceRequestDTO[];
  onRequestService: (type: ServiceRequestType, notes?: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export const UniversalServiceTracker: React.FC<UniversalServiceTrackerProps> = ({
  serviceMode,
  serviceRequests,
  onRequestService,
  isSubmitting = false,
}) => {
  const [selectedType, setSelectedType] = useState<ServiceRequestType | null>(null);
  const [notes, setNotes] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const quickButtons: Array<{
    type: ServiceRequestType;
    label: string;
    icon: string;
  }> =
    serviceMode === 'IN_ROOM_DINING'
      ? [
          { type: 'WATER_REFILL', label: 'Bottled Water', icon: '💧' },
          { type: 'CALL_ROOM_SERVICE', label: 'Room Attendant', icon: '🛎️' },
          { type: 'EXTRA_CUTLERY', label: 'Plates & Cutlery', icon: '🍴' },
          { type: 'ROOM_CLEANING', label: 'Trash Clearance', icon: '🧹' },
        ]
      : [
          { type: 'WATER_REFILL', label: 'Water Refill', icon: '💧' },
          { type: 'CALL_WAITER', label: 'Call Waiter', icon: '🛎️' },
          { type: 'EXTRA_CUTLERY', label: 'Extra Cutlery', icon: '🍴' },
          { type: 'REQUEST_BILL', label: 'Ask for Bill', icon: '🧾' },
        ];

  const handleOpenRequest = (type: ServiceRequestType) => {
    setSelectedType(type);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleConfirmRequest = async () => {
    if (selectedType) {
      await onRequestService(selectedType, notes.trim() || undefined);
      setIsModalOpen(false);
      setSelectedType(null);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>
          🛎️ Quick Assistance & Table Service
        </h3>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>1-Tap Staff Alert</span>
      </div>

      {/* Quick Buttons Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        {quickButtons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => handleOpenRequest(btn.type)}
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <span>{btn.icon}</span>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Active Service Requests List */}
      {serviceRequests.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>
            Active Service Alerts ({serviceRequests.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {serviceRequests.map((req) => {
              const badge = CustomerPortalHelper.getStatusBadgeStyle(req.status);
              return (
                <div
                  key={req.requestId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {CustomerPortalHelper.formatServiceRequestLabel(req.requestType)}
                    </div>
                    {req.notes && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        Note: {req.notes}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      backgroundColor: badge.bg,
                      color: badge.text,
                      fontWeight: 600,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Request Modal */}
      {isModalOpen && selectedType && (
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
              maxWidth: '380px',
              width: '100%',
              padding: '20px',
            }}
          >
            <h4 style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              Confirm {CustomerPortalHelper.formatServiceRequestLabel(selectedType)}
            </h4>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#6B7280' }}>
              Our staff on floor will immediately receive this priority notification.
            </p>
            <input
              type="text"
              placeholder="Any specific instructions? (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRequest}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                {isSubmitting ? 'Sending...' : 'Confirm Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
