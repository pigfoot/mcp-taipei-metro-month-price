/**
 * Configuration constants for TPASS Calculator
 */

export const DEFAULT_CONFIG = {
  // Default fare and trip settings
  oneWayFare: 40, // Default one-way fare in NTD
  tripsPerDay: 2, // Default trips per working day (round trip)

  // TPASS constants
  tpassPrice: 1200, // TPASS monthly pass price in NTD
  tpassValidityDays: 30, // TPASS validity period in days

  // Calendar settings
  cacheMaxAgeDays: 30, // Maximum age of calendar cache before refresh
  calendarSources: [
    {
      name: 'data.gov.tw',
      url: 'https://data.gov.tw/dataset/14718',
      priority: 1,
    },
    {
      name: '新北市資料開放平臺',
      url: 'https://data.ntpc.gov.tw/api/datasets/308DCD75-6434-45BC-A95F-584DA4FED251/json',
      priority: 2,
    },
  ],

  // Validation constraints
  validation: {
    minFare: 1,
    maxFare: 1000,
    minTripsPerDay: 1,
    maxTripsPerDay: 10,
    minWorkingDays: 0,
    maxWorkingDays: 30,
  },

  // Fare lookup configuration
  fare: {
    csvUrl: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=893c2f2a-dcfd-407b-b871-394a14105532',
    cacheFile: 'data/fare-cache.json',
    cacheTTLDays: 7, // 7 days cache expiry
    fuzzyMatchThreshold: 0.3,
    maxSuggestions: 3,
  },
} as const;

/**
 * Application metadata
 */
export const APP_INFO = {
  name: 'TPASS Calculator',
  version: '1.0.0',
  description: 'Taipei Metro monthly pass cost comparison tool',
} as const;
