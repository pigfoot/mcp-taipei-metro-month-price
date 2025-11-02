/**
 * Integration tests for cross-month TPASS calculation
 * Feature: 004-cross-month-tpass
 *
 * Tests the complete flow from calculator service to cross-month calculation
 * Validates acceptance scenarios from spec.md
 */

import { describe, test, expect } from 'bun:test';
import { calculateCrossMonthTPASSWithBreakdown } from '../../src/services/calculator';

describe('Cross-Month TPASS Integration Tests', () => {
  /**
   * User Story 1 - Acceptance Scenario 1
   * Oct 31 start with 20 working days
   * Expected: Oct (1 day, 2 trips, no discount = $70) + Nov (19 days, 38 trips, 10% discount = $1197) = $1267
   */
  test('should calculate cross-month fare correctly (Oct 31 start)', async () => {
    const params = {
      startDate: new Date(2024, 9, 31), // Oct 31, 2024
      oneWayFare: 35,
      tripsPerDay: 2,
      customWorkingDays: 20, // Override to match spec example
    };

    const result = await calculateCrossMonthTPASSWithBreakdown(params);

    // Verify it crosses month boundary
    expect(result.crossesMonthBoundary).toBe(true);
    expect(result.segments).toHaveLength(2);

    // October segment: 1 day, 2 trips, no discount
    const octSegment = result.segments[0];
    expect(octSegment.monthName).toBe('October');
    expect(octSegment.workingDays).toBe(1);
    expect(octSegment.trips).toBe(2);
    expect(octSegment.originalCost).toBe(70); // 2 * $35
    expect(octSegment.discountTier).toBe(0); // 0-10 trips = 0%
    expect(octSegment.discountAmount).toBe(0);
    expect(octSegment.finalCost).toBe(70);

    // November segment: 19 days, 38 trips, 10% discount
    const novSegment = result.segments[1];
    expect(novSegment.monthName).toBe('November');
    expect(novSegment.workingDays).toBe(19);
    expect(novSegment.trips).toBe(38);
    expect(novSegment.originalCost).toBe(1330); // 38 * $35
    expect(novSegment.discountTier).toBe(10); // 21-40 trips = 10%
    expect(novSegment.discountAmount).toBe(133); // 1330 * 0.1
    expect(novSegment.finalCost).toBe(1197); // 1330 - 133

    // Total: $70 + $1197 = $1267
    expect(result.totalFinalCost).toBe(1267);
    expect(result.totalWorkingDays).toBe(20);
    expect(result.totalTrips).toBe(40);

    // Should include comparison with old method
    expect(result.previousCalculation).toBeDefined();
    expect(result.previousCalculation?.method).toBe('single-discount');
    // Old method would apply 10% discount to all 40 trips: 1400 * 0.9 = 1260
    expect(result.previousCalculation?.totalCost).toBe(1260);
    expect(result.previousCalculation?.difference).toBe(7); // 1267 - 1260 = 7
  });

  /**
   * User Story 1 - Acceptance Scenario 2
   * Mid-month start with all days in same month
   */
  test('should handle single-month period correctly', async () => {
    const params = {
      startDate: new Date(2024, 9, 1), // Oct 1, 2024
      oneWayFare: 35,
      tripsPerDay: 2,
    };

    const result = await calculateCrossMonthTPASSWithBreakdown(params);

    // Should not cross month boundary
    expect(result.crossesMonthBoundary).toBe(false);
    expect(result.segments).toHaveLength(1);

    // Single October segment
    const segment = result.segments[0];
    expect(segment.monthName).toBe('October');
    expect(segment.year).toBe(2024);
    expect(segment.month).toBe(9);

    // Should apply appropriate discount tier
    expect(segment.trips).toBeGreaterThan(0);
    expect(segment.finalCost).toBeGreaterThan(0);

    // Should not have previous calculation (not cross-month)
    expect(result.previousCalculation).toBeUndefined();
  });

  /**
   * User Story 1 - Acceptance Scenario 3
   * Year boundary transition (Dec to Jan)
   */
  test('should handle year boundary crossing correctly', async () => {
    const params = {
      startDate: new Date(2024, 11, 20), // Dec 20, 2024
      oneWayFare: 35,
      tripsPerDay: 2,
    };

    const result = await calculateCrossMonthTPASSWithBreakdown(params);

    // Should cross month and year boundary
    expect(result.crossesMonthBoundary).toBe(true);
    expect(result.segments).toHaveLength(2);

    // December 2024 segment
    const decSegment = result.segments[0];
    expect(decSegment.monthName).toBe('December');
    expect(decSegment.year).toBe(2024);
    expect(decSegment.month).toBe(11);

    // January 2025 segment
    const janSegment = result.segments[1];
    expect(janSegment.monthName).toBe('January');
    expect(janSegment.year).toBe(2025);
    expect(janSegment.month).toBe(0);

    // Both segments should have independent discount tiers
    expect(decSegment.discountTier).toBeGreaterThanOrEqual(0);
    expect(janSegment.discountTier).toBeGreaterThanOrEqual(0);

    // Totals should be sum of segments
    expect(result.totalFinalCost).toBe(
      decSegment.finalCost + janSegment.finalCost
    );
    expect(result.totalWorkingDays).toBe(
      decSegment.workingDays + janSegment.workingDays
    );
  });

  /**
   * Edge case: February month-end scenarios
   */
  test('should handle February 28 month-end correctly (non-leap year)', async () => {
    const params = {
      startDate: new Date(2025, 1, 15), // Feb 15, 2025 (non-leap year)
      oneWayFare: 35,
      tripsPerDay: 2,
    };

    const result = await calculateCrossMonthTPASSWithBreakdown(params);

    // Should cross into March
    expect(result.crossesMonthBoundary).toBe(true);
    expect(result.segments).toHaveLength(2);

    // February segment (Feb 15-28 = 14 days)
    const febSegment = result.segments[0];
    expect(febSegment.monthName).toBe('February');
    expect(febSegment.startDate.getDate()).toBe(15);
    expect(febSegment.endDate.getDate()).toBe(28); // Last day of Feb in non-leap year

    // March segment
    const marSegment = result.segments[1];
    expect(marSegment.monthName).toBe('March');
  });

  /**
   * Edge case: Leap year February
   */
  test('should handle February 29 in leap year correctly', async () => {
    const params = {
      startDate: new Date(2024, 1, 15), // Feb 15, 2024 (leap year)
      oneWayFare: 35,
      tripsPerDay: 2,
    };

    const result = await calculateCrossMonthTPASSWithBreakdown(params);

    // Should cross into March
    expect(result.crossesMonthBoundary).toBe(true);
    expect(result.segments).toHaveLength(2);

    // February segment (Feb 15-29 = 15 days in leap year)
    const febSegment = result.segments[0];
    expect(febSegment.monthName).toBe('February');
    expect(febSegment.startDate.getDate()).toBe(15);
    expect(febSegment.endDate.getDate()).toBe(29); // Last day of Feb in leap year

    // March segment
    const marSegment = result.segments[1];
    expect(marSegment.monthName).toBe('March');
  });

  /**
   * Verify discount tier accuracy
   */
  test('should apply correct discount tiers based on trip counts', async () => {
    // Test with custom working days to hit specific discount tiers

    // 5 working days = 10 trips = 0% discount
    const result10Trips = await calculateCrossMonthTPASSWithBreakdown({
      startDate: new Date(2024, 9, 1),
      oneWayFare: 35,
      customWorkingDays: 5,
    });
    expect(result10Trips.segments[0].trips).toBe(10);
    expect(result10Trips.segments[0].discountTier).toBe(0);

    // 8 working days = 16 trips = 5% discount
    const result16Trips = await calculateCrossMonthTPASSWithBreakdown({
      startDate: new Date(2024, 9, 1),
      oneWayFare: 35,
      customWorkingDays: 8,
    });
    expect(result16Trips.segments[0].trips).toBe(16);
    expect(result16Trips.segments[0].discountTier).toBe(5);

    // 15 working days = 30 trips = 10% discount
    const result30Trips = await calculateCrossMonthTPASSWithBreakdown({
      startDate: new Date(2024, 9, 1),
      oneWayFare: 35,
      customWorkingDays: 15,
    });
    expect(result30Trips.segments[0].trips).toBe(30);
    expect(result30Trips.segments[0].discountTier).toBe(10);

    // 21 working days = 42 trips = 15% discount
    const result42Trips = await calculateCrossMonthTPASSWithBreakdown({
      startDate: new Date(2024, 9, 1),
      oneWayFare: 35,
      customWorkingDays: 21,
    });
    expect(result42Trips.segments[0].trips).toBe(42);
    expect(result42Trips.segments[0].discountTier).toBe(15);
  });
});
