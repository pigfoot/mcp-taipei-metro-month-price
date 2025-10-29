/**
 * Unit tests for holiday details functionality
 * Tests for Enhancement 3 (Holiday information)
 */

import { describe, test, expect } from 'bun:test';
import { getChineseDayOfWeek } from '../../src/lib/utils';
import { calculateTPASSComparison } from '../../src/services/calculator';

describe('Holiday Details (Enhancement 3)', () => {
  /**
   * T030: Unit test for getChineseDayOfWeek() conversion
   */
  describe('getChineseDayOfWeek()', () => {
    test('T030: Should convert Sunday to 日', () => {
      const sunday = new Date('2025-10-05'); // Oct 5, 2025 is Sunday
      expect(getChineseDayOfWeek(sunday)).toBe('日');
    });

    test('T030: Should convert Monday to 一', () => {
      const monday = new Date('2025-10-06'); // Oct 6, 2025 is Monday
      expect(getChineseDayOfWeek(monday)).toBe('一');
    });

    test('T030: Should convert Tuesday to 二', () => {
      const tuesday = new Date('2025-10-07'); // Oct 7, 2025 is Tuesday
      expect(getChineseDayOfWeek(tuesday)).toBe('二');
    });

    test('T030: Should convert Wednesday to 三', () => {
      const wednesday = new Date('2025-10-08'); // Oct 8, 2025 is Wednesday
      expect(getChineseDayOfWeek(wednesday)).toBe('三');
    });

    test('T030: Should convert Thursday to 四', () => {
      const thursday = new Date('2025-10-09'); // Oct 9, 2025 is Thursday
      expect(getChineseDayOfWeek(thursday)).toBe('四');
    });

    test('T030: Should convert Friday to 五', () => {
      const friday = new Date('2025-10-10'); // Oct 10, 2025 is Friday (國慶日)
      expect(getChineseDayOfWeek(friday)).toBe('五');
    });

    test('T030: Should convert Saturday to 六', () => {
      const saturday = new Date('2025-10-11'); // Oct 11, 2025 is Saturday
      expect(getChineseDayOfWeek(saturday)).toBe('六');
    });
  });

  /**
   * T029: Unit test for extractHolidayDetails() output format
   */
  describe('extractHolidayDetails()', () => {
    test('T029: Should include holidayDetails in calculation result', async () => {
      // Calculate for October 2025 which has national holidays
      const startDate = new Date('2025-10-01');

      const result = await calculateTPASSComparison({
        startDate,
        tripsPerDay: 2,
      });

      // Verify holidayDetails exists
      expect(result.holidayDetails).toBeDefined();
      expect(result.holidayDetails).not.toBeNull();
    });

    test('T029: holidayDetails should have correct structure', async () => {
      const startDate = new Date('2025-10-01');

      const result = await calculateTPASSComparison({
        startDate,
        tripsPerDay: 2,
      });

      const details = result.holidayDetails;

      // Verify structure
      expect(details).toHaveProperty('totalHolidays');
      expect(details).toHaveProperty('holidayList');
      expect(typeof details?.totalHolidays).toBe('number');
      expect(Array.isArray(details?.holidayList)).toBe(true);
    });

    test('T029: holidayList entries should have correct fields', async () => {
      const startDate = new Date('2025-10-01');

      const result = await calculateTPASSComparison({
        startDate,
        tripsPerDay: 2,
      });

      const holidays = result.holidayDetails?.holidayList || [];

      // Should have at least one holiday in October (國慶日 on 10/10)
      expect(holidays.length).toBeGreaterThan(0);

      // Check first holiday structure
      const holiday = holidays[0];
      expect(holiday).toHaveProperty('date');
      expect(holiday).toHaveProperty('name');
      expect(holiday).toHaveProperty('dayOfWeek');
      expect(holiday).toHaveProperty('isWeekend');

      // Verify types
      expect(typeof holiday.date).toBe('string');
      expect(typeof holiday.name).toBe('string');
      expect(typeof holiday.dayOfWeek).toBe('string');
      expect(typeof holiday.isWeekend).toBe('boolean');

      // Date should be in YYYY-MM-DD format
      expect(holiday.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // dayOfWeek should be Chinese character
      expect(['日', '一', '二', '三', '四', '五', '六']).toContain(holiday.dayOfWeek);
    });

    test('T029: Should find 國慶日 (National Day) in October', async () => {
      const startDate = new Date('2025-10-01');

      const result = await calculateTPASSComparison({
        startDate,
        tripsPerDay: 2,
      });

      const holidays = result.holidayDetails?.holidayList || [];

      // Find 國慶日 (Oct 10)
      const nationalDay = holidays.find((h) => h.date === '2025-10-10');

      expect(nationalDay).toBeDefined();
      expect(nationalDay?.name).toContain('國慶');
      expect(nationalDay?.dayOfWeek).toBe('五'); // Oct 10, 2025 is Friday
    });

    test('T029: Should find 中秋節 (Mid-Autumn Festival) in October', async () => {
      const startDate = new Date('2025-10-01');

      const result = await calculateTPASSComparison({
        startDate,
        tripsPerDay: 2,
      });

      const holidays = result.holidayDetails?.holidayList || [];

      // Find 中秋節 (Oct 6)
      const midAutumn = holidays.find((h) => h.date === '2025-10-06');

      expect(midAutumn).toBeDefined();
      expect(midAutumn?.name).toContain('中秋');
      expect(midAutumn?.dayOfWeek).toBe('一'); // Oct 6, 2025 is Monday
    });

    test('T029: totalHolidays should match holidayList length', async () => {
      const startDate = new Date('2025-10-01');

      const result = await calculateTPASSComparison({
        startDate,
        tripsPerDay: 2,
      });

      const details = result.holidayDetails;

      expect(details?.totalHolidays).toBe(details?.holidayList.length);
    });

    test('T029: holidayList should be sorted by date', async () => {
      const startDate = new Date('2025-10-01');

      const result = await calculateTPASSComparison({
        startDate,
        tripsPerDay: 2,
      });

      const holidays = result.holidayDetails?.holidayList || [];

      // Verify dates are in ascending order
      for (let i = 1; i < holidays.length; i++) {
        expect(holidays[i].date >= holidays[i - 1].date).toBe(true);
      }
    });
  });
});
