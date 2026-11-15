import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChefHat,
  Delete,
  LockKeyhole,
  ShieldCheck,
  Utensils,
  WalletCards,
} from 'lucide-react';
import { fetchActiveHotels, fetchStaffRoster, getStaffLoginError, loginWithStaffPin } from './api';
import { getPortalUrl } from './config';
import type { ActiveHotel, LoginStep, StaffProfile, StaffRole } from './types';

const steps: { id: LoginStep; label: string }[] = [
  { id: 'HOTEL_SELECT', label: 'Hotel' },
  { id: 'ROLE_SELECT', label: 'Role' },
  { id: 'STAFF_SELECT', label: 'Staff' },
  { id: 'PIN_ENTRY', label: 'PIN' },
];

const roles: {
  id: StaffRole;
  name: string;
  description: string;
  icon: typeof Utensils;
}[] = [
  { id: 'waiter', name: 'Waiter', description: 'Tables and service', icon: Utensils },
  { id: 'cashier', name: 'Cashier', description: 'Bills and payments', icon: WalletCards },
  { id: 'kds', name: 'Kitchen', description: 'Kitchen display', icon: ChefHat },
  { id: 'reception', name: 'Reception', description: 'Front desk', icon: Building2 },
];

const apiRoleNames: Record<StaffRole, string[]> = {
  waiter: ['WAITER'],
  cashier: ['CASHIER'],
  kds: ['CHEF', 'KITCHEN'],
  reception: ['RECEPTIONIST', 'RECEPTION'],
};

function isRoleEnabled(hotel: ActiveHotel, role: StaffRole): boolean {
  return hotel.enabledPortals.some((portal) => portal.toLowerCase() === role);
}

function isStaffForRole(staff: StaffProfile, role: StaffRole): boolean {
  return apiRoleNames[role].includes(staff.role.toUpperCase());
}

