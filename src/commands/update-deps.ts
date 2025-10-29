#!/usr/bin/env bun
/**
 * Package dependency update command
 * Updates package.json dependencies to latest versions
 */

import { readFile, writeFile } from 'node:fs/promises';
import { compareVersions, fetchLatestVersion, getMajorVersion } from './version-checker.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface PackageUpdate {
  name: string;
  from: string;
  to: string;
  changeType: 'patch' | 'minor' | 'major';
}

interface UpdateReport {
  updated: PackageUpdate[];
  skipped: PackageUpdate[];
  warnings: string[];
  timestamp: string;
  success: boolean;
}

/**
 * Main update command
 */
async function updateDependencies(acceptMajor: boolean = false): Promise<UpdateReport> {
  const report: UpdateReport = {
    updated: [],
    skipped: [],
    warnings: [],
    timestamp: new Date().toISOString(),
    success: true,
  };

  try {
    // Read package.json
    const packageJsonPath = 'package.json';
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson: PackageJson = JSON.parse(packageJsonContent);

    // Combine all dependencies
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    console.log('🔍 Checking for package updates...\n');

    // Check each dependency
    for (const [name, currentVersion] of Object.entries(allDeps)) {
      try {
        // Skip version tags (latest, next, canary, etc.) - these are intentional
        const versionTags = ['latest', 'next', 'canary', 'beta', 'alpha', 'rc'];
        const isVersionTag = versionTags.includes(currentVersion);

        if (isVersionTag) {
          console.log(`⏭️  ${name}: ${currentVersion} (tag preserved)`);
          continue;
        }

        // Fetch latest version from npm
        const { latestMinor, latestMajor } = await fetchLatestVersion(name);

        // Compare versions
        const minorComparison = compareVersions(currentVersion, latestMinor);
        const majorComparison = compareVersions(currentVersion, latestMajor);

        // Check for major version update
        if (majorComparison.isMajor) {
          if (acceptMajor) {
            // Update to major version
            const update: PackageUpdate = {
              name,
              from: currentVersion,
              to: latestMajor,
              changeType: 'major',
            };
            report.updated.push(update);

            // Update in package.json
            if (packageJson.dependencies?.[name]) {
              packageJson.dependencies[name] = `^${latestMajor}`;
            }
            if (packageJson.devDependencies?.[name]) {
              packageJson.devDependencies[name] = `^${latestMajor}`;
            }

            console.log(`⚠️  ${name}: ${currentVersion} → ^${latestMajor} (major update)`);
          } else {
            // Skip major update, add warning
            const update: PackageUpdate = {
              name,
              from: currentVersion,
              to: latestMajor,
              changeType: 'major',
            };
            report.skipped.push(update);
            report.warnings.push(
              `${name}: ${latestMajor} available (major update - use --major flag)`
            );

            console.log(
              `⚠️  ${name}: ${currentVersion} (${latestMajor} available - use --major flag)`
            );
          }
        } else if (minorComparison.isNewer) {
          // Minor or patch update
          const changeType = minorComparison.isMinor ? 'minor' : 'patch';
          const update: PackageUpdate = {
            name,
            from: currentVersion,
            to: latestMinor,
            changeType,
          };
          report.updated.push(update);

          // Update in package.json
          if (packageJson.dependencies?.[name]) {
            packageJson.dependencies[name] = `^${latestMinor}`;
          }
          if (packageJson.devDependencies?.[name]) {
            packageJson.devDependencies[name] = `^${latestMinor}`;
          }

          console.log(`✓ ${name}: ${currentVersion} → ^${latestMinor} (${changeType})`);
        } else {
          console.log(`✓ ${name}: ${currentVersion} (up to date)`);
        }
      } catch (error) {
        report.warnings.push(
          `Failed to check ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        console.error(`❌ ${name}: Failed to check version`);
      }
    }

    // Write updated package.json
    if (report.updated.length > 0) {
      await writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n',
        'utf-8'
      );
      console.log(`\n✅ Updated package.json with ${report.updated.length} package(s)`);
    }

    // Print summary
    console.log('\n📊 Summary:');
    console.log(`  Updated: ${report.updated.length} package(s)`);
    console.log(`  Skipped (major): ${report.skipped.length} package(s)`);
    console.log(`  Warnings: ${report.warnings.length}`);

    if (report.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      report.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }
  } catch (error) {
    report.success = false;
    console.error('❌ Failed to update dependencies:', error);
  }

  return report;
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const acceptMajor = args.includes('--major');

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: bun run update-deps [--major]');
    console.log('');
    console.log('Options:');
    console.log('  --major  Accept major version updates');
    console.log('  --help   Show this help message');
    process.exit(0);
  }

  const report = await updateDependencies(acceptMajor);
  process.exit(report.success ? 0 : 1);
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { updateDependencies, type UpdateReport, type PackageUpdate };
