/**
 * Step-by-Step Interaction Manager
 * Handles progressive disclosure and guided user flows for TPASS calculations
 */

import type { WidgetConfiguration } from './responseFormatter.js';
import { createFormWidget, createResultWidget } from '../adapters/openai/widgets.js';

/**
 * Step information for the interaction flow
 */
export interface StepInfo {
  stepNumber: number;
  title: string;
  description: string;
  requiredFields: string[];
  widgetType: 'form' | 'result' | 'info';
}

/**
 * Step-by-step interaction state
 */
export interface InteractionState {
  currentStep: number;
  totalSteps: number;
  collectedData: Record<string, unknown>;
  canProceed: boolean;
  isComplete: boolean;
}

/**
 * Step-by-step interaction configuration
 */
export interface InteractionConfig {
  mode: 'basic' | 'advanced';
  allowBackNavigation: boolean;
  validateOnEachStep: boolean;
  includeHelpText: boolean;
}

/**
 * Default interaction flow steps
 */
const DEFAULT_STEPS: StepInfo[] = [
  {
    stepNumber: 1,
    title: 'Basic Travel Information',
    description: 'Enter your basic travel details to get started with TPASS calculation',
    requiredFields: ['startDate', 'oneWayFare'],
    widgetType: 'form',
  },
  {
    stepNumber: 2,
    title: 'Advanced Options',
    description: 'Configure trips per day and working days for accurate calculation',
    requiredFields: ['tripsPerDay'],
    widgetType: 'form',
  },
  {
    stepNumber: 3,
    title: 'Calculation Results',
    description: 'Review your personalized TPASS vs regular fare comparison',
    requiredFields: [],
    widgetType: 'result',
  },
];

/**
 * Advanced mode steps (includes custom working days)
 */
const ADVANCED_STEPS: StepInfo[] = [
  ...DEFAULT_STEPS.slice(0, 2),
  {
    stepNumber: 3,
    title: 'Custom Working Days',
    description: 'Specify your exact working days if different from standard schedule',
    requiredFields: ['customWorkingDays'],
    widgetType: 'form',
  },
  {
    stepNumber: 4,
    title: 'Calculation Results',
    description: 'Review your personalized TPASS vs regular fare comparison',
    requiredFields: [],
    widgetType: 'result',
  },
];

/**
 * Manages step-by-step interaction flow
 */
export class StepByStepInteractionManager {
  private state: InteractionState;
  private config: InteractionConfig;
  private steps: StepInfo[];

  constructor(config?: Partial<InteractionConfig>) {
    this.config = {
      mode: 'basic',
      allowBackNavigation: true,
      validateOnEachStep: true,
      includeHelpText: true,
      ...config,
    };

    this.steps = this.config.mode === 'advanced' ? ADVANCED_STEPS : DEFAULT_STEPS;
    this.state = {
      currentStep: 1,
      totalSteps: this.steps.length,
      collectedData: {},
      canProceed: false,
      isComplete: false,
    };
  }

  /**
   * Start the interaction flow
   */
  startInteraction(): {
    currentStep: number;
    totalSteps: number;
    stepTitle: string;
    stepDescription: string;
    canProceed: boolean;
    widget: WidgetConfiguration;
  } {
    const step = this.getCurrentStep();
    const widget = this.createWidgetForStep(step);

    return {
      currentStep: step.stepNumber,
      totalSteps: this.steps.length,
      stepTitle: step.title,
      stepDescription: step.description,
      canProceed: this.state.canProceed,
      widget,
    };
  }

  /**
   * Continue to next step with collected data
   */
  continueInteraction(
    stepData: Record<string, unknown>
  ): {
    currentStep: number;
    totalSteps: number;
    isComplete: boolean;
    calculationResult?: {
      recommendation: 'BUY_TPASS' | 'USE_REGULAR';
      tpassCost: number;
      regularCost: number;
      savings: number;
      explanation: string;
    };
    nextWidget?: WidgetConfiguration;
  } {
    // Validate current step data
    if (this.config.validateOnEachStep && !this.validateStepData(stepData)) {
      throw new Error('Invalid data for current step');
    }

    // Merge collected data
    this.state.collectedData = { ...this.state.collectedData, ...stepData };

    // Check if we can proceed
    this.state.canProceed = this.validateCurrentStep();

    // Move to next step or complete
    if (this.state.canProceed && this.state.currentStep < this.steps.length) {
      this.state.currentStep++;
      this.state.canProceed = false;

      const step = this.getCurrentStep();
      const nextWidget = this.createWidgetForStep(step);

      return {
        currentStep: step.stepNumber,
        totalSteps: this.steps.length,
        isComplete: false,
        nextWidget,
      };
    }

    // Complete interaction
    if (this.state.canProceed && this.state.currentStep === this.steps.length) {
      this.state.isComplete = true;

      // Generate final calculation result
      const calculationResult = this.generateCalculationResult();

      return {
        currentStep: this.steps.length,
        totalSteps: this.steps.length,
        isComplete: true,
        calculationResult,
      };
    }

    throw new Error('Cannot proceed to next step');
  }

