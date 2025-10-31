/**
 * CSV parser with Big5 encoding support for Taipei Metro fare data
 */

import type { FareRecord } from '../models/fare';

/**
 * Column indices in the CSV file
 * CSV structure: 起站, 訖站, 全票票價, 敬老卡愛心卡愛心陪伴卡及臺北市與新北市兒童優惠票價, 距離
 */
const CSV_COLUMNS = {
  ORIGIN: 0,
  DESTINATION: 1,
  REGULAR_FARE: 2,
  DISCOUNTED_FARE: 3,
  DISTANCE: 4,
} as const;

/**
 * Parse CSV data with Big5 encoding
 * @param buffer - Raw CSV data buffer
 * @returns Array of parsed fare records
 * @throws Error if CSV structure is invalid
 */
export function parseFareCsv(buffer: ArrayBuffer): FareRecord[] {
  // Decode Big5 encoded data
  // Note: Bun supports Big5 encoding
  const decoder = new TextDecoder('big5' as any);
  const csvText = decoder.decode(buffer);

  // Split into lines and filter empty lines
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // First line is header, skip it
  const dataLines = lines.slice(1);

  const records: FareRecord[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line) continue;

    const lineNumber = i + 2; // +2 because: array is 0-indexed, and we skipped header

    try {
      const record = parseCsvLine(line, lineNumber);
      if (record) {
        records.push(record);
      }
    } catch (error) {
      // Skip invalid lines but log warning
      console.warn(
        `Warning: Skipping invalid line ${lineNumber}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (records.length === 0) {
    throw new Error('No valid fare records found in CSV');
  }

  return records;
}

/**
 * Parse a single CSV line into a FareRecord
 * @param line - CSV line to parse
 * @param lineNumber - Line number for error reporting
 * @returns Parsed FareRecord or null if line should be skipped
 * @throws Error if line format is invalid
 */
function parseCsvLine(line: string, lineNumber: number): FareRecord | null {
  // Split by comma, handling quoted fields
  const fields = splitCsvLine(line);

  // Validate field count
  if (fields.length < 5) {
    throw new Error(
      `Expected at least 5 fields, got ${fields.length} at line ${lineNumber}`
    );
  }

  // Extract and validate fields
  const origin = fields[CSV_COLUMNS.ORIGIN]?.trim() ?? '';
  const destination = fields[CSV_COLUMNS.DESTINATION]?.trim() ?? '';
  const regularFareStr = fields[CSV_COLUMNS.REGULAR_FARE]?.trim() ?? '';
  const discountedFareStr = fields[CSV_COLUMNS.DISCOUNTED_FARE]?.trim() ?? '';
  const distanceStr = fields[CSV_COLUMNS.DISTANCE]?.trim() ?? '';

  // Validate required fields
  if (!origin || !destination) {
    throw new Error(
      `Missing required fields (origin or destination) at line ${lineNumber}`
    );
  }

  // Parse numeric fields
  const regularFare = parseFloat(regularFareStr);
  const discountedFare = parseFloat(discountedFareStr);
  const distance = parseFloat(distanceStr);

  // Validate numeric values
  if (isNaN(regularFare) || regularFare < 0) {
    throw new Error(`Invalid regular fare "${regularFareStr}" at line ${lineNumber}`);
  }

  if (isNaN(discountedFare) || discountedFare < 0) {
    throw new Error(
      `Invalid discounted fare "${discountedFareStr}" at line ${lineNumber}`
    );
  }

  if (isNaN(distance) || distance < 0) {
    throw new Error(`Invalid distance "${distanceStr}" at line ${lineNumber}`);
  }

  return {
    id: `${origin}-${destination}`, // Generate ID from origin and destination
    origin,
    destination,
    regularFare,
    discountedFare,
    distance,
  };
}

/**
 * Split CSV line by comma, handling quoted fields
 * Simple implementation that handles basic quoting
 * @param line - CSV line to split
 * @returns Array of field values
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Toggle quote state
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      // Field separator (when not inside quotes)
      fields.push(currentField);
      currentField = '';
    } else {
      // Regular character
      currentField += char;
    }
  }

  // Add the last field
  fields.push(currentField);

  return fields;
}

/**
 * Validate CSV structure by checking header
 * @param buffer - Raw CSV data buffer
 * @returns True if CSV structure is valid
 */
export function validateCsvStructure(buffer: ArrayBuffer): boolean {
  try {
    const decoder = new TextDecoder('big5' as any);
    const csvText = decoder.decode(buffer);
    const lines = csvText.split(/\r?\n/);

    if (lines.length === 0) {
      return false;
    }

    // Check header line contains expected columns
    const header = lines[0]?.toLowerCase() ?? '';

    // Expected column names (case-insensitive)
    const expectedColumns = ['起站', '訖站', '全票票價', '距離'];

    // Check if all expected columns are present in header
    return expectedColumns.every((col) =>
      header.includes(col.toLowerCase())
    );
  } catch {
    return false;
  }
}
