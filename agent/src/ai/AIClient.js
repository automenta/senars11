import { generateText, generateObject, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { TransformersJSProvider } from '@senars/core/src/lm/TransformersJSProvider.js';

export class AIClient {
    constructor(config = {}) {
        this.providers = new Map();
        this.defaultProvider = config.provider || config.lm?.provider || 'openai';
        this.defaultModel = config.model || config.modelName || config.lm?.modelName || 'gpt-4o';
        this.initializeProviders(config);
    }

    initializeProviders(config) {
        // Initialize OpenAI
        if (config.openai?.apiKey) {
            this.providers.set('openai', createOpenAI({
                apiKey: config.openai.apiKey,
                compatibility: 'strict',
            }));
        }

        // Initialize Anthropic
        if (config.anthropic?.apiKey) {
            this.providers.set('anthropic', createAnthropic({
                apiKey: config.anthropic.apiKey,
            }));
        }

        this.providers.set('transformers', (modelName) => {
            return {
                specificationVersion: 'v2',
                provider: 'transformers-js',
                modelId: modelName,
                doGenerate: async (options) => {
                    const provider = new TransformersJSProvider({ modelName });
                    const text = await provider.generateText(options.prompt.map(m => m.content).join('\n'), {
                        temperature: options.temperature,
                        maxTokens: options.maxTokens
                    });
                    return { text, finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } };
                },
                doStream: async (options) => {
                    const provider = new TransformersJSProvider({ modelName });
                    const stream = new ReadableStream({
                        async start(controller) {
                            const text = await provider.generateText(options.prompt.map(m => m.content).join('\n'), {
                                temperature: options.temperature,
                                maxTokens: options.maxTokens
                            });
                            controller.enqueue({ type: 'text-delta', textDelta: text });
                            controller.enqueue({ type: 'finish', finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } });
                            controller.close();
                        }
                    });
                    return { stream };
                }
            };
        });

        // Mock provider for testing/offline
        this.providers.set('mock', {
            chat: (modelId) => ({
                doGenerate: async () => ({ text: 'Mock response' }),
                doStream: async () => ({ stream: new ReadableStream({ start(c) { c.enqueue('Mock stream'); c.close(); } }) })
            })
        });
    }

    getModel(providerName, modelName) {
        const provider = this.providers.get(providerName) || this.providers.get(this.defaultProvider);
        if (!provider) throw new Error(`Provider ${providerName} not found`);
        return provider(modelName);
    }

    async generate(prompt, options = {}) {
        const model = this.getModel(options.provider || this.defaultProvider, options.model || this.defaultModel);
        return generateText({
            model,
            prompt,
            ...options
        });
    }

    async stream(prompt, options = {}) {
        const model = this.getModel(options.provider || this.defaultProvider, options.model || this.defaultModel);
        return streamText({
            model,
            prompt,
            ...options
        });
    }

    async generateObject(prompt, schema, options = {}) {
        const model = this.getModel(options.provider || this.defaultProvider, options.model || this.defaultModel);
        return generateObject({
            model,
            schema,
            prompt,
            ...options
        });
    }
}
