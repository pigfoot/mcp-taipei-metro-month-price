/**
 * End-to-end test combining all three enhancements
 * T037: Verify all enhancements work together seamlessly
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { CalendarService } from '../../src/services/calendar-service';
import { calculateTPASSComparison } from '../../src/services/calculator';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs';

const TEST_CACHE_FILE = 'data/calendar-cache.json';
const BACKUP_CACHE_FILE = 'data/calendar-cache.backup.e2e.json';

describe('E2E: All Enhancements Integration', () => {
  let originalCache: string | null = null;

  beforeAll(() => {
    // Backup original cache
    if (existsSync(TEST_CACHE_FILE)) {
      originalCache = readFileSync(TEST_CACHE_FILE, 'utf-8');
      writeFileSync(BACKUP_CACHE_FILE, originalCache);
    }
  });

  afterAll(() => {
    // Restore original cache
    if (originalCache) {
      writeFileSync(TEST_CACHE_FILE, originalCache);
    }

    // Clean up backup
    if (existsSync(BACKUP_CACHE_FILE)) {
      unlinkSync(BACKUP_CACHE_FILE);
    }
  });

  /**
   * T037: Complete E2E test combining all three enhancements
   *
   * Enhancement 1 (Auto-fetch): Cache management ensures data availability
   * Enhancement 2 (Multi-year): Cross-year period fetches both years
   * Enhancement 3 (Holiday details): Response includes detailed holiday info
   */
  test('T037: All three enhancements should work together in a complete workflow', async () => {
    // ======================================================================
    // STEP 1: Enhancement 2 - Cross-year period (Dec 15, 2025 → Jan 13, 2026)
    // ======================================================================

    const crossYearStart = new Date('2025-12-15');

    // This single calculation should:
    // 1. Ensure cache exists (E1) via auto-fetch if needed
    // 2. Fetch both 2025 and 2026 data (E2) for cross-year period
    // 3. Include holiday details (E3) in the response
    const result = await calculateTPASSComparison({
      startDate: crossYearStart,
      tripsPerDay: 2,
    });

    // ======================================================================
    // VERIFICATION: Enhancement 1 - Cache management working
    // ======================================================================

    // Cache should exist (auto-fetch ensures this)
    expect(existsSync(TEST_CACHE_FILE)).toBe(true);

    const cache = JSON.parse(readFileSync(TEST_CACHE_FILE, 'utf-8'));

    // Cache should have valid metadata
    expect(cache.metadata).toBeDefined();
    expect(cache.metadata.lastUpdated).toBeDefined();
    expect(cache.metadata.yearsCovered).toBeDefined();

    // Cache should be fresh (within 30 days - valid cache)
    const cacheDate = new Date(cache.metadata.lastUpdated);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBeLessThan(30);

    // ======================================================================
    // VERIFICATION: Enhancement 2 - Multi-year data was fetched
    // ======================================================================

    // Both years should be in cache
    expect(cache.metadata.yearsCovered).toContain(2025);
    expect(cache.metadata.yearsCovered).toContain(2026);

    // Entries should exist for both years
    const entries2025 = cache.entries.filter((e: any) => e.date.startsWith('2025'));
    const entries2026 = cache.entries.filter((e: any) => e.date.startsWith('2026'));

    expect(entries2025.length).toBeGreaterThan(0);
    expect(entries2026.length).toBeGreaterThan(0);

    // ======================================================================
    // VERIFICATION: Enhancement 3 - Holiday details in response
    // ======================================================================

    // Response should include holiday details
    expect(result.holidayDetails).toBeDefined();
    expect(result.holidayDetails?.totalHolidays).toBeGreaterThanOrEqual(0);
    expect(result.holidayDetails?.holidayList).toBeDefined();

    const holidays = result.holidayDetails?.holidayList || [];

    // Holiday list should be non-empty (Dec/Jan period has holidays)
    expect(holidays.length).toBeGreaterThan(0);

    // Check for specific holidays
    const christmasDay = holidays.find((h) => h.date === '2025-12-25');
    const newYear2026 = holidays.find((h) => h.date === '2026-01-01');

    // At least one of these should exist
    expect(christmasDay || newYear2026).toBeDefined();

    // Holidays should have Chinese names
    holidays.forEach((holiday) => {
      expect(holiday.name).toBeDefined();
      expect(holiday.name.length).toBeGreaterThan(0);
      expect(holiday.name).toMatch(/[\u4e00-\u9fa5]/); // Contains Chinese characters
    });

    // Holidays should have Chinese day of week
    holidays.forEach((holiday) => {
      expect(['日', '一', '二', '三', '四', '五', '六']).toContain(holiday.dayOfWeek);
    });

    // ======================================================================
    // VERIFICATION: Calculation correctness
    // ======================================================================

    // Basic calculation validation
    expect(result.period.totalDays).toBe(30);
    expect(result.period.workingDays).toBeGreaterThan(0);
    expect(result.period.workingDays).toBeLessThanOrEqual(30);
    expect(result.period.workingDays + result.period.holidays).toBe(30);

    expect(result.totalTrips).toBe(result.period.workingDays * 2);
    expect(result.recommendation).toMatch(/BUY_TPASS|USE_REGULAR/);
    expect(result.recommendationReason).toBeDefined();
  });

  /**
   * T037-sequential: Verify enhancements work in different order
   * Test that having cache doesn't break multi-year or holiday details
   */
  test('T037-sequential: Enhancements should work with existing cache', async () => {
    // At this point, cache exists from previous test

    expect(existsSync(TEST_CACHE_FILE)).toBe(true);

    // Run calculation again with different cross-year period
    const result = await calculateTPASSComparison({
      startDate: new Date('2025-12-20'),
      tripsPerDay: 2,
    });

    // Should still have holiday details (E3)
    expect(result.holidayDetails).toBeDefined();
    expect(result.holidayDetails?.holidayList.length).toBeGreaterThan(0);

    // Should still work across years (E2)
    expect(result.period.totalDays).toBe(30);

    // Cache should still be valid (E1)
    const cache = JSON.parse(readFileSync(TEST_CACHE_FILE, 'utf-8'));
    expect(cache.metadata.yearsCovered).toContain(2025);
    expect(cache.metadata.yearsCovered).toContain(2026);
  });

  /**
   * T037-stress: Verify system handles multiple requests correctly
   */
  test('T037-stress: Multiple calculations should maintain consistency', async () => {
    // Run multiple calculations with different periods
    const periods = [
      new Date('2025-10-01'), // October (single year)
      new Date('2025-12-15'), // Cross-year Dec-Jan
      new Date('2026-01-01'), // January (single year, but 2026)
    ];

    const results = await Promise.all(
      periods.map((startDate) =>
        calculateTPASSComparison({
          startDate,
          tripsPerDay: 2,
        })
      )
    );

    // All should have holiday details
    results.forEach((result, index) => {
      expect(result.holidayDetails).toBeDefined();
      expect(result.holidayDetails?.totalHolidays).toBeGreaterThanOrEqual(0);
      expect(result.period.totalDays).toBe(30);
    });

    // Cache should now have all required years
    const cache = JSON.parse(readFileSync(TEST_CACHE_FILE, 'utf-8'));
    expect(cache.metadata.yearsCovered).toContain(2025);
    expect(cache.metadata.yearsCovered).toContain(2026);
  });
});
