/**
 * @file tests/unit/repl/AgentReplOllama.simple.test.js
 * @description Simple test to verify AgentReplOllama can be imported and basic functionality works
 */

import { AgentReplOllama } from '../../../src/repl/AgentReplOllama.js';

describe('AgentReplOllama Simple Test', () => {
  test('should import and instantiate without errors', () => {
    expect(AgentReplOllama).toBeDefined();
    
    const agent = new AgentReplOllama();
    expect(agent).toBeInstanceOf(AgentReplOllama);
  });

  test('should have required methods', () => {
    const agent = new AgentReplOllama();
    
    expect(typeof agent.initialize).toBe('function');
    expect(typeof agent.streamExecution).toBe('function');
    expect(typeof agent.start).toBe('function');
    expect(typeof agent.shutdown).toBe('function');
    expect(typeof agent._initializeTools).toBe('function');
  });

  test('should accept constructor options', () => {
    const options = {
      modelName: 'test-model',
      temperature: 0.5,
      baseUrl: 'http://localhost:11434'
    };
    
    const agent = new AgentReplOllama(options);
    
    expect(agent.modelName).toBe('test-model');
    expect(agent.temperature).toBe(0.5);
    expect(agent.baseUrl).toBe('http://localhost:11434');
  });
});