/**
 * Fare lookup service - Core business logic
 */

import { DEFAULT_CONFIG } from '../config';
import type {
  FareLookupRequest,
  FareLookupResponse,
  FareErrorCode,
  FareRecord,
} from '../models/fare';
import { FareCacheService } from './fareCacheService';
import {
  findMatchingStations,
  isExactMatch,
  extractUniqueStations,
  type MatchResult,
} from '../lib/stationMatcher';

/**
 * Service for fare lookup operations
 */
export class FareService {
  private cacheService: FareCacheService;
  private initialized: boolean = false;
  private fareRecords: FareRecord[] = [];
  private stationNames: string[] = [];

  constructor(cacheService?: FareCacheService) {
    this.cacheService = cacheService ?? new FareCacheService();
  }

  /**
   * Initialize service by loading fare data
   * @throws Error if initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const cache = await this.cacheService.getFareData();
      this.fareRecords = cache.data;
      this.stationNames = extractUniqueStations(this.fareRecords);
      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize FareService: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Lookup fare based on request parameters
   * @param request - Fare lookup request
   * @returns Fare lookup response
   */
  async lookupFare(request: FareLookupRequest): Promise<FareLookupResponse> {
    // Ensure service is initialized
    await this.initialize();

    // Validate request
    const validationError = this.validateRequest(request);
    if (validationError) {
      return validationError;
    }

    // Handle manual fare input
    if (request.fare !== undefined) {
      return this.handleManualFareInput(request);
    }

    // Handle station-based lookup
    if (request.origin && request.destination) {
      return await this.handleStationLookup(request);
    }

    // No fare information provided - prompt user
    return {
      success: false,
      error: {
        code: 'E005' as FareErrorCode,
        message:
          'Please provide either a fare amount or both origin and destination stations',
        details: {
          hint: 'You can either:\n1. Provide "fare" parameter for manual input\n2. Provide "origin" and "destination" parameters for automatic lookup',
        },
      },
    };
  }

