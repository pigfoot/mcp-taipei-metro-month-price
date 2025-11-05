/**
 * OpenAI Apps Widget Generation
 * Creates widget configurations for different interaction types
 * Supports TPASS calculation forms, results display, and error handling
 */

import type { WidgetConfiguration, WidgetField, WidgetAction, WidgetSection } from '../../lib/responseFormatter.js';

// ============================================================================
// Widget Creation Functions
// ============================================================================

/**
 * Create result display widget for TPASS calculation
 */
export function createResultWidget(
  data: {
    recommendation: 'BUY_TPASS' | 'USE_REGULAR';
    tpassCost: number;
    regularCost: number;
    savings: number;
    savingsPercentage: number;
    explanation: string;
    calculationDetails?: {
      workingDays: number;
      totalTrips: number;
      discountRate: number;
      discountTier: string;
      validityPeriod: {
        start: string;
        end: string;
      };
    };
  }
): WidgetConfiguration {
  const isRecommendationBuy = data.recommendation === 'BUY_TPASS';
  const emoji = isRecommendationBuy ? '✅' : '❌';
  const title = isRecommendationBuy ? 'Buy TPASS' : 'Use Regular Fare';

  const sections: WidgetSection[] = [
    {
      title: 'Summary',
      type: 'summary',
      content: `${data.explanation}`,
      data: {
        recommendation: data.recommendation,
        savings: data.savings,
        savingsPercentage: data.savingsPercentage,
      },
    },
  ];

  // Add detailed breakdown if available
  if (data.calculationDetails) {
    sections.push({
      title: 'Cost Breakdown',
      type: 'breakdown',
      content: `TPASS: ${data.tpassCost} NTD | Regular: ${data.regularCost} NTD | Savings: ${data.savings} NTD`,
      data: {
        tpassCost: data.tpassCost,
        regularCost: data.regularCost,
        savings: data.savings,
      },
    });

    sections.push({
      title: 'Calculation Details',
      type: 'details',
      content: `Working Days: ${data.calculationDetails.workingDays} | Total Trips: ${data.calculationDetails.totalTrips} | Discount: ${(data.calculationDetails.discountRate * 100).toFixed(0)}% (${data.calculationDetails.discountTier})`,
      data: data.calculationDetails,
    });
  }

  const actions: WidgetAction[] = [
    {
      type: 'recalculate',
      label: 'Recalculate',
      description: 'Run calculation again with the same parameters',
      enabled: true,
      priority: 'primary',
    },
    {
      type: 'detailed_view',
      label: 'View Details',
      description: 'See detailed monthly breakdown',
      enabled: Boolean(data.calculationDetails?.validityPeriod),
      priority: 'secondary',
    },
    {
      type: 'share',
      label: 'Share Result',
      description: 'Share this calculation with others',
      enabled: true,
      priority: 'tertiary',
    },
  ];

  return {
    type: 'result',
    layout: 'vertical',
    title: `${emoji} ${title} - Save ${data.savings} NTD`,
    description: `${data.savingsPercentage}% savings compared to alternative option`,
    sections,
    actions,
    data: {
      recommendation: data.recommendation,
      costs: {
        tpass: data.tpassCost,
        regular: data.regularCost,
        savings: data.savings,
      },
      calculationComplete: true,
    },
  };
}

/**
 * Create form widget for TPASS calculation input
 */
