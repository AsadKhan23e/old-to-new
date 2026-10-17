import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/**
 * Format Pakistan phone numbers (e.g. 03325518648) to international format (923325518648)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = (phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '92' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Open either regular WhatsApp or WhatsApp Business on mobile/web
 */
export function openWhatsApp(phone: string, message: string, targetApp: 'whatsapp' | 'business') {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  if (targetApp === 'business') {
    if (isAndroid) {
      // Android Intent targeting WhatsApp Business package explicitly
      const intentUrl = `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
      window.location.href = intentUrl;
      setTimeout(() => {
        // Fallback if not opened
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
      }, 1500);
    } else {
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
    }
  } else {
    if (isAndroid) {
      // Android Intent targeting regular WhatsApp package explicitly
      const intentUrl = `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
      window.location.href = intentUrl;
      setTimeout(() => {
        window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
      }, 1500);
    } else {
      window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
    }
  }
}

/**
 * Native or Web Share fallback
 */
export async function shareMessage(text: string, title: string = 'Payment Reminder') {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title,
        text,
        dialogTitle: title
      });
      return true;
    } catch (e) {
      console.warn('Native share error:', e);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text
      });
      return true;
    } catch (e: any) {
      if (e.name === 'AbortError') return true; // user closed share sheet
      console.warn('Web share error:', e);
    }
  }

  // Fallback to clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return false; // indicated copied
    }
  } catch (err) {
    console.error('Clipboard copy failed:', err);
  }
  return false;
}
