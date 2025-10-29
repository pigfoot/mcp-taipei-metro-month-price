#!/usr/bin/env bun
/**
 * CLI command for viewing discount information
 */

import { getDiscountInfo } from '../services/calculator.js';

/**
 * Display discount information
 */
function displayDiscountInfo() {
  const info = getDiscountInfo();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('     TAIPEI METRO FARE DISCOUNT INFORMATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Frequent rider program
  console.log('🎫 FREQUENT RIDER DISCOUNT PROGRAM\n');
  console.log('Eligibility: ' + info.frequentRiderProgram.eligibility);
  console.log('Reset Cycle: ' + info.frequentRiderProgram.resetCycle + '\n');

  console.log('Discount Tiers:');
  info.frequentRiderProgram.discountTiers.forEach((tier, index) => {
    console.log(`  ${index + 1}. ${tier.tripRange}: ${tier.discount}`);
  });

  // TPASS program
  console.log('\n💳 TPASS MONTHLY PASS\n');
  console.log('Price: ' + info.tpassProgram.price);
  console.log('Validity: ' + info.tpassProgram.validity);
  console.log('Coverage: ' + info.tpassProgram.coverage);
  console.log('\nBenefits:');
  info.tpassProgram.benefits.forEach((benefit) => {
    console.log(`  • ${benefit}`);
  });

  // Comparison tip
  console.log('\n💡 TIP');
  console.log(`   ${info.comparisonTip}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Main CLI entry point
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
TPASS Calculator - View discount information

Usage:
  bun run src/cli/discount-cmd.ts

Description:
  Display information about Taipei Metro frequent rider discount tiers
  and TPASS monthly pass program.

Options:
  -h, --help    Show this help message
`);
    process.exit(0);
  }

  displayDiscountInfo();
}

// Run CLI
main();
