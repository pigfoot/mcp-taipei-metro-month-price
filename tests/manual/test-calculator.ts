#!/usr/bin/env bun
/**
 * Manual test script for TPASS calculator
 * Run with: bun run tests/manual/test-calculator.ts
 */

import { calculateTPASSComparison } from '../../src/services/calculator.js';
import { formatDate, formatCurrency, formatPercentage, parseDate } from '../../src/lib/utils.js';
import { getDiscountTierDescription } from '../../src/models/discount.js';

/**
 * Test case definition
 */
interface TestCase {
  name: string;
  params: Parameters<typeof calculateTPASSComparison>[0];
  expectedRecommendation?: 'BUY_TPASS' | 'USE_REGULAR';
}

/**
 * Test cases for manual validation
 */
const testCases: TestCase[] = [
  {
    name: 'Default parameters (today, NT$40, 2 trips/day)',
    params: {},
  },
  {
    name: 'Low usage - 10 working days, 2 trips/day (20 trips total)',
    params: {
      customWorkingDays: 10,
      tripsPerDay: 2,
    },
    expectedRecommendation: 'USE_REGULAR',
  },
  {
    name: 'Medium usage - 20 working days, 2 trips/day (40 trips total)',
    params: {
      customWorkingDays: 20,
      tripsPerDay: 2,
    },
  },
  {
    name: 'High usage - 22 working days, 2 trips/day (44 trips total)',
    params: {
      customWorkingDays: 22,
      tripsPerDay: 2,
    },
    expectedRecommendation: 'BUY_TPASS',
  },
  {
    name: 'Custom fare NT$50, 20 working days, 2 trips/day',
    params: {
      oneWayFare: 50,
      customWorkingDays: 20,
      tripsPerDay: 2,
    },
    expectedRecommendation: 'BUY_TPASS',
  },
  {
    name: 'Heavy commuter - 22 working days, 4 trips/day',
    params: {
      customWorkingDays: 22,
      tripsPerDay: 4,
    },
    expectedRecommendation: 'BUY_TPASS',
  },
  {
    name: 'Cross-month period starting 2025-01-15',
    params: {
      startDate: parseDate('2025-01-15'),
    },
  },
  {
    name: 'Cross-month period starting 2025-02-25',
    params: {
      startDate: parseDate('2025-02-25'),
    },
  },
  {
    name: 'Past date warning test - 2025-01-01',
    params: {
      startDate: parseDate('2025-01-01'),
    },
  },
];

/**
 * Run a single test case
 */
async function runTestCase(testCase: TestCase, index: number): Promise<boolean> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log('='.repeat(80));

  try {
    const result = await calculateTPASSComparison(testCase.params);

    // Display results
    console.log(`\n📅 Period: ${formatDate(result.period.startDate)} to ${formatDate(result.period.endDate)}`);
    console.log(
      `   ${result.period.totalDays} days (${result.period.workingDays} working, ${result.period.holidays} holidays)`
    );
    console.log(`\n🚇 Trips: ${result.totalTrips} trips (${result.tripsPerDay}/day × ${result.period.workingDays} days)`);
    console.log(`   Fare: ${formatCurrency(result.oneWayFare)} per trip`);
    console.log(
      `\n💰 TPASS:           ${formatCurrency(result.tpassCost)}`
    );
    console.log(
      `   Regular (no discount): ${formatCurrency(result.regularCostBeforeDiscount)}`
    );
    console.log(
      `   Regular (${formatPercentage(result.appliedDiscount.discountRate)} off):   ${formatCurrency(result.regularCost)}`
    );
    console.log(`   Discount: ${getDiscountTierDescription(result.appliedDiscount)}`);
    console.log(
      `\n🎯 Recommendation: ${result.recommendation === 'BUY_TPASS' ? '✅ BUY TPASS' : '✅ USE REGULAR FARE'}`
    );
    console.log(`   ${result.recommendationReason}`);
    console.log(
      `   Savings: ${formatCurrency(Math.abs(result.savingsAmount))} (${formatPercentage(Math.abs(result.savingsPercentage))})`
    );

    if (result.warnings && result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      result.warnings.forEach((warning) => {
        console.log(`   - ${warning}`);
      });
    }

    // Check expected recommendation if specified
    if (testCase.expectedRecommendation) {
      const matches = result.recommendation === testCase.expectedRecommendation;
      if (matches) {
        console.log(`\n✅ PASS: Recommendation matches expected (${testCase.expectedRecommendation})`);
      } else {
        console.log(
          `\n❌ FAIL: Expected ${testCase.expectedRecommendation}, got ${result.recommendation}`
        );
        return false;
      }
    } else {
      console.log(`\n✅ PASS: Calculation completed successfully`);
    }

    return true;
  } catch (error) {
    console.log(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Run all test cases
 */
async function runAllTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    TPASS CALCULATOR - MANUAL TEST SUITE                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  const results: boolean[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const passed = await runTestCase(testCases[i], i);
    results.push(passed);
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));

  const passedCount = results.filter((r) => r).length;
  const failedCount = results.length - passedCount;

  console.log(`\nTotal tests: ${results.length}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);

  if (failedCount === 0) {
    console.log(`\n🎉 All tests passed!\n`);
  } else {
    console.log(`\n⚠️  Some tests failed. Please review the results above.\n`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
