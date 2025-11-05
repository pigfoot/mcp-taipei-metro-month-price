/**
 * Widget Interaction Flow Tests
 * Validates step-by-step progression and form handling
 */

import { describe, test, expect } from 'bun:test';
import { StepByStepInteractionManager } from '../../../src/lib/stepByStepInteraction.js';
import { createDatePickerField, validateDatePickerInput } from '../../../src/lib/widgets/datePicker.js';
import { createNumberInputField, validateNumberInput } from '../../../src/lib/widgets/numberInput.js';
import { createDropdownField, validateDropdownSelection } from '../../../src/lib/widgets/dropdown.js';
import { commonNumberInputs } from '../../../src/lib/widgets/numberInput.js';

describe('Widget Interaction Flow', () => {
  describe('StepByStepInteraction Manager', () => {
    test('should start with basic mode flow', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });
      const initialStep = manager.startInteraction();

      expect(initialStep.currentStep).toBe(1);
      expect(initialStep.totalSteps).toBe(3);
      expect(initialStep.stepTitle).toBe('Basic Travel Information');
      expect(initialStep.widget.type).toBe('form');
      expect(initialStep.canProceed).toBe(false);
    });

    test('should start with advanced mode flow', () => {
      const manager = new StepByStepInteractionManager({ mode: 'advanced' });
      const initialStep = manager.startInteraction();

      expect(initialStep.currentStep).toBe(1);
      expect(initialStep.totalSteps).toBe(4);
      expect(initialStep.stepTitle).toBe('Basic Travel Information');
      expect(initialStep.widget.type).toBe('form');
    });

    test('should progress through steps with valid data', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });

      // Step 1: Basic travel information
      const step1 = manager.startInteraction();
      expect(step1.currentStep).toBe(1);

      const step1Data = {
        startDate: '2024-01-01',
        oneWayFare: 40,
      };

      const step2 = manager.continueInteraction(step1Data);
      expect(step2.currentStep).toBe(2);
      expect(step2.isComplete).toBe(false);
      expect(step2.nextWidget).toBeDefined();

      // Step 2: Advanced options
      const step2Data = {
        tripsPerDay: 2,
      };

      const step3 = manager.continueInteraction(step2Data);
      expect(step3.currentStep).toBe(3);
      expect(step3.isComplete).toBe(true);
      expect(step3.calculationResult).toBeDefined();
      expect(step3.calculationResult?.recommendation).toBeDefined();
    });

    test('should allow back navigation in basic mode', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });

      // Progress to step 2
      manager.continueInteraction({
        startDate: '2024-01-01',
        oneWayFare: 40,
      });

      manager.continueInteraction({
        tripsPerDay: 2,
      });

      // Go back
      const previousStep = manager.goBack();
      expect(previousStep.currentStep).toBe(2);
    });

    test('should validate data on each step', () => {
      const manager = new StepByStepInteractionManager({
        mode: 'basic',
        validateOnEachStep: true,
      });

      // Try to proceed with invalid data
      expect(() => {
        manager.continueInteraction({
          startDate: 'invalid-date',
          oneWayFare: 40,
        });
      }).toThrow('Invalid data for current step');

      // Try to proceed with missing required fields
      expect(() => {
        manager.continueInteraction({
          startDate: '2024-01-01',
          // Missing oneWayFare
        });
      }).toThrow('Invalid data for current step');
    });

    test('should complete calculation with correct recommendation', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });

      // Complete the flow
      manager.continueInteraction({
        startDate: '2024-01-01',
        oneWayFare: 40,
      });

      manager.continueInteraction({
        tripsPerDay: 2,
      });

      const finalResult = manager.continueInteraction({});

      expect(finalResult.isComplete).toBe(true);
      expect(finalResult.calculationResult).toBeDefined();
      expect(finalResult.calculationResult?.recommendation).toBe('BUY_TPASS');
      expect(finalResult.calculationResult?.tpassCost).toBe(1200);
      expect(finalResult.calculationResult?.regularCost).toBeGreaterThan(0);
    });

    test('should reset interaction state', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });

      // Progress to step 2
      manager.continueInteraction({
        startDate: '2024-01-01',
        oneWayFare: 40,
      });

      // Reset
      manager.reset();
      const state = manager.getState();

      expect(state.currentStep).toBe(1);
      expect(state.totalSteps).toBe(3);
      expect(state.collectedData).toEqual({});
      expect(state.isComplete).toBe(false);
    });
  });

  describe('Widget Validation', () => {
    describe('Date Picker Validation', () => {
      test('should validate date format', () => {
        const result = validateDatePickerInput('2024-01-01', {
          name: 'startDate',
          label: 'Start Date',
          required: true,
        });

        expect(result.isValid).toBe(true);
      });

      test('should reject invalid date format', () => {
        const result = validateDatePickerInput('invalid-date', {
          name: 'startDate',
          label: 'Start Date',
          required: true,
        });

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid date format');
      });

      test('should enforce date constraints', () => {
        const result = validateDatePickerInput('2024-01-01', {
          name: 'startDate',
          label: 'Start Date',
          required: true,
          minDate: '2024-01-15',
        });

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be after');
      });
    });

    describe('Number Input Validation', () => {
      test('should validate numeric value', () => {
        const result = validateNumberInput('40', commonNumberInputs.fare(40));
        expect(result.isValid).toBe(true);
        expect(result.numericValue).toBe(40);
      });

      test('should reject non-numeric input', () => {
        const result = validateNumberInput('abc', commonNumberInputs.fare());
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('valid number');
      });

      test('should enforce min/max constraints', () => {
        const result1 = validateNumberInput('0', commonNumberInputs.tripsPerDay());
        expect(result1.isValid).toBe(false);
        expect(result1.error).toContain('at least');

        const result2 = validateNumberInput('15', commonNumberInputs.tripsPerDay());
        expect(result2.isValid).toBe(false);
        expect(result2.error).toContain('at most');
      });

      test('should handle step validation', () => {
        const result = validateNumberInput('1.5', commonNumberInputs.tripsPerDay());
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('increments');
      });
    });

    describe('Dropdown Validation', () => {
      test('should validate valid selection', () => {
        const result = validateDropdownSelection('daily', {
          name: 'frequency',
          label: 'Frequency',
          required: true,
          options: [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ],
        });

        expect(result.isValid).toBe(true);
        expect(result.selectedValues).toEqual(['daily']);
      });

      test('should reject invalid selection', () => {
        const result = validateDropdownSelection('invalid', {
          name: 'frequency',
          label: 'Frequency',
          required: true,
          options: [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ],
        });

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid selection');
      });

      test('should handle optional fields', () => {
        const result = validateDropdownSelection('', {
          name: 'frequency',
          label: 'Frequency',
          required: false,
          options: [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ],
        });

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Progressive Disclosure', () => {
    test('should show appropriate fields for each step', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });

      const step1 = manager.startInteraction();
      expect(step1.widget.fields?.length).toBe(2); // startDate, oneWayFare

      manager.continueInteraction({
        startDate: '2024-01-01',
        oneWayFare: 40,
      });

      const step2 = manager.continueInteraction({});
      expect(step2.nextWidget?.fields?.length).toBe(1); // tripsPerDay
    });

    test('should adapt to advanced mode', () => {
      const manager = new StepByStepInteractionManager({ mode: 'advanced' });

      const step1 = manager.startInteraction();
      expect(step1.totalSteps).toBe(4);

      // Complete first two steps
      manager.continueInteraction({
        startDate: '2024-01-01',
        oneWayFare: 40,
      });

      manager.continueInteraction({
        tripsPerDay: 2,
      });

      const step3 = manager.continueInteraction({});
      expect(step3.nextWidget?.fields?.length).toBe(1); // customWorkingDays
    });
  });

  describe('Cross-Month Calculation Detection', () => {
    test('should detect cross-month scenarios', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });

      // Start with end-of-month date
      manager.continueInteraction({
        startDate: '2024-01-31',
        oneWayFare: 40,
      });

      const result = manager.continueInteraction({
        tripsPerDay: 2,
      });

      // Should complete and provide calculation result
      expect(result.isComplete).toBe(true);
      expect(result.calculationResult).toBeDefined();
    });
  });

  describe('User Experience Testing', () => {
    test('should provide helpful error messages', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });

      // Test validation errors
      expect(() => {
        manager.continueInteraction({
          startDate: 'invalid-date',
        });
      }).toThrow();
    });

    test('should handle edge cases gracefully', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });

      // Test with extreme values
      expect(() => {
        manager.continueInteraction({
          startDate: '2024-01-01',
          oneWayFare: 1000, // Very high fare
        });
      }).not.toThrow();
    });

    test('should maintain state consistency', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });

      // Progress through steps
      manager.continueInteraction({
        startDate: '2024-01-01',
        oneWayFare: 40,
      });

      let state = manager.getState();
      expect(state.currentStep).toBe(2);

      manager.continueInteraction({
        tripsPerDay: 2,
      });

      state = manager.getState();
      expect(state.isComplete).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    test('should complete interaction flow quickly', () => {
      const manager = new StepByStepInteractionManager({ mode: 'basic' });
      const start = Date.now();

      // Complete full flow
      manager.continueInteraction({
        startDate: '2024-01-01',
        oneWayFare: 40,
      });

      manager.continueInteraction({
        tripsPerDay: 2,
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Under 100ms
    });

    test('should handle multiple interactions efficiently', () => {
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        const manager = new StepByStepInteractionManager({ mode: 'basic' });
        manager.startInteraction();
      }

      const duration = Date.now() - start;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(10); // Under 10ms per interaction
    });
  });
});
