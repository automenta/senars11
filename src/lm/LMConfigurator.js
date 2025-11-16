import inquirer from 'inquirer';
import {LangChainProvider} from './LangChainProvider.js';
import {HuggingFaceProvider} from './HuggingFaceProvider.js';
import {DummyProvider} from './DummyProvider.js';

export class LMConfigurator {
    constructor() {
        this.defaultProviders = {
            'ollama': {
                name: 'Ollama (OpenAI-compatible)',
                providerClass: LangChainProvider,
                defaultConfig: {
                    provider: 'ollama',
                    modelName: 'llama2',
                    baseURL: 'http://localhost:11434'
                }
            },
            'openai': {
                name: 'OpenAI',
                providerClass: LangChainProvider,
                defaultConfig: {
                    provider: 'openai',
                    modelName: 'gpt-3.5-turbo'
                }
            },
            'huggingface': {
                name: 'Hugging Face Transformers',
                providerClass: HuggingFaceProvider,
                defaultConfig: {
                    modelName: 'HuggingFaceTB/SmolLM-135M-Instruct',
                    device: 'cpu'
                }
            },
            'anthropic': {
                name: 'Anthropic (via LangChain)',
                providerClass: LangChainProvider,
                defaultConfig: {
                    provider: 'anthropic',
                    modelName: 'claude-3-haiku'
                }
            },
            'dummy': {
                name: 'Dummy/Null Provider',
                providerClass: DummyProvider,
                defaultConfig: {
                    id: 'dummy'
                }
            }
        };

        // Predefined small models for different categories
        this.predefinedModels = {
            'SmolLM': [
                'HuggingFaceTB/SmolLM-135M-Instruct',
                'HuggingFaceTB/SmolLM-360M-Instruct',
                'HuggingFaceTB/SmolLM-1.7B-Instruct'
            ],
            'Granite': [
                'ibm-granite/granite-3.0-8b-instruct',
                'ibm-granite/granite-3.0-2b-instruct'
            ],
            'Mistral': [
                'mistral/mistral-tiny',
                'mistral/mistral-small',
                'microsoft/DialoGPT-small'
            ]
        };
    }

