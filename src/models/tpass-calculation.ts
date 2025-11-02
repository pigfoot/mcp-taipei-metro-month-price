/**
 * Data models for cross-month TPASS calculation
 * Feature: 004-cross-month-tpass
 */

/**
 * Represents a portion of the 30-day period within a single calendar month
 */
export interface MonthlySegment {
  // Calendar month information
  year: number; // e.g., 2025
  month: number; // 0-11 (JavaScript month index)
  monthName: string; // e.g., "October", "November"

  // Date range within this month
  startDate: Date; // First day of segment in this month
  endDate: Date; // Last day of segment in this month

  // Calculation data
  workingDays: number; // Number of working days in this segment
  trips: number; // workingDays * 2 (round trip)
  baseFare: number; // Single trip fare amount

  // Discount application
  discountTier: number; // 0, 5, 10, or 15 (percentage)
  discountAmount: number; // Amount saved due to discount

  // Costs
  originalCost: number; // trips * baseFare (before discount)
  finalCost: number; // originalCost - discountAmount
}

/**
 * Represents the complete calculation result for a cross-month TPASS period
 */
export interface CrossMonthCalculation {
  // Input parameters
  startDate: Date; // Start of 30-day period
  endDate: Date; // End of 30-day period (startDate + 29 days)
  farePerTrip: number; // Base fare amount

  // Calculation metadata
  totalDays: number; // Always 30 for TPASS
  totalWorkingDays: number; // Sum of working days across all segments
  totalTrips: number; // totalWorkingDays * 2

  // Month breakdown
  crossesMonthBoundary: boolean; // true if spans multiple months
  segments: MonthlySegment[]; // 1-3 segments typically

  // Financial summary
  totalOriginalCost: number; // Sum of segments' original costs
  totalDiscountAmount: number; // Sum of segments' discount amounts
  totalFinalCost: number; // Sum of segments' final costs

  // Comparison with old calculation (optional)
  previousCalculation?: {
    method: 'single-discount'; // Old method name
    totalCost: number; // What old calculation would return
    difference: number; // New - Old (can be positive or negative)
  };
}

/**
 * Discount tier structure for TPASS
 */
export interface DiscountTier {
  minTrips: number; // Minimum trips for this tier (inclusive)
  maxTrips: number | null; // Maximum trips for this tier (inclusive), null = unlimited
  discountPercent: number; // Discount percentage (0, 5, 10, or 15)
  description: string; // Human-readable description
}

/**
 * Static TPASS discount tier configuration
 * Based on Taipei Metro official frequent rider discount policy
 * Reference: https://www.metro.taipei/cp.aspx?n=AB56163F79ECB2C2
 */
export const DISCOUNT_TIERS: DiscountTier[] = [
  { minTrips: 0, maxTrips: 10, discountPercent: 0, description: 'No discount' },
  { minTrips: 11, maxTrips: 20, discountPercent: 5, description: '5% off' },
  { minTrips: 21, maxTrips: 40, discountPercent: 10, description: '10% off' },
  { minTrips: 41, maxTrips: null, discountPercent: 15, description: '15% off' },
];

/**
 * Get discount tier for a given trip count
 */
export function getDiscountTierForTrips(trips: number): DiscountTier {
  for (const tier of DISCOUNT_TIERS) {
    if (trips >= tier.minTrips && (tier.maxTrips === null || trips <= tier.maxTrips)) {
      return tier;
    }
  }
  // Fallback to no discount
  return DISCOUNT_TIERS[0];
}

/**
 * Calculate discount amount based on trip count
 */
export function calculateDiscountAmount(baseCost: number, trips: number): number {
  const tier = getDiscountTierForTrips(trips);
  return baseCost * (tier.discountPercent / 100);
}
