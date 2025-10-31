/**
 * Type definitions for fare lookup feature
 */

/**
 * Fare record from CSV data source
 * Represents a single fare entry between two stations
 */
export interface FareRecord {
  /** Unique identifier from CSV (_id column) */
  id: string;
  /** Origin station name (起站) */
  origin: string;
  /** Destination station name (訖站) */
  destination: string;
  /** Regular fare in NTD (全票票價) */
  regularFare: number;
  /** Discounted fare in NTD (優惠票價) */
  discountedFare: number;
  /** Distance in kilometers (距離) */
  distance: number;
}

/**
 * Station pair for fare lookup
 */
export interface StationPair {
  /** Origin station name */
  origin: string;
  /** Destination station name */
  destination: string;
}

/**
 * Fare data cache structure
 */
export interface FareCache {
  /** Cache format version for future compatibility */
  version: string;
  /** Data source information */
  source: {
    /** Source URL */
    url: string;
    /** Dataset name */
    name: string;
  };
  /** Timestamp when cache was last updated (ISO 8601) */
  lastUpdated: string;
  /** Timestamp when cache expires (ISO 8601) */
  expiresAt: string;
  /** Cache statistics */
  stats: {
    /** Total number of fare records */
    totalRecords: number;
    /** Number of unique stations */
    uniqueStations: number;
  };
  /** Array of fare records */
  data: FareRecord[];
}

/**
 * Fuzzy match result for a station name
 */
export interface StationMatch {
  /** Original user input */
  original: string;
  /** Top matching results (up to 3) */
  matches: Array<{
    /** Matched station name */
    name: string;
    /** Match score (0-1, higher is better) */
    score: number;
  }>;
  /** User-selected station name (if disambiguation occurred) */
  selected?: string;
}

/**
 * Fare lookup request parameters
 * Supports either manual fare input OR station-based lookup
 */
export interface FareLookupRequest {
  /** Manual fare input (mutually exclusive with origin/destination) */
  fare?: number;
  /** Origin station name (requires destination) */
  origin?: string;
  /** Destination station name (requires origin) */
  destination?: string;
  /** Fare type selection (defaults to 'regular') */
  fareType?: 'regular' | 'discounted';
}

/**
 * Fare lookup response
 */
export interface FareLookupResponse {
  /** Whether the lookup was successful */
  success: boolean;
  /** Retrieved or provided fare amount */
  fare?: number;
  /** Source of fare data */
  source?: 'manual' | 'cache' | 'api';
  /** Station information (for station-based lookups) */
  stations?: {
    /** Origin station details */
    origin: {
      /** User input */
      input: string;
      /** Matched station name */
      matched: string;
    };
    /** Destination station details */
    destination: {
      /** User input */
      input: string;
      /** Matched station name */
      matched: string;
    };
    /** Distance between stations */
    distance?: number;
  };
  /** Fuzzy match suggestions (when exact match fails) */
  suggestions?: {
    /** Origin station suggestions */
    origin?: StationMatch['matches'];
    /** Destination station suggestions */
    destination?: StationMatch['matches'];
  };
  /** Warning messages (e.g., using expired cache) */
  warnings?: string[];
  /** Error information (when success is false) */
  error?: {
    /** Error code */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional context for debugging */
    details?: Record<string, unknown>;
  };
}

/**
 * Error codes for fare lookup operations
 */
export enum FareErrorCode {
  /** Network error during data download */
  NETWORK_ERROR = 'E001',
  /** CSV download failed */
  CSV_DOWNLOAD_FAILED = 'E002',
  /** CSV parsing failed */
  CSV_PARSE_FAILED = 'E003',
  /** Cache read/write error */
  CACHE_ERROR = 'E004',
  /** Invalid request parameters */
  INVALID_REQUEST = 'E005',
  /** Station not found in fare table */
  STATION_NOT_FOUND = 'E006',
  /** Cache corrupted or invalid */
  CACHE_CORRUPTED = 'E007',
}

/**
 * Warning codes for fare lookup operations
 */
export enum FareWarningCode {
  /** Using expired cache due to network failure */
  USING_EXPIRED_CACHE = 'W001',
  /** Fuzzy matching was used for station names */
  FUZZY_MATCH_USED = 'W002',
  /** Cache will expire soon */
  CACHE_EXPIRING_SOON = 'W003',
}
