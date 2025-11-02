/**
 * Performance benchmark tests for cross-month TPASS calculation
 * Feature: 004-cross-month-tpass
 * Validates SC-002: Calculation time < 200ms
 */

import { describe, test, expect } from 'bun:test';
import { calculateCrossMonthTPASSWithBreakdown } from '../../src/services/calculator';

describe('Performance Benchmarks (SC-002)', () => {
  /**
   * Verify calculation completes within 200ms for typical scenarios
   */
  test('should calculate cross-month TPASS within 200ms', async () => {
    const startTime = performance.now();

    await calculateCrossMonthTPASSWithBreakdown({
      startDate: new Date(2024, 9, 31), // Oct 31, 2024
      oneWayFare: 35,
      tripsPerDay: 2,
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(200);
    console.log(`Cross-month calculation took ${duration.toFixed(2)}ms`);
  });

  /**
   * Verify calculation completes within 200ms for year boundary crossing
   */
  test('should calculate year boundary crossing within 200ms', async () => {
    const startTime = performance.now();

    await calculateCrossMonthTPASSWithBreakdown({
      startDate: new Date(2024, 11, 20), // Dec 20, 2024
      oneWayFare: 35,
      tripsPerDay: 2,
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(200);
    console.log(`Year boundary calculation took ${duration.toFixed(2)}ms`);
  });

  /**
   * Verify calculation completes within 200ms with custom working days
   */
  test('should calculate with custom working days within 200ms', async () => {
    const startTime = performance.now();

    await calculateCrossMonthTPASSWithBreakdown({
      startDate: new Date(2024, 9, 31), // Oct 31, 2024
      oneWayFare: 35,
      tripsPerDay: 2,
      customWorkingDays: 20,
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(200);
    console.log(`Custom working days calculation took ${duration.toFixed(2)}ms`);
  });

  /**
   * Run multiple calculations to verify consistent performance
   */
  test('should maintain performance across multiple calculations', async () => {
    const iterations = 10;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      await calculateCrossMonthTPASSWithBreakdown({
        startDate: new Date(2024, 9, 31),
        oneWayFare: 35,
        tripsPerDay: 2,
      });

      const endTime = performance.now();
      durations.push(endTime - startTime);
    }

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / iterations;
    const maxDuration = Math.max(...durations);

    console.log(`Average duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`Max duration: ${maxDuration.toFixed(2)}ms`);

    // Average should be well under 200ms
    expect(avgDuration).toBeLessThan(200);
    // Even the slowest should be under 200ms
    expect(maxDuration).toBeLessThan(200);
  });

  /**
   * Benchmark comparison: single-month vs cross-month
   */
  test('should compare single-month vs cross-month performance', async () => {
    // Single-month calculation
    const singleMonthStart = performance.now();
    await calculateCrossMonthTPASSWithBreakdown({
      startDate: new Date(2024, 9, 1), // Oct 1, 2024
      oneWayFare: 35,
      tripsPerDay: 2,
    });
    const singleMonthDuration = performance.now() - singleMonthStart;

    // Cross-month calculation
    const crossMonthStart = performance.now();
    await calculateCrossMonthTPASSWithBreakdown({
      startDate: new Date(2024, 9, 31), // Oct 31, 2024
      oneWayFare: 35,
      tripsPerDay: 2,
    });
    const crossMonthDuration = performance.now() - crossMonthStart;

    console.log(`Single-month: ${singleMonthDuration.toFixed(2)}ms`);
    console.log(`Cross-month: ${crossMonthDuration.toFixed(2)}ms`);

    // Both should be under 200ms
    expect(singleMonthDuration).toBeLessThan(200);
    expect(crossMonthDuration).toBeLessThan(200);
  });
});
