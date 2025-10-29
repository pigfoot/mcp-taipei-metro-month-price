#!/usr/bin/env bun
/**
 * CLI command for calendar data management
 */

import { CalendarService } from '../services/calendar-service.js';
import { CalendarFetcher } from '../services/calendar-fetcher.js';
import { formatDate } from '../lib/utils.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Display calendar status
 */
async function showStatus() {
  console.log('\n📅 Calendar Cache Status\n');

  const cacheFilePath = path.join(process.cwd(), 'data', 'calendar-cache.json');

  try {
    const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    const metadata = cacheData.metadata;

    console.log(`Version: ${metadata.version}`);
    console.log(`Last Updated: ${metadata.lastUpdated}`);
    console.log(`Source: ${metadata.source}`);
    console.log(`Years Covered: ${metadata.yearsCovered.join(', ')}`);
    console.log(`Total Entries: ${cacheData.entries.length} holidays`);

    // Calculate cache age
    const lastUpdate = new Date(metadata.lastUpdated);
    const now = new Date();
    const ageInDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`\nCache Age: ${ageInDays} days`);

    if (ageInDays > 30) {
      console.log('⚠️  Cache is older than 30 days. Consider updating.');
    } else {
      console.log('✅ Cache is up to date');
    }
  } catch (error) {
    console.error('❌ Error reading cache:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }

  console.log();
}

/**
 * Display cached calendar data
 */
async function viewCache() {
  const cacheFilePath = path.join(process.cwd(), 'data', 'calendar-cache.json');

  try {
    const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));

    console.log('\n📅 Cached Calendar Data\n');
    console.log('Holidays:');

    cacheData.entries.forEach((holiday: { date: string; name: string; isWorkingDay: boolean; description?: string }) => {
      const workingStatus = holiday.isWorkingDay ? '(working day)' : '(holiday)';
      const desc = holiday.description ? ` - ${holiday.description}` : '';
      console.log(`  ${holiday.date} - ${holiday.name} ${workingStatus}${desc}`);
    });

    console.log(`\nTotal: ${cacheData.entries.length} entries\n`);
  } catch (error) {
    console.error('❌ Error reading cache:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Update calendar cache from government sources
 */
async function updateCache(year?: number) {
  const cacheFilePath = path.join(process.cwd(), 'data', 'calendar-cache.json');
  const targetYear = year || new Date().getFullYear();

  console.log('\n📥 Updating calendar cache...\n');
  console.log(`Target year: ${targetYear}`);
  console.log('Fetching from government open data sources...\n');

  try {
    const fetcher = new CalendarFetcher();
    const calendarData = await fetcher.fetchFromSource(targetYear);

    // Backup existing cache
    if (fs.existsSync(cacheFilePath)) {
      const backupPath = cacheFilePath.replace('.json', `.backup.${Date.now()}.json`);
      fs.copyFileSync(cacheFilePath, backupPath);
      console.log(`\n📦 Backup created: ${path.basename(backupPath)}`);
    }

    // Write new cache
    const cacheContent = JSON.stringify(calendarData, null, 2);
    fs.writeFileSync(cacheFilePath, cacheContent, 'utf-8');

    console.log(`\n✅ Calendar cache updated successfully!`);
    console.log(`   Source: ${calendarData.metadata.source}`);
    console.log(`   Entries: ${calendarData.entries.length} holidays`);
    console.log(`   Year: ${calendarData.metadata.yearsCovered.join(', ')}`);
    console.log(`   Updated: ${calendarData.metadata.lastUpdated}`);

    // Show updated status
    console.log('\n');
    await showStatus();
  } catch (error) {
    console.error('\n❌ Failed to update calendar cache');
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('\n💡 Tip: The system will continue using the existing cached data.');
    console.error('   You can manually update data/calendar-cache.json if needed.\n');
    process.exit(1);
  }
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
TPASS Calculator - Calendar Management

Usage:
  bun run src/cli/calendar-cmd.ts <command> [options]

Commands:
  status              Show calendar cache status and age
  view                Display all cached calendar data
  update [year]       Update calendar cache from government sources

Options:
  -h, --help          Show this help message

Examples:
  bun run src/cli/calendar-cmd.ts status
  bun run src/cli/calendar-cmd.ts view
  bun run src/cli/calendar-cmd.ts update
  bun run src/cli/calendar-cmd.ts update 2026
`);
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;
      case 'view':
        await viewCache();
        break;
      case 'update': {
        const year = args[1] ? parseInt(args[1], 10) : undefined;
        if (year && (year < 2020 || year > 2030)) {
          console.error(`Invalid year: ${year}. Must be between 2020-2030.`);
          process.exit(1);
        }
        await updateCache(year);
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run with --help for usage information.');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run CLI
main();
