import {BaseProvider} from './BaseProvider.js';
import {ChatOllama} from '@langchain/ollama';
import {ChatOpenAI} from '@langchain/openai';
import {HumanMessage} from '@langchain/core/messages';
import {ModelNotFoundError, ConnectionError} from '../util/ErrorHandler.js';

export class LangChainProvider extends BaseProvider {
    constructor(config = {}) {
        super({...config, maxTokens: config.maxTokens ?? 1000});
        this.providerType = config.provider ?? 'ollama';
        this.modelName = config.modelName ?? 'llama2';
        this.apiKey = config.apiKey;
        this.baseURL = this._normalizeBaseUrl(config.baseURL ?? 'http://localhost:11434');
        this._initChatModel();
    }

    _normalizeBaseUrl(baseURL) {
        return baseURL.includes(':11434') && !baseURL.startsWith('http') 
            ? `http://${baseURL}` 
            : baseURL;
    }

    _initChatModel() {
        const modelCreators = {
            'ollama': () => new ChatOllama({
                model: this.modelName,
                baseUrl: this.baseURL,
                temperature: this.temperature,
                num_predict: this.maxTokens,
                ...this.config.ollamaOptions
            }),
            'openai': () => {
                if (!this.apiKey) throw new Error('API key is required for OpenAI provider');
                return new ChatOpenAI({
                    modelName: this.modelName,
                    openAIApiKey: this.apiKey,
                    temperature: this.temperature,
                    maxTokens: this.maxTokens,
                    ...this.config.openaiOptions
                });
            }
        };

        const creator = modelCreators[this.providerType];
        if (!creator) {
            throw new Error(`Unsupported provider type: ${this.providerType}. Use 'ollama' or 'openai'.`);
        }

        this.chatModel = creator();
    }

    async generateText(prompt, options = {}) {
        try {
            const messages = [new HumanMessage(prompt)];
            const response = await this.chatModel.invoke(messages, {
                temperature: options.temperature ?? this.temperature,
                max_tokens: options.maxTokens ?? this.maxTokens,
                ...options,
            });
            return response.content ?? '';
        } catch (error) {
            // Throw specific error types for better error handling upstream
            if (error.message.includes('model') && error.message.includes('not found')) {
                throw new ModelNotFoundError(this.modelName);
            } else if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
                throw new ConnectionError(`Connection to ${this.providerType} service failed. Please ensure the service is running at ${this.baseURL}`);
            } else {
                throw new Error(`LangChainProvider generateText failed: ${error.message}`);
            }
        }
    }

    async generateEmbedding() {
        throw new Error("Embeddings not fully implemented for LangChainProvider due to LangChain's varied embedding support across providers");
    }
}