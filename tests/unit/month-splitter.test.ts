/**
 * Unit tests for month-splitter service
 * Feature: 004-cross-month-tpass
 */

import { describe, test, expect } from 'bun:test';
import { detectMonthBoundary, splitIntoMonthlySegments } from '../../src/services/month-splitter';

describe('month-splitter - detectMonthBoundary (FR-001)', () => {
  test('should detect cross-month boundary (Oct 31 to Nov 29)', () => {
    const startDate = new Date(2024, 9, 31); // Oct 31, 2024
    const endDate = new Date(2024, 10, 29); // Nov 29, 2024

    const result = detectMonthBoundary(startDate, endDate);

    expect(result).toBe(true);
  });

  test('should detect no boundary for single month (Oct 1 to Oct 30)', () => {
    const startDate = new Date(2024, 9, 1); // Oct 1, 2024
    const endDate = new Date(2024, 9, 30); // Oct 30, 2024

    const result = detectMonthBoundary(startDate, endDate);

    expect(result).toBe(false);
  });

  test('should detect year boundary crossing (Dec 31 to Jan 29)', () => {
    const startDate = new Date(2024, 11, 31); // Dec 31, 2024
    const endDate = new Date(2025, 0, 29); // Jan 29, 2025

    const result = detectMonthBoundary(startDate, endDate);

    expect(result).toBe(true);
  });

  test('should detect same day in same month', () => {
    const startDate = new Date(2024, 9, 15); // Oct 15, 2024
    const endDate = new Date(2024, 9, 15); // Oct 15, 2024

    const result = detectMonthBoundary(startDate, endDate);

    expect(result).toBe(false);
  });
});

describe('month-splitter - splitIntoMonthlySegments (FR-002)', () => {
  test('should split cross-month period into 2 segments (Oct 31 to Nov 29)', () => {
    const startDate = new Date(2024, 9, 31); // Oct 31, 2024
    const endDate = new Date(2024, 10, 29); // Nov 29, 2024

    const segments = splitIntoMonthlySegments(startDate, endDate);

    expect(segments).toHaveLength(2);

    // October segment
    expect(segments[0].start.getMonth()).toBe(9); // October
    expect(segments[0].start.getDate()).toBe(31);
    expect(segments[0].end.getMonth()).toBe(9); // October
    expect(segments[0].end.getDate()).toBe(31);
    expect(segments[0].days).toBe(1);

    // November segment
    expect(segments[1].start.getMonth()).toBe(10); // November
    expect(segments[1].start.getDate()).toBe(1);
    expect(segments[1].end.getMonth()).toBe(10); // November
    expect(segments[1].end.getDate()).toBe(29);
    expect(segments[1].days).toBe(29);
  });

  test('should return single segment for single month period', () => {
    const startDate = new Date(2024, 9, 1); // Oct 1, 2024
    const endDate = new Date(2024, 9, 30); // Oct 30, 2024

    const segments = splitIntoMonthlySegments(startDate, endDate);

    expect(segments).toHaveLength(1);
    expect(segments[0].start.getMonth()).toBe(9);
    expect(segments[0].end.getMonth()).toBe(9);
    expect(segments[0].days).toBe(30);
  });

  test('should split year boundary into 2 segments (Dec 20 to Jan 18)', () => {
    const startDate = new Date(2024, 11, 20); // Dec 20, 2024
    const endDate = new Date(2025, 0, 18); // Jan 18, 2025

    const segments = splitIntoMonthlySegments(startDate, endDate);

    expect(segments).toHaveLength(2);

    // December segment
    expect(segments[0].start.getFullYear()).toBe(2024);
    expect(segments[0].start.getMonth()).toBe(11); // December
    expect(segments[0].start.getDate()).toBe(20);
    expect(segments[0].end.getMonth()).toBe(11); // December
    expect(segments[0].end.getDate()).toBe(31);

    // January segment
    expect(segments[1].start.getFullYear()).toBe(2025);
    expect(segments[1].start.getMonth()).toBe(0); // January
    expect(segments[1].start.getDate()).toBe(1);
    expect(segments[1].end.getDate()).toBe(18);
  });

  test('should handle February leap year (Feb 15 to Mar 15, 2024)', () => {
    const startDate = new Date(2024, 1, 15); // Feb 15, 2024 (leap year)
    const endDate = new Date(2024, 2, 15); // Mar 15, 2024

    const segments = splitIntoMonthlySegments(startDate, endDate);

    expect(segments).toHaveLength(2);

    // February segment (leap year has 29 days)
    expect(segments[0].start.getMonth()).toBe(1); // February
    expect(segments[0].end.getDate()).toBe(29); // Last day of Feb in leap year
    expect(segments[0].days).toBe(15); // Feb 15-29 = 15 days

    // March segment
    expect(segments[1].start.getMonth()).toBe(2); // March
    expect(segments[1].end.getDate()).toBe(15);
  });

  test('should handle February non-leap year (Feb 15 to Mar 15, 2025)', () => {
    const startDate = new Date(2025, 1, 15); // Feb 15, 2025 (non-leap year)
    const endDate = new Date(2025, 2, 15); // Mar 15, 2025

    const segments = splitIntoMonthlySegments(startDate, endDate);

    expect(segments).toHaveLength(2);

    // February segment (non-leap year has 28 days)
    expect(segments[0].start.getMonth()).toBe(1); // February
    expect(segments[0].end.getDate()).toBe(28); // Last day of Feb in non-leap year
    expect(segments[0].days).toBe(14); // Feb 15-28 = 14 days

    // March segment
    expect(segments[1].start.getMonth()).toBe(2); // March
    expect(segments[1].end.getDate()).toBe(15);
  });
});
