#!/usr/bin/env bun
/**
 * CLI command for TPASS fare calculation
 */

import { calculateTPASSComparison } from '../services/calculator.js';
import { parseDate, formatDate, formatCurrency, formatPercentage } from '../lib/utils.js';
import { getDiscountTierDescription } from '../models/discount.js';
import { DEFAULT_CONFIG } from '../config.js';

/**
 * Validate input parameters
 */
function validateParams(params: {
  oneWayFare?: number;
  tripsPerDay?: number;
  customWorkingDays?: number;
}): string[] {
  const errors: string[] = [];
  const { validation } = DEFAULT_CONFIG;

  if (params.oneWayFare !== undefined) {
    if (params.oneWayFare < validation.minFare || params.oneWayFare > validation.maxFare) {
      errors.push(
        `One-way fare must be between ${validation.minFare} and ${validation.maxFare} NTD`
      );
    }
  }

  if (params.tripsPerDay !== undefined) {
    if (
      params.tripsPerDay < validation.minTripsPerDay ||
      params.tripsPerDay > validation.maxTripsPerDay
    ) {
      errors.push(
        `Trips per day must be between ${validation.minTripsPerDay} and ${validation.maxTripsPerDay}`
      );
    }
  }

  if (params.customWorkingDays !== undefined) {
    if (
      params.customWorkingDays < validation.minWorkingDays ||
      params.customWorkingDays > validation.maxWorkingDays
    ) {
      errors.push(
        `Custom working days must be between ${validation.minWorkingDays} and ${validation.maxWorkingDays}`
      );
    }
  }

  return errors;
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  startDate?: Date;
  oneWayFare?: number;
  tripsPerDay?: number;
  customWorkingDays?: number;
  help?: boolean;
} {
  const args = process.argv.slice(2);
  const params: Record<string, any> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      params.help = true;
      continue;
    }

    if (arg === '--date') {
      params.startDate = parseDate(args[++i]);
    } else if (arg === '--fare') {
      params.oneWayFare = parseFloat(args[++i]);
    } else if (arg === '--trips') {
      params.tripsPerDay = parseInt(args[++i], 10);
    } else if (arg === '--custom-days') {
      params.customWorkingDays = parseInt(args[++i], 10);
    }
  }

  return params;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
TPASS Calculator - Taipei Metro monthly pass comparison tool

Usage:
  bun run src/cli/calculate-cmd.ts [options]

Options:
  --date <YYYY-MM-DD>    Start date for TPASS validity period (default: today)
  --fare <amount>        One-way fare in NTD (default: 40)
  --trips <count>        Trips per working day (default: 2)
  --custom-days <count>  Override working days calculation (0-30)
  -h, --help             Show this help message

Examples:
  # Calculate with defaults (today, NT$40, 2 trips/day)
  bun run src/cli/calculate-cmd.ts

  # Calculate for specific date
  bun run src/cli/calculate-cmd.ts --date 2025-02-01

  # Custom fare and trips
  bun run src/cli/calculate-cmd.ts --fare 50 --trips 4

  # Override working days
  bun run src/cli/calculate-cmd.ts --custom-days 20
`);
}

/**
 * Format and display calculation results
 */
function displayResults(result: Awaited<ReturnType<typeof calculateTPASSComparison>>) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('           TPASS CALCULATOR RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Period information
  console.log('📅 VALIDITY PERIOD');
  console.log(`   Start: ${formatDate(result.period.startDate)}`);
  console.log(`   End:   ${formatDate(result.period.endDate)}`);
  console.log(`   Total days: ${result.period.totalDays} days (${result.period.workingDays} working days)\n`);

  // Trip information
  console.log('🚇 COMMUTE PATTERN');
  console.log(`   Trips per day: ${result.tripsPerDay}`);
  console.log(`   Total trips: ${result.totalTrips} trips`);
  console.log(`   One-way fare: ${formatCurrency(result.oneWayFare)}\n`);

  // Cost comparison
  console.log('💰 COST COMPARISON');
  console.log(`   TPASS monthly pass:         ${formatCurrency(result.tpassCost)}`);
  console.log(`   Regular fare (no discount): ${formatCurrency(result.regularCostBeforeDiscount)}`);
  console.log(
    `   Regular fare (with ${formatPercentage(result.appliedDiscount.discountRate)} discount): ${formatCurrency(result.regularCost)}`
  );
  console.log(`   Discount tier: ${getDiscountTierDescription(result.appliedDiscount)}\n`);

  // Recommendation
  const savingsSign = result.savingsAmount > 0 ? '+' : '';
  console.log('🎯 RECOMMENDATION');
  console.log(`   ${result.recommendation === 'BUY_TPASS' ? '✅ BUY TPASS' : '✅ USE REGULAR FARE'}`);
  console.log(`   ${result.recommendationReason}`);
  console.log(
    `   Net savings: ${savingsSign}${formatCurrency(Math.abs(result.savingsAmount))} (${savingsSign}${formatPercentage(Math.abs(result.savingsPercentage))})`
  );

  // Warnings
  if (result.warnings && result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS');
    result.warnings.forEach((warning) => {
      console.log(`   ${warning}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Main CLI entry point
 */
async function main() {
  const params = parseArgs();

  if (params.help) {
    showHelp();
    process.exit(0);
  }

  // Validate input parameters
  const validationErrors = validateParams(params);
  if (validationErrors.length > 0) {
    console.error('\n❌ Validation errors:');
    validationErrors.forEach((error) => {
      console.error(`   • ${error}`);
    });
    console.error('\nRun with --help for usage information.\n');
    process.exit(1);
  }

  try {
    console.log('Calculating TPASS comparison...');
    const result = await calculateTPASSComparison(params);
    displayResults(result);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run CLI
main();
