/**
 * Dropdown Widget
 * Provides selection from predefined options
 */

import type { WidgetField, WidgetAction } from '../responseFormatter.js';

/**
 * Dropdown option
 */
export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Dropdown widget configuration
 */
export interface DropdownConfig {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  options: DropdownOption[];
  multiple?: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
  };
}

/**
 * Create dropdown widget field
 */
export function createDropdownField(config: DropdownConfig): WidgetField {
  return {
    name: config.name,
    type: 'dropdown',
    label: config.label,
    description: config.description,
    required: config.required || false,
    defaultValue: config.defaultValue,
    placeholder: config.placeholder,
    options: config.options,
    multiple: config.multiple || false,
    validation: {
      pattern: config.validation?.pattern,
    },
  };
}

/**
 * Create dropdown form widget
 */
export function createDropdownWidget(
  config: DropdownConfig,
  actions?: WidgetAction[]
): {
  type: 'form';
  layout: 'vertical';
  title: string;
  description?: string;
  fields: WidgetField[];
  actions: WidgetAction[];
} {
  const field = createDropdownField(config);

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
 * Validate dropdown selection
 */
export function validateDropdownSelection(
  value: string | string[],
  config: DropdownConfig
): { isValid: boolean; error?: string; selectedValues?: string[] } {
  if (!value && config.required) {
    return { isValid: false, error: `${config.label} is required` };
  }

  if (!value && !config.required) {
    return { isValid: true };
  }

  const selectedValues = Array.isArray(value) ? value : [value];

  // Check if all selected values exist in options
  const optionValues = config.options.map(opt => opt.value);
  const invalidValues = selectedValues.filter(val => !optionValues.includes(val));

  if (invalidValues.length > 0) {
    return {
      isValid: false,
      error: 'Invalid selection'
    };
  }

  // Check if any selected options are disabled
  const disabledValues = selectedValues.filter(val => {
    const option = config.options.find(opt => opt.value === val);
    return option?.disabled;
  });

  if (disabledValues.length > 0) {
    return {
      isValid: false,
      error: 'One or more selected options are not available'
    };
  }

  return { isValid: true, selectedValues };
}

/**
 * Get option by value
 */
export function getOptionByValue(
  options: DropdownOption[],
  value: string
): DropdownOption | undefined {
  return options.find(option => option.value === value);
}

/**
 * Format dropdown selection for display
 */
export function formatDropdownSelection(
  value: string | string[],
  options: DropdownOption[]
): string {
  const selectedValues = Array.isArray(value) ? value : [value];
  const selectedOptions = options.filter(opt => selectedValues.includes(opt.value));

  if (selectedOptions.length === 0) {
    return '';
  }

  if (selectedOptions.length === 1) {
    return selectedOptions[0].label;
  }

  return selectedOptions.map(opt => opt.label).join(', ');
}

/**
 * Common pre-defined dropdown configurations for TPASS calculator
 */
export const commonDropdowns = {
  // Trip frequency presets
  tripFrequency: (): DropdownConfig => ({
    name: 'tripFrequency',
    label: 'Trip Frequency',
    description: 'How often do you travel?',
    required: true,
    defaultValue: 'daily',
    options: [
      {
        value: 'daily',
        label: 'Daily',
        description: 'Travel every working day',
      },
      {
        value: 'weekly',
        label: 'Weekly',
        description: 'Travel 2-3 times per week',
      },
      {
        value: 'occasional',
        label: 'Occasional',
        description: 'Travel less than once per week',
      },
    ],
    placeholder: 'Select frequency',
  }),

  // Calculation mode
  calculationMode: (): DropdownConfig => ({
    name: 'calculationMode',
    label: 'Calculation Mode',
    description: 'Choose your calculation preference',
    required: true,
    defaultValue: 'basic',
    options: [
      {
        value: 'basic',
        label: 'Basic',
        description: 'Simple TPASS vs regular fare comparison',
      },
      {
        value: 'advanced',
        label: 'Advanced',
        description: 'Detailed breakdown with custom options',
      },
    ],
    placeholder: 'Select mode',
  }),

  // Transportation type
  transportType: (): DropdownConfig => ({
    name: 'transportType',
    label: 'Transportation',
    description: 'Primary mode of transport',
    required: false,
    options: [
      {
        value: 'metro',
        label: 'Taipei Metro',
        description: 'MRT only',
      },
      {
        value: 'bus',
        label: 'Bus',
        description: 'City bus only',
      },
      {
        value: 'metro-bus',
        label: 'Metro + Bus',
        description: 'Both MRT and bus',
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Different transportation',
      },
    ],
    placeholder: 'Select transport type',
  }),
};
