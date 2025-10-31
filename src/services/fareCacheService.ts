/**
 * Fare cache management service
 * Handles downloading, caching, and expiry of fare data
 */

import { DEFAULT_CONFIG } from '../config';
import type { FareCache } from '../models/fare';
import { parseFareCsv, validateCsvStructure } from '../lib/csvParser';
import { extractUniqueStations } from '../lib/stationMatcher';

const CACHE_VERSION = '1.0.0';

/**
 * Service for managing fare data cache
 */
export class FareCacheService {
  private cacheFilePath: string;
  private csvUrl: string;
  private cacheTTLDays: number;

  constructor(
    cacheFilePath: string = DEFAULT_CONFIG.fare.cacheFile,
    csvUrl: string = DEFAULT_CONFIG.fare.csvUrl,
    cacheTTLDays: number = DEFAULT_CONFIG.fare.cacheTTLDays
  ) {
    this.cacheFilePath = cacheFilePath;
    this.csvUrl = csvUrl;
    this.cacheTTLDays = cacheTTLDays;
  }

  /**
   * Get fare data from cache or download if needed
   * @returns Fare cache data
   * @throws Error if download fails and no valid cache exists
   */
  async getFareData(): Promise<FareCache> {
    const cache = await this.loadCache();

    // Check if cache is valid
    if (cache && this.isCacheValid(cache)) {
      return cache;
    }

    // Try to download fresh data
    try {
      const freshCache = await this.downloadFareData();
      await this.saveCache(freshCache);
      return freshCache;
    } catch (error) {
      // If download fails but we have expired cache, use it with warning
      if (cache) {
        console.warn(
          'Using expired cache due to download failure:',
          error instanceof Error ? error.message : String(error)
        );
        return cache;
      }

      // No cache and download failed - throw error
      throw error;
    }
  }

  /**
   * Download fare data from CSV source
   * @returns Fresh fare cache
   * @throws Error if download or parsing fails
   */
  async downloadFareData(): Promise<FareCache> {
    try {
      // Download CSV file
      const response = await fetch(this.csvUrl);

      if (!response.ok) {
        throw new Error(
          `CSV download failed with status ${response.status}: ${response.statusText}`
        );
      }

      // Get raw buffer
      const buffer = await response.arrayBuffer();

      // Validate CSV structure
      if (!validateCsvStructure(buffer)) {
        throw new Error('CSV structure validation failed - unexpected format');
      }

      // Parse CSV data
      const records = parseFareCsv(buffer);

      // Create cache object
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.cacheTTLDays * 24 * 60 * 60 * 1000);

      const cache: FareCache = {
        version: CACHE_VERSION,
        source: {
          url: this.csvUrl,
          name: 'Taipei Open Data Platform',
        },
        lastUpdated: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        stats: {
          totalRecords: records.length,
          uniqueStations: extractUniqueStations(records).length,
        },
        data: records,
      };

      return cache;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to download fare data: ${error.message}`);
      }
      throw new Error('Failed to download fare data: Unknown error');
    }
  }

  /**
   * Load cache from file
   * @returns Cached fare data or null if not found/invalid
   */
  async loadCache(): Promise<FareCache | null> {
    try {
      const file = Bun.file(this.cacheFilePath);

      // Check if file exists
      if (!(await file.exists())) {
        return null;
      }

      // Read and parse cache
      const cacheData = await file.json();

      // Validate cache structure
      if (!this.isValidCacheStructure(cacheData)) {
        console.warn('Invalid cache structure, ignoring cache file');
        return null;
      }

      return cacheData as FareCache;
    } catch (error) {
      console.warn(
        'Failed to load cache:',
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Save cache to file with atomic write
   * @param cache - Fare cache to save
   */
  async saveCache(cache: FareCache): Promise<void> {
    try {
      // Create backup of existing cache
      const existingFile = Bun.file(this.cacheFilePath);
      if (await existingFile.exists()) {
        const backupPath = `${this.cacheFilePath}.backup.${Date.now()}`;
        await Bun.write(backupPath, await existingFile.text());
      }

      // Write new cache atomically
      const cacheJson = JSON.stringify(cache, null, 2);
      await Bun.write(this.cacheFilePath, cacheJson);

      console.log(`Cache saved successfully: ${cache.stats.totalRecords} records`);
    } catch (error) {
      throw new Error(
        `Failed to save cache: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if cache is valid (not expired)
   * @param cache - Fare cache to check
   * @returns True if cache is still valid
   */
  isCacheValid(cache: FareCache): boolean {
    const now = new Date();
    const expiresAt = new Date(cache.expiresAt);
    return now < expiresAt;
  }

  /**
   * Check if cache will expire soon (within 24 hours)
   * @param cache - Fare cache to check
   * @returns True if cache expires within 24 hours
   */
  isCacheExpiringSoon(cache: FareCache): boolean {
    const now = new Date();
    const expiresAt = new Date(cache.expiresAt);
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24;
  }

  /**
   * Validate cache structure
   * @param data - Data to validate
   * @returns True if structure is valid
   */
  private isValidCacheStructure(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const cache = data as Record<string, unknown>;

    // Check required fields
    if (
      typeof cache.version !== 'string' ||
      typeof cache.lastUpdated !== 'string' ||
      typeof cache.expiresAt !== 'string' ||
      !Array.isArray(cache.data)
    ) {
      return false;
    }

    // Check if data array has valid structure
    if (cache.data.length > 0) {
      const firstRecord = cache.data[0] as Record<string, unknown>;
      if (
        typeof firstRecord.id !== 'string' ||
        typeof firstRecord.origin !== 'string' ||
        typeof firstRecord.destination !== 'string' ||
        typeof firstRecord.regularFare !== 'number'
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Force cache refresh
   * @returns Fresh cache data
   */
  async refreshCache(): Promise<FareCache> {
    const freshCache = await this.downloadFareData();
    await this.saveCache(freshCache);
    return freshCache;
  }

  /**
   * Get cache status information
   * @returns Cache status details or null if no cache exists
   */
  async getCacheStatus(): Promise<{
    exists: boolean;
    valid: boolean;
    expiringSoon: boolean;
    lastUpdated?: string;
    expiresAt?: string;
    totalRecords?: number;
    uniqueStations?: number;
  } | null> {
    const cache = await this.loadCache();

    if (!cache) {
      return {
        exists: false,
        valid: false,
        expiringSoon: false,
      };
    }

    return {
      exists: true,
      valid: this.isCacheValid(cache),
      expiringSoon: this.isCacheExpiringSoon(cache),
      lastUpdated: cache.lastUpdated,
      expiresAt: cache.expiresAt,
      totalRecords: cache.stats.totalRecords,
      uniqueStations: cache.stats.uniqueStations,
    };
  }

  /**
   * Detect and recover from corrupted cache
   * @returns True if cache was corrupted and recovered
   */
  async detectAndRecoverCorruptedCache(): Promise<boolean> {
    try {
      const cache = await this.loadCache();

      // If cache doesn't exist or is invalid, try to download fresh data
      if (!cache || !this.isValidCacheStructure(cache)) {
        console.warn('Corrupted cache detected, downloading fresh data...');
        await this.refreshCache();
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        'Failed to recover from corrupted cache:',
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }
}