    async configure() {
        console.log('🚀 SeNARS Agent REPL - LM Configuration\n');

        const config = await inquirer.prompt([
            {
                type: 'list',
                name: 'providerType',
                message: 'Choose an LM provider:',
                choices: [
                    {name: 'OpenAI-compatible (Ollama)', value: 'ollama'},
                    {name: 'OpenAI', value: 'openai'},
                    {name: 'Hugging Face (with presets)', value: 'huggingface'},
                    {name: 'Anthropic (via LangChain)', value: 'anthropic'},
                    {name: 'Dummy/Null (testing)', value: 'dummy'},
                    {name: 'Add custom provider configuration', value: 'custom'}
                ],
                default: 'ollama'
            }
        ]);

        let providerConfig = {};

        if (config.providerType === 'custom') {
            const customConfig = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'providerName',
                    message: 'Enter provider name:',
                    default: 'custom-provider'
                },
                {
                    type: 'list',
                    name: 'providerClass',
                    message: 'Select provider class:',
                    choices: [
                        {name: 'LangChainProvider (OpenAI-compatible)', value: 'LangChainProvider'},
                        {name: 'HuggingFaceProvider (Transformers)', value: 'HuggingFaceProvider'},
                        {name: 'DummyProvider (testing)', value: 'DummyProvider'}
                    ]
                },
                {
                    type: 'input',
                    name: 'modelName',
                    message: 'Enter model name:',
                    default: 'llama2'
                }
            ]);

            providerConfig = {
                id: customConfig.providerName,
                provider: customConfig.providerClass.toLowerCase().replace('provider', ''),
                modelName: customConfig.modelName
            };
        } else {
            const providerInfo = this.defaultProviders[config.providerType];

            // Set up specific configuration based on provider type
            switch (config.providerType) {
                case 'ollama':
                    const ollamaConfig = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'modelName',
                            message: 'Enter Ollama model name:',
                            default: providerInfo.defaultConfig.modelName
                        },
                        {
                            type: 'input',
                            name: 'baseURL',
                            message: 'Enter Ollama API URL:',
                            default: providerInfo.defaultConfig.baseURL
                        }
                    ]);
                    providerConfig = {
                        ...providerInfo.defaultConfig,
                        ...ollamaConfig
                    };
                    break;

                case 'openai':
                    const openaiConfig = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'modelName',
                            message: 'Enter OpenAI model name:',
                            default: providerInfo.defaultConfig.modelName
                        },
                        {
                            type: 'password',
                            name: 'apiKey',
                            message: 'Enter OpenAI API key:'
                        }
                    ]);
                    providerConfig = {
                        ...providerInfo.defaultConfig,
                        ...openaiConfig
                    };
                    break;

                case 'huggingface':
                    const hfConfig = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'presetCategory',
                            message: 'Select model category:',
                            choices: [
                                {name: 'SmolLM (HuggingFaceTB)', value: 'SmolLM'},
                                {name: 'Granite (IBM)', value: 'Granite'},
                                {name: 'Mistral', value: 'Mistral'},
                                {name: 'Custom model name', value: 'custom'}
                            ]
                        }
                    ]);

                    if (hfConfig.presetCategory === 'custom') {
                        const customModel = await inquirer.prompt([
                            {
                                type: 'input',
                                name: 'modelName',
                                message: 'Enter custom Hugging Face model name:',
                                default: 'sshleifer/distilbart-cnn-12-6'
                            }
                        ]);
                        providerConfig = {
                            ...providerInfo.defaultConfig,
                            ...customModel
                        };
                    } else {
                        const models = this.predefinedModels[hfConfig.presetCategory];
                        const selectedModel = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'modelName',
                                message: `Select ${hfConfig.presetCategory} model:`,
                                choices: models.map(model => ({name: model, value: model}))
                            }
                        ]);
                        providerConfig = {
                            ...providerInfo.defaultConfig,
                            ...selectedModel
                        };
                    }
                    break;

                case 'anthropic':
                    const anthropicConfig = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'modelName',
                            message: 'Enter Anthropic model name:',
                            default: providerInfo.defaultConfig.modelName
                        },
                        {
                            type: 'password',
                            name: 'apiKey',
                            message: 'Enter Anthropic API key:'
                        }
                    ]);
                    providerConfig = {
                        ...providerInfo.defaultConfig,
                        ...anthropicConfig,
                        provider: 'anthropic'
                    };
                    break;

                case 'dummy':
                    providerConfig = {
                        ...providerInfo.defaultConfig
                    };
                    break;
            }
        }

        // Create the selected provider
        const providerInfo = this.defaultProviders[config.providerType] || this.defaultProviders[providerConfig.provider];
        if (!providerInfo) {
            throw new Error(`Unsupported provider type: ${config.providerType}`);
        }

        const ProviderClass = providerInfo.providerClass;
        const provider = new ProviderClass(providerConfig);

        console.log('✅ Configuration completed successfully!\n');
        return {
            provider,
            config: providerConfig
        };
    }

    async quickSelect() {
        console.log('🚀 SeNARS Agent REPL - Quick LM Selection\n');

        const providers = [
            {name: 'Ollama - llama2 (fast, local)', value: 'ollama-llama2'},
            {name: 'Ollama - mistral (balanced)', value: 'ollama-mistral'},
            {name: 'SmolLM-135M (HuggingFace, small)', value: 'huggingface-smollm'},
            {name: 'Granite-3.0-2b (HuggingFace, small)', value: 'huggingface-granite'},
            {name: 'Dummy Provider (for testing)', value: 'dummy'},
            {name: 'Custom configuration', value: 'custom'}
        ];

        const selection = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'Quick select a provider:',
                choices: providers
            }
        ]);

        // Handle quick selections
        if (selection.choice.startsWith('ollama-')) {
            const model = selection.choice.split('-')[1];
            const provider = new LangChainProvider({
                provider: 'ollama',
                modelName: model,
                baseURL: 'http://localhost:11434'
            });
            return {provider, config: {provider: 'ollama', modelName: model}};
        } else if (selection.choice.startsWith('huggingface-')) {
            const modelPreset = selection.choice.split('-')[1];
            let modelName = 'sshleifer/distilbart-cnn-12-6'; // default

            if (modelPreset === 'smollm') {
                modelName = 'HuggingFaceTB/SmolLM-135M-Instruct';
            } else if (modelPreset === 'granite') {
                modelName = 'ibm-granite/granite-3.0-2b-instruct';
            }

            const provider = new HuggingFaceProvider({
                modelName: modelName,
                device: 'cpu'
            });
            return {provider, config: {provider: 'huggingface', modelName}};
        } else if (selection.choice === 'dummy') {
            const provider = new DummyProvider();
            return {provider, config: {id: 'dummy'}};
        } else if (selection.choice === 'custom') {
            return await this.configure(); // Call full configuration
        }
    }
}