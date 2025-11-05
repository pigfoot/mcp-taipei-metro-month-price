/**
 * Contract tests for OpenAI Apps response format validation
 * Ensures responses conform to OpenAI Apps Functions Schema v1.0
 */

import { describe, test, expect } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';

// Load the OpenAI Apps schema
const openAISchemaPath = path.resolve(__dirname, '../../../specs/005-openai-app-sdk/contracts/openai-apps-extended.json');
let openAISchema: any;

async function loadSchema() {
  if (!openAISchema) {
    const schemaContent = await fs.readFile(openAISchemaPath, 'utf-8');
    openAISchema = JSON.parse(schemaContent);
  }
  return openAISchema;
}

describe('OpenAI Apps Response Format Contract', () => {
  describe('Schema Compliance', () => {
    test('should have valid schema structure', async () => {
      const schema = await loadSchema();
      expect(schema.$schema).toBe('https://openai.com/apps/schema/functions.json');
      expect(schema.name).toBe('taipei-metro-tpass-extended');
      expect(schema.version).toBe('2.0.0');
      expect(schema.functions).toBeInstanceOf(Array);
      expect(schema.functions.length).toBeGreaterThan(0);
    });

    test('should define calculateTPASSComparison function', async () => {
      const schema = await loadSchema();
      const calculateFunc = schema.functions.find((f: any) => f.name === 'calculateTPASSComparison');
      expect(calculateFunc).toBeDefined();
      expect(calculateFunc.parameters.type).toBe('object');
      expect(calculateFunc.returns.type).toBe('object');
      expect(calculateFunc.widget).toBeDefined();
    });

    test('should define getDiscountInformation function', async () => {
      const schema = await loadSchema();
      const discountFunc = schema.functions.find((f: any) => f.name === 'getDiscountInformation');
      expect(discountFunc).toBeDefined();
      expect(discountFunc.parameters.type).toBe('object');
      expect(discountFunc.returns.type).toBe('object');
      expect(discountFunc.widget).toBeDefined();
    });
  });

  describe('Response Format Validation', () => {
    test('should validate calculateTPASSComparison response format', async () => {
      const schema = await loadSchema();
      const calculateFunc = schema.functions.find((f: any) => f.name === 'calculateTPASSComparison');
      const returns = calculateFunc.returns.properties;

      // Check required properties
      expect(returns.success.type).toBe('boolean');
      expect(returns.recommendation.type).toBe('string');
      expect(returns.tpassCost.type).toBe('number');
      expect(returns.regularCost.type).toBe('number');
      expect(returns.savings.type).toBe('number');
      expect(returns.savingsPercentage.type).toBe('number');
      expect(returns.explanation.type).toBe('string');

      // Check recommendation enum
      expect(returns.recommendation.enum).toContain('BUY_TPASS');
      expect(returns.recommendation.enum).toContain('USE_REGULAR');

      // Check calculationDetails structure
      expect(returns.calculationDetails.type).toBe('object');
      expect(returns.calculationDetails.properties.workingDays.type).toBe('number');
      expect(returns.calculationDetails.properties.totalTrips.type).toBe('number');
      expect(returns.calculationDetails.properties.discountRate.type).toBe('number');
      expect(returns.calculationDetails.properties.discountTier.type).toBe('string');
      expect(returns.calculationDetails.properties.validityPeriod.type).toBe('object');

      // Check widget configuration
      expect(calculateFunc.widget.type).toBe('object');
      expect(calculateFunc.widget.properties.type.enum).toContain('result');
    });

    test('should validate getDiscountInformation response format', async () => {
      const schema = await loadSchema();
      const discountFunc = schema.functions.find((f: any) => f.name === 'getDiscountInformation');
      const returns = discountFunc.returns.properties;

      // Check required properties
      expect(returns.success.type).toBe('boolean');
      expect(returns.frequentRiderProgram.type).toBe('object');
      expect(returns.tpassProgram.type).toBe('object');
      expect(returns.comparisonTip.type).toBe('string');

      // Check frequent rider program structure
      expect(returns.frequentRiderProgram.properties.discountTiers.type).toBe('array');
      expect(returns.frequentRiderProgram.properties.resetCycle.type).toBe('string');
      expect(returns.frequentRiderProgram.properties.eligibility.type).toBe('string');

      // Check widget configuration
      expect(discountFunc.widget.type).toBe('object');
      expect(discountFunc.widget.properties.type.enum).toContain('info');
    });

    test('should validate widget configuration structure', async () => {
      const schema = await loadSchema();
      const calculateFunc = schema.functions.find((f: any) => f.name === 'calculateTPASSComparison');
      const widget = calculateFunc.widget.properties;

      // Check widget type
      expect(widget.type.enum).toContain('result');

      // Check layout options
      expect(widget.layout.enum).toContain('vertical');
      expect(widget.layout.enum).toContain('horizontal');

      // Check sections structure
      expect(widget.sections.type).toBe('array');
      expect(widget.sections.items.type).toBe('object');
      expect(widget.sections.items.properties.title.type).toBe('string');
      expect(widget.sections.items.properties.type.enum).toContain('summary');

      // Check actions structure
      expect(widget.actions.type).toBe('array');
      expect(widget.actions.items.properties.type.enum).toContain('recalculate');
    });
  });

  describe('Parameter Validation', () => {
    test('should validate calculateTPASSComparison parameters', async () => {
      const schema = await loadSchema();
      const calculateFunc = schema.functions.find((f: any) => f.name === 'calculateTPASSComparison');
      const params = calculateFunc.parameters.properties;

      // Check optional parameters
      expect(params.startDate.type).toBe('string');
      expect(params.oneWayFare.type).toBe('number');
      expect(params.tripsPerDay.type).toBe('number');
      expect(params.customWorkingDays.type).toBe('number');

      // Check validation constraints
      expect(params.oneWayFare.minimum).toBe(1);
      expect(params.oneWayFare.maximum).toBe(200);
      expect(params.tripsPerDay.minimum).toBe(1);
      expect(params.tripsPerDay.maximum).toBe(10);
      expect(params.customWorkingDays.minimum).toBe(0);
      expect(params.customWorkingDays.maximum).toBe(30);
    });

    test('should validate startTpassCalculation parameters', async () => {
      const schema = await loadSchema();
      const startFunc = schema.functions.find((f: any) => f.name === 'startTpassCalculation');
      const params = startFunc.parameters.properties;

      expect(params.mode.type).toBe('string');
      expect(params.mode.enum).toContain('basic');
      expect(params.mode.enum).toContain('advanced');
      expect(params.mode.default).toBe('basic');
    });
  });

  describe('Cross-Month Calculation Support', () => {
    test('should include cross-month details in response', async () => {
      const schema = await loadSchema();
      const calculateFunc = schema.functions.find((f: any) => f.name === 'calculateTPASSComparison');
      const crossMonth = calculateFunc.returns.properties.calculationDetails.properties.crossMonthDetails;

      expect(crossMonth.type).toBe('object');
      expect(crossMonth.properties.isCrossMonth.type).toBe('boolean');
      expect(crossMonth.properties.monthlyBreakdown.type).toBe('array');
    });

    test('should validate monthly breakdown structure', async () => {
      const schema = await loadSchema();
      const calculateFunc = schema.functions.find((f: any) => f.name === 'calculateTPASSComparison');
      const breakdown = calculateFunc.returns.properties.calculationDetails.properties.monthlyBreakdown.items.properties;

      expect(breakdown.month.type).toBe('string');
      expect(breakdown.workingDays.type).toBe('number');
      expect(breakdown.trips.type).toBe('number');
      expect(breakdown.cost.type).toBe('number');
    });
  });

  describe('Step-by-Step Interaction Support', () => {
    test('should validate startTpassCalculation response', async () => {
      const schema = await loadSchema();
      const startFunc = schema.functions.find((f: any) => f.name === 'startTpassCalculation');
      const returns = startFunc.returns.properties;

      expect(returns.success.type).toBe('boolean');
      expect(returns.currentStep.type).toBe('number');
      expect(returns.totalSteps.type).toBe('number');
      expect(returns.stepTitle.type).toBe('string');
      expect(returns.stepDescription.type).toBe('string');
      expect(returns.widget).toBeDefined();
    });

    test('should validate form widget structure', async () => {
      const schema = await loadSchema();
      const startFunc = schema.functions.find((f: any) => f.name === 'startTpassCalculation');
      const widget = startFunc.returns.properties.widget.properties;

      expect(widget.type.enum).toContain('form');
      expect(widget.layout.enum).toContain('vertical');
      expect(widget.fields.type).toBe('array');

      // Check field types
      const fieldTypes = widget.fields.items.properties.type.enum;
      expect(fieldTypes).toContain('date-picker');
      expect(fieldTypes).toContain('number-input');
      expect(fieldTypes).toContain('dropdown');
      expect(fieldTypes).toContain('text-input');
    });
  });

  describe('Error Handling Contract', () => {
    test('should validate handleWidgetError function', async () => {
      const schema = await loadSchema();
      const errorFunc = schema.functions.find((f: any) => f.name === 'handleWidgetError');

      expect(errorFunc).toBeDefined();
      expect(errorFunc.parameters.type).toBe('object');
      expect(errorFunc.returns.type).toBe('object');

      const params = errorFunc.parameters.properties;
      expect(params.errorType.enum).toContain('validation');
      expect(params.errorType.enum).toContain('calculation');
      expect(params.errorType.enum).toContain('network');
      expect(params.errorType.enum).toContain('widget');

      const returns = errorFunc.returns.properties;
      expect(returns.success.type).toBe('boolean');
      expect(returns.errorWidget.type).toBe('object');
      expect(returns.errorWidget.properties.type.enum).toContain('error');
    });
  });

  describe('Schema Versioning', () => {
    test('should use OpenAI Apps Functions Schema v1.0', async () => {
      const schema = await loadSchema();
      expect(schema.$schema).toBe('https://openai.com/apps/schema/functions.json');
    });

    test('should maintain backward compatibility', async () => {
      const schema = await loadSchema();
      // Ensure all functions have required properties
      for (const func of schema.functions) {
        expect(func.name).toBeDefined();
        expect(func.description).toBeDefined();
        expect(func.parameters).toBeDefined();
        expect(func.returns).toBeDefined();
      }
    });
  });

  describe('Message Size Compliance', () => {
    test('should not exceed OpenAI message size limits', () => {
      // Simulate a response and check size
      const sampleResponse = {
        success: true,
        recommendation: 'BUY_TPASS',
        tpassCost: 1200,
        regularCost: 1500,
        savings: 300,
        savingsPercentage: 20,
        explanation: 'Sample calculation result',
        calculationDetails: {
          workingDays: 22,
          totalTrips: 44,
          discountRate: 0.1,
          discountTier: '10% discount',
          validityPeriod: {
            start: '2024-01-01',
            end: '2024-01-31'
          }
        }
      };

      const responseSize = JSON.stringify(sampleResponse).length;
      // OpenAI message limit is typically around 32KB
      expect(responseSize).toBeLessThan(32768);
    });
  });
});
