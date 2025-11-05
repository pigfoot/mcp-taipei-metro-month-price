/**
 * Text Input Widget
 * Provides free-form text input with validation
 */

import type { WidgetField, WidgetAction } from '../responseFormatter.js';

/**
 * Text input widget configuration
 */
export interface TextInputConfig {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

/**
 * Create text input widget field
 */
export function createTextInputField(config: TextInputConfig): WidgetField {
  return {
    name: config.name,
    type: 'text-input',
    label: config.label,
    description: config.description,
    required: config.required || false,
    defaultValue: config.defaultValue,
    placeholder: config.placeholder,
    multiline: config.multiline || false,
    rows: config.rows,
    validation: {
      minLength: config.validation?.minLength,
      maxLength: config.validation?.maxLength,
      pattern: config.validation?.pattern,
    },
  };
}

/**
 * Create text input form widget
 */
export function createTextInputWidget(
  config: TextInputConfig,
  actions?: WidgetAction[]
): {
  type: 'form';
  layout: 'vertical';
  title: string;
  description?: string;
  fields: WidgetField[];
  actions: WidgetAction[];
} {
  const field = createTextInputField(config);

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
 * Validate text input
 */
export function validateTextInput(
  value: string,
  config: TextInputConfig
): { isValid: boolean; error?: string } {
  if (!value && config.required) {
    return { isValid: false, error: `${config.label} is required` };
  }

  if (value) {
    // Check min length
    const minLength = config.validation?.minLength;
    if (minLength !== undefined && value.length < minLength) {
      return {
        isValid: false,
        error: `${config.label} must be at least ${minLength} characters`
      };
    }

    // Check max length
    const maxLength = config.maxLength || config.validation?.maxLength;
    if (maxLength !== undefined && value.length > maxLength) {
      return {
        isValid: false,
        error: `${config.label} must be at most ${maxLength} characters`
      };
    }

    // Check pattern
    const pattern = config.validation?.pattern;
    if (pattern && !new RegExp(pattern).test(value)) {
      return {
        isValid: false,
        error: `${config.label} format is invalid`
      };
    }
  }

  return { isValid: true };
}

/**
 * Sanitize text input for safety
 */
export function sanitizeTextInput(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Format text for display
 */
export function formatTextForDisplay(value: string, maxLength?: number): string {
  if (maxLength && value.length > maxLength) {
    return value.substring(0, maxLength) + '...';
  }
  return value;
}

/**
 * Common pre-defined text input configurations
 */
export const commonTextInputs = {
  // Station name input (for future expansion)
  stationName: (): TextInputConfig => ({
    name: 'stationName',
    label: 'Station Name',
    description: 'Starting station (optional)',
    required: false,
    placeholder: 'Enter station name',
    maxLength: 50,
  }),

  // Notes or additional information
  notes: (): TextInputConfig => ({
    name: 'notes',
    label: 'Additional Notes',
    description: 'Any special considerations or notes',
    required: false,
    placeholder: 'Enter any additional information',
    multiline: true,
    rows: 3,
    maxLength: 200,
    validation: {
      maxLength: 200,
    },
  }),

  // Custom working schedule description
  workSchedule: (): TextInputConfig => ({
    name: 'workSchedule',
    label: 'Work Schedule',
    description: 'Describe your typical work schedule (optional)',
    required: false,
    placeholder: 'e.g., Monday-Friday, 9AM-6PM',
    multiline: true,
    rows: 2,
    maxLength: 100,
  }),
};
