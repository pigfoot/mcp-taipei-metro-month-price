/**
 * Calendar fetcher service - fetches government calendar data
 */

import type { CalendarEntry, CalendarCacheMetadata } from '../lib/types.js';

interface CalendarData {
  metadata: CalendarCacheMetadata;
  entries: CalendarEntry[];
}

/**
 * Calendar fetcher service for Taiwan government working day calendar
 */
export class CalendarFetcher {
  private static readonly DATA_SOURCES = [
    {
      name: 'data.gov.tw - 政府行政機關辦公日曆表',
      url: 'https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/2025.json',
      format: 'json' as const,
    },
    {
      name: '新北市資料開放平臺',
      url: 'https://data.ntpc.gov.tw/api/datasets/308DCD75-6434-45BC-A95F-584DA4FED251/json',
      format: 'json' as const,
    },
  ];

  /**
   * Fetch calendar data from government sources with fallback
   */
  async fetchFromSource(year?: number): Promise<CalendarData> {
    const targetYear = year || new Date().getFullYear();
    const errors: Error[] = [];

    // Try each data source
    for (const source of CalendarFetcher.DATA_SOURCES) {
      try {
        console.log(`Fetching calendar data from ${source.name}...`);
        const url = source.url.replace('2025', String(targetYear));

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'TPASS-Calculator/1.0',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const entries = this.parseCalendarData(data, source.name);

        console.log(`✅ Successfully fetched ${entries.length} calendar entries from ${source.name}`);

        return {
          metadata: {
            version: '1.0.0',
            lastUpdated: new Date().toISOString().split('T')[0],
            source: source.name,
            yearsCovered: [targetYear],
          },
          entries,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        console.warn(`⚠️  Failed to fetch from ${source.name}: ${err.message}`);
        continue;
      }
    }

    // All sources failed
    throw new Error(
      `Failed to fetch calendar data from all sources:\n${errors.map((e) => `  - ${e.message}`).join('\n')}`
    );
  }

  /**
   * Format date from YYYYMMDD to YYYY-MM-DD
   */
  private formatDate(dateStr: string): string {
    if (dateStr.includes('-')) {
      return dateStr; // Already formatted
    }
    // Convert YYYYMMDD to YYYY-MM-DD
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  }

  /**
   * Parse calendar data from API response
   * Handles multiple API formats
   */
  private parseCalendarData(response: any, sourceName: string): CalendarEntry[] {
    const entries: CalendarEntry[] = [];

    try {
      // Handle GitHub Taiwan Calendar format (array of events)
      if (Array.isArray(response)) {
        for (const item of response) {
          // Only include holidays or special working days
          if (item.date && (item.isHoliday === true || item.description)) {
            const dateStr = this.formatDate(item.date);
            const isHoliday = item.isHoliday === true;
            const description = item.description || '';

            // Skip weekend days without description
            if (!description && (item.week === '六' || item.week === '日')) {
              continue;
            }

            // Only add entries for holidays or makeup working days
            if (isHoliday || description) {
              entries.push({
                date: dateStr,
                isWorkingDay: !isHoliday,
                isHoliday: isHoliday,
                name: description || (isHoliday ? '休假日' : ''),
                description: description,
              });
            }
          }
        }
      }
      // Handle object with holidays array
      else if (response.holidays && Array.isArray(response.holidays)) {
        for (const item of response.holidays) {
          entries.push({
            date: item.date || item.Date,
            isWorkingDay: false,
            isHoliday: true,
            name: item.name || item.Name || item.holidayName,
            description: item.description || item.Description,
          });
        }
      }
      // Handle data.gov.tw format (array with specific fields)
      else if (response.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          entries.push({
            date: item.西元日期 || item.date,
            isWorkingDay: item.是否放假 !== 'Y',
            isHoliday: item.是否放假 === 'Y',
            name: item.備註 || item.name || '放假日',
            description: item.說明 || item.description,
          });
        }
      }

      // Validate and sort entries
      const validEntries = entries.filter((e) => {
        return e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date);
      });

      validEntries.sort((a, b) => a.date.localeCompare(b.date));

      return validEntries;
    } catch (error) {
      throw new Error(
        `Failed to parse calendar data from ${sourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
