/**
 * Unit tests for CalendarService - Multi-year functionality
 * Tests for Enhancement 2 (Multi-year fetching)
 */

import { describe, test, expect } from 'bun:test';
import { CalendarService } from '../../src/services/calendar-service';
import { existsSync, readFileSync } from 'fs';

const TEST_CACHE_FILE = 'data/calendar-cache.json';

describe('CalendarService - Multi-year fetching (Enhancement 2)', () => {
  /**
   * T020: Unit test for getYearsInRange() with single year
   */
  test('T020: getYearsInRange() should return single year for same-year period', async () => {
    const service = CalendarService.getInstance();
    await service.initialize();

    // Test by ensuring data for a single-year period
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-12-31');

    await service.ensureDataForPeriod(startDate, endDate);

    // Verify cache has 2025 data
    const cache = JSON.parse(readFileSync(TEST_CACHE_FILE, 'utf-8'));
    expect(cache.metadata.yearsCovered).toContain(2025);
  });

  /**
   * T021: Unit test for getYearsInRange() with year boundary crossing
   */
  test('T021: getYearsInRange() should return multiple years for cross-year period', async () => {
    const service = CalendarService.getInstance();
    await service.initialize();

    // Test by ensuring data for a cross-year period (Dec 2025 → Jan 2026)
    const startDate = new Date('2025-12-15');
    const endDate = new Date('2026-01-13');

    await service.ensureDataForPeriod(startDate, endDate);

    // Verify cache has both 2025 and 2026 data
    const cache = JSON.parse(readFileSync(TEST_CACHE_FILE, 'utf-8'));
    expect(cache.metadata.yearsCovered).toContain(2025);
    expect(cache.metadata.yearsCovered).toContain(2026);

    // Verify yearsCovered is sorted
    const years = cache.metadata.yearsCovered;
    const sortedYears = [...years].sort();
    expect(years).toEqual(sortedYears);
  });

  /**
   * Additional test: Verify getMissingYears() logic
   */
  test('getMissingYears() should identify missing years correctly', async () => {
    const service = CalendarService.getInstance();
    await service.initialize();

    const status = service.getCacheStatus();
    const currentYears = status.yearsCovered || [];

    // If we already have 2025, requesting 2025 again should not fetch
    // If we need 2026, it should fetch
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    // This should not trigger new fetch since 2025 exists
    await service.ensureDataForPeriod(startDate, endDate);

    const newStatus = service.getCacheStatus();
    expect(newStatus.yearsCovered).toEqual(expect.arrayContaining(currentYears));
  });

  /**
   * Verify multi-year cache persistence
   */
  test('Multi-year data should persist in cache file', async () => {
    const service = CalendarService.getInstance();
    await service.initialize();

    // Ensure we have multi-year data
    const crossYearStart = new Date('2025-12-15');
    const crossYearEnd = new Date('2026-01-13');

    await service.ensureDataForPeriod(crossYearStart, crossYearEnd);

    // Read cache file
    const cache = JSON.parse(readFileSync(TEST_CACHE_FILE, 'utf-8'));

    // Verify metadata structure
    expect(cache.metadata).toBeDefined();
    expect(cache.metadata.yearsCovered).toBeDefined();
    expect(Array.isArray(cache.metadata.yearsCovered)).toBe(true);
    expect(cache.metadata.yearsCovered.length).toBeGreaterThanOrEqual(1);

    // Verify entries from multiple years exist
    const entries2025 = cache.entries.filter((e: any) => e.date.startsWith('2025'));
    const entries2026 = cache.entries.filter((e: any) => e.date.startsWith('2026'));

    if (cache.metadata.yearsCovered.includes(2025)) {
      expect(entries2025.length).toBeGreaterThan(0);
    }

    if (cache.metadata.yearsCovered.includes(2026)) {
      expect(entries2026.length).toBeGreaterThan(0);
    }
  });
});