export function createFormWidget(
  options: {
    mode?: 'basic' | 'advanced';
    defaultValues?: {
      startDate?: string;
      oneWayFare?: number;
      tripsPerDay?: number;
      customWorkingDays?: number;
    };
  } = {}
): WidgetConfiguration {
  const mode = options.mode || 'basic';
  const fields: WidgetField[] = [
    {
      name: 'startDate',
      type: 'date-picker',
      label: 'Start Date',
      description: 'When do you want to start using TPASS?',
      required: false,
      validation: {
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
      defaultValue: options.defaultValues?.startDate || new Date().toISOString().split('T')[0],
    },
    {
      name: 'oneWayFare',
      type: 'number-input',
      label: 'One-way Fare (NTD)',
      description: 'How much does one trip cost?',
      required: false,
      validation: {
        min: 1,
        max: 200,
      },
      defaultValue: options.defaultValues?.oneWayFare || 40,
    },
    {
      name: 'tripsPerDay',
      type: 'number-input',
      label: 'Trips per Day',
      description: 'How many trips do you take per working day?',
      required: false,
      validation: {
        min: 1,
        max: 10,
      },
      defaultValue: options.defaultValues?.tripsPerDay || 2,
    },
  ];

  // Add advanced fields if in advanced mode
  if (mode === 'advanced') {
    fields.push({
      name: 'customWorkingDays',
      type: 'number-input',
      label: 'Custom Working Days (0-30)',
      description: 'Override the calculated working days (optional)',
      required: false,
      validation: {
        min: 0,
        max: 30,
      },
      defaultValue: options.defaultValues?.customWorkingDays,
    });
  }

  const actions: WidgetAction[] = [
    {
      type: 'submit',
      label: 'Calculate TPASS Comparison',
      description: 'Compare TPASS cost vs regular fare',
      enabled: true,
      priority: 'primary',
    },
    {
      type: 'cancel',
      label: 'Cancel',
      description: 'Cancel calculation',
      enabled: true,
      priority: 'tertiary',
    },
  ];

  return {
    type: 'form',
    layout: 'vertical',
    title: '🚌 TPASS Calculator',
    description: `Calculate whether TPASS monthly pass is worth it for your usage pattern. ${mode === 'basic' ? 'Using default values for convenience.' : 'Advanced mode allows custom working days.'}`,
    fields,
    actions,
    data: {
      mode,
      step: 1,
      totalSteps: 1,
    },
  };
}

/**
 * Create error widget with retry functionality
 */
export function createErrorWidget(
  error: {
    type: 'validation' | 'calculation' | 'network' | 'widget' | 'protocol';
    message: string;
    code?: string;
    suggestions?: string[];
  },
  context?: {
    step?: number;
    field?: string;
    function?: string;
  }
): WidgetConfiguration {
  const errorTitle = getErrorTitle(error.type);
  const emoji = getErrorEmoji(error.type);

  const sections: WidgetSection[] = [
    {
      title: 'Error Details',
      type: 'error',
      content: `Error: ${error.message}${error.code ? ` (${error.code})` : ''}`,
      data: {
        errorType: error.type,
        errorCode: error.code,
      },
    },
  ];

  if (context?.field) {
    sections.push({
      title: 'Problem Field',
      type: 'error',
      content: `The issue is with: ${context.field}`,
      data: { field: context.field },
    });
  }

  if (error.suggestions && error.suggestions.length > 0) {
    sections.push({
      title: 'Suggestions',
      type: 'details',
      content: error.suggestions.join('\n• '),
      data: { suggestions: error.suggestions },
    });
  }

  const actions: WidgetAction[] = [
    {
      type: 'retry',
      label: 'Try Again',
      description: 'Retry the calculation',
      enabled: true,
      priority: 'primary',
    },
    {
      type: 'help',
      label: 'Get Help',
      description: 'View troubleshooting guide',
      enabled: true,
      priority: 'secondary',
    },
  ];

  return {
    type: 'error',
    layout: 'vertical',
    title: `${emoji} ${errorTitle}`,
    description: error.message,
    sections,
    actions,
    data: {
      errorType: error.type,
      errorCode: error.code,
      context,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create step-by-step interaction widget for advanced users
 */
export function createStepByStepWidget(
  stepData: {
    currentStep: number;
    totalSteps: number;
    stepTitle: string;
    stepDescription?: string;
    stepType: 'input' | 'review' | 'result';
    canProceed: boolean;
    nextStepConfig?: WidgetConfiguration;
    collectedData?: Record<string, unknown>;
  }
): WidgetConfiguration {
  const progress = Math.round((stepData.currentStep / stepData.totalSteps) * 100);
  const stepEmoji = getStepEmoji(stepData.stepType);

  const sections: WidgetSection[] = [
    {
      title: 'Progress',
      type: 'details',
      content: `Step ${stepData.currentStep} of ${stepData.totalSteps} (${progress}% complete)`,
      data: {
        currentStep: stepData.currentStep,
        totalSteps: stepData.totalSteps,
        progress,
      },
    },
  ];

  if (stepData.stepDescription) {
    sections.push({
      title: 'Instructions',
      type: 'details',
      content: stepData.stepDescription,
    });
  }

  const actions: WidgetAction[] = [];

  if (stepData.canProceed && stepData.currentStep < stepData.totalSteps) {
    actions.push({
      type: 'next',
      label: 'Continue',
      description: `Go to step ${stepData.currentStep + 1}`,
      enabled: true,
      priority: 'primary',
    });
  } else if (stepData.currentStep === stepData.totalSteps) {
    actions.push({
      type: 'submit',
      label: 'Complete Calculation',
      description: 'Finish and see results',
      enabled: true,
      priority: 'primary',
    });
  }

  if (stepData.currentStep > 1) {
    actions.push({
      type: 'cancel',
      label: 'Previous Step',
      description: `Go back to step ${stepData.currentStep - 1}`,
      enabled: true,
      priority: 'secondary',
    });
  }

  return {
    type: 'form',
    layout: 'vertical',
    title: `${stepEmoji} ${stepData.stepTitle}`,
    description: `Step ${stepData.currentStep} of ${stepData.totalSteps}`,
    sections,
    actions,
    data: {
      currentStep: stepData.currentStep,
      totalSteps: stepData.totalSteps,
      stepType: stepData.stepType,
      canProceed: stepData.canProceed,
      collectedData: stepData.collectedData,
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get appropriate error title based on error type
 */
function getErrorTitle(errorType: string): string {
  switch (errorType) {
    case 'validation':
      return 'Invalid Input';
    case 'calculation':
      return 'Calculation Error';
    case 'network':
      return 'Connection Error';
    case 'widget':
      return 'Display Error';
    case 'protocol':
      return 'Protocol Error';
    default:
      return 'Error Occurred';
  }
}

/**
 * Get appropriate emoji for error type
 */
function getErrorEmoji(errorType: string): string {
  switch (errorType) {
    case 'validation':
      return '⚠️';
    case 'calculation':
      return '🔢';
    case 'network':
      return '🌐';
    case 'widget':
      return '📱';
    case 'protocol':
      return '🔌';
    default:
      return '❌';
  }
}

/**
 * Get appropriate emoji for step type
 */
function getStepEmoji(stepType: string): string {
  switch (stepType) {
    case 'input':
      return '✏️';
    case 'review':
      return '👀';
    case 'result':
      return '📊';
    default:
      return '📝';
  }
}

/**
 * Validate widget configuration
 */
export function validateWidget(widget: WidgetConfiguration): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!widget.type) {
    errors.push('Widget type is required');
  }

  if (!widget.title) {
    errors.push('Widget title is required');
  }

  // Validate widget type
  const validTypes = ['form', 'result', 'error', 'info'];
  if (widget.type && !validTypes.includes(widget.type)) {
    errors.push(`Invalid widget type: ${widget.type}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate layout
  const validLayouts = ['vertical', 'horizontal', 'grid'];
  if (widget.layout && !validLayouts.includes(widget.layout)) {
    errors.push(`Invalid layout: ${widget.layout}. Must be one of: ${validLayouts.join(', ')}`);
  }

  // Validate fields for form widgets
  if (widget.type === 'form') {
    if (!widget.fields || widget.fields.length === 0) {
      errors.push('Form widgets must have at least one field');
    } else {
      widget.fields.forEach((field, index) => {
        if (!field.name) {
          errors.push(`Field ${index + 1}: name is required`);
        }
        if (!field.type) {
          errors.push(`Field ${index + 1}: type is required`);
        }
        if (!field.label) {
          errors.push(`Field ${index + 1}: label is required`);
        }
      });
    }
  }

  // Validate actions
  if (widget.actions && widget.actions.length > 0) {
    widget.actions.forEach((action, index) => {
      if (!action.type) {
        errors.push(`Action ${index + 1}: type is required`);
      }
      if (!action.label) {
        errors.push(`Action ${index + 1}: label is required`);
      }
    });
  }

  // Check for performance warnings
  if (widget.sections && widget.sections.length > 10) {
    warnings.push('Too many sections may impact performance');
  }

  if (widget.actions && widget.actions.length > 5) {
    warnings.push('Too many actions may clutter the interface');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Optimize widget for size constraints
 */
export function optimizeWidgetForSize(
  widget: WidgetConfiguration,
  maxSize: number = 32 * 1024 // 32KB default
): WidgetConfiguration {
  const currentSize = JSON.stringify(widget).length;

  if (currentSize <= maxSize) {
    return widget; // No optimization needed
  }

  const optimized = { ...widget };

  // Reduce sections if too many
  if (optimized.sections && optimized.sections.length > 5) {
    optimized.sections = optimized.sections.slice(0, 5);
  }

  // Reduce actions if too many
  if (optimized.actions && optimized.actions.length > 3) {
    optimized.actions = optimized.actions.slice(0, 3);
  }

  // Truncate long content
  if (optimized.sections) {
    optimized.sections = optimized.sections.map(section => ({
      ...section,
      content: section.content.length > 500 ? section.content.substring(0, 500) + '...' : section.content,
    }));
  }

  // Truncate description
  if (optimized.description && optimized.description.length > 200) {
    optimized.description = optimized.description.substring(0, 200) + '...';
  }

  return optimized;
}