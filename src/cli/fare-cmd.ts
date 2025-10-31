#!/usr/bin/env bun

/**
 * CLI commands for fare management
 * Usage:
 *   bun run src/cli/fare-cmd.ts update
 *   bun run src/cli/fare-cmd.ts status
 *   bun run src/cli/fare-cmd.ts lookup --origin "台北車站" --destination "市政府"
 */

import { FareCacheService } from '../services/fareCacheService';
import { FareService } from '../services/fareService';

const command = process.argv[2];

/**
 * Main CLI entry point
 */
async function main() {
  try {
    switch (command) {
      case 'update':
        await handleUpdate();
        break;
      case 'status':
        await handleStatus();
        break;
      case 'lookup':
        await handleLookup();
        break;
      default:
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Handle fare cache update command
 */
async function handleUpdate() {
  console.log('Downloading fare data from Taipei Open Data...');

  const cacheService = new FareCacheService();
  const cache = await cacheService.refreshCache();

  console.log('✓ Download complete');
  console.log(`  Parsed ${cache.stats.totalRecords} fare records`);
  console.log(`  Found ${cache.stats.uniqueStations} unique stations`);
  console.log(`  Cache expires: ${new Date(cache.expiresAt).toLocaleString()}`);
}

/**
 * Handle cache status command
 */
async function handleStatus() {
  const cacheService = new FareCacheService();
  const status = await cacheService.getCacheStatus();

  if (!status || !status.exists) {
    console.log('Cache Status: Not found');
    console.log('Run "bun run fare:update" to download fare data');
    return;
  }

  console.log('Cache Status:');
  console.log(`  Last Updated: ${status.lastUpdated ? new Date(status.lastUpdated).toLocaleString() : 'N/A'}`);
  console.log(`  Expires: ${status.expiresAt ? new Date(status.expiresAt).toLocaleString() : 'N/A'}`);
  console.log(`  Records: ${status.totalRecords ?? 'N/A'}`);
  console.log(`  Unique Stations: ${status.uniqueStations ?? 'N/A'}`);
  console.log(`  Status: ${status.valid ? '✓ Valid' : '✗ Expired'}`);

  if (status.expiringSoon && status.valid) {
    console.log('  ⚠ Warning: Cache will expire soon');
  }

  if (!status.valid) {
    console.log('\nRun "bun run fare:update" to refresh cache');
  }
}

/**
 * Handle fare lookup command
 */
async function handleLookup() {
  // Parse command line arguments
  const args = parseArgs(process.argv.slice(3));

  const origin = args.origin;
  const destination = args.destination;
  const fareType = (args.fareType ?? 'regular') as 'regular' | 'discounted';

  if (!origin || !destination) {
    console.error('Error: Both --origin and --destination are required');
    console.log('\nUsage:');
    console.log('  bun run fare:lookup --origin "台北車站" --destination "市政府"');
    console.log('  bun run fare:lookup --origin "台北車站" --destination "市政府" --fareType discounted');
    process.exit(1);
  }

  console.log(`Looking up fare from ${origin} to ${destination}...`);

  const fareService = new FareService();
  await fareService.initialize();

  const result = await fareService.lookupFare({
    origin,
    destination,
    fareType,
  });

  if (result.success) {
    console.log('\n✓ Fare found:');
    console.log(`  Route: ${result.stations!.origin.matched} → ${result.stations!.destination.matched}`);
    console.log(`  Fare: NT$${result.fare}`);
    console.log(`  Type: ${fareType}`);
    if (result.stations!.distance) {
      console.log(`  Distance: ${result.stations!.distance} km`);
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach((warning) => {
        console.log(`  ⚠ ${warning}`);
      });
    }
  } else if (result.suggestions) {
    console.log('\n✗ Station names not found. Did you mean:');

    if (result.suggestions.origin && result.suggestions.origin.length > 0) {
      console.log(`\nOrigin suggestions for "${origin}":`);
      result.suggestions.origin.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.name} (confidence: ${(match.score * 100).toFixed(0)}%)`);
      });
    }

    if (result.suggestions.destination && result.suggestions.destination.length > 0) {
      console.log(`\nDestination suggestions for "${destination}":`);
      result.suggestions.destination.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.name} (confidence: ${(match.score * 100).toFixed(0)}%)`);
      });
    }

    console.log('\nPlease try again with one of the suggested station names.');
    process.exit(1);
  } else {
    console.log(`\n✗ ${result.error!.message}`);
    if (result.error!.details?.hint) {
      console.log(`  Hint: ${result.error!.details.hint}`);
    }
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 * @param args - Array of arguments
 * @returns Object with parsed arguments
 */
function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];

      if (value && !value.startsWith('--')) {
        parsed[key] = value;
        i++; // Skip next argument as it's the value
      }
    }
  }

  return parsed;
}

/**
 * Print usage information
 */
function printUsage() {
  console.log('Fare Management CLI\n');
  console.log('Usage:');
  console.log('  bun run src/cli/fare-cmd.ts <command> [options]\n');
  console.log('Commands:');
  console.log('  update   Download and update fare data cache');
  console.log('  status   Show cache status information');
  console.log('  lookup   Lookup fare between two stations\n');
  console.log('Examples:');
  console.log('  bun run src/cli/fare-cmd.ts update');
  console.log('  bun run src/cli/fare-cmd.ts status');
  console.log('  bun run src/cli/fare-cmd.ts lookup --origin "台北車站" --destination "市政府"');
  console.log('  bun run src/cli/fare-cmd.ts lookup --origin "台北" --destination "淡水" --fareType discounted');
}

// Run main function
main();