  /**
   * Validate fare lookup request
   * @param request - Request to validate
   * @returns Error response if invalid, null if valid
   */
  private validateRequest(request: FareLookupRequest): FareLookupResponse | null {
    const { fare, origin, destination, fareType } = request;

    // Check for conflicting inputs
    if (fare !== undefined && (origin || destination)) {
      return {
        success: false,
        error: {
          code: 'E005' as FareErrorCode,
          message: 'Cannot specify both manual fare and station lookup',
          details: {
            providedFare: fare,
            providedOrigin: origin,
            providedDestination: destination,
          },
        },
      };
    }

    // Validate manual fare
    if (fare !== undefined) {
      if (typeof fare !== 'number' || fare < 0) {
        return {
          success: false,
          error: {
            code: 'E005' as FareErrorCode,
            message: 'Fare must be a non-negative number',
            details: { providedFare: fare },
          },
        };
      }

      const { minFare, maxFare } = DEFAULT_CONFIG.validation;
      if (fare < minFare || fare > maxFare) {
        return {
          success: false,
          error: {
            code: 'E005' as FareErrorCode,
            message: `Fare must be between ${minFare} and ${maxFare} NTD`,
            details: { providedFare: fare, minFare, maxFare },
          },
        };
      }
    }

    // Validate station lookup
    if (origin || destination) {
      if (!origin || !destination) {
        return {
          success: false,
          error: {
            code: 'E005' as FareErrorCode,
            message: 'Both origin and destination are required for station lookup',
            details: {
              providedOrigin: origin,
              providedDestination: destination,
            },
          },
        };
      }

      if (typeof origin !== 'string' || typeof destination !== 'string') {
        return {
          success: false,
          error: {
            code: 'E005' as FareErrorCode,
            message: 'Station names must be strings',
          },
        };
      }

      if (origin.trim().length === 0 || destination.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'E005' as FareErrorCode,
            message: 'Station names cannot be empty',
          },
        };
      }
    }

    // Validate fare type
    if (fareType && fareType !== 'regular' && fareType !== 'discounted') {
      return {
        success: false,
        error: {
          code: 'E005' as FareErrorCode,
          message: 'Fare type must be either "regular" or "discounted"',
          details: { providedFareType: fareType },
        },
      };
    }

    return null;
  }

  /**
   * Handle manual fare input
   * @param request - Request with manual fare
   * @returns Lookup response
   */
  private handleManualFareInput(request: FareLookupRequest): FareLookupResponse {
    return {
      success: true,
      fare: request.fare!,
      source: 'manual',
    };
  }

  /**
   * Handle station-based fare lookup
   * @param request - Request with origin and destination
   * @returns Lookup response
   */
  private async handleStationLookup(
    request: FareLookupRequest
  ): Promise<FareLookupResponse> {
    const { origin, destination, fareType = 'regular' } = request;

    // Try exact match first
    const originExact = isExactMatch(origin!, this.stationNames);
    const destinationExact = isExactMatch(destination!, this.stationNames);

    if (originExact && destinationExact) {
      // Both stations match exactly
      const fareRecord = this.findFareRecord(origin!, destination!);

      if (fareRecord) {
        const fare =
          fareType === 'discounted'
            ? fareRecord.discountedFare
            : fareRecord.regularFare;

        // Check if cache is expiring soon
        const warnings: string[] = [];
        const cacheStatus = await this.cacheService.getCacheStatus();
        if (cacheStatus?.expiringSoon) {
          warnings.push('Cache will expire soon - data may be outdated');
        }

        return {
          success: true,
          fare,
          source: 'cache',
          stations: {
            origin: {
              input: origin!,
              matched: origin!,
            },
            destination: {
              input: destination!,
              matched: destination!,
            },
            distance: fareRecord.distance,
          },
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      }

      // Exact match but no fare record found
      return {
        success: false,
        error: {
          code: 'E006' as FareErrorCode,
          message: `No fare record found for route from ${origin} to ${destination}`,
          details: {
            origin: origin!,
            destination: destination!,
            hint: 'This route may not be valid or data may be incomplete',
          },
        },
      };
    }

    // Try fuzzy matching
    const originMatches = findMatchingStations(origin!, this.stationNames);
    const destinationMatches = findMatchingStations(destination!, this.stationNames);

    // Check if we have suggestions
    if (originMatches.length === 0 && destinationMatches.length === 0) {
      return {
        success: false,
        error: {
          code: 'E006' as FareErrorCode,
          message: 'No matching stations found',
          details: {
            providedOrigin: origin!,
            providedDestination: destination!,
            hint: 'Please check station names and try again',
          },
        },
      };
    }

    // Return suggestions for user to select
    return {
      success: false,
      suggestions: {
        origin: originMatches.length > 0 ? originMatches : undefined,
        destination: destinationMatches.length > 0 ? destinationMatches : undefined,
      },
      error: {
        code: 'E006' as FareErrorCode,
        message: 'Station names not found - please select from suggestions',
        details: {
          providedOrigin: origin!,
          providedDestination: destination!,
          hint: 'Use one of the suggested station names and try again',
        },
      },
    };
  }

  /**
   * Find fare record for a station pair
   * @param origin - Origin station name
   * @param destination - Destination station name
   * @returns Fare record or undefined if not found
   */
  private findFareRecord(origin: string, destination: string): FareRecord | undefined {
    return this.fareRecords.find(
      (record) => record.origin === origin && record.destination === destination
    );
  }

  /**
   * Get all unique station names
   * @returns Array of station names
   */
  getStationNames(): string[] {
    return [...this.stationNames];
  }

  /**
   * Validate station name exists
   * @param stationName - Station name to validate
   * @returns True if station exists
   */
  validateStationName(stationName: string): boolean {
    return isExactMatch(stationName, this.stationNames);
  }

  /**
   * Get suggestions for a station name
   * @param stationName - Partial or misspelled station name
   * @returns Array of suggested station names with scores
   */
  getStationSuggestions(stationName: string): MatchResult[] {
    return findMatchingStations(stationName, this.stationNames);
  }
}
