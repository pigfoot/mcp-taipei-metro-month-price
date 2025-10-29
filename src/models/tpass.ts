/**
 * TPASS monthly pass model
 */

import type { TPASS } from '../lib/types.js';
import { DEFAULT_CONFIG } from '../config.js';
import { addDays } from '../lib/utils.js';

/**
 * Create a TPASS instance for a given start date
 */
export function createTPASS(startDate: Date): TPASS {
  return {
    price: DEFAULT_CONFIG.tpassPrice,
    validityDays: DEFAULT_CONFIG.tpassValidityDays,
    startDate: new Date(startDate),
    endDate: addDays(startDate, DEFAULT_CONFIG.tpassValidityDays - 1),
  };
}

/**
 * Check if TPASS is valid on a given date
 */
export function isTPASSValid(tpass: TPASS, date: Date): boolean {
  return date >= tpass.startDate && date <= tpass.endDate;
}

/**
 * Get TPASS validity period in days
 */
export function getTPASSValidityDays(): number {
  return DEFAULT_CONFIG.tpassValidityDays;
}

/**
 * Get TPASS price
 */
export function getTPASSPrice(): number {
  return DEFAULT_CONFIG.tpassPrice;
}