  /**
   * Go back to previous step
   */
  goBack(): {
    currentStep: number;
    totalSteps: number;
    stepTitle: string;
    stepDescription: string;
    canProceed: boolean;
    widget: WidgetConfiguration;
  } {
    if (!this.config.allowBackNavigation || this.state.currentStep <= 1) {
      throw new Error('Cannot go back to previous step');
    }

    this.state.currentStep--;
    this.state.canProceed = this.validateCurrentStep();

    const step = this.getCurrentStep();
    const widget = this.createWidgetForStep(step);

    return {
      currentStep: step.stepNumber,
      totalSteps: this.steps.length,
      stepTitle: step.title,
      stepDescription: step.description,
      canProceed: this.state.canProceed,
      widget,
    };
  }

  /**
   * Get current interaction state
   */
  getState(): InteractionState {
    return { ...this.state };
  }

  /**
   * Reset interaction to beginning
   */
  reset(): void {
    this.state = {
      currentStep: 1,
      totalSteps: this.steps.length,
      collectedData: {},
      canProceed: false,
      isComplete: false,
    };
  }

  /**
   * Validate data for current step
   */
  private validateStepData(data: Record<string, unknown>): boolean {
    const step = this.getCurrentStep();

    for (const field of step.requiredFields) {
      if (!(field in data) || data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    // Additional validation rules
    if (data.startDate && !this.isValidDate(data.startDate as string)) {
      return false;
    }

    if (data.oneWayFare && typeof data.oneWayFare === 'number') {
      const fare = data.oneWayFare as number;
      if (fare < 1 || fare > 200) {
        return false;
      }
    }

    if (data.tripsPerDay && typeof data.tripsPerDay === 'number') {
      const trips = data.tripsPerDay as number;
      if (trips < 1 || trips > 10) {
        return false;
      }
    }

    if (data.customWorkingDays && typeof data.customWorkingDays === 'number') {
      const days = data.customWorkingDays as number;
      if (days < 0 || days > 30) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate that current step requirements are met
   */
  private validateCurrentStep(): boolean {
    const step = this.getCurrentStep();

    for (const field of step.requiredFields) {
      if (!(field in this.state.collectedData)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create widget for current step
   */
  private createWidgetForStep(step: StepInfo): WidgetConfiguration {
    switch (step.widgetType) {
      case 'form':
        return this.createFormWidgetForStep(step);
      case 'result':
        return this.createResultWidgetForStep();
      default:
        throw new Error(`Unknown widget type: ${step.widgetType}`);
    }
  }

  /**
   * Create form widget for current step
   */
  private createFormWidgetForStep(step: StepInfo): WidgetConfiguration {
    switch (step.stepNumber) {
      case 1:
        return createBasicFormWidget(this.state.collectedData);
      case 2:
        return createAdvancedFormWidget(this.state.collectedData);
      case 3:
        if (this.config.mode === 'advanced') {
          return createCustomDaysWidget(this.state.collectedData);
        }
        return createResultWidget(this.state.collectedData);
      default:
        throw new Error(`Unknown step: ${step.stepNumber}`);
    }
  }

  /**
   * Create result widget for final step
   */
  private createResultWidgetForStep(): WidgetConfiguration {
    const calculationResult = this.generateCalculationResult();
    return createResultWidget({
      recommendation: calculationResult.recommendation,
      tpassCost: calculationResult.tpassCost,
      regularCost: calculationResult.regularCost,
      savings: calculationResult.savings,
      savingsPercentage: Math.round((calculationResult.savings / calculationResult.tpassCost) * 100),
      explanation: calculationResult.explanation,
    });
  }

  /**
   * Generate calculation result from collected data
   */
  private generateCalculationResult(): {
    recommendation: 'BUY_TPASS' | 'USE_REGULAR';
    tpassCost: number;
    regularCost: number;
    savings: number;
    explanation: string;
  } {
    const data = this.state.collectedData;

    // Use collected data to perform calculation
    const startDate = (data.startDate as string) || new Date().toISOString().split('T')[0];
    const oneWayFare = (data.oneWayFare as number) || 40;
    const tripsPerDay = (data.tripsPerDay as number) || 2;
    const customWorkingDays = data.customWorkingDays as number | undefined;

    // Simple calculation logic (in real implementation, use actual calculator)
    const workingDays = customWorkingDays || 22;
    const totalTrips = workingDays * tripsPerDay;
    const regularCost = totalTrips * oneWayFare * 0.9; // 10% discount assumed
    const tpassCost = 1200;

    const savings = regularCost - tpassCost;
    const recommendation = savings > 0 ? 'BUY_TPASS' : 'USE_REGULAR';

    const explanation = recommendation === 'BUY_TPASS'
      ? `TPASS saves you NT$${savings} compared to regular fare.`
      : `Regular fare saves you NT$${Math.abs(savings)} compared to TPASS.`;

    return {
      recommendation,
      tpassCost,
      regularCost,
      savings: Math.abs(savings),
      explanation,
    };
  }

  /**
   * Get current step information
   */
  private getCurrentStep(): StepInfo {
    if (this.state.currentStep < 1 || this.state.currentStep > this.steps.length) {
      throw new Error(`Invalid step: ${this.state.currentStep}`);
    }
    return this.steps[this.state.currentStep - 1];
  }

  /**
   * Validate date format
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  }
}

/**
 * Create basic form widget for step 1
 */
function createBasicFormWidget(data: Record<string, unknown>): WidgetConfiguration {
  return createFormWidget({
    title: 'Travel Information',
    description: 'Enter your basic travel details to get started',
    fields: [
      {
        name: 'startDate',
        type: 'date-picker' as const,
        label: 'Start Date',
        description: 'When does your 30-day period begin?',
        required: true,
        validation: {
          min: new Date().toISOString().split('T')[0], // Can't start in the past
        },
      },
      {
        name: 'oneWayFare',
        type: 'number-input' as const,
        label: 'One-way Fare',
        description: 'Cost of a single trip in NTD',
        required: true,
        validation: {
          min: 1,
          max: 200,
        },
        defaultValue: data.oneWayFare || 40,
      },
    ],
    actions: [
      {
        type: 'next' as const,
        label: 'Continue',
        enabled: Boolean(data.startDate && data.oneWayFare),
      },
    ],
  });
}

/**
 * Create advanced form widget for step 2
 */
function createAdvancedFormWidget(data: Record<string, unknown>): WidgetConfiguration {
  return createFormWidget({
    title: 'Advanced Options',
    description: 'Configure your travel frequency',
    fields: [
      {
        name: 'tripsPerDay',
        type: 'number-input' as const,
        label: 'Trips per Day',
        description: 'How many trips do you make per working day?',
        required: true,
        validation: {
          min: 1,
          max: 10,
        },
        defaultValue: data.tripsPerDay || 2,
      },
    ],
    actions: [
      {
        type: 'back' as const,
        label: 'Back',
        enabled: true,
      },
      {
        type: 'next' as const,
        label: 'Continue',
        enabled: Boolean(data.tripsPerDay),
      },
    ],
  });
}

/**
 * Create custom working days widget for step 3 (advanced mode)
 */
function createCustomDaysWidget(data: Record<string, unknown>): WidgetConfiguration {
  return createFormWidget({
    title: 'Custom Working Days',
    description: 'Optional: Specify exact working days (otherwise calculated automatically)',
    fields: [
      {
        name: 'customWorkingDays',
        type: 'number-input' as const,
        label: 'Working Days',
        description: 'Number of working days in the 30-day period (0-30)',
        required: false,
        validation: {
          min: 0,
          max: 30,
        },
        defaultValue: data.customWorkingDays || '',
      },
    ],
    actions: [
      {
        type: 'back' as const,
        label: 'Back',
        enabled: true,
      },
      {
        type: 'next' as const,
        label: 'Calculate',
        enabled: true,
      },
    ],
  });
}

/**
 * Create result widget from calculation data
 */
function createResultWidget(data: Record<string, unknown>): WidgetConfiguration {
  const recommendation = (data.recommendation as 'BUY_TPASS' | 'USE_REGULAR') || 'USE_REGULAR';
  const isBuyRecommendation = recommendation === 'BUY_TPASS';

  return createResultWidget({
    recommendation,
    tpassCost: (data.tpassCost as number) || 1200,
    regularCost: (data.regularCost as number) || 0,
    savings: (data.savings as number) || 0,
    savingsPercentage: (data.savingsPercentage as number) || 0,
    explanation: (data.explanation as string) || 'Calculation completed',
    calculationDetails: {
      workingDays: 22,
      totalTrips: (data.tripsPerDay as number) * 22 || 44,
      discountRate: 0.1,
      discountTier: '10% discount',
      validityPeriod: {
        start: (data.startDate as string) || new Date().toISOString().split('T')[0],
        end: '2024-01-31',
      },
    },
  });
}