function App() {
  const [step, setStep] = useState<LoginStep>('HOTEL_SELECT');
  const [hotels, setHotels] = useState<ActiveHotel[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [hotelsError, setHotelsError] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<ActiveHotel | null>(null);
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [shakePin, setShakePin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hotelRetry, setHotelRetry] = useState(0);
  const [rosterRetry, setRosterRetry] = useState(0);
  const loginInProgress = useRef(false);

  const currentStepIndex = steps.findIndex(({ id }) => id === step);
  const selectedRoleName = roles.find(({ id }) => id === selectedRole)?.name ?? 'Staff portal';
  const availableRoles = roles.filter((role) => selectedHotel && isRoleEnabled(selectedHotel, role.id));
  const matchingStaff = selectedRole
    ? staff.filter((member) => isStaffForRole(member, selectedRole))
    : [];
  const selectedStaffCanLogin = Boolean(
    selectedStaff && selectedStaff.hasPin && selectedStaff.pinApprovedByAdmin,
  );

  useEffect(() => {
    const controller = new AbortController();
    setHotelsLoading(true);
    setHotelsError('');
    fetchActiveHotels(controller.signal)
      .then(setHotels)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setHotelsError(error instanceof Error ? error.message : 'Could not load active hotels.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setHotelsLoading(false);
      });
    return () => controller.abort();
  }, [hotelRetry]);

  useEffect(() => {
    if (step !== 'STAFF_SELECT' || !selectedHotel || !selectedRole) return;

    const controller = new AbortController();
    setStaffLoading(true);
    setStaffError('');
    setStaff([]);
    setSelectedStaff(null);
    fetchStaffRoster(selectedHotel.id, selectedRole, controller.signal)
      .then((roster) => {
        if (!controller.signal.aborted) setStaff(roster);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setStaffError(error instanceof Error ? error.message : 'Could not load the staff roster.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setStaffLoading(false);
      });

    return () => controller.abort();
  }, [step, selectedHotel, selectedRole, rosterRetry]);

  useEffect(() => {
    if (step !== 'PIN_ENTRY' || !selectedStaffCanLogin) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        handlePinDigit(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        setPin((current) => current.slice(0, -1));
        setPinError('');
      } else if (event.key === 'Escape') {
        setPin('');
        setPinError('');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pin, step, selectedStaffCanLogin]);

  const goBack = () => {
    if (step === 'PIN_ENTRY') {
      setPin('');
      setPinError('');
      setStep('STAFF_SELECT');
    } else if (step === 'STAFF_SELECT') {
      setSelectedStaff(null);
      setStaff([]);
      setStep('ROLE_SELECT');
    } else if (step === 'ROLE_SELECT') {
      setSelectedRole(null);
      setSelectedStaff(null);
      setStep('HOTEL_SELECT');
    }
  };

  const submitPin = async (value: string) => {
    if (!selectedHotel || !selectedRole || !selectedStaff || loginInProgress.current) return;
    loginInProgress.current = true;
    setIsSubmitting(true);
    setPinError('');

    try {
      const portalUrl = getPortalUrl(selectedRole);
      const session = await loginWithStaffPin(selectedStaff.id, selectedHotel.id, selectedRole, value);
      localStorage.setItem('spicehub_staff_unified_session', JSON.stringify(session));

      const destination = new URL(portalUrl);
      destination.searchParams.set('token', session.token);
      destination.searchParams.set('hotelId', session.user.hotelId || selectedHotel.id);
      destination.searchParams.set('staffId', session.user.id);
      destination.searchParams.set('staffName', session.user.name);
      destination.searchParams.set('staffRole', session.user.role);
      window.location.assign(destination.toString());
    } catch (error) {
      const result = getStaffLoginError(error);
      setPinError(result.message);
      if (result.invalidPin) {
        setPin('');
        setShakePin(true);
        window.setTimeout(() => setShakePin(false), 500);
      }
    } finally {
      loginInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (isSubmitting || !selectedStaffCanLogin) return;
    setPinError('');
    if (pin.length >= 4) return;
    const next = `${pin}${digit}`;
    setPin(next);
    if (next.length === 4) void submitPin(next);
  };

  const renderHotelStep = () => (
    <>
      <StepHeading
        title="Choose your hotel"
        description="Select the property where you are starting your shift."
      />
      {hotelsLoading && <p className="state-message">Loading active hotels…</p>}
      {hotelsError && (
        <div className="error-state" role="alert">
          <p>{hotelsError}</p>
          <button type="button" className="text-button" onClick={() => setHotelRetry((count) => count + 1)}>
            Try again
          </button>
        </div>
      )}
      {!hotelsLoading && !hotelsError && hotels.length === 0 && (
        <p className="state-message">No active hotels are available for staff sign-in.</p>
      )}
      <div className="choice-list">
        {hotels.map((hotel) => (
          <button
            type="button"
            key={hotel.id}
            aria-pressed={selectedHotel?.id === hotel.id}
            className={`choice-row ${selectedHotel?.id === hotel.id ? 'choice-row-selected' : ''}`}
            onClick={() => setSelectedHotel(hotel)}
          >
            <span className="choice-icon"><Building2 size={20} strokeWidth={1.8} /></span>
            <span className="choice-copy">
              <span className="choice-title">{hotel.name}</span>
              <span className="choice-subtitle">{hotel.city || 'Hotel property'}</span>
            </span>
            {selectedHotel?.id === hotel.id && <Check className="choice-check" size={19} />}
          </button>
        ))}
      </div>
      <ContinueButton
        disabled={!selectedHotel || hotelsLoading || Boolean(hotelsError)}
        onClick={() => setStep('ROLE_SELECT')}
        label="Continue"
      />
    </>
  );

  const renderRoleStep = () => (
    <>
      <StepHeading
        title="Choose a role"
        description={`Select a workstation for ${selectedHotel?.name ?? 'your hotel'}.`}
      />
      {availableRoles.length > 0 ? (
        <div className="role-list">
          {availableRoles.map(({ id, name, description, icon: Icon }) => (
            <button
              type="button"
              key={id}
              aria-pressed={selectedRole === id}
              className={`role-option ${selectedRole === id ? 'role-option-selected' : ''}`}
              onClick={() => {
                setSelectedRole(id);
                setSelectedStaff(null);
              }}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span className="role-copy">
                <span className="choice-title">{name}</span>
                <span className="choice-subtitle">{description}</span>
              </span>
              {selectedRole === id && <Check className="choice-check" size={19} />}
            </button>
          ))}
        </div>
      ) : (
        <p className="state-message">No staff workstations are enabled for this hotel.</p>
      )}
      <ContinueButton
        disabled={!selectedRole || !availableRoles.some(({ id }) => id === selectedRole)}
        onClick={() => setStep('STAFF_SELECT')}
        label="Continue"
      />
    </>
  );

  const renderStaffStep = () => (
    <>
      <StepHeading
        title="Select your profile"
        description={`Choose your staff profile for the ${selectedRoleName} workstation.`}
      />
      {staffLoading && <p className="state-message">Loading staff profiles…</p>}
      {staffError && (
        <div className="error-state" role="alert">
          <p>{staffError}</p>
          <button type="button" className="text-button" onClick={() => setRosterRetry((count) => count + 1)}>
            Try again
          </button>
        </div>
      )}
      {!staffLoading && !staffError && matchingStaff.length === 0 && (
        <p className="state-message">No active {selectedRoleName.toLowerCase()} profiles are available.</p>
      )}
      <div className="choice-list">
        {matchingStaff.map((member) => {
          const canLogin = member.hasPin && member.pinApprovedByAdmin;
          const profileStatus = !member.hasPin
            ? 'PIN setup required'
            : !member.pinApprovedByAdmin
              ? 'PIN awaiting approval'
              : member.shift || 'Staff profile';
          return (
            <button
              type="button"
              key={member.id}
              aria-pressed={selectedStaff?.id === member.id}
              className={`choice-row ${selectedStaff?.id === member.id ? 'choice-row-selected' : ''}`}
              onClick={() => setSelectedStaff(member)}
            >
              {member.avatar ? (
                <img className="staff-avatar" src={member.avatar} alt="" />
              ) : (
                <span className="staff-avatar" aria-hidden="true">
                  {member.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="choice-copy">
                <span className="choice-title">{member.name}</span>
                <span className={`choice-subtitle ${canLogin ? '' : 'choice-subtitle-warning'}`}>
                  {profileStatus}
                </span>
              </span>
              {selectedStaff?.id === member.id && <Check className="choice-check" size={19} />}
            </button>
          );
        })}
      </div>
      <ContinueButton
        disabled={!selectedStaffCanLogin || staffLoading || Boolean(staffError)}
        onClick={() => {
          setPin('');
          setPinError('');
          setStep('PIN_ENTRY');
        }}
        label="Continue to PIN"
      />
    </>
  );

  const renderPinStep = () => (
    <>
      <StepHeading title="Enter your PIN" description="Use your four-digit staff PIN to continue." />
      <div className="pin-profile">
        {selectedStaff?.avatar ? (
          <img className="staff-avatar" src={selectedStaff.avatar} alt="" />
        ) : (
          <span className="staff-avatar" aria-hidden="true">
            {selectedStaff?.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="choice-copy">
          <span className="choice-title">{selectedStaff?.name}</span>
          <span className="choice-subtitle">{selectedRoleName} · {selectedHotel?.name}</span>
        </span>
      </div>
      <div
        className={`pin-dots ${shakePin ? 'pin-shake' : ''}`}
        aria-label={`${pin.length} of 4 PIN digits entered`}
      >
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={`pin-dot ${pin.length > index ? 'pin-dot-filled' : ''}`} />
        ))}
      </div>
      <div className="keypad" aria-label="PIN keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'].map((key) => (
          <button
            type="button"
            key={key}
            disabled={isSubmitting}
            className={`keypad-key ${key === 'clear' || key === 'delete' ? 'keypad-action' : ''}`}
            aria-label={key === 'clear' ? 'Clear PIN' : key === 'delete' ? 'Delete last digit' : `Enter ${key}`}
            onClick={() => {
              if (key === 'clear') {
                setPin('');
                setPinError('');
              } else if (key === 'delete') {
                setPin((current) => current.slice(0, -1));
                setPinError('');
              } else {
                handlePinDigit(key);
              }
            }}
          >
            {key === 'clear' ? 'Clear' : key === 'delete' ? <Delete size={19} /> : key}
          </button>
        ))}
      </div>
      {isSubmitting && <p className="state-message" role="status">Verifying PIN…</p>}
      {pinError && <p className="pin-error" role="alert">{pinError}</p>}
      <p className="preview-note pin-note">
        <LockKeyhole size={14} aria-hidden="true" />
        Your PIN is verified securely by the hotel server.
      </p>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="app-header">
        <a className="brand" href="/" aria-label="SpiceHub Staff Access home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span className="brand-text">
            <span className="brand-name">SpiceHub</span>
            <span className="brand-caption">Staff access</span>
          </span>
        </a>
        <div className="secure-label">
          <ShieldCheck size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>Staff sign-in</span>
        </div>
      </header>

      <main className="main-shell">
        <section className="intro">
          <p className="eyebrow">One sign-in for every shift</p>
          <h1>Staff portal</h1>
          <p className="intro-copy">
            Choose your hotel, workstation and profile to get started.
          </p>
          <div className="workstation-summary" aria-label="Available workstations">
            <span>Waiter</span><span>Cashier</span><span>Kitchen</span><span>Reception</span>
          </div>
        </section>

        <section className="login-panel" aria-labelledby="step-title">
          <div className="step-track" aria-label={`Step ${currentStepIndex + 1} of 4`}>
            {steps.map(({ id, label }, index) => {
              const isComplete = index < currentStepIndex;
              const isCurrent = id === step;
              return (
                <div
                  key={id}
                  className={`step-item ${isCurrent ? 'step-current' : ''} ${isComplete ? 'step-complete' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="step-number">{isComplete ? <Check size={14} /> : index + 1}</span>
                  <span className="step-label">{label}</span>
                </div>
              );
            })}
          </div>

          <div className="panel-content">
            {step !== 'HOTEL_SELECT' && (
              <button className="back-button" type="button" onClick={goBack}>
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </button>
            )}
            {step === 'HOTEL_SELECT' && renderHotelStep()}
            {step === 'ROLE_SELECT' && renderRoleStep()}
            {step === 'STAFF_SELECT' && renderStaffStep()}
            {step === 'PIN_ENTRY' && renderPinStep()}
          </div>
        </section>

        <footer className="help-footer">
          <span>SpiceHub staff workstation access</span>
          {selectedHotel?.supportPhone || selectedHotel?.contactPhone ? (
            <span>
              Support Helpline:{' '}
              <a
                href={`tel:${selectedHotel.supportPhone || selectedHotel.contactPhone}`}
                style={{ color: '#ea580c', fontWeight: 'bold', textDecoration: 'underline' }}
              >
                {selectedHotel.supportPhone || selectedHotel.contactPhone}
              </a>
            </span>
          ) : (
            <span>For access, contact your hotel administrator.</span>
          )}
        </footer>
      </main>
    </div>
  );
}

function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="step-heading">
      <h2 id="step-title">{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function ContinueButton({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button type="button" className="continue-button" disabled={disabled} onClick={onClick}>
      {label}
      <ArrowRight size={17} aria-hidden="true" />
    </button>
  );
}

export default App;
