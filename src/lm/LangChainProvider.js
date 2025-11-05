import {BaseProvider} from './BaseProvider.js';
import {ChatOllama} from '@langchain/ollama';
import {ChatOpenAI} from '@langchain/openai';
import {HumanMessage} from '@langchain/core/messages';

export class LangChainProvider extends BaseProvider {
    constructor(config = {}) {
        super({...config, maxTokens: config.maxTokens ?? 1000});
        this.providerType = config.provider || 'ollama';
        this.modelName = config.modelName || 'llama2';
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL || 'http://localhost:11434';

        if (this.baseURL.includes(':11434') && !this.baseURL.startsWith('http')) {
            this.baseURL = `http://${this.baseURL}`;
        }

        this._initChatModel();
    }

    _initChatModel() {
        switch (this.providerType) {
            case 'ollama':
                this.chatModel = new ChatOllama({
                    model: this.modelName,
                    baseUrl: this.baseURL,
                    temperature: this.temperature,
                    num_predict: this.maxTokens,
                    ...this.config.ollamaOptions
                });
                break;
            case 'openai':
                if (!this.apiKey) throw new Error('API key is required for OpenAI provider');
                this.chatModel = new ChatOpenAI({
                    modelName: this.modelName,
                    openAIApiKey: this.apiKey,
                    temperature: this.temperature,
                    maxTokens: this.maxTokens,
                    ...this.config.openaiOptions
                });
                break;
            default:
                throw new Error(`Unsupported provider type: ${this.providerType}. Use 'ollama' or 'openai'.`);
        }
    }

    async generateText(prompt, options = {}) {
        try {
            const messages = [new HumanMessage(prompt)];
            const response = await this.chatModel.call(messages, {
                temperature: options.temperature ?? this.temperature,
                max_tokens: options.maxTokens ?? this.maxTokens,
                ...options,
            });
            return response.content;
        } catch (error) {
            throw new Error(`LangChainProvider generateText failed: ${error.message}`);
        }
    }

    async generateEmbedding() {
        throw new Error("Embeddings not fully implemented for LangChainProvider due to LangChain's varied embedding support across providers");
    }
}