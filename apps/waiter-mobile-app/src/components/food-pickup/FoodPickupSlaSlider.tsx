import React, { useState } from 'react';
import { FoodPickupSlaConfigDTO } from '../../../../../packages/ui/src/food-pickup-sla';

export interface FoodPickupSlaSliderProps {
  initialConfig?: Partial<FoodPickupSlaConfigDTO>;
  onSaveConfig: (updated: Partial<FoodPickupSlaConfigDTO>) => Promise<void> | void;
}

export const FoodPickupSlaSlider: React.FC<FoodPickupSlaSliderProps> = ({
  initialConfig,
  onSaveConfig,
}) => {
  const [slaMinutes, setSlaMinutes] = useState<number>(initialConfig?.defaultPickupSlaMinutes || 3);
  const [maxSnoozeSeconds, setMaxSnoozeSeconds] = useState<number>(initialConfig?.maxSnoozeSeconds || 60);
  const [escalateToCaptain, setEscalateToCaptain] = useState<boolean>(
    initialConfig?.escalateToCaptainOnBreach !== false
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveConfig({
        defaultPickupSlaMinutes: slaMinutes,
        maxSnoozeSeconds,
        escalateToCaptainOnBreach: escalateToCaptain,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#111827' }}>
        ⏱️ Food Pickup SLA Settings
      </h3>

      {/* SLA Slider (2 to 10 mins) */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
            Pickup Deadline Target:
          </label>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#2563EB' }}>
            {slaMinutes} Minutes
          </span>
        </div>
        <input
          type="range"
          min={2}
          max={10}
          step={1}
          value={slaMinutes}
          onChange={(e) => setSlaMinutes(Number(e.target.value))}
          style={{
            width: '100%',
            height: '10px',
            borderRadius: '5px',
            cursor: 'pointer',
            accentColor: '#2563EB',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
          <span>2m (Fast-Casual / Express)</span>
          <span>10m (Fine-Dining Courses)</span>
        </div>
      </div>

      {/* Snooze Config */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
          Waiter "On My Way" Snooze Duration:
        </label>
        <select
          value={maxSnoozeSeconds}
          onChange={(e) => setMaxSnoozeSeconds(Number(e.target.value))}
          style={{
            width: '100%',
            minHeight: '48px',
            borderRadius: '10px',
            border: '1px solid #D1D5DB',
            padding: '0 12px',
            fontSize: '14px',
            color: '#111827',
          }}
        >
          <option value={30}>30 Seconds</option>
          <option value={60}>60 Seconds (Standard)</option>
          <option value={90}>90 Seconds</option>
        </select>
      </div>

      {/* Captain Escalation Checkbox */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="checkbox"
          id="captainEscalate"
          checked={escalateToCaptain}
          onChange={(e) => setEscalateToCaptain(e.target.checked)}
          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
        />
        <label htmlFor="captainEscalate" style={{ fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
          Escalate to Floor Captain if pickup SLA breached
        </label>
      </div>

      {savedSuccess && (
        <div
          style={{
            padding: '10px',
            backgroundColor: '#DCFCE7',
            color: '#166534',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '14px',
            textAlign: 'center',
          }}
        >
          ✅ Pickup SLA configuration saved successfully!
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          minHeight: '48px',
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving...' : '💾 Save Pickup SLA Settings'}
      </button>
    </div>
  );
};
