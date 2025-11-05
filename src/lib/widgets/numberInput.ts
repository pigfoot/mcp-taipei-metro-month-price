/**
 * Number Input Widget
 * Provides numeric input with validation and constraints
 */

import type { WidgetField, WidgetAction } from '../responseFormatter.js';

/**
 * Number input widget configuration
 */
export interface NumberInputConfig {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * Create number input widget field
 */
export function createNumberInputField(config: NumberInputConfig): WidgetField {
  return {
    name: config.name,
    type: 'number-input',
    label: config.label,
    description: config.description,
    required: config.required || false,
    defaultValue: config.defaultValue?.toString(),
    validation: {
      min: config.min,
      max: config.max,
      step: config.step,
      pattern: config.validation?.pattern,
    },
  };
}

/**
 * Create number input form widget
 */
export function createNumberInputWidget(
  config: NumberInputConfig,
  actions?: WidgetAction[]
): {
  type: 'form';
  layout: 'vertical';
  title: string;
  description?: string;
  fields: WidgetField[];
  actions: WidgetAction[];
} {
  const field = createNumberInputField(config);

  const defaultActions: WidgetAction[] = [
    {
      type: 'cancel',
      label: 'Cancel',
      enabled: true,
    },
    {
      type: 'next',
      label: 'Continue',
      enabled: Boolean(config.defaultValue !== undefined),
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
 * Validate number input
 */
export function validateNumberInput(
  value: string | number,
  config: NumberInputConfig
): { isValid: boolean; error?: string; numericValue?: number } {
  let numericValue: number;

  // Convert to number
  if (typeof value === 'string') {
    if (!value.trim()) {
      if (config.required) {
        return { isValid: false, error: `${config.label} is required` };
      }
      return { isValid: true };
    }

    numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      return { isValid: false, error: 'Please enter a valid number' };
    }
  } else {
    numericValue = value;
  }

  // Check min constraint
  const minValue = config.min ?? config.validation?.min;
  if (minValue !== undefined && numericValue < minValue) {
    return {
      isValid: false,
      error: `${config.label} must be at least ${minValue}`
    };
  }

  // Check max constraint
  const maxValue = config.max ?? config.validation?.max;
  if (maxValue !== undefined && numericValue > maxValue) {
    return {
      isValid: false,
      error: `${config.label} must be at most ${maxValue}`
    };
  }

  // Check step constraint
  if (config.step !== undefined) {
    const remainder = (numericValue - (minValue || 0)) % config.step;
    if (remainder !== 0) {
      return {
        isValid: false,
        error: `${config.label} must be in increments of ${config.step}`
      };
    }
  }

  return { isValid: true, numericValue };
}

/**
 * Format number for display
 */
export function formatNumberForDisplay(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Common pre-defined number input configurations
 */
export const commonNumberInputs = {
  // One-way fare input (NTD)
  fare: (defaultValue?: number): NumberInputConfig => ({
    name: 'oneWayFare',
    label: 'One-way Fare',
    description: 'Cost of a single trip in New Taiwan Dollars (NTD)',
    required: true,
    defaultValue: defaultValue ?? 40,
    min: 1,
    max: 200,
    step: 1,
  }),

  // Trips per day input
  tripsPerDay: (defaultValue?: number): NumberInputConfig => ({
    name: 'tripsPerDay',
    label: 'Trips per Day',
    description: 'How many trips do you make per working day?',
    required: true,
    defaultValue: defaultValue ?? 2,
    min: 1,
    max: 10,
    step: 1,
  }),

  // Custom working days input
  customWorkingDays: (defaultValue?: number): NumberInputConfig => ({
    name: 'customWorkingDays',
    label: 'Working Days',
    description: 'Number of working days in the 30-day period (0-30)',
    required: false,
    defaultValue,
    min: 0,
    max: 30,
    step: 1,
  }),
};
