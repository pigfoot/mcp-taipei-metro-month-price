/**
 * Integration tests for User-Agent detection accuracy
 * Validates 100% success rate for protocol detection
 */

import { describe, test, expect } from 'bun:test';
import { detectUserAgent, getUserAgentContext, type UserAgentInfo } from '../../../src/lib/userAgentDetection.js';

describe('User-Agent Detection Integration', () => {
  describe('OpenAI Apps Detection', () => {
    test('should detect openai-mcp/1.0.0 format', () => {
      const result = detectUserAgent('openai-mcp/1.0.0');
      expect(result.isOpenAI).toBe(true);
      expect(result.clientType).toBe('openai-apps');
      expect(result.openAIVersion).toBe('1.0.0');
      expect(result.confidence).toBe('high');
    });

    test('should detect openai-mcp/2.1.0 format', () => {
      const result = detectUserAgent('openai-mcp/2.1.0');
      expect(result.isOpenAI).toBe(true);
      expect(result.clientType).toBe('openai-apps');
      expect(result.openAIVersion).toBe('2.1.0');
      expect(result.confidence).toBe('high');
    });

    test('should handle OpenAI MCP with different cases', () => {
      const formats = [
        'OpenAI-MCP/1.0.0',
        'OPENAI-MCP/1.0.0',
        'OpenAi-Mcp/1.0.0',
      ];

      for (const format of formats) {
        const result = detectUserAgent(format);
        expect(result.isOpenAI).toBe(true);
        expect(result.clientType).toBe('openai-apps');
      }
    });

    test('should detect general OpenAI patterns', () => {
      const result = detectUserAgent('ChatGPT/1.0 (OpenAI-MCP compatible)');
      expect(result.isOpenAI).toBe(true);
      expect(result.clientType).toBe('openai-apps');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('MCP Protocol Detection', () => {
    test('should default to MCP when User-Agent is missing', () => {
      const result = detectUserAgent(undefined);
      expect(result.isOpenAI).toBe(false);
      expect(result.clientType).toBe('mcp');
      expect(result.confidence).toBe('high');
    });

    test('should detect MCP client patterns', () => {
      const mcpClients = [
        'mcp-client/1.0.0',
        'Model-Context-Protocol/2.0',
        'claude-code/1.0',
        'anthropic/1.0',
      ];

      for (const client of mcpClients) {
        const result = detectUserAgent(client);
        expect(result.isOpenAI).toBe(false);
        expect(result.clientType).toBe('mcp');
      }
    });

    test('should default to MCP for unknown User-Agents', () => {
      const result = detectUserAgent('MyApp/1.0.0');
      expect(result.isOpenAI).toBe(false);
      expect(result.clientType).toBe('mcp');
      expect(result.confidence).toBe('low');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty User-Agent gracefully', () => {
      const result = detectUserAgent('');
      expect(result.clientType).toBe('mcp');
      expect(result.isValid).toBe(true);
    });

    test('should handle whitespace-only User-Agent', () => {
      const result = detectUserAgent('   ');
      expect(result.clientType).toBe('mcp');
      expect(result.isValid).toBe(true);
    });

    test('should handle very long User-Agent', () => {
      const longUA = 'a'.repeat(2100); // Over 2048 character limit
      const result = detectUserAgent(longUA);
      expect(result.clientType).toBe('mcp');
      expect(result.isValid).toBe(false);
    });

    test('should handle OpenAI version with different format', () => {
      const result = detectUserAgent('openai-mcp/2.1.0');
      expect(result.isOpenAI).toBe(true);
      expect(result.openAIVersion).toBe('2.1.0');
    });
  });

  describe('Validation Context', () => {
    test('should provide validation context', () => {
      const context = getUserAgentContext('openai-mcp/1.0.0');
      expect(context.detected.isOpenAI).toBe(true);
      expect(context.validation.isValid).toBe(true);
      expect(context.shouldLog).toBe(false);
    });

    test('should flag low confidence for logging', () => {
      const context = getUserAgentContext('UnknownApp/1.0');
      expect(context.detected.confidence).toBe('low');
      expect(context.shouldLog).toBe(true);
    });

    test('should flag validation issues for logging', () => {
      const context = getUserAgentContext('<script>alert(1)</script>');
      expect(context.validation.issues.length).toBeGreaterThan(0);
      expect(context.shouldLog).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    test('should complete detection quickly', () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        detectUserAgent('openai-mcp/1.0.0');
      }

      const duration = Date.now() - start;
      const avgTimePerDetection = duration / iterations;

      expect(avgTimePerDetection).toBeLessThan(1); // Less than 1ms per detection
    });

    test('should handle high-frequency requests', () => {
      const requests = Array(100).fill(null).map((_, i) => `openai-mcp/1.${i % 10}`);
      const results = requests.map(ua => detectUserAgent(ua));

      expect(results.length).toBe(100);
      expect(results.every(r => r.clientType === 'openai-apps')).toBe(true);
    });
  });

  describe('Accuracy Measurement', () => {
    test('should achieve 100% accuracy on test corpus', () => {
      const testCases = [
        // OpenAI Apps cases
        { ua: 'openai-mcp/1.0.0', expected: 'openai-apps' },
        { ua: 'OpenAI-MCP/2.1.0', expected: 'openai-apps' },
        { ua: 'ChatGPT/OpenAI-MCP', expected: 'openai-apps' },

        // MCP cases
        { ua: 'mcp-client/1.0', expected: 'mcp' },
        { ua: 'Model-Context-Protocol', expected: 'mcp' },
        { ua: 'claude-code', expected: 'mcp' },
        { ua: 'UnknownApp', expected: 'mcp' },
        { ua: undefined, expected: 'mcp' },
        { ua: '', expected: 'mcp' },
      ];

      let correctDetections = 0;
      const totalCases = testCases.length;

      for (const testCase of testCases) {
        const result = detectUserAgent(testCase.ua);
        if (result.clientType === testCase.expected) {
          correctDetections++;
        }
      }

      const accuracyRate = correctDetections / totalCases;
      expect(accuracyRate).toBe(1.0); // 100% accuracy
    });
  });
});
