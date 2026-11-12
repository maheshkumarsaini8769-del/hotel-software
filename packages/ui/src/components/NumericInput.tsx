import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface SanitizeNumericOptions {
  allowDecimal?: boolean;
  allowNegative?: boolean;
  allowLeadingZeros?: boolean;
}

/**
 * Strips non-numeric characters and eliminates leading zeros before digits (the "0300" bug),
 * while preserving valid decimals like "0.5" or in-progress "0." / "-0.".
 */
export function sanitizeNumericText(
  rawValue: string,
  options: SanitizeNumericOptions = {}
): string {
  const {
    allowDecimal = true,
    allowNegative = false,
    allowLeadingZeros = false,
  } = options;

  let str = String(rawValue ?? '');
  if (!str) return '';

  // Keep optional leading minus only if negative values are permitted
  let sign = '';
  if (allowNegative && str.trimStart().startsWith('-')) {
    sign = '-';
  }

  // Keep only digits and optionally dots
  str = str.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');

  // Ensure at most one decimal point
  if (allowDecimal) {
    const firstDot = str.indexOf('.');
    if (firstDot !== -1) {
      const intPart = str.slice(0, firstDot);
      const fracPart = str.slice(firstDot + 1).replace(/\./g, '');
      str = `${intPart}.${fracPart}`;
    }
    if (str.startsWith('.')) {
      str = `0${str}`;
    }
  }

  // Prevent "-0" ->Wait: "-" + "" stays "-", whereas "-03" -> "-3"
  if (!allowLeadingZeros && str.length > 1) {
    str = str.replace(/^0+(?=\d)/, '');
  }

  return `${sign}${str}`;
}

export function formatNumericExternalValue(
  value: string | number | readonly string[] | undefined | null
): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return String(value[0] ?? '');
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  return String(value);
}

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Keep 'type' optional so mechanical migration from <input type="number" /> is seamless */
  type?: 'number' | 'text' | 'tel';
  /** Allow fractional values with '.' (defaults true unless step === '1' / 1 or inputMode === 'numeric') */
  allowDecimal?: boolean;
  /** Allow leading '-' (defaults true only when min < 0) */
  allowNegative?: boolean;
  /** Preserve leading zeros, e.g. PINs, OTPs, phone numbers (defaults false) */
  allowLeadingZeros?: boolean;
}

const ALLOWED_CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'Clear',
]);

/**
 * Drop-in strict numeric replacement for <input type="number" />.
 * - Renders type="text" with mobile inputMode="numeric"|"decimal" so browsers never inject 'e'/'+' or desync DOM state.
 * - Blocks alphabetical and invalid text on keystrokes and pastes.
 * - Fixes the "300 -> backspace -> 0 -> type 300 -> 0300" leading-zero bug by retaining empty draft while focused
 *   when parent state bounces Number("") => 0, and stripping redundant leading zeros before digits.
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  function NumericInput(
    {
      type: requestedType,
      allowDecimal,
      allowNegative,
      allowLeadingZeros = false,
      value,
      defaultValue,
      step,
      min,
      maxLength,
      inputMode,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      onPaste,
      ...rest
    },
    ref
  ) {
    const effectiveAllowDecimal =
      allowDecimal !== undefined
        ? allowDecimal
        : inputMode === 'numeric' || step === 1 || step === '1'
        ? false
        : true;

    const minNum = min !== undefined && min !== '' ? Number(min) : NaN;
    const effectiveAllowNegative =
      allowNegative !== undefined
        ? allowNegative
        : Number.isFinite(minNum) && minNum < 0;

    const effectiveInputMode =
      inputMode ?? (effectiveAllowDecimal ? 'decimal' : 'numeric');

    const isControlled = value !== undefined;
    const externalStr = isControlled ? formatNumericExternalValue(value) : undefined;

    const [draft, setDraft] = useState<string>(() =>
      isControlled ? externalStr! : formatNumericExternalValue(defaultValue)
    );

    const innerRef = useRef<HTMLInputElement | null>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    const isFocusedRef = useRef(false);
    const clearedWhileFocusedRef = useRef(false);
    const awaitingClearBounceRef = useRef(false);
    const lastEmittedRef = useRef<string | null>(null);
    const selectZeroOnMouseUpRef = useRef(false);

    useEffect(() => {
      if (!isControlled) return;
      const nextExt = externalStr ?? '';

      if (!isFocusedRef.current) {
        clearedWhileFocusedRef.current = false;
        awaitingClearBounceRef.current = false;
        setDraft(nextExt);
        return;
      }

      // Parent bounced Number("") -> 0 (or || 1 / || 90 fallback) right after user cleared input
      if (clearedWhileFocusedRef.current) {
        if (awaitingClearBounceRef.current || nextExt === '' || nextExt === '0') {
          awaitingClearBounceRef.current = false;
          return;
        }
      }

      // Parent echoed back our last emitted sanitized string
      if (lastEmittedRef.current !== null && nextExt === lastEmittedRef.current) {
        return;
      }

      // Preserve in-progress decimal typing (e.g. "0.", "12.", "1.50") when parent converted via Number()
      if (
        draft !== '' &&
        draft !== '-' &&
        Number.isFinite(Number(draft)) &&
        Number.isFinite(Number(nextExt)) &&
        Number(draft) === Number(nextExt) &&
        (draft.endsWith('.') || /\.\d*0$/.test(draft))
      ) {
        return;
      }

      clearedWhileFocusedRef.current = false;
      awaitingClearBounceRef.current = false;
      setDraft(nextExt);
    }, [externalStr, isControlled]);

    const applyMaxLength = (text: string): string => {
      if (typeof maxLength === 'number' && maxLength > 0 && text.length > maxLength) {
        return text.slice(0, maxLength);
      }
      return text;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (
        ALLOWED_CONTROL_KEYS.has(e.key) ||
        e.key === 'Unidentified' ||
        e.key === 'Process' ||
        e.key === 'Dead'
      ) {
        return;
      }

      if (e.key.length === 1) {
        if (/^[0-9]$/.test(e.key)) return;

        if (e.key === '.' && effectiveAllowDecimal) {
          const el = e.currentTarget;
          const start = el.selectionStart ?? el.value.length;
          const end = el.selectionEnd ?? el.value.length;
          const remaining = el.value.slice(0, start) + el.value.slice(end);
          if (!remaining.includes('.')) return;
        }

        if (e.key === '-' && effectiveAllowNegative) {
          const el = e.currentTarget;
          const start = el.selectionStart ?? 0;
          const end = el.selectionEnd ?? 0;
          const remaining = el.value.slice(0, start) + el.value.slice(end);
          if (start === 0 && !remaining.includes('-')) return;
        }

        e.preventDefault();
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const selectionStart = e.target.selectionStart;

      let sanitized = sanitizeNumericText(raw, {
        allowDecimal: effectiveAllowDecimal,
        allowNegative: effectiveAllowNegative,
        allowLeadingZeros,
      });
      sanitized = applyMaxLength(sanitized);

      clearedWhileFocusedRef.current = sanitized === '';
      awaitingClearBounceRef.current = sanitized === '';
      lastEmittedRef.current = sanitized;
      setDraft(sanitized);

      if (e.target.value !== sanitized) {
        e.target.value = sanitized;
      }
      if (e.currentTarget && e.currentTarget.value !== sanitized) {
        e.currentTarget.value = sanitized;
      }

      if (raw !== sanitized && selectionStart !== null && innerRef.current) {
        const diff = raw.length - sanitized.length;
        const nextCursor = Math.max(0, selectionStart - Math.max(0, diff));
        requestAnimationFrame(() => {
          try {
            if (innerRef.current && document.activeElement === innerRef.current) {
              innerRef.current.setSelectionRange(nextCursor, nextCursor);
            }
          } catch {
            // ignore cursor restoration failures
          }
        });
      }

      onChange?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(e);
      if (e.defaultPrevented) return;

      const pasted = e.clipboardData?.getData('text');
      if (!pasted) return;

      const el = e.currentTarget;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const combined = el.value.slice(0, start) + pasted + el.value.slice(end);
      const sanitized = applyMaxLength(
        sanitizeNumericText(combined, {
          allowDecimal: effectiveAllowDecimal,
          allowNegative: effectiveAllowNegative,
          allowLeadingZeros,
        })
      );

      // Intercept non-clean pastes so the sanitized value lands deterministically
      if (pasted !== sanitized && combined !== sanitized) {
        e.preventDefault();
        clearedWhileFocusedRef.current = sanitized === '';
        lastEmittedRef.current = sanitized;
        setDraft(sanitized);

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(el, sanitized);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      if (!allowLeadingZeros && e.currentTarget.value === '0') {
        selectZeroOnMouseUpRef.current = true;
        e.currentTarget.select();
      }
      onFocus?.(e);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
      if (selectZeroOnMouseUpRef.current) {
        selectZeroOnMouseUpRef.current = false;
        const el = e.currentTarget;
        if (!allowLeadingZeros && el.value === '0' && el.selectionStart === el.selectionEnd) {
          el.select();
        }
      }
      rest.onMouseUp?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;
      selectZeroOnMouseUpRef.current = false;
      clearedWhileFocusedRef.current = false;
      lastEmittedRef.current = null;

      let cleaned = draft;
      if (cleaned === '-' || cleaned === '.' || cleaned === '-.') {
        cleaned = '';
      } else if (cleaned.endsWith('.')) {
        cleaned = cleaned.slice(0, -1);
      }

      if (cleaned !== draft && onChange) {
        if (e.target.value !== cleaned) {
          e.target.value = cleaned;
        }
      }

      setDraft(isControlled ? (externalStr ?? '') : cleaned);
      onBlur?.(e);
    };

    return (
      <input
        {...rest}
        ref={innerRef}
        type={requestedType === 'tel' ? 'tel' : 'text'}
        inputMode={effectiveInputMode}
        min={min}
        step={step}
        maxLength={maxLength}
        data-spicehub-numeric="true"
        value={isControlled ? draft : undefined}
        defaultValue={!isControlled ? draft : undefined}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onMouseUp={handleMouseUp}
        onBlur={handleBlur}
      />
    );
  }
);

export const DigitsInput = React.forwardRef<
  HTMLInputElement,
  Omit<NumericInputProps, 'allowDecimal' | 'allowNegative'>
>(function DigitsInput(props, ref) {
  return (
    <NumericInput
      ref={ref}
      allowDecimal={false}
      allowNegative={false}
      allowLeadingZeros={props.allowLeadingZeros ?? true}
      inputMode="numeric"
      {...props}
    />
  );
});

/**
 * Defense-in-depth document listener: blocks text characters inside any remaining
 * native number, inputMode="numeric"|"decimal", or tel fields across all apps.
 */
export function installGlobalNumericInputGuard(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const w = window as unknown as Record<string, unknown>;
  if (w.__spicehubNumericGuardInstalled) return;
  w.__spicehubNumericGuardInstalled = true;

  const isTelInput = (el: HTMLInputElement) => el.type === 'tel';
  const isStrictNumericEl = (el: HTMLInputElement) =>
    el.dataset.spicehubNumeric !== 'true' &&
    (el.type === 'number' ||
      el.inputMode === 'numeric' ||
      el.inputMode === 'decimal' ||
      el.dataset.numericOnly === 'true');

  document.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.readOnly || target.disabled) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (ALLOWED_CONTROL_KEYS.has(e.key) || e.key.length !== 1) return;

      if (isStrictNumericEl(target)) {
        const allowDecimal = target.inputMode !== 'numeric' && target.step !== '1';
        const allowNegative = target.min !== '' && Number(target.min) < 0;
        const ok =
          /^[0-9]$/.test(e.key) ||
          (e.key === '.' && allowDecimal && !target.value.includes('.')) ||
          (e.key === '-' && allowNegative && (target.selectionStart ?? 0) === 0 && !target.value.includes('-'));
        if (!ok) {
          e.preventDefault();
        }
        return;
      }

      if (isTelInput(target)) {
        // Block alphabetic letters in phone fields while allowing digits, +, -, spaces
        if (!/^[0-9+\-\s()]$/.test(e.key)) {
          e.preventDefault();
        }
      }
    },
    true
  );

  document.addEventListener(
    'input',
    (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.dataset.spicehubNumeric === 'true') return;

      if (isStrictNumericEl(target)) {
        const allowDecimal = target.inputMode !== 'numeric' && target.step !== '1';
        const allowNegative = target.min !== '' && Number(target.min) < 0;
        const allowLeadingZeros =
          target.dataset.allowLeadingZeros === 'true' || target.inputMode === 'numeric';
        const cleaned = sanitizeNumericText(target.value, {
          allowDecimal,
          allowNegative,
          allowLeadingZeros,
        });
        if (target.value !== cleaned) {
          target.value = cleaned;
        }
      } else if (isTelInput(target)) {
        const cleaned = target.value.replace(/[^0-9+\-\s()]/g, '');
        if (target.value !== cleaned) {
          target.value = cleaned;
        }
      }
    },
    true
  );
}
