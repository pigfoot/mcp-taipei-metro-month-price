#!/usr/bin/env bun
/**
 * Manual test script for OpenAI Apps adapter
 * Run with: bun run tests/manual/test-openai-adapter.ts
 */

import {
  handleOpenAIFunctionCall,
  getOpenAIFunctions,
  openAIAppConfig,
} from '../../src/adapters/openai/app.js';

/**
 * Test case definition
 */
interface OpenAITestCase {
  name: string;
  functionCall: {
    name: string;
    arguments: string;
  };
}

/**
 * Test cases for OpenAI adapter
 */
const testCases: OpenAITestCase[] = [
  {
    name: 'calculateTPASSComparison with default parameters',
    functionCall: {
      name: 'calculateTPASSComparison',
      arguments: '{}',
    },
  },
  {
    name: 'calculateTPASSComparison with custom parameters',
    functionCall: {
      name: 'calculateTPASSComparison',
      arguments: JSON.stringify({
        startDate: '2025-01-15',
        oneWayFare: 50,
        tripsPerDay: 3,
      }),
    },
  },
  {
    name: 'calculateTPASSComparison with custom working days',
    functionCall: {
      name: 'calculateTPASSComparison',
      arguments: JSON.stringify({
        customWorkingDays: 20,
        tripsPerDay: 2,
      }),
    },
  },
  {
    name: 'getDiscountInformation',
    functionCall: {
      name: 'getDiscountInformation',
      arguments: '{}',
    },
  },
];

/**
 * Run a single OpenAI adapter test
 */
async function runOpenAITest(testCase: OpenAITestCase, index: number): Promise<boolean> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`OpenAI Adapter Test ${index + 1}: ${testCase.name}`);
  console.log('='.repeat(80));
  console.log(`\nFunction: ${testCase.functionCall.name}`);
  console.log(`Arguments: ${testCase.functionCall.arguments}`);

  try {
    const result = await handleOpenAIFunctionCall(testCase.functionCall);

    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));

    // Validate result structure
    if (testCase.functionCall.name === 'calculateTPASSComparison') {
      const required = ['recommendation', 'tpassCost', 'regularCost', 'savings', 'explanation'];
      const missing = required.filter((field) => !(field in result));

      if (missing.length > 0) {
        console.log(`\n❌ FAIL: Missing required fields: ${missing.join(', ')}`);
        return false;
      }

      console.log('\n✅ PASS: Result has all required fields');
      console.log(`   Recommendation: ${result.recommendation}`);
      console.log(`   Savings: ${result.savings}`);
    } else {
      const required = ['frequentRiderProgram', 'tpassProgram', 'comparisonTip'];
      const missing = required.filter((field) => !(field in result));

      if (missing.length > 0) {
        console.log(`\n❌ FAIL: Missing required fields: ${missing.join(', ')}`);
        return false;
      }

      console.log('\n✅ PASS: Result has all required fields');
    }

    return true;
  } catch (error) {
    console.log(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('\nStack trace:', error);
    return false;
  }
}

/**
 * Test function schema registration
 */
function testFunctionSchemas() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('Testing Function Schema Registration');
  console.log('='.repeat(80));

  const functions = getOpenAIFunctions();
  console.log(`\n✅ Retrieved ${functions.length} function schemas`);
  functions.forEach((func) => {
    console.log(`   - ${func.name}`);
  });

  console.log(`\n✅ App Config:`);
  console.log(`   Name: ${openAIAppConfig.name}`);
  console.log(`   Version: ${openAIAppConfig.version}`);
  console.log(`   Description: ${openAIAppConfig.description}`);
}

/**
 * Run all OpenAI adapter tests
 */
async function runAllOpenAITests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                  OPENAI APPS ADAPTER TEST SUITE                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Test function schemas first
  testFunctionSchemas();

  // Run function call tests
  const results: boolean[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const passed = await runOpenAITest(testCases[i], i);
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
    console.log(`\n🎉 All OpenAI adapter tests passed!\n`);
    console.log('OpenAI Apps adapter is ready for integration.\n');
  } else {
    console.log(`\n⚠️  Some tests failed. Please review the results above.\n`);
    process.exit(1);
  }
}

// Run tests
runAllOpenAITests().catch((error) => {
  console.error('Fatal error running OpenAI adapter tests:', error);
  process.exit(1);
});
