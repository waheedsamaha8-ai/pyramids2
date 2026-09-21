/**
 * Utility functions for Egyptian mobile phone numbers normalization and formatting.
 * Ensures numbers are always stored and displayed with the standard leading zero:
 * Example: 01007911777 (not 1007911777).
 */

/**
 * Formats a mobile number to ensure it has the standard leading zero (e.g. 01007911777).
 * Handles:
 * - Missing leading 0 (e.g., "1007911777" -> "01007911777")
 * - Arabic-Indic numbers (e.g., "٠١٠٠٧٩١١٧٧٧" -> "01007911777")
 * - International prefix "+20" or "0020" or "20" followed by 1
 * - Numeric types (from Google Sheets or Excel)
 */
export function formatMobileNumber(phone: string | number | null | undefined): string {
  if (phone === null || phone === undefined) return '';
  let str = String(phone).trim();
  if (!str) return '';

  // 1. Convert Arabic-Indic (٠-٩) and Persian (۰-۹) numerals to Western digits (0-9)
  str = str
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());

  // 2. Remove any formatting characters (spaces, hyphens, parentheses)
  let cleaned = str.replace(/[^\d+]/g, '');

  // 3. Remove international prefix: +20, 0020, or 20 when followed by 1 (Egyptian mobile prefix)
  if (cleaned.startsWith('+20')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('0020')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('20') && cleaned.length >= 12 && cleaned.charAt(2) === '1') {
    cleaned = cleaned.substring(2);
  }

  // Remove any remaining '+'
  cleaned = cleaned.replace(/\+/g, '');

  // 4. Missing leading zero check:
  // Egyptian mobile numbers are 11 digits: 010, 011, 012, 015.
  // If 10 digits starting with 1 (e.g. 1007911777), add leading 0 -> 01007911777
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * Sanitizes and normalizes phone input while typing or pasting into text fields.
 * If user pastes or types a 10-digit number starting with 1, automatically prepends '0'.
 */
export function normalizePhoneInput(input: string): string {
  if (!input) return '';

  // Convert Arabic-Indic digits
  let str = input
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());

  // Keep only digits and +
  let cleaned = str.replace(/[^\d+]/g, '');

  // If user pasted or typed full 10 digits starting with 1 (e.g. 1007911777), prepend '0'
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    return '0' + cleaned;
  }

  // If starts with +20 or 0020 and user finished typing, convert to local format
  if (cleaned.startsWith('+20') && cleaned.length >= 13) {
    return formatMobileNumber(cleaned);
  }
  if (cleaned.startsWith('0020') && cleaned.length >= 14) {
    return formatMobileNumber(cleaned);
  }

  return cleaned;
}

/**
 * Returns phone number formatted for WhatsApp API (e.g. "201007911777").
 */
export function toWhatsAppNumber(phone: string | number | null | undefined): string {
  const formatted = formatMobileNumber(phone);
  if (!formatted) return '';

  const digits = formatted.replace(/\D/g, '');
  if (digits.startsWith('01')) {
    return '2' + digits; // 0100... -> 20100...
  }
  if (digits.startsWith('20')) {
    return digits;
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return '20' + digits;
  }
  return digits;
}
