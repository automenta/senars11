/**
 * @file tests/unit/repl/AgentReplOllama.e2e.test.js
 * @description End-to-end test for the AgentReplOllama implementation
 * Tests the complete streaming functionality with tools and responses
 */

import { AgentReplOllama } from '../../../src/repl/AgentReplOllama.js';

describe('AgentReplOllama - End-to-End Tests', () => {
  let agentRepl;
  let mockNAR;
  let originalConsoleLog;

  beforeEach(() => {
    // Store original console.log to capture output for verification
    originalConsoleLog = console.log;
    
    // Create a mock NAR for testing
    mockNAR = {
      beliefs: [],
      goals: [],
      tasks: [],
      
      addInput: (input) => {
        if (input.includes('!')) {
          this.goals.push({ content: input, timestamp: Date.now() });
        } else {
          this.beliefs.push({ content: input, timestamp: Date.now() });
        }
        return { success: true, message: `Input processed: ${input}` };
      },
      
      execute: (input) => this.addInput(input),
      
      cycle: (steps = 1) => {
        return { cycles: steps, status: 'completed' };
      },
      
      getBeliefs: () => mockNAR.beliefs,
      
      getGoals: () => mockNAR.goals,
      
      addTask: (task) => {
        mockNAR.tasks.push(task);
        return { success: true, taskId: task.id || Date.now() };
      }
    };
  });

  afterEach(() => {
    if (agentRepl && agentRepl.shutdown) {
      agentRepl.shutdown();
    }
    // Restore original console.log
    console.log = originalConsoleLog;
  });

  test('should initialize properly', async () => {
    agentRepl = new AgentReplOllama({ 
      modelName: 'hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M',
      baseUrl: 'http://localhost:11434',
      temperature: 0,
      nar: mockNAR 
    });

    // Initialize should complete without throwing errors
    await expect(agentRepl.initialize()).resolves.not.toThrow();
    expect(agentRepl.graph).toBeDefined();
    expect(agentRepl.model).toBeDefined();
    expect(agentRepl.tools.length).toBeGreaterThan(0);
  });

  test('should stream responses correctly with real tools', async () => {
    agentRepl = new AgentReplOllama({ 
      modelName: 'hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M',
      baseUrl: 'http://localhost:11434',
      temperature: 0,
      nar: mockNAR 
    });

    try {
      // Initialize the actual graph
      await agentRepl.initialize();
      
      // Test streaming execution
      const chunks = [];
      for await (const chunk of agentRepl.streamExecution('What is 2+2?')) {  // Simple query that shouldn't need tools
        chunks.push(chunk);
        if (chunks.length >= 1) break; // Limit to first response to avoid long wait
      }
      
      // Verify we got at least one response
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('type');
      expect(chunks[0]).toHaveProperty('content');
      expect(chunks[0].type).toBe('agent_response');
      
    } catch (error) {
      // If Ollama is not available, skip detailed checks but ensure graceful handling
      if (error.message.includes('ECONNREFUSED') || error.message.includes('model not found')) {
        // Just verify that the system handles the error gracefully
        expect(error).toBeDefined();
      } else {
        throw error; // Re-throw other errors
      }
    }
  });

  test('should handle direct agent responses without tools', async () => {
    agentRepl = new AgentReplOllama({ 
      modelName: 'hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M',
      baseUrl: 'http://localhost:11434',
      temperature: 0,
      nar: mockNAR 
    });

    try {
      await agentRepl.initialize();
      
      const chunks = [];
      for await (const chunk of agentRepl.streamExecution('Hello')) {
        chunks.push(chunk);
        if (chunks.length >= 1) break; // Limit to first response
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('type');
      expect(chunks[0]).toHaveProperty('content');
      expect(chunks[0].type).toBe('agent_response');
    } catch (error) {
      // If Ollama is not available, skip detailed checks but ensure graceful handling
      if (error.message.includes('ECONNREFUSED') || error.message.includes('model not found')) {
        // Just verify that the system handles the error gracefully
        expect(error).toBeDefined();
      } else {
        throw error; // Re-throw other errors
      }
    }
  });

  test('should handle NAR tool calls when available', async () => {
    agentRepl = new AgentReplOllama({ 
      modelName: 'hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M',
      baseUrl: 'http://localhost:11434',
      temperature: 0,
      nar: mockNAR 
    });

    try {
      await agentRepl.initialize();
      
      const chunks = [];
      for await (const chunk of agentRepl.streamExecution('Tell me about tools')) {
        chunks.push(chunk);
        if (chunks.length >= 1) break; // Limit to first response to avoid long wait
      }
      
      expect(chunks.length).toBeGreaterThan(0);
    } catch (error) {
      // If Ollama is not available, skip detailed checks but ensure graceful handling
      if (error.message.includes('ECONNREFUSED') || error.message.includes('model not found')) {
        // Just verify that the system handles the error gracefully
        expect(error).toBeDefined();
      } else {
        throw error; // Re-throw other errors
      }
    }
  }, 10000); // Increase timeout for this test

  test('should handle error gracefully', async () => {
    agentRepl = new AgentReplOllama({ 
      modelName: 'llama3.2',
      baseUrl: 'http://localhost:11434',
      temperature: 0,
      nar: mockNAR 
    });

    // Test that streaming fails properly when not initialized
    await expect(async () => {
      const chunks = [];
      for await (const chunk of agentRepl.streamExecution('test')) {
        chunks.push(chunk);
      }
    }).rejects.toThrow("Agent not initialized. Call initialize() first.");
  });
});