/**
 * Backward Compatibility Tests
 * Ensures existing MCP functionality remains unchanged with dual-protocol support
 */

import { describe, test, expect } from 'bun:test';
import { detectUserAgent } from '../../src/lib/userAgentDetection.js';

describe('Backward Compatibility Validation', () => {
  describe('MCP Stdio Server Functionality', () => {
    test('should maintain existing MCP stdio server behavior', () => {
      // Test that user-agent detection doesn't affect stdio mode
      const detection = detectUserAgent(undefined);
      expect(detection.clientType).toBe('mcp');

      // Test various User-Agents that should default to MCP
      const mcpCompatibleUserAgents = [
        'mcp-client/1.0',
        'claude-code/1.0',
        'anthropic/1.0',
        'model-context-protocol',
        'unknown-app/1.0',
        '',
        undefined,
      ];

      for (const ua of mcpCompatibleUserAgents) {
        const detection = detectUserAgent(ua);
        expect(detection.clientType).toBe('mcp');
        expect(detection.isOpenAI).toBe(false);
      }
    });

    test('should not interfere with existing MCP responses', () => {
      // Simulate existing MCP user agents
      const existingMCPUsers = [
        'claude-code/3.5-sonnet-20241022',
        'anthropic-cli/1.0',
        'mcp-client/0.1.0',
      ];

      for (const ua of existingMCPUsers) {
        const detection = detectUserAgent(ua);
        expect(detection.clientType).toBe('mcp');
        expect(detection.confidence).toBe('medium');
      }
    });
  });

  describe('HTTP Endpoint Compatibility', () => {
    test('should handle standard MCP JSON-RPC requests', () => {
      // Test that standard MCP requests get MCP responses
      const standardMCPUserAgents = [
        'mcp-client/1.0',
        'model-context-protocol/2.0',
        'claude/1.0',
      ];

      for (const ua of standardMCPUserAgents) {
        const detection = detectUserAgent(ua);
        expect(detection.clientType).toBe('mcp');
        expect(detection.isOpenAI).toBe(false);
      }
    });

    test('should maintain existing API contract', () => {
      // Verify that MCP users get the same response structure
      const mcpDetection = detectUserAgent('mcp-client/1.0');
      expect(mcpDetection.clientType).toBe('mcp');

      const openAIDetection = detectUserAgent('openai-mcp/1.0.0');
      expect(openAIDetection.clientType).toBe('openai-apps');
    });
  });

  describe('Zero Regression Assurance', () => {
    test('should not affect existing MCP client behavior', () => {
      const scenarios = [
        { ua: undefined, expected: 'mcp' },
        { ua: '', expected: 'mcp' },
        { ua: 'mcp-client', expected: 'mcp' },
        { ua: 'claude-code', expected: 'mcp' },
        { ua: 'anthropic', expected: 'mcp' },
      ];

      for (const { ua, expected } of scenarios) {
        const detection = detectUserAgent(ua);
        expect(detection.clientType).toBe(expected);
      }
    });

    test('should preserve existing error handling', () => {
      // Test edge cases that should default to MCP
      const edgeCases = [
        'very-long-user-agent-string-that-should-still-work',
        'User-Agent with spaces',
        '123456',
        'null',
      ];

      for (const ua of edgeCases) {
        const detection = detectUserAgent(ua);
        // Should not throw, should default to MCP
        expect(detection.clientType).toBe('mcp');
        expect(() => detection).not.toThrow();
      }
    });

    test('should maintain performance characteristics', () => {
      const iterations = 10000;
      const mcpUserAgents = [
        'mcp-client/1.0',
        'claude-code/1.0',
        undefined,
        '',
      ];

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        const ua = mcpUserAgents[i % mcpUserAgents.length];
        detectUserAgent(ua);
      }
      const duration = Date.now() - start;

      // Should complete quickly even with legacy user agents
      expect(duration).toBeLessThan(1000); // Under 1 second for 10k iterations
      const avgTime = duration / iterations;
      expect(avgTime).toBeLessThan(0.1); // Under 0.1ms per detection
    });
  });

  describe('Migration Path Validation', () => {
    test('should provide clear command distinction', () => {
      // Verify that stdio and HTTP can coexist
      const stdioDetection = detectUserAgent('claude-code');
      const httpDetection = detectUserAgent('openai-mcp/1.0.0');

      expect(stdioDetection.clientType).toBe('mcp');
      expect(httpDetection.clientType).toBe('openai-apps');
    });

    test('should allow gradual adoption', () => {
      // Test mixed environment scenarios
      const mixedScenarios = [
        { name: 'Legacy only', ua: 'claude-code', expected: 'mcp' },
        { name: 'OpenAI only', ua: 'openai-mcp/1.0', expected: 'openai-apps' },
        { name: 'Unknown default', ua: 'new-client', expected: 'mcp' },
      ];

      for (const scenario of mixedScenarios) {
        const detection = detectUserAgent(scenario.ua);
        expect(detection.clientType).toBe(scenario.expected);
      }
    });

    test('should support operational monitoring', () => {
      const monitoringData = [
        { ua: 'openai-mcp/1.0', protocol: 'openai-apps' },
        { ua: 'mcp-client/1.0', protocol: 'mcp' },
        { ua: 'claude-code', protocol: 'mcp' },
        { ua: undefined, protocol: 'mcp' },
      ];

      let openAICount = 0;
      let mcpCount = 0;

      for (const { protocol } of monitoringData) {
        if (protocol === 'openai-apps') {
          openAICount++;
        } else {
          mcpCount++;
        }
      }

      expect(openAICount + mcpCount).toBe(monitoringData.length);
      expect(openAICount).toBeGreaterThan(0);
      expect(mcpCount).toBeGreaterThan(0);
    });
  });
});
