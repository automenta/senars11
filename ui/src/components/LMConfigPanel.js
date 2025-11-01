import React, { useState, useEffect, useCallback } from 'react';
import useUiStore from '../stores/uiStore.js';
import { GenericInputField, GenericSelectField, Button, Card } from './GenericComponents.js';

// Default configuration options for different LLM providers
const DEFAULT_PROVIDER_CONFIGS = {
  openai: {
    name: 'OpenAI',
    apiKey: '',
    model: 'gpt-4',
    baseURL: 'https://api.openai.com/v1',
    temperature: 0.7,
    maxTokens: 1000
  },
  ollama: {
    name: 'Ollama',
    apiKey: '', // Ollama doesn't require API key but we keep the field for UI consistency
    model: 'llama2',
    baseURL: 'http://localhost:11434/api',
    temperature: 0.7,
    maxTokens: 1000
  },
  anthropic: {
    name: 'Anthropic',
    apiKey: '',
    model: 'claude-3-sonnet-20240229',
    baseURL: 'https://api.anthropic.com/v1',
    temperature: 0.7,
    maxTokens: 1000
  }
};

const LMConfigPanel = () => {
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [config, setConfig] = useState(() => ({...DEFAULT_PROVIDER_CONFIGS.openai}));
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const wsService = useUiStore(state => state.wsService);
  const lmTestResult = useUiStore(state => state.lmTestResult);

  // Load saved configuration if available
  useEffect(() => {
    const savedConfig = localStorage.getItem('lmConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        setSelectedProvider(parsedConfig.provider || 'openai');
      } catch (error) {
        console.error('Error loading saved LM config:', error);
      }
    }
  }, []);

  // Update config when selected provider changes
  useEffect(() => {
    const defaultConfig = DEFAULT_PROVIDER_CONFIGS[selectedProvider] || DEFAULT_PROVIDER_CONFIGS.openai;
    setConfig(prev => ({ ...defaultConfig, provider: selectedProvider, ...prev }));
  }, [selectedProvider]);

  // Handle test result from the store
  useEffect(() => {
    if (lmTestResult) {
      setTestResult(lmTestResult);
      setIsTesting(false);
      // Clear the test result from store to avoid showing it again
      useUiStore.getState().setLMTestResult(null);
    }
  }, [lmTestResult]);

  const handleInputChange = useCallback((field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveConfig = useCallback(() => {
    const configToSave = { ...config, provider: selectedProvider };
    localStorage.setItem('lmConfig', JSON.stringify(configToSave));
    useUiStore.getState().addNotification({
      type: 'success',
      title: 'Configuration Saved',
      message: `LM configuration for ${config.name} saved successfully`
    });
  }, [config, selectedProvider]);

  const testConnection = useCallback(async () => {
    if (!wsService) {
      setTestResult({ success: false, message: 'WebSocket service not available' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Prepare configuration for testing
      const testConfig = { ...config, provider: selectedProvider };
      
      // Send test configuration to the backend
      wsService.sendMessage({
        type: 'testLMConnection',
        payload: testConfig
      });
    } catch (error) {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: `Test failed: ${error.message || 'Unknown error'}` 
      });
    }
  }, [wsService, config, selectedProvider]);

  const handleProviderChange = useCallback((providerId) => {
    setSelectedProvider(providerId);
  }, []);

  const toggleSecretVisibility = useCallback(() => {
    setShowSecrets(prev => !prev);
  }, []);

  // Render provider selection buttons
  const renderProviderSelector = () => React.createElement('div', { style: { marginBottom: '1.5rem' } },
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' } },
      Object.keys(DEFAULT_PROVIDER_CONFIGS).map(providerId => 
        React.createElement('button', {
          key: providerId,
          onClick: () => handleProviderChange(providerId),
          style: {
            padding: '0.5rem 1rem',
            border: selectedProvider === providerId ? '2px solid #007bff' : '1px solid #ccc',
            backgroundColor: selectedProvider === providerId ? '#e7f3ff' : '#f8f9fa',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: selectedProvider === providerId ? 'bold' : 'normal'
          }
        }, DEFAULT_PROVIDER_CONFIGS[providerId].name)
      )
    )
  );

  // Render test result
  const renderTestResult = () => {
    if (!testResult) return null;

    const { success, message, model } = testResult;
    const bg = success ? '#d4edda' : '#f8d7da';
    const border = success ? '#c3e6c3' : '#f5c6cb';
    const color = success ? '#155724' : '#721c24';
    
    return React.createElement(Card, {
      style: {
        padding: '1rem',
        borderRadius: '4px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        marginBottom: '1rem'
      }
    },
      React.createElement('div', { style: { fontWeight: 'bold', color } }, 
        success ? '✓ Connection Successful' : '✗ Connection Failed'
      ),
      React.createElement('div', { style: { fontSize: '0.9rem', marginTop: '0.5rem' } }, message),
      model && React.createElement('div', { style: { fontSize: '0.8rem', marginTop: '0.25rem', color: '#666' } },
        `Model: ${model}`
      )
    );
  };

  // Render action buttons
  const renderActionButtons = () => React.createElement('div', { 
    style: { display: 'flex', gap: '0.5rem', marginTop: '1rem' } 
  },
    React.createElement(Button, {
      onClick: saveConfig,
      variant: 'primary',
      style: { flex: 1 }
    }, 'Save Configuration'),
    React.createElement(Button, {
      onClick: testConnection,
      disabled: isTesting,
      variant: isTesting ? 'secondary' : 'success',
      style: { flex: 1 }
    }, isTesting ? 'Testing...' : 'Test Connection'),
    React.createElement(Button, {
      onClick: toggleSecretVisibility,
      variant: showSecrets ? 'warning' : 'secondary',
      style: { flex: 1 }
    }, showSecrets ? 'Hide Secrets' : 'Show Secrets')
  );

  return React.createElement('div', {
    style: {
      padding: '1rem',
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#fff',
      fontSize: '0.9rem'
    }
  },
    React.createElement('h3', { style: { margin: '0 0 1rem 0', color: '#333' } }, 'Language Model Configuration'),
    
    renderProviderSelector(),
    
    React.createElement(GenericInputField, {
      label: 'Provider',
      value: DEFAULT_PROVIDER_CONFIGS[selectedProvider]?.name || selectedProvider,
      onChange: () => {}, // Read-only
      disabled: true,
      description: 'The selected language model provider'
    }),
    
    React.createElement(GenericInputField, {
      label: 'API Key',
      type: showSecrets ? 'text' : 'password',
      value: config.apiKey || '',
      onChange: (value) => handleInputChange('apiKey', value),
      placeholder: 'Enter your API key',
      description: 'Your API key for authentication (will be stored locally)'
    }),
    
    React.createElement(GenericInputField, {
      label: 'Model',
      value: config.model || '',
      onChange: (value) => handleInputChange('model', value),
      placeholder: 'e.g., gpt-4, llama2',
      description: 'The specific model to use from the provider'
    }),
    
    React.createElement(GenericInputField, {
      label: 'Base URL',
      value: config.baseURL || '',
      onChange: (value) => handleInputChange('baseURL', value),
      placeholder: 'e.g., https://api.openai.com/v1',
      description: 'The base URL for the provider API'
    }),
    
    React.createElement(GenericInputField, {
      label: 'Temperature',
      type: 'number',
      value: config.temperature !== undefined ? config.temperature : 0.7,
      onChange: (value) => handleInputChange('temperature', parseFloat(value)),
      placeholder: '0.0 - 1.0',
      description: 'Controls randomness in output (0.0 = deterministic, 1.0 = random)'
    }),
    
    React.createElement(GenericInputField, {
      label: 'Max Tokens',
      type: 'number',
      value: config.maxTokens !== undefined ? config.maxTokens : 1000,
      onChange: (value) => handleInputChange('maxTokens', parseInt(value)),
      placeholder: 'Maximum tokens to generate',
      description: 'Maximum number of tokens to generate in a single request'
    }),
    
    renderTestResult(),
    
    renderActionButtons(),
    
    React.createElement(Card, {
      title: 'Instructions',
      style: { 
        marginTop: '1.5rem',
        padding: '1rem', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '4px',
        border: '1px solid #e9ecef',
        fontSize: '0.85rem'
      } 
    },
      React.createElement('ul', { style: { margin: '0.5rem 0', paddingLeft: '1.2rem' } },
        React.createElement('li', null, 'Select your preferred language model provider from the options above'),
        React.createElement('li', null, 'Enter your API key and other configuration details'),
        React.createElement('li', null, 'Click "Test Connection" to verify the configuration works'),
        React.createElement('li', null, 'Click "Save Configuration" to store settings in local storage'),
        React.createElement('li', null, 'Use "Show Secrets" to view sensitive information like API keys')
      )
    )
  );
};

export default LMConfigPanel;