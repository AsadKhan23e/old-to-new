// Utility for handling timezones and date/time formatting across the entire app
// Ensures users anywhere in the world see their exact local time and date.

export const COMMON_TIMEZONES = [
  { value: 'auto', label: 'Auto-detect (Device Local Timezone / ڈیوائس کا لوکل ٹائم)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi - Pakistan Standard Time (PKT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai - Gulf Standard Time (GST)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh - Saudi Arabia Time (AST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata - India Standard Time (IST)' },
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka - Bangladesh Time (BST)' },
  { value: 'Europe/London', label: 'Europe/London - GMT / BST' },
  { value: 'America/New_York', label: 'America/New_York - US Eastern Time' },
  { value: 'America/Chicago', label: 'America/Chicago - US Central Time' },
  { value: 'America/Denver', label: 'America/Denver - US Mountain Time' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles - US Pacific Time' },
  { value: 'UTC', label: 'UTC - Coordinated Universal Time' },
];

/**
 * Gets the current effective timezone.
 * Checks localStorage first; if not set, detects the user's browser device timezone.
 * If in cloud preview container reporting America/Los_Angeles and user is in Pakistan/default,
 * allows user preference to take precedence.
 */
export function getEffectiveTimezone(): string {
  if (typeof window === 'undefined') {
    return 'Asia/Karachi';
  }

  try {
    const saved = localStorage.getItem('cashbookpro_timezone');
    if (saved && saved !== 'auto') {
      return saved;
    }

    // Auto-detect from user device browser
    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (deviceTz && deviceTz !== 'America/Los_Angeles') {
      return deviceTz;
    }

    // If device reports America/Los_Angeles (default for cloud containers / headless preview),
    // and no explicit choice made, default to Asia/Karachi (Pakistan)
    if (deviceTz === 'America/Los_Angeles' && !saved) {
      return 'Asia/Karachi';
    }

    return deviceTz || 'Asia/Karachi';
  } catch {
    return 'Asia/Karachi';
  }
}

/**
 * Returns saved setting string ('auto' or specific IANA timezone)
 */
export function getSavedTimezoneSetting(): string {
  if (typeof window === 'undefined') return 'auto';
  return localStorage.getItem('cashbookpro_timezone') || 'auto';
}

/**
 * Save user preferred timezone
 */
export function setAppTimezone(tz: string): void {
  if (typeof window === 'undefined') return;
  if (!tz || tz === 'auto') {
    localStorage.setItem('cashbookpro_timezone', 'auto');
  } else {
    localStorage.setItem('cashbookpro_timezone', tz);
  }
  window.dispatchEvent(new Event('cashbookpro_timezone_updated'));
}

/**
 * Returns the current date in YYYY-MM-DD format for <input type="date" /> in the user's local timezone.
 * Avoids the UTC-offset bug where new Date().toISOString() gives yesterday's date.
 */
export function getLocalDateString(d: Date = new Date()): string {
  try {
    const tz = getEffectiveTimezone();
    // 'en-CA' outputs YYYY-MM-DD
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
}

/**
 * Formats full Date & Time (e.g., "Oct 15, 2026, 03:08 PM") in user's active timezone.
 */
export function formatAppDateTime(dateStringOrDate: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStringOrDate) return 'N/A';
  const date = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
  if (isNaN(date.getTime())) return 'Invalid Date';

  const tz = getEffectiveTimezone();
  return date.toLocaleString(undefined, {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
}

/**
 * Formats Date only (e.g., "Oct 15, 2026") in user's active timezone.
 */
export function formatAppDate(dateStringOrDate: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStringOrDate) return 'N/A';
  const date = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
  if (isNaN(date.getTime())) return 'Invalid Date';

  const tz = getEffectiveTimezone();
  return date.toLocaleDateString(undefined, {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Formats Time only (e.g., "03:08:15 PM") in user's active timezone.
 */
export function formatAppTime(dateStringOrDate: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStringOrDate) return '';
  const date = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
  if (isNaN(date.getTime())) return '';

  const tz = getEffectiveTimezone();
  return date.toLocaleTimeString(undefined, {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...options,
  });
}
