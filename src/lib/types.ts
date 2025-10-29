/**
 * Shared TypeScript type definitions for TPASS Calculator
 */

// TPASS Monthly Pass
export interface TPASS {
  price: number; // Fixed at 1200 NTD
  validityDays: number; // Fixed at 30 days
  startDate: Date; // User-selected start date
  endDate: Date; // Calculated: startDate + 30 days
}

// Trip configuration
export interface Trip {
  oneWayFare: number; // Single journey fare in NTD
  tripsPerDay: number; // Number of trips per working day
  totalTrips?: number; // Calculated: workingDays * tripsPerDay
}

// Discount tier definition
export interface DiscountTier {
  minTrips: number; // Minimum trips for this tier
  maxTrips: number | null; // Maximum trips (null for highest tier)
  discountRate: number; // Discount percentage as decimal (0.05 = 5%)
}

// Calendar entry for working days
export interface CalendarEntry {
  date: string; // YYYY-MM-DD format
  isWorkingDay: boolean; // True if government working day
  isHoliday: boolean; // True if national holiday
  name?: string; // Holiday name (optional)
  description?: string; // Additional info (optional)
}

// Working day period calculation
export interface WorkingDayPeriod {
  startDate: Date;
  endDate: Date;
  totalDays: number; // Total calendar days
  workingDays: number; // Number of working days
  holidays: number; // Number of holidays/weekends
}

// Holiday details in response
export interface HolidayDetail {
  date: string; // YYYY-MM-DD
  name: string; // Holiday name (e.g., "春節", "國慶日")
  dayOfWeek: string; // Chinese day name (e.g., "一", "二")
  isWeekend: boolean; // True if Sat/Sun
}

export interface WorkingDayException {
  date: string; // YYYY-MM-DD
  name: string; // e.g., "補行上班"
  originalHoliday: string; // Which holiday it compensates
}

export interface HolidayDetails {
  totalHolidays: number;
  holidayList: HolidayDetail[];
  workingDayExceptions?: WorkingDayException[];
}

// Fare comparison result
export interface FareComparison {
  // Input parameters
  startDate: Date;
  oneWayFare: number;
  tripsPerDay: number;

  // Calculated values
  period: WorkingDayPeriod;
  totalTrips: number;
  appliedDiscount: DiscountTier;

  // Cost comparison
  tpassCost: number;
  regularCost: number;
  regularCostBeforeDiscount: number;
  savingsAmount: number;
  savingsPercentage: number;

  // Recommendation
  recommendation: 'BUY_TPASS' | 'USE_REGULAR';
  recommendationReason: string;

  // Holiday details (Enhancement: FR-013)
  holidayDetails?: HolidayDetails;

  // Warnings
  warnings?: string[];
}

// Calendar data cache metadata
export interface CalendarCacheMetadata {
  version: string;
  lastUpdated: string;
  source: string;
  yearsCovered: number[];
}

// Result type for operations with fallback
export type Result<T> = { success: true; data: T } | { success: false; error: string };

// Calculation parameters
export interface CalculationParams {
  startDate?: Date;
  oneWayFare?: number;
  tripsPerDay?: number;
  customWorkingDays?: number;
}
