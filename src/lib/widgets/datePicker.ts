/**
 * Date Picker Widget
 * Provides date selection functionality with validation
 */

import type { WidgetField, WidgetAction } from '../responseFormatter.js';

/**
 * Date picker widget configuration
 */
export interface DatePickerConfig {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  minDate?: string;
  maxDate?: string;
  validation?: {
    min?: string;
    max?: string;
    pattern?: string;
  };
}

/**
 * Create date picker widget field
 */
export function createDatePickerField(config: DatePickerConfig): WidgetField {
  return {
    name: config.name,
    type: 'date-picker',
    label: config.label,
    description: config.description,
    required: config.required || false,
    defaultValue: config.defaultValue,
    validation: {
      min: config.minDate,
      max: config.maxDate,
      pattern: config.validation?.pattern,
    },
  };
}

/**
 * Create date picker form widget with validation actions
 */
export function createDatePickerWidget(
  config: DatePickerConfig,
  actions?: WidgetAction[]
): {
  type: 'form';
  layout: 'vertical';
  title: string;
  description?: string;
  fields: WidgetField[];
  actions: WidgetAction[];
} {
  const field = createDatePickerField(config);

  const defaultActions: WidgetAction[] = [
    {
      type: 'cancel',
      label: 'Cancel',
      enabled: true,
    },
    {
      type: 'next',
      label: 'Continue',
      enabled: Boolean(config.defaultValue),
    },
  ];

  return {
    type: 'form',
    layout: 'vertical',
    title: config.label,
    description: config.description,
    fields: [field],
    actions: actions || defaultActions,
  };
}

/**
 * Validate date picker input
 */
export function validateDatePickerInput(
  value: string,
  config: DatePickerConfig
): { isValid: boolean; error?: string } {
  if (!value && config.required) {
    return { isValid: false, error: 'Date is required' };
  }

  if (value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid date format' };
    }

    // Check min date
    if (config.minDate) {
      const minDate = new Date(config.minDate);
      if (date < minDate) {
        return { isValid: false, error: `Date must be after ${config.minDate}` };
      }
    }

    // Check max date
    if (config.maxDate) {
      const maxDate = new Date(config.maxDate);
      if (date > maxDate) {
        return { isValid: false, error: `Date must be before ${config.maxDate}` };
      }
    }
  }

  return { isValid: true };
}

/**
 * Format date for display
 */
export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get default TPASS start date (today)
 */
export function getDefaultTPASSStartDate(): string {
  return getTodayDate();
}
