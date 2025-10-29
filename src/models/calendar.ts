/**
 * Calendar model for working day calculations
 */

import type { WorkingDayPeriod } from '../lib/types.js';
import { CalendarService } from '../services/calendar-service.js';
import { daysBetween } from '../lib/utils.js';

/**
 * Calculate working day period for a date range
 */
export async function calculateWorkingDayPeriod(
  startDate: Date,
  endDate: Date
): Promise<WorkingDayPeriod> {
  const calendarService = CalendarService.getInstance();
  await calendarService.initialize();

  const workingDays = calendarService.countWorkingDays(startDate, endDate);
  const totalDays = daysBetween(startDate, endDate);
  const holidays = totalDays - workingDays;

  return {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    totalDays,
    workingDays,
    holidays,
  };
}

/**
 * Count working days in a specific month
 */
export async function countWorkingDaysInMonth(year: number, month: number): Promise<number> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const calendarService = CalendarService.getInstance();
  await calendarService.initialize();

  return calendarService.countWorkingDays(startDate, endDate);
}
