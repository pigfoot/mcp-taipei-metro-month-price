/**
 * User Story 1 Acceptance Criteria Validation
 * Tests OpenAI App request detection and basic widget support
 */

import { describe, test, expect } from 'bun:test';
import { detectUserAgent } from '../../../src/lib/userAgentDetection.js';
import { createResponseFormatter } from '../../../src/lib/responseFormatter.js';
import { handleOpenAIFunctionCall } from '../../../src/adapters/openai/app.js';

describe('User Story 1 Acceptance Criteria', () => {
  describe('T037: OpenAI App request detection', () => {
    test('should detect various User-Agent formats correctly', () => {
      const testCases = [
        'openai-mcp/1.0.0',
        'OpenAI-MCP/2.1.0',
        'ChatGPT/OpenAI-MCP',
        'openai-mcp/1.5.2-beta',
      ];

      for (const userAgent of testCases) {
        const detection = detectUserAgent(userAgent);
        expect(detection.isOpenAI).toBe(true);
        expect(detection.clientType).toBe('openai-apps');
      }
    });

    test('should handle edge cases gracefully', () => {
      const edgeCases = [
        undefined,
        '',
        'unknown-client/1.0',
        'mcp-client/2.0',
      ];

      for (const userAgent of edgeCases) {
        const detection = detectUserAgent(userAgent);
        expect(detection.clientType).toBe('mcp');
        expect(detection.isValid).toBe(true);
      }
    });

    test('should achieve 100% detection accuracy', () => {
      const corpus = [
        { ua: 'openai-mcp/1.0.0', expected: 'openai-apps' },
        { ua: 'mcp-client/1.0', expected: 'mcp' },
        { ua: undefined, expected: 'mcp' },
        { ua: 'claude-code/1.0', expected: 'mcp' },
      ];

      let correctCount = 0;
      for (const { ua, expected } of corpus) {
        const result = detectUserAgent(ua);
        if (result.clientType === expected) {
          correctCount++;
        }
      }

      const accuracy = correctCount / corpus.length;
      expect(accuracy).toBe(1.0);
    });
  });

  describe('T038: MCP protocol backward compatibility', () => {
    test('should maintain MCP protocol responses unchanged', () => {
      const mcpFormatter = createResponseFormatter('mcp');
      const testData = {
        recommendation: 'BUY_TPASS' as const,
        tpassCost: 1200,
        regularCost: 1500,
        savings: 300,
        savingsPercentage: 20,
        explanation: 'Test explanation',
      };

      const response = mcpFormatter.formatSuccess(testData);

      // Verify MCP format structure
      expect(response).toHaveProperty('jsonrpc');
      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('result');

      // Verify no widget-specific fields in MCP response
      expect(response.result).not.toHaveProperty('widget');
      expect(response.result).not.toHaveProperty('widgetConfig');
    });

    test('should handle MCP error responses', () => {
      const mcpFormatter = createResponseFormatter('mcp');
      const error = {
        code: -32600,
        message: 'Invalid Request',
        data: 'Test error data',
      };

      const response = mcpFormatter.formatError(error);

      expect(response).toHaveProperty('jsonrpc', '2.0');
      expect(response).toHaveProperty('error');
      expect(response.error.code).toBe(-32600);
      expect(response.error.message).toBe('Invalid Request');
    });
  });

  describe('T039: OpenAI function call processing', () => {
    test('should process calculateTPASSComparison function call', async () => {
      const functionCall = {
        name: 'calculateTPASSComparison',
        arguments: JSON.stringify({
          startDate: '2024-01-01',
          oneWayFare: 40,
          tripsPerDay: 2,
        }),
      };

      const result = await handleOpenAIFunctionCall(functionCall);

      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('tpassCost');
      expect(result).toHaveProperty('regularCost');
      expect(result).toHaveProperty('savings');
      expect(result).toHaveProperty('explanation');
    });

    test('should process getDiscountInformation function call', async () => {
      const functionCall = {
        name: 'getDiscountInformation',
        arguments: '{}',
      };

      const result = await handleOpenAIFunctionCall(functionCall);

      expect(result).toHaveProperty('frequentRiderProgram');
      expect(result).toHaveProperty('tpassProgram');
      expect(result).toHaveProperty('comparisonTip');
    });

    test('should handle unknown function calls', async () => {
      const functionCall = {
        name: 'unknownFunction',
        arguments: '{}',
      };

      await expect(handleOpenAIFunctionCall(functionCall))
        .rejects
        .toThrow('Unknown function: unknownFunction');
    });
  });

  describe('T040: Missing/malformed User-Agent fallback', () => {
    test('should default to MCP when User-Agent is missing', () => {
      const detection = detectUserAgent(undefined);
      expect(detection.clientType).toBe('mcp');
      expect(detection.isOpenAI).toBe(false);
    });

    test('should handle malformed User-Agent safely', () => {
      const malformedUAs = [
        'invalid-ua',
        '   ',
        'a'.repeat(600), // Too long
        '<script>alert(1)</script>', // Potentially malicious
      ];

      for (const ua of malformedUAs) {
        const detection = detectUserAgent(ua);
        expect(detection.clientType).toBe('mcp');
        expect(detection.isValid).toBe(true);
      }
    });

    test('should use MCP response formatter when no OpenAI detection', () => {
      const formatter = createResponseFormatter('mcp');
      const testData = {
        recommendation: 'USE_REGULAR' as const,
        tpassCost: 1200,
        regularCost: 800,
        savings: -400,
        savingsPercentage: -33.33,
        explanation: 'Regular fare is cheaper',
      };

      const response = formatter.formatSuccess(testData);

      // Should generate MCP-compliant response
      expect(response).toHaveProperty('jsonrpc', '2.0');
      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('result');
    });

    test('should achieve graceful degradation for all fallback scenarios', () => {
      const fallbackScenarios = [
        undefined,
        '',
        'malformed',
        'unknown-client/1.0',
      ];

      for (const scenario of fallbackScenarios) {
        const detection = detectUserAgent(scenario);
        const formatter = createResponseFormatter(detection.clientType);

        // Should not throw errors
        expect(() => formatter.formatSuccess({
          recommendation: 'BUY_TPASS',
          tpassCost: 1200,
          regularCost: 1500,
          savings: 300,
          savingsPercentage: 20,
          explanation: 'Test',
        })).not.toThrow();

        // Should provide valid response
        const response = formatter.formatSuccess({
          recommendation: 'BUY_TPASS',
          tpassCost: 1200,
          regularCost: 1500,
          savings: 300,
          savingsPercentage: 20,
          explanation: 'Test',
        });

        expect(response).toBeDefined();
        expect(response).not.toBeNull();
      }
    });
  });

  describe('Performance Requirements', () => {
    test('should complete user-agent detection under 10ms', () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        detectUserAgent('openai-mcp/1.0.0');
      }

      const totalTime = Date.now() - start;
      const avgTimePerDetection = totalTime / iterations;

      expect(avgTimePerDetection).toBeLessThan(10);
    });

    test('should complete basic calculation under 3 seconds', async () => {
      const functionCall = {
        name: 'calculateTPASSComparison',
        arguments: JSON.stringify({
          oneWayFare: 40,
          tripsPerDay: 2,
        }),
      };

      const start = Date.now();
      await handleOpenAIFunctionCall(functionCall);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(3000);
    });
  });
});
