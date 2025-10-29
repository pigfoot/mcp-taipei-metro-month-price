/**
 * Version comparison and npm registry interaction utilities
 */

/**
 * Compare semver versions to determine update type
 */
export function compareVersions(current: string, latest: string): {
  isNewer: boolean;
  isMajor: boolean;
  isMinor: boolean;
  isPatch: boolean;
} {
  // Remove ^ or ~ prefixes
  const cleanCurrent = current.replace(/^[\^~]/, '');
  const cleanLatest = latest.replace(/^[\^~]/, '');

  const [curMajor, curMinor, curPatch] = cleanCurrent.split('.').map(Number);
  const [latMajor, latMinor, latPatch] = cleanLatest.split('.').map(Number);

  const isMajor = latMajor > curMajor;
  const isMinor = latMajor === curMajor && latMinor > curMinor;
  const isPatch = latMajor === curMajor && latMinor === curMinor && latPatch > curPatch;
  const isNewer = isMajor || isMinor || isPatch;

  return { isNewer, isMajor, isMinor, isPatch };
}

/**
 * Fetch latest version from npm registry
 */
export async function fetchLatestVersion(packageName: string): Promise<{
  latestMinor: string;
  latestMajor: string;
}> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${packageName}: ${response.statusText}`);
    }

    const data = await response.json();
    const latestMajor = data['dist-tags'].latest;

    // For latestMinor, we need to find the latest version in the same major
    // This is a simplified implementation - just return latest for now
    // In production, you'd parse all versions and filter by major
    const latestMinor = latestMajor;

    return { latestMinor, latestMajor };
  } catch (error) {
    throw new Error(
      `Failed to fetch version for ${packageName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get major version number from semver string
 */
export function getMajorVersion(version: string): number {
  const clean = version.replace(/^[\^~]/, '');
  return parseInt(clean.split('.')[0], 10);
}
