/**
 * Station name fuzzy matching using fuzzysort library
 */

import fuzzysort from 'fuzzysort';
import { DEFAULT_CONFIG } from '../config';

/**
 * Match result with score
 */
export interface MatchResult {
  /** Matched station name */
  name: string;
  /** Match score (0-1, higher is better) */
  score: number;
}

/**
 * Find matching station names using fuzzy search
 * @param query - User input station name
 * @param stationNames - Array of valid station names to search
 * @param options - Optional configuration
 * @returns Array of top matches (up to maxSuggestions)
 */
export function findMatchingStations(
  query: string,
  stationNames: string[],
  options?: {
    /** Maximum number of suggestions to return (default: 3) */
    maxSuggestions?: number;
    /** Match threshold (0-1, default: 0.3) */
    threshold?: number;
  }
): MatchResult[] {
  const maxSuggestions = options?.maxSuggestions ?? DEFAULT_CONFIG.fare.maxSuggestions;
  const threshold = options?.threshold ?? DEFAULT_CONFIG.fare.fuzzyMatchThreshold;

  if (!query || query.trim().length === 0) {
    return [];
  }

  // Use fuzzysort for fuzzy matching
  const results = fuzzysort.go(query, stationNames, {
    limit: maxSuggestions,
    threshold: -10000, // fuzzysort uses negative scores, we'll filter later
  });

  // Convert fuzzysort results to our format
  const matches: MatchResult[] = results.map((result) => ({
    name: result.target,
    // Normalize score to 0-1 range
    // fuzzysort scores are negative, with 0 being perfect match
    // We convert to positive and normalize
    score: normalizeScore(result.score),
  }));

  // Filter by threshold
  return matches.filter((match) => match.score >= threshold);
}

/**
 * Check if a station name exists exactly in the list
 * @param stationName - Station name to check
 * @param stationNames - Array of valid station names
 * @returns True if exact match exists
 */
export function isExactMatch(
  stationName: string,
  stationNames: string[]
): boolean {
  const normalized = stationName.trim();
  return stationNames.includes(normalized);
}

/**
 * Get best match for a station name
 * @param query - User input station name
 * @param stationNames - Array of valid station names
 * @returns Best match or null if no good match found
 */
export function getBestMatch(
  query: string,
  stationNames: string[]
): MatchResult | null {
  // First try exact match
  if (isExactMatch(query, stationNames)) {
    return {
      name: query.trim(),
      score: 1.0,
    };
  }

  // Then try fuzzy match
  const matches = findMatchingStations(query, stationNames, {
    maxSuggestions: 1,
  });

  return matches.length > 0 ? (matches[0] ?? null) : null;
}

/**
 * Normalize fuzzysort score to 0-1 range
 * fuzzysort returns negative scores where:
 * - 0 is perfect match
 * - More negative means worse match
 * We convert to 0-1 where 1 is best match
 * @param score - Raw fuzzysort score
 * @returns Normalized score (0-1)
 */
function normalizeScore(score: number): number {
  // fuzzysort scores range from 0 (perfect) to very negative (poor)
  // We use a logarithmic scale to normalize
  // Score of 0 -> 1.0
  // Score of -1000 -> ~0.5
  // Score of -10000 -> ~0.0

  if (score === 0) {
    return 1.0;
  }

  // Use exponential decay for normalization
  // This ensures small differences in good matches are more significant
  const normalized = Math.exp(score / 1000);

  // Clamp to [0, 1] range
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Extract unique station names from fare records
 * @param records - Array of fare records
 * @returns Sorted array of unique station names
 */
export function extractUniqueStations(
  records: Array<{ origin: string; destination: string }>
): string[] {
  const stationSet = new Set<string>();

  for (const record of records) {
    stationSet.add(record.origin);
    stationSet.add(record.destination);
  }

  // Return sorted array for consistent results
  return Array.from(stationSet).sort();
}

/**
 * Find stations with similar spellings for disambiguation
 * @param stationName - Station name to check
 * @param stationNames - Array of all station names
 * @returns Array of similar station names
 */
export function findSimilarStations(
  stationName: string,
  stationNames: string[]
): string[] {
  // Use a lower threshold to find similar spellings
  const matches = findMatchingStations(stationName, stationNames, {
    maxSuggestions: 5,
    threshold: 0.6, // Higher threshold for disambiguation
  });

  // Filter out exact match if present
  return matches
    .filter((match) => match.name !== stationName)
    .map((match) => match.name);
}
