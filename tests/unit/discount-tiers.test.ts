/**
 * Unit tests for discount tier validation
 * Feature: 004-cross-month-tpass
 * Validates FR-008: Correct discount tier application
 */

import { describe, test, expect } from 'bun:test';
import { getDiscountTierForTrips, DISCOUNT_TIERS } from '../../src/models/tpass-calculation';

describe('Discount Tier Validation (FR-008)', () => {
  /**
   * User Story 3 - Acceptance Scenario 1
   * 38 trips should get 10% discount
   */
  test('should apply 10% discount for 38 trips', () => {
    const tier = getDiscountTierForTrips(38);
    expect(tier.discountPercent).toBe(10);
    expect(tier.minTrips).toBe(21);
    expect(tier.maxTrips).toBe(40);
  });

  /**
   * User Story 3 - Acceptance Scenario 2
   * 2 trips should get 0% discount
   */
  test('should apply 0% discount for 2 trips', () => {
    const tier = getDiscountTierForTrips(2);
    expect(tier.discountPercent).toBe(0);
    expect(tier.minTrips).toBe(0);
    expect(tier.maxTrips).toBe(10);
  });

  /**
   * User Story 3 - Acceptance Scenario 3
   * 15 trips should get 5% discount
   */
  test('should apply 5% discount for 15 trips', () => {
    const tier = getDiscountTierForTrips(15);
    expect(tier.discountPercent).toBe(5);
    expect(tier.minTrips).toBe(11);
    expect(tier.maxTrips).toBe(20);
  });

  /**
   * User Story 3 - Acceptance Scenario 4
   * 42 trips should get 15% discount
   */
  test('should apply 15% discount for 42 trips', () => {
    const tier = getDiscountTierForTrips(42);
    expect(tier.discountPercent).toBe(15);
    expect(tier.minTrips).toBe(41);
    expect(tier.maxTrips).toBe(null); // Unlimited
  });

  /**
   * Edge case: boundary values
   */
  test('should correctly handle tier boundaries', () => {
    // Lower boundary of each tier
    expect(getDiscountTierForTrips(0).discountPercent).toBe(0); // 0-10 trips
    expect(getDiscountTierForTrips(11).discountPercent).toBe(5); // 11-20 trips
    expect(getDiscountTierForTrips(21).discountPercent).toBe(10); // 21-40 trips
    expect(getDiscountTierForTrips(41).discountPercent).toBe(15); // 41+ trips

    // Upper boundary of each tier
    expect(getDiscountTierForTrips(10).discountPercent).toBe(0); // Still in 0-10
    expect(getDiscountTierForTrips(20).discountPercent).toBe(5); // Still in 11-20
    expect(getDiscountTierForTrips(40).discountPercent).toBe(10); // Still in 21-40
  });

  /**
   * Edge case: very high trip counts
   */
  test('should apply maximum 15% discount for very high trip counts', () => {
    expect(getDiscountTierForTrips(100).discountPercent).toBe(15);
    expect(getDiscountTierForTrips(1000).discountPercent).toBe(15);
  });

  /**
   * Edge case: zero trips
   */
  test('should apply 0% discount for zero trips', () => {
    const tier = getDiscountTierForTrips(0);
    expect(tier.discountPercent).toBe(0);
  });

  /**
   * Verify discount tier configuration matches spec
   */
  test('should have correct discount tier structure per FR-008', () => {
    expect(DISCOUNT_TIERS).toHaveLength(4);

    // Tier 1: 0-10 trips, 0% discount
    expect(DISCOUNT_TIERS[0].minTrips).toBe(0);
    expect(DISCOUNT_TIERS[0].maxTrips).toBe(10);
    expect(DISCOUNT_TIERS[0].discountPercent).toBe(0);

    // Tier 2: 11-20 trips, 5% discount
    expect(DISCOUNT_TIERS[1].minTrips).toBe(11);
    expect(DISCOUNT_TIERS[1].maxTrips).toBe(20);
    expect(DISCOUNT_TIERS[1].discountPercent).toBe(5);

    // Tier 3: 21-40 trips, 10% discount
    expect(DISCOUNT_TIERS[2].minTrips).toBe(21);
    expect(DISCOUNT_TIERS[2].maxTrips).toBe(40);
    expect(DISCOUNT_TIERS[2].discountPercent).toBe(10);

    // Tier 4: 41+ trips, 15% discount
    expect(DISCOUNT_TIERS[3].minTrips).toBe(41);
    expect(DISCOUNT_TIERS[3].maxTrips).toBe(null); // Unlimited
    expect(DISCOUNT_TIERS[3].discountPercent).toBe(15);
  });

  /**
   * Verify all trip counts fall into exactly one tier
   */
  test('should ensure all trip counts map to exactly one tier', () => {
    // Sample trip counts across the spectrum
    const testCounts = [0, 1, 5, 10, 11, 15, 20, 21, 30, 40, 41, 50, 100];

    for (const trips of testCounts) {
      const tier = getDiscountTierForTrips(trips);
      expect(tier).toBeDefined();
      expect(tier.discountPercent).toBeGreaterThanOrEqual(0);
      expect(tier.discountPercent).toBeLessThanOrEqual(15);
    }
  });
});
