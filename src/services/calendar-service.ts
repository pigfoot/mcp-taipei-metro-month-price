/**
 * Calendar service - provides calendar data with fallback logic
 */

import { formatDate, isWeekend } from '../lib/utils.js';
import type { CalendarEntry } from '../lib/types.js';
import { CalendarFetcher } from './calendar-fetcher.js';

interface CalendarCache {
  metadata: {
    version: string;
    lastUpdated: string;
    source: string;
    yearsCovered: number[];
  };
  entries: CalendarEntry[];
}

/**
 * Calendar service with caching and fallback support
 */
export class CalendarService {
  private static instance: CalendarService;
  private cache: Map<string, CalendarEntry> = new Map();
  private cacheLoaded = false;
  private readonly cacheFile = 'data/calendar-cache.json';
  private static readonly CACHE_EXPIRY_DAYS = 30;
  private metadata: CalendarCache['metadata'] | null = null;

  private constructor() {}

  static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  /**
   * Initialize calendar service by loading cache
   * Enhancement: FR-011 (Auto-fetch on missing/expired cache)
   */
  async initialize(): Promise<void> {
    if (this.cacheLoaded) return;

    const cacheValid = await this.isCacheValid();

    if (!cacheValid) {
      // Auto-fetch when cache is missing or expired
      try {
        await this.fetchAndUpdateCache();
        this.cacheLoaded = true;
        console.log(`[INFO] Calendar cache loaded: ${this.cache.size} entries (fresh data)`);
        return;
      } catch (error) {
        console.error('[ERROR] Auto-fetch failed:', error);
        // Try to load existing cache as fallback
        console.log('[INFO] Attempting to use existing cache as fallback...');
      }
    }

    try {
      await this.loadCache();
      this.cacheLoaded = true;
      console.log(`[INFO] Calendar cache loaded: ${this.cache.size} entries`);
    } catch (error) {
      console.warn('[WARN] Failed to load calendar cache:', error);
      // Continue with empty cache - will use weekday estimation
    }
  }

  /**
   * Check if cache is valid (exists and not expired)
   * Enhancement: FR-011 (Auto-fetch)
   */
  private async isCacheValid(): Promise<boolean> {
    try {
      const file = Bun.file(this.cacheFile);
      const exists = await file.exists();

      if (!exists) {
        console.log('[INFO] Cache file does not exist');
        return false;
      }

      const data = (await file.json()) as CalendarCache;
      const lastUpdate = new Date(data.metadata.lastUpdated);
      const now = new Date();
      const daysSinceUpdate = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUpdate >= CalendarService.CACHE_EXPIRY_DAYS) {
        console.log(`[INFO] Cache expired (${daysSinceUpdate} days old)`);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('[WARN] Failed to validate cache:', error);
      return false;
    }
  }

  /**
   * Fetch fresh data and update cache
   * Enhancement: FR-011 (Auto-fetch)
   */
  private async fetchAndUpdateCache(): Promise<void> {
    console.log('[INFO] Auto-fetching calendar data...');
    const fetcher = new CalendarFetcher();

    try {
      const data = await fetcher.fetchFromSource();

      // Create backup of existing cache if it exists
      try {
        const file = Bun.file(this.cacheFile);
        if (await file.exists()) {
          const backupPath = `${this.cacheFile}.backup.${Date.now()}`;
          const content = await file.text();
          await Bun.write(backupPath, content);
          console.log(`[INFO] Backup created: ${backupPath}`);
        }
      } catch (backupError) {
        console.warn('[WARN] Failed to create backup:', backupError);
      }

      // Save new cache
      await Bun.write(this.cacheFile, JSON.stringify(data, null, 2));
      console.log('[INFO] Calendar cache updated successfully');

      // Update metadata
      this.metadata = data.metadata;

      // Reload cache into memory
      data.entries.forEach((entry) => {
        this.cache.set(entry.date, entry);
      });
    } catch (error) {
      console.error('[ERROR] Failed to fetch calendar data:', error);
      throw error;
    }
  }

  /**
   * Load calendar data from cache file
   */
  private async loadCache(): Promise<void> {
    try {
      const file = Bun.file(this.cacheFile);
      const data = (await file.json()) as CalendarCache;

      // Store metadata
      this.metadata = data.metadata;

      data.entries.forEach((entry) => {
        this.cache.set(entry.date, entry);
      });
    } catch (error) {
      throw new Error(`Failed to load calendar cache: ${error}`);
    }
  }

  /**
   * Check if a specific date is a working day
   */
  isWorkingDay(date: Date): boolean {
    const dateStr = formatDate(date);
    const entry = this.cache.get(dateStr);

    if (entry) {
      return entry.isWorkingDay;
    }

    // Fallback: assume Mon-Fri are working days
    return !isWeekend(date);
  }

  /**
   * Get calendar entry for a specific date
   */
  getEntry(date: Date): CalendarEntry | undefined {
    const dateStr = formatDate(date);
    return this.cache.get(dateStr);
  }

  /**
   * Count working days in a date range
   */
  countWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      if (this.isWorkingDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Update calendar cache from remote sources
   */
  async updateCache(): Promise<void> {
    const fetcher = new CalendarFetcher();
    try {
      const data = await fetcher.fetchFromSource();
      // Save to cache file
      await Bun.write(this.cacheFile, JSON.stringify(data, null, 2));
      // Reload cache
      this.cache.clear();
      this.cacheLoaded = false;
      await this.initialize();
      console.log('Calendar cache updated successfully');
    } catch (error) {
      console.error('Failed to update calendar cache:', error);
      throw error;
    }
  }

  /**
   * Get list of years spanning a date range
   * Enhancement: FR-012 (Multi-year fetching)
   */
  private getYearsInRange(startDate: Date, endDate: Date): number[] {
    const years = new Set<number>();
    years.add(startDate.getFullYear());
    years.add(endDate.getFullYear());
    return Array.from(years).sort();
  }

  /**
   * Check which years are missing from cache
   * Enhancement: FR-012 (Multi-year fetching)
   */
  private getMissingYears(requiredYears: number[]): number[] {
    if (!this.metadata || !this.metadata.yearsCovered) {
      return requiredYears;
    }
    return requiredYears.filter((year) => !this.metadata!.yearsCovered.includes(year));
  }

  /**
   * Ensure calendar data exists for entire date range
   * Enhancement: FR-012 (Multi-year fetching)
   */
  async ensureDataForPeriod(startDate: Date, endDate: Date): Promise<void> {
    const requiredYears = this.getYearsInRange(startDate, endDate);
    const missingYears = this.getMissingYears(requiredYears);

    if (missingYears.length > 0) {
      console.log(`[INFO] Fetching data for years: ${missingYears.join(', ')}`);
      await this.fetchMultipleYears(missingYears);
    }
  }

  /**
   * Fetch and merge data for multiple years
   * Enhancement: FR-012 (Multi-year fetching)
   */
  private async fetchMultipleYears(years: number[]): Promise<void> {
    const fetcher = new CalendarFetcher();

    for (const year of years) {
      try {
        console.log(`[INFO] Fetching calendar data for ${year}...`);
        const data = await fetcher.fetchFromSource(year);

        // Merge new entries into cache
        data.entries.forEach((entry) => {
          this.cache.set(entry.date, entry);
        });

        // Update metadata yearsCovered
        if (this.metadata) {
          if (!this.metadata.yearsCovered.includes(year)) {
            this.metadata.yearsCovered.push(year);
            this.metadata.yearsCovered.sort();
          }
        } else {
          this.metadata = data.metadata;
        }

        console.log(`[INFO] Added ${data.entries.length} entries for year ${year}`);
      } catch (error) {
        console.error(`[ERROR] Failed to fetch data for year ${year}:`, error);
        throw error;
      }
    }

    // Save updated cache with all years
    await this.saveCache();
  }

  /**
   * Save cache to file
   * Enhancement: FR-012 (Multi-year fetching)
   */
  private async saveCache(): Promise<void> {
    if (!this.metadata) {
      throw new Error('Cannot save cache without metadata');
    }

    const cacheData: CalendarCache = {
      metadata: this.metadata,
      entries: Array.from(this.cache.values()),
    };

    await Bun.write(this.cacheFile, JSON.stringify(cacheData, null, 2));
    console.log(`[INFO] Cache saved with ${cacheData.entries.length} entries`);
  }

  /**
   * Get cache status information
   */
  getCacheStatus(): {
    loaded: boolean;
    entryCount: number;
    source: string;
    lastUpdated: string;
    yearsCovered?: number[];
  } {
    return {
      loaded: this.cacheLoaded,
      entryCount: this.cache.size,
      source: this.metadata?.source || 'local-cache',
      lastUpdated: this.metadata?.lastUpdated || 'unknown',
      yearsCovered: this.metadata?.yearsCovered,
    };
  }
}
