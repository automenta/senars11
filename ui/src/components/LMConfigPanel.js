import React, { useState, useEffect, useCallback } from 'react';
import useUiStore from '../stores/uiStore.js';
import { GenericInputField, Button, Card } from './GenericComponents.js';

const DEFAULT_PROVIDER_CONFIGS = Object.freeze({
  openai: {
    id: 'openai',
    name: 'OpenAI',
    apiKey: '',
    model: 'gpt-4',
    baseURL: 'https://api.openai.com/v1',
    temperature: 0.7,
    maxTokens: 1000,
    icon: '🤖'
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    apiKey: '', // Ollama doesn't require API key but we keep the field for UI consistency
    model: 'llama2',
    baseURL: 'http://localhost:11434/api',
    temperature: 0.7,
    maxTokens: 1000,
    icon: '💻'
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    apiKey: '',
    model: 'claude-3-sonnet-20240229',
    baseURL: 'https://api.anthropic.com/v1',
    temperature: 0.7,
    maxTokens: 1000,
    icon: '🧠'
  },
  custom: {
    id: 'custom',
    name: 'Custom Provider',
    apiKey: '',
    model: '',
    baseURL: '',
    temperature: 0.7,
    maxTokens: 1000,
    icon: '⚙️'
  }
});

const LMConfigPanel = () => {
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [config, setConfig] = useState(() => ({...DEFAULT_PROVIDER_CONFIGS.openai}));
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [customConfig, setCustomConfig] = useState({});
  const wsService = useUiStore(state => state.wsService);
  const lmTestResult = useUiStore(state => state.lmTestResult);

  // Load saved configuration from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('lmConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        setSelectedProvider(parsedConfig.provider || 'openai');
      } catch (error) {
        console.error('Error loading saved LM config:', error);
        useUiStore.getState().addNotification({
          type: 'error',
          title: 'Configuration Load Error',
          message: 'Could not load saved configuration, using defaults',
          timestamp: Date.now()
        });
      }
    }
  }, []);

  // Update config when provider changes
  useEffect(() => {
    const defaultConfig = DEFAULT_PROVIDER_CONFIGS[selectedProvider] || DEFAULT_PROVIDER_CONFIGS.openai;
    setConfig(prev => ({ ...defaultConfig, provider: selectedProvider, ...prev }));
  }, [selectedProvider]);

  // Handle test results from WebSocket
  useEffect(() => {
    if (lmTestResult) {
      setTestResult(lmTestResult);
      setIsTesting(false);
      useUiStore.getState().setLMTestResult(null);
    }
  }, [lmTestResult]);

  // Handle input changes with validation
  const handleInputChange = useCallback((field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save configuration to localStorage
  const saveConfig = useCallback(() => {
    const configToSave = { ...config, provider: selectedProvider };
    try {
      localStorage.setItem('lmConfig', JSON.stringify(configToSave));
      useUiStore.getState().addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: `LM configuration for ${config.name} saved successfully`
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      useUiStore.getState().addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not save configuration: ' + error.message
      });
    }
  }, [config, selectedProvider]);

  // Test the connection to the selected provider
  const testConnection = useCallback(async () => {
    if (!wsService) {
      setTestResult({ success: false, message: 'WebSocket service not available' });
      useUiStore.getState().addNotification({
        type: 'error',
        title: 'Connection Error',
        message: 'WebSocket service not available'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      wsService.sendMessage({
        type: 'testLMConnection',
        payload: { ...config, provider: selectedProvider }
      });
    } catch (error) {
      setIsTesting(false);
      const errorMessage = { success: false, message: `Test failed: ${error.message || 'Unknown error'}` };
      setTestResult(errorMessage);
      useUiStore.getState().addNotification({
        type: 'error',
        title: 'Test Failed',
        message: error.message || 'Unknown test error'
      });
    }
  }, [wsService, config, selectedProvider]);

  // Handle provider change
  const handleProviderChange = useCallback((providerId) => {
    setSelectedProvider(providerId);
  }, []);

  // Toggle secret visibility
  const toggleSecretVisibility = useCallback(() => setShowSecrets(prev => !prev), []);

  // Provider selector component
  const renderProviderSelector = useCallback(() => React.createElement('div', { style: { marginBottom: '1.5rem' } },
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' } },
      Object.keys(DEFAULT_PROVIDER_CONFIGS).map(providerId => {
        const provider = DEFAULT_PROVIDER_CONFIGS[providerId];
        return React.createElement('button', {
          key: providerId,
          onClick: () => handleProviderChange(providerId),
          style: {
            padding: '0.75rem 1rem',
            border: selectedProvider === providerId ? '2px solid #007bff' : '1px solid #ccc',
            backgroundColor: selectedProvider === providerId ? '#e7f3ff' : '#f8f9fa',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: selectedProvider === providerId ? 'bold' : 'normal',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }
        }, 
          React.createElement('span', null, provider.icon),
          React.createElement('span', null, provider.name)
        );
      })
    )
  ), [selectedProvider, handleProviderChange]);

  // Test result display component
  const renderTestResult = useCallback(() => {
    if (!testResult) return null;

    const { success, message, model, responseSample } = testResult;
    const isSuccess = success === true;
    const bg = isSuccess ? '#d4edda' : '#f8d7da';
    const border = isSuccess ? '#c3e6c3' : '#f5c6cb';
    const color = isSuccess ? '#155724' : '#721c24';
    const icon = isSuccess ? '✅' : '❌';
    
    return React.createElement(Card, {
      style: {
        padding: '1rem',
        borderRadius: '6px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        marginBottom: '1rem'
      }
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color } }, 
        React.createElement('span', null, icon),
        React.createElement('span', null, isSuccess ? 'Connection Successful' : 'Connection Failed')
      ),
      React.createElement('div', { style: { fontSize: '0.9rem', marginTop: '0.5rem' } }, message),
      model && React.createElement('div', { style: { fontSize: '0.8rem', marginTop: '0.25rem', color: '#666' } },
        React.createElement('strong', null, 'Model: '), model
      ),
      responseSample && React.createElement('div', { style: { fontSize: '0.8rem', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px' } },
        React.createElement('strong', null, 'Response sample: '), 
        React.createElement('span', { style: { wordBreak: 'break-word' } }, responseSample)
      )
    );
  }, [testResult]);

  // Action buttons component
  const renderActionButtons = useCallback(() => React.createElement('div', { 
    style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' } 
  },
    React.createElement(Button, {
      onClick: saveConfig,
      variant: 'primary',
      style: { flex: 1, minWidth: '120px' }
    }, 'Save Configuration'),
    React.createElement(Button, {
      onClick: testConnection,
      disabled: isTesting,
      variant: isTesting ? 'secondary' : 'success',
      style: { flex: 1, minWidth: '120px' }
    }, isTesting ? 'Testing...' : 'Test Connection'),
    React.createElement(Button, {
      onClick: toggleSecretVisibility,
      variant: showSecrets ? 'warning' : 'secondary',
      style: { flex: 1, minWidth: '120px' }
    }, showSecrets ? 'Hide Secrets' : 'Show Secrets')
  ), [saveConfig, testConnection, isTesting, toggleSecretVisibility, showSecrets]);

  // Instruction card component
  const renderInstructionCard = useCallback(() => 
    React.createElement(Card, {
      style: { 
        marginTop: '1.5rem',
        padding: '1rem', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '6px',
        border: '1px solid #e9ecef',
        fontSize: '0.85rem'
      } 
    },
      React.createElement('h4', { style: { margin: '0 0 0.5rem 0', color: '#333' } }, 'Configuration Guide'),
      React.createElement('ul', { style: { margin: '0.5rem 0', paddingLeft: '1.2rem' } },
        React.createElement('li', null, 'Select your preferred language model provider from the options above'),
        React.createElement('li', null, 'Enter your API key and other configuration details'),
        React.createElement('li', null, 'Click "Test Connection" to verify the configuration works'),
        React.createElement('li', null, 'Click "Save Configuration" to store settings in local storage'),
        React.createElement('li', null, 'Use "Show Secrets" to view sensitive information like API keys'),
        React.createElement('li', null, 'For custom providers, use the "Custom Provider" option')
      )
    )
  , []);

  // Input field with validation
  const renderInputField = useCallback((field, label, type = 'text', placeholder, description) => 
    React.createElement(GenericInputField, {
      label,
      type: field === 'apiKey' && !showSecrets ? 'password' : type,
      value: config[field] || '',
      onChange: (value) => handleInputChange(field, value),
      placeholder,
      description,
      style: { marginBottom: '0.75rem' }
    })
  , [config, handleInputChange, showSecrets]);

  return React.createElement('div', {
    style: {
      padding: '1rem',
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#fff',
      fontSize: '0.9rem'
    }
  },
    React.createElement('h3', { style: { margin: '0 0 1rem 0', color: '#333', display: 'flex', alignItems: 'center', gap: '0.5rem' } }, 
      React.createElement('span', null, '🌐'),
      React.createElement('span', null, 'Language Model Configuration')
    ),
    
    renderProviderSelector(),
    
    renderInputField('name', 'Provider', 'text', 'Provider name', 'The selected language model provider'),
    
    renderInputField('apiKey', 'API Key', 'password', 'Enter your API key', 'Your API key for authentication (will be stored locally)'),
    
    renderInputField('model', 'Model', 'text', 'e.g., gpt-4, llama2', 'The specific model to use from the provider'),
    
    renderInputField('baseURL', 'Base URL', 'text', 'e.g., https://api.openai.com/v1', 'The base URL for the provider API'),
    
    renderInputField('temperature', 'Temperature', 'number', '0.0 - 1.0', 'Controls randomness in output (0.0 = deterministic, 1.0 = random)'),
    
    renderInputField('maxTokens', 'Max Tokens', 'number', 'Maximum tokens to generate', 'Maximum number of tokens to generate in a single request'),
    
    renderTestResult(),
    
    renderActionButtons(),
    
    renderInstructionCard()
  );
};

export default LMConfigPanel;