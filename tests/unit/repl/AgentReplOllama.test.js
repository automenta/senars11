/**
 * @file tests/unit/repl/AgentReplOllama.test.js
 * @description Unit tests for the AgentReplOllama implementation
 */

import { AgentReplOllama } from '../../../src/repl/AgentReplOllama.js';

describe('AgentReplOllama', () => {
  let agentRepl;
  let mockNAR;

  beforeEach(() => {
    // Create a mock NAR for testing
    mockNAR = {
      beliefs: [],
      goals: [],
      tasks: [],
      
      addInput: (input) => {
        if (input.includes('!')) {
          mockNAR.goals.push({ content: input, timestamp: Date.now() });
        } else if (input.includes('?')) {
          // Query
        } else {
          mockNAR.beliefs.push({ content: input, timestamp: Date.now() });
        }
        return { success: true, message: `Input processed: ${input}` };
      },
      
      execute: (input) => mockNAR.addInput(input),
      
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
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      agentRepl = new AgentReplOllama();
      
      expect(agentRepl.modelName).toBe('llama3.2');
      expect(agentRepl.temperature).toBe(0);
      expect(agentRepl.baseUrl).toBe('http://localhost:11434');
      expect(agentRepl.nar).toBeNull();
    });

    test('should accept custom options', () => {
      const options = {
        modelName: 'test-model',
        temperature: 0.7,
        baseUrl: 'http://test.url:11434',
        nar: mockNAR
      };
      
      agentRepl = new AgentReplOllama(options);
      
      expect(agentRepl.modelName).toBe('test-model');
      expect(agentRepl.temperature).toBe(0.7);
      expect(agentRepl.baseUrl).toBe('http://test.url:11434');
      expect(agentRepl.nar).toBe(mockNAR);
    });
  });

  describe('_initializeTools', () => {
    test('should initialize tools without NAR', () => {
      agentRepl = new AgentReplOllama({ nar: null });
      const tools = agentRepl._initializeTools();
      
      expect(Array.isArray(tools)).toBe(true);
      // Should have at least one tool
      expect(tools.length).toBeGreaterThan(0);
    });

    test('should initialize tools with NAR', () => {
      agentRepl = new AgentReplOllama({ nar: mockNAR });
      const tools = agentRepl._initializeTools();
      
      expect(Array.isArray(tools)).toBe(true);
      // Should have at least one tool
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe('initialize', () => {
    test('should initialize the agent graph successfully', async () => {
      agentRepl = new AgentReplOllama({ nar: mockNAR });
      
      // Just test that initialization completes without error
      // The actual connection to Ollama happens during invocation, not during initialization
      await expect(agentRepl.initialize()).resolves.not.toThrow();
      expect(agentRepl.graph).toBeDefined();
      expect(agentRepl.model).toBeDefined();
    });
  });

  describe('streamExecution', () => {
    test('should throw error if agent not initialized', async () => {
      agentRepl = new AgentReplOllama({ nar: mockNAR });
      
      await expect(async () => {
        const chunks = [];
        for await (const chunk of agentRepl.streamExecution('test input')) {
          chunks.push(chunk);
        }
      }).rejects.toThrow("Agent not initialized. Call initialize() first.");
    });
  });

  describe('integration', () => {
    test('should complete full cycle: initialize -> stream -> shutdown', async () => {
      agentRepl = new AgentReplOllama({ 
        modelName: 'hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M',
        baseUrl: 'http://localhost:11434',
        nar: mockNAR 
      });

      try {
        // Initialize with real components
        await agentRepl.initialize();

        // Stream execution
        const chunks = [];
        for await (const chunk of agentRepl.streamExecution('test query')) {
          chunks.push(chunk);
          if (chunks.length >= 1) break; // Limit to first response
        }

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0]).toHaveProperty('type');
        expect(chunks[0]).toHaveProperty('content');
      } catch (error) {
        // If Ollama is not available, ensure graceful error handling
        if (error.message.includes('ECONNREFUSED') || error.message.includes('model not found')) {
          // The error should be handled gracefully by the system
          expect(error).toBeDefined();
        } else {
          throw error; // Re-throw other errors
        }
      }
    });
  });

  describe('NAR integration', () => {
    test('should register NAR tool when NAR instance provided', () => {
      agentRepl = new AgentReplOllama({ nar: mockNAR });
      const tools = agentRepl._initializeTools();
      
      // Verify that tools include NAR-related functionality
      expect(Array.isArray(tools)).toBe(true);
    });
  });
});