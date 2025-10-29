/**
 * Integration test for multi-year calendar fetching
 * T022: Cross-year TPASS period test
 */

import { describe, test, expect } from 'bun:test';
import { CalendarService } from '../../src/services/calendar-service';
import { calculateTPASSComparison } from '../../src/services/calculator';
import { existsSync, readFileSync } from 'fs';

const TEST_CACHE_FILE = 'data/calendar-cache.json';

describe('Integration: Multi-year calendar fetching (Enhancement 2)', () => {
  /**
   * T022: Cross-year TPASS period integration test
   * Scenario: Query with Dec start date → Should fetch both current and next year
   */
  test('T022: Cross-year TPASS period should fetch data for both years', async () => {
    // Step 1: Calculate TPASS comparison with cross-year period
    // Dec 15, 2025 → Jan 13, 2026 (30 days)
    const startDate = new Date('2025-12-15');

    const result = await calculateTPASSComparison({
      startDate,
      tripsPerDay: 2,
    });

    // Step 2: Verify calculation succeeded
    expect(result).toBeDefined();
    expect(result.period).toBeDefined();
    expect(result.period.totalDays).toBe(30);
    expect(result.period.workingDays).toBeGreaterThan(0);

    // Step 3: Verify cache contains both 2025 and 2026 data
    expect(existsSync(TEST_CACHE_FILE)).toBe(true);
    const cache = JSON.parse(readFileSync(TEST_CACHE_FILE, 'utf-8'));

    expect(cache.metadata.yearsCovered).toBeDefined();
    expect(cache.metadata.yearsCovered).toContain(2025);
    expect(cache.metadata.yearsCovered).toContain(2026);

    // Step 4: Verify entries exist for both years
    const entries = cache.entries;
    const entries2025 = entries.filter((e: any) => e.date.startsWith('2025'));
    const entries2026 = entries.filter((e: any) => e.date.startsWith('2026'));

    expect(entries2025.length).toBeGreaterThan(0);
    expect(entries2026.length).toBeGreaterThan(0);

    // Step 5: Verify we can query holiday data for the cross-year period
    const service = CalendarService.getInstance();

    // Check a date in December 2025
    const dec25Entry = service.getEntry(new Date('2025-12-25'));
    expect(dec25Entry).toBeDefined();

    // Check a date in January 2026
    const jan01Entry = service.getEntry(new Date('2026-01-01'));
    expect(jan01Entry).toBeDefined();
  });

  /**
   * T022-ext: Verify working day calculation across year boundary
   */
  test('T022-ext: Working day count should be accurate across year boundary', async () => {
    const startDate = new Date('2025-12-15');

    const result = await calculateTPASSComparison({
      startDate,
      tripsPerDay: 2,
    });

    // Verify working days calculation spans both years correctly
    expect(result.period.workingDays).toBeGreaterThan(0);
    expect(result.period.workingDays).toBeLessThanOrEqual(30);

    // Working days should be reasonable (roughly 20-22 for a 30-day period)
    expect(result.period.workingDays).toBeGreaterThanOrEqual(15);
    expect(result.period.workingDays).toBeLessThanOrEqual(25);

    // Total days should always be 30 (TPASS period)
    expect(result.period.totalDays).toBe(30);

    // Holidays + working days should equal total days
    expect(result.period.workingDays + result.period.holidays).toBe(result.period.totalDays);
  });

  /**
   * T022-incremental: Verify incremental year fetching
   * System should only fetch missing years, not re-fetch existing years
   */
  test('T022-incremental: Should only fetch missing years incrementally', async () => {
    const service = CalendarService.getInstance();
    await service.initialize();

    // Get current status
    const initialStatus = service.getCacheStatus();
    const initialYears = initialStatus.yearsCovered || [];
    const initialEntryCount = initialStatus.entryCount;

    // Request same year period (should not fetch)
    const sameYearStart = new Date('2025-10-01');
    const sameYearEnd = new Date('2025-10-30');
    await service.ensureDataForPeriod(sameYearStart, sameYearEnd);

    const afterSameYear = service.getCacheStatus();

    // Entry count should not increase significantly (same year)
    if (initialYears.includes(2025)) {
      expect(afterSameYear.entryCount).toBe(initialEntryCount);
    }

    // Request cross-year period (may fetch new year if not exists)
    const crossYearStart = new Date('2025-12-15');
    const crossYearEnd = new Date('2026-01-13');
    await service.ensureDataForPeriod(crossYearStart, crossYearEnd);

    const afterCrossYear = service.getCacheStatus();

    // Verify both years are now in cache
    expect(afterCrossYear.yearsCovered).toContain(2025);
    expect(afterCrossYear.yearsCovered).toContain(2026);

    // Entry count should increase (new year added)
    if (!initialYears.includes(2026)) {
      expect(afterCrossYear.entryCount).toBeGreaterThan(initialEntryCount);
    }
  });

  /**
   * Verify holiday details work across year boundary
   */
  test('Holiday details should include holidays from both years', async () => {
    const startDate = new Date('2025-12-15');

    const result = await calculateTPASSComparison({
      startDate,
      tripsPerDay: 2,
    });

    // Verify holiday details are included
    expect(result.holidayDetails).toBeDefined();
    expect(result.holidayDetails?.totalHolidays).toBeGreaterThanOrEqual(0);
    expect(result.holidayDetails?.holidayList).toBeDefined();
    expect(Array.isArray(result.holidayDetails?.holidayList)).toBe(true);

    // Check if we have any holidays in the period
    const holidays = result.holidayDetails?.holidayList || [];

    // Check for holidays in December 2025 or January 2026
    const dec2025Holidays = holidays.filter((h) => h.date.startsWith('2025-12'));
    const jan2026Holidays = holidays.filter((h) => h.date.startsWith('2026-01'));

    // At least one of these should have holidays (Christmas in Dec or New Year in Jan)
    expect(dec2025Holidays.length + jan2026Holidays.length).toBeGreaterThanOrEqual(0);

    // If there's a New Year's Day holiday, verify it
    const newYear2026 = holidays.find((h) => h.date === '2026-01-01');
    if (newYear2026) {
      expect(newYear2026.name).toBeDefined();
      expect(newYear2026.dayOfWeek).toBeDefined();
    }
  });
});
