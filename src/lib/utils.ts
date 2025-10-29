/**
 * Utility functions for date handling and formatting
 */

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date object
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the number of days between two dates (inclusive)
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startMs = start.getTime();
  const endMs = end.getTime();
  return Math.round((endMs - startMs) / msPerDay) + 1;
}

/**
 * Get Chinese day of week name
 * Enhancement: FR-013 (Holiday details)
 */
export function getChineseDayOfWeek(date: Date): string {
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  return dayNames[date.getDay()];
}

/**
 * Check if a date is in the past
 */
export function isInPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

/**
 * Get the start and end of a calendar month
 */
export function getMonthBoundaries(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end };
}

/**
 * Split a date range into month segments
 */
export function splitDateRangeByMonth(
  start: Date,
  end: Date
): Array<{ start: Date; end: Date; days: number }> {
  const segments: Array<{ start: Date; end: Date; days: number }> = [];
  let current = new Date(start);

  while (current <= end) {
    const segmentStart = new Date(current);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const segmentEnd = monthEnd < end ? monthEnd : new Date(end);

    segments.push({
      start: segmentStart,
      end: segmentEnd,
      days: daysBetween(segmentStart, segmentEnd),
    });

    // Move to next month
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return segments;
}

/**
 * Format currency amount in NTD
 */
export function formatCurrency(amount: number): string {
  return `NT$${amount.toFixed(0)}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Check if date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}
