#!/usr/bin/env bun
/**
 * Manual test script for MCP server integration
 * Run with: bun run tests/manual/test-mcp.ts
 */

import { handleCalculateFare, handleGetDiscountInfo } from '../../src/adapters/mcp/tools.js';

/**
 * Test case definition
 */
interface MCPTestCase {
  name: string;
  tool: 'calculate_fare' | 'get_discount_info';
  args: Record<string, unknown>;
}

/**
 * Test cases for MCP tools
 */
const testCases: MCPTestCase[] = [
  {
    name: 'Calculate fare with default parameters',
    tool: 'calculate_fare',
    args: {},
  },
  {
    name: 'Calculate fare with custom parameters',
    tool: 'calculate_fare',
    args: {
      startDate: '2025-01-15',
      oneWayFare: 50,
      tripsPerDay: 3,
    },
  },
  {
    name: 'Calculate fare with custom working days',
    tool: 'calculate_fare',
    args: {
      customWorkingDays: 20,
      tripsPerDay: 2,
    },
  },
  {
    name: 'Calculate fare for low usage',
    tool: 'calculate_fare',
    args: {
      customWorkingDays: 10,
      tripsPerDay: 2,
    },
  },
  {
    name: 'Get discount information',
    tool: 'get_discount_info',
    args: {},
  },
];

/**
 * Run a single MCP test case
 */
async function runMCPTest(testCase: MCPTestCase, index: number): Promise<boolean> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`MCP Test ${index + 1}: ${testCase.name}`);
  console.log('='.repeat(80));
  console.log(`\nTool: ${testCase.tool}`);
  console.log(`Args: ${JSON.stringify(testCase.args, null, 2)}`);

  try {
    let result: string;

    if (testCase.tool === 'calculate_fare') {
      result = await handleCalculateFare(testCase.args);
    } else {
      result = await handleGetDiscountInfo();
    }

    // Parse and display result
    const parsed = JSON.parse(result);

    if (parsed.error) {
      console.log(`\n❌ ERROR: ${parsed.error}`);
      return false;
    }

    console.log('\n📊 Result:');
    console.log(result);

    // Validate result structure
    if (testCase.tool === 'calculate_fare') {
      const required = ['tpassCost', 'regularCost', 'recommendation', 'savingsAmount'];
      const missing = required.filter((field) => !(field in parsed));

      if (missing.length > 0) {
        console.log(`\n❌ FAIL: Missing required fields: ${missing.join(', ')}`);
        return false;
      }

      console.log('\n✅ PASS: Result has all required fields');
      console.log(`   Recommendation: ${parsed.recommendation}`);
      console.log(`   Savings: ${parsed.savingsAmount}`);
    } else {
      const required = ['discountTiers', 'validityPeriod', 'tpassInfo'];
      const missing = required.filter((field) => !(field in parsed));

      if (missing.length > 0) {
        console.log(`\n❌ FAIL: Missing required fields: ${missing.join(', ')}`);
        return false;
      }

      console.log('\n✅ PASS: Result has all required fields');
      console.log(`   Discount tiers: ${parsed.discountTiers.length}`);
    }

    return true;
  } catch (error) {
    console.log(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('\nStack trace:', error);
    return false;
  }
}

/**
 * Run all MCP integration tests
 */
async function runAllMCPTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                  MCP SERVER INTEGRATION TEST SUITE                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  const results: boolean[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const passed = await runMCPTest(testCases[i], i);
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
    console.log(`\n🎉 All MCP integration tests passed!\n`);
    console.log('MCP server is ready for integration with AI assistants.\n');
  } else {
    console.log(`\n⚠️  Some tests failed. Please review the results above.\n`);
    process.exit(1);
  }
}

// Run tests
runAllMCPTests().catch((error) => {
  console.error('Fatal error running MCP tests:', error);
  process.exit(1);
});
