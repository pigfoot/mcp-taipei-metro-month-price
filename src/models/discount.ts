/**
 * Taipei Metro frequent rider discount tier definitions
 */

import type { DiscountTier } from '../lib/types.js';

/**
 * Taipei Metro frequent rider discount tiers
 * Based on monthly trip count within calendar month
 */
export const DISCOUNT_TIERS: DiscountTier[] = [
  { minTrips: 0, maxTrips: 10, discountRate: 0.0 }, // 0% discount
  { minTrips: 11, maxTrips: 20, discountRate: 0.05 }, // 5% discount
  { minTrips: 21, maxTrips: 40, discountRate: 0.1 }, // 10% discount
  { minTrips: 41, maxTrips: null, discountRate: 0.15 }, // 15% discount
];

/**
 * Get the discount tier for a given trip count
 */
export function getDiscountTier(tripCount: number): DiscountTier {
  for (const tier of DISCOUNT_TIERS) {
    if (tripCount >= tier.minTrips && (tier.maxTrips === null || tripCount <= tier.maxTrips)) {
      return tier;
    }
  }
  // Default to first tier (no discount)
  return DISCOUNT_TIERS[0]!;
}

/**
 * Get discount tier description
 */
export function getDiscountTierDescription(tier: DiscountTier): string {
  const percentage = (tier.discountRate * 100).toFixed(0);
  if (tier.maxTrips === null) {
    return `${tier.minTrips}+ trips: ${percentage}% off`;
  }
  return `${tier.minTrips}-${tier.maxTrips} trips: ${percentage}% off`;
}

/**
 * Get all discount tier information
 */
export function getAllDiscountTiers(): Array<{
  tripRange: string;
  discount: string;
  tier: DiscountTier;
}> {
  return DISCOUNT_TIERS.map((tier) => ({
    tripRange:
      tier.maxTrips === null ? `${tier.minTrips}+ trips` : `${tier.minTrips}-${tier.maxTrips} trips`,
    discount: `${(tier.discountRate * 100).toFixed(0)}%`,
    tier,
  }));
}
