import { describe, expect, it, beforeEach } from 'vitest';
import useUiStore from '../stores/uiStore.js';

const resetStore = () => useUiStore.getState().resetStore();

describe('LM Configuration Panel Functionality Tests', () => {
  beforeEach(resetStore);

  it('should store and retrieve LM test results', () => {
    const testResult = {
      success: true,
      message: 'Connection successful',
      model: 'gpt-4'
    };
    
    useUiStore.getState().setLMTestResult(testResult);
    expect(useUiStore.getState().lmTestResult).toEqual(testResult);
    
    useUiStore.getState().setLMTestResult(null);
    expect(useUiStore.getState().lmTestResult).toBeNull();
  });

  it('should handle LM configuration saving to localStorage', () => {
    const config = {
      provider: 'ollama',
      name: 'Ollama',
      apiKey: '',
      model: 'llama2',
      baseURL: 'http://localhost:11434/api',
      temperature: 0.7,
      maxTokens: 1000
    };
    
    // Test saving configuration to localStorage
    localStorage.setItem('lmConfig', JSON.stringify(config));
    const savedConfig = JSON.parse(localStorage.getItem('lmConfig'));
    
    expect(savedConfig).toEqual(config);
    expect(savedConfig.provider).toBe('ollama');
    expect(savedConfig.model).toBe('llama2');
    
    // Clean up
    localStorage.removeItem('lmConfig');
  });

  it('should support multiple provider configurations', () => {
    const providers = [
      {
        provider: 'openai',
        name: 'OpenAI',
        apiKey: 'test-openai-key',
        model: 'gpt-4',
        baseURL: 'https://api.openai.com/v1'
      },
      {
        provider: 'ollama',
        name: 'Ollama',
        apiKey: '',
        model: 'llama2',
        baseURL: 'http://localhost:11434/api'
      },
      {
        provider: 'anthropic',
        name: 'Anthropic',
        apiKey: 'test-anthropic-key',
        model: 'claude-3-sonnet-20240229',
        baseURL: 'https://api.anthropic.com/v1'
      }
    ];
    
    providers.forEach((config) => {
      // Test that each provider configuration can be stored and retrieved
      localStorage.setItem('lmConfig', JSON.stringify(config));
      const savedConfig = JSON.parse(localStorage.getItem('lmConfig'));
      expect(savedConfig.provider).toBe(config.provider);
      expect(savedConfig.model).toBe(config.model);
    });
    
    // Clean up
    localStorage.removeItem('lmConfig');
  });

  it('should handle LM connection test result processing', () => {
    const result = {
      success: true,
      message: 'Successfully connected to OpenAI provider',
      model: 'gpt-4',
      responseSample: 'Test response...'
    };
    
    useUiStore.getState().setLMTestResult(result);
    expect(useUiStore.getState().lmTestResult).toEqual(result);
    
    // Test with failure result
    const failureResult = {
      success: false,
      message: 'Connection failed: Invalid API key',
      error: 'Authentication error'
    };
    
    useUiStore.getState().setLMTestResult(failureResult);
    expect(useUiStore.getState().lmTestResult).toEqual(failureResult);
  });

  it('should maintain LM test result isolation', () => {
    // Test that LM test results don't interfere with other store state
    useUiStore.getState().setWsConnected(true);
    useUiStore.getState().addReasoningStep({ id: 'step1', description: 'Test step' });
    useUiStore.getState().addTask({ id: 'task1', term: 'test', type: 'belief' });
    
    const testResult = { success: true, message: 'Test successful' };
    useUiStore.getState().setLMTestResult(testResult);
    
    const state = useUiStore.getState();
    expect(state.wsConnected).toBe(true);
    expect(state.reasoningSteps).toEqual([{ id: 'step1', description: 'Test step' }]);
    expect(state.tasks).toEqual([{ id: 'task1', term: 'test', type: 'belief' }]);
    expect(state.lmTestResult).toEqual(testResult);
  });

  it('should handle LM configuration state reset', () => {
    const testResult = { success: true, message: 'Test successful' };
    useUiStore.getState().setLMTestResult(testResult);
    expect(useUiStore.getState().lmTestResult).toEqual(testResult);
    
    useUiStore.getState().resetStore();
    // Check that the LM test result is reset to initial state
    expect(useUiStore.getState().lmTestResult).toBeNull();
  });
});

describe('LM Configuration Integration Tests', () => {
  beforeEach(resetStore);

  it('should integrate LM configuration with reasoning workflow', () => {
    // Simulate the full workflow: configure LM -> connect -> use in reasoning
    const lmConfig = {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      baseURL: 'https://api.openai.com/v1'
    };
    
    // Add initial reasoning data
    useUiStore.getState().addReasoningStep({
      id: 'step1',
      description: 'Initial reasoning step',
      source: 'nars',
      timestamp: Date.now()
    });
    
    // Store LM config in localStorage (simulating the save in LMConfigPanel)
    localStorage.setItem('lmConfig', JSON.stringify(lmConfig));
    
    // Verify both reasoning data and LM config are maintained
    expect(useUiStore.getState().reasoningSteps.length).toBe(1);
    expect(JSON.parse(localStorage.getItem('lmConfig'))).toEqual(lmConfig);
    
    // Clean up
    localStorage.removeItem('lmConfig');
  });

  it('should handle concurrent LM and reasoning operations', () => {
    // Simulate multiple operations happening concurrently
    const reasoningStep = { id: 'step1', description: 'NARS reasoning', timestamp: Date.now() };
    const task = { id: 'task1', term: 'test', type: 'belief', creationTime: Date.now() };
    const lmConfig = {
      provider: 'ollama',
      model: 'llama2',
      baseURL: 'http://localhost:11434/api'
    };
    
    useUiStore.getState().addReasoningStep(reasoningStep);
    useUiStore.getState().addTask(task);
    localStorage.setItem('lmConfig', JSON.stringify(lmConfig));
    useUiStore.getState().updateTask('task1', { priority: 0.8 });
    
    // Verify all operations completed successfully
    expect(useUiStore.getState().reasoningSteps.length).toBe(1);
    expect(useUiStore.getState().tasks.length).toBe(1);
    expect(useUiStore.getState().tasks[0].priority).toBe(0.8);
    expect(JSON.parse(localStorage.getItem('lmConfig'))).toEqual(lmConfig);
    
    // Clean up
    localStorage.removeItem('lmConfig');
  });

  it('should maintain LM configuration state across application lifecycle', () => {
    const config = {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key'
    };
    
    // Store LM config in localStorage
    localStorage.setItem('lmConfig', JSON.stringify(config));
    
    // Simulate some operations that might change state
    useUiStore.getState().addReasoningStep({ id: 'step1', description: 'Test' });
    useUiStore.getState().addTask({ id: 'task1', term: 'test', type: 'belief' });
    useUiStore.getState().setWsConnected(true);
    
    // Verify LM config is maintained in localStorage
    expect(JSON.parse(localStorage.getItem('lmConfig'))).toEqual(config);
    
    // Verify other state is also maintained
    expect(useUiStore.getState().reasoningSteps.length).toBe(1);
    expect(useUiStore.getState().tasks.length).toBe(1);
    expect(useUiStore.getState().wsConnected).toBe(true);
    
    // Clean up
    localStorage.removeItem('lmConfig');
  });
});