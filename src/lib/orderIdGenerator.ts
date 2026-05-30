/**
 * Order ID Generator for Sparkfluence v2.0
 *
 * Format: SF-YYYYMMDD-XXXX
 * Example: SF-20260113-A3X9
 *
 * Components:
 * - SF: Sparkfluence prefix
 * - YYYYMMDD: Date (20260113)
 * - XXXX: Random 4-character alphanumeric (uppercase + numbers)
 */

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a random 4-character alphanumeric string
 */
function generateRandomCode(): string {
  let result = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    result += CHARACTERS[randomIndex];
  }
  return result;
}

/**
 * Format date as YYYYMMDD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Generate a new Order ID
 * Format: SF-YYYYMMDD-XXXX
 *
 * @returns Order ID string (e.g., "SF-20260113-A3X9")
 */
export function generateOrderId(): string {
  const now = new Date();
  const dateStr = formatDate(now);
  const randomCode = generateRandomCode();

  return `SF-${dateStr}-${randomCode}`;
}

/**
 * Validate Order ID format
 *
 * @param orderId - Order ID to validate
 * @returns true if valid format, false otherwise
 */
export function isValidOrderId(orderId: string): boolean {
  // Format: SF-YYYYMMDD-XXXX
  const regex = /^SF-\d{8}-[A-Z0-9]{4}$/;
  return regex.test(orderId);
}

/**
 * Extract date from Order ID
 *
 * @param orderId - Order ID string
 * @returns Date object or null if invalid
 */
export function extractDateFromOrderId(orderId: string): Date | null {
  if (!isValidOrderId(orderId)) {
    return null;
  }

  // Extract YYYYMMDD part (positions 3-10)
  const dateStr = orderId.substring(3, 11);
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
  const day = parseInt(dateStr.substring(6, 8), 10);

  return new Date(year, month, day);
}

/**
 * Format Order ID for display (add spacing for readability)
 *
 * @param orderId - Order ID string
 * @returns Formatted string or original if invalid
 */
export function formatOrderIdForDisplay(orderId: string): string {
  if (!isValidOrderId(orderId)) {
    return orderId;
  }

  // Already in format SF-YYYYMMDD-XXXX, just return as is
  return orderId;
}

/**
 * Generate multiple unique Order IDs (for batch operations)
 *
 * @param count - Number of Order IDs to generate
 * @returns Array of unique Order IDs
 */
export function generateBatchOrderIds(count: number): string[] {
  const orderIds = new Set<string>();

  while (orderIds.size < count) {
    orderIds.add(generateOrderId());
  }

  return Array.from(orderIds);
}
