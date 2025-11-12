import {z} from 'zod';
import {BaseProvider} from './BaseProvider.js';
import {ChatOllama} from '@langchain/ollama';
import {ChatOpenAI} from '@langchain/openai';
import {HumanMessage, AIMessage, ToolMessage} from '@langchain/core/messages';
import {ChatPromptTemplate, MessagesPlaceholder} from '@langchain/core/prompts';
import {StateGraph, END} from '@langchain/langgraph';
import {ToolNode} from '@langchain/langgraph/prebuilt';
import {ModelNotFoundError, ConnectionError} from '../util/ErrorHandler.js';
import {DynamicTool} from '@langchain/core/tools';
import {StructuredTool} from '@langchain/core/tools';

export class LangChainProvider extends BaseProvider {
    constructor(config = {}) {
        super({...config, maxTokens: config.maxTokens ?? 1000});
        this._validateConfig(config);
        this.providerType = config.provider ?? 'ollama';
        // Remove hardcoded default model name - user must provide it via config
        if (!config.modelName) {
            throw new Error('modelName is required for LangChainProvider');
        }
        this.modelName = config.modelName;
        this.apiKey = config.apiKey;
        this.baseURL = this._normalizeBaseUrl(config.baseURL ?? 'http://localhost:11434');
        this.tools = config.tools || [];
        this.tools = config.tools || [];
    }

    _validateConfig(config) {
        if (!config.provider) {
            config.provider = 'ollama'; // default to ollama
        }

        if (config.provider === 'openai' && !config.apiKey) {
            throw new Error('API key is required for OpenAI provider');
        }

        if (!['ollama', 'openai'].includes(config.provider)) {
            throw new Error(`Unsupported provider type: ${config.provider}. Use 'ollama' or 'openai'.`);
        }
    }

    initialize() {
        this._initAgent();
    }

    _convertToLangchainTools(tools) {
        return tools.map(tool => {
            // If it's already a LangChain tool, return as-is
            if (tool.invoke && typeof tool.invoke === 'function') {
                return tool;
            }

            // Convert our custom tool to a LangChain DynamicTool
            return new DynamicTool({
                name: tool.name || tool.constructor.name,
                description: tool.description || 'A tool for the language model',
                func: async (input) => {
                    try {
                        // Handle both string input and object input
                        let args = input;
                        if (typeof input === 'string') {
                            try {
                                args = JSON.parse(input);
                            } catch {
                                // If it's not JSON, pass as-is
                                args = { content: input };
                            }
                        }
                        const result = await (typeof tool.execute === 'function'
                            ? tool.execute(args)
                            : { error: 'Tool has no execute method' });
                        return JSON.stringify(result);
                    } catch (error) {
                        return JSON.stringify({ error: error.message });
                    }
                },
                schema: tool.schema || { type: 'object', properties: {}, required: [] }
            });
        });
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

        return creator();
    }

    _initAgent() {
        const tools = this._convertToLangchainTools(this.tools);
        let hasTools = tools && tools.length > 0;
        
        // Only attempt to create the model with tools if we have tools to bind
        let modelWithTools;
        let model;
        
        try {
            model = this._initChatModel();
            
            if (hasTools) {
                try {
                    // Attempt to bind tools - if the model doesn't support tools, this will cause issues
                    modelWithTools = model.bindTools(tools);
                } catch (bindError) {
                    console.warn(`⚠️  Model ${this.modelName} may not support tools, proceeding without tools: ${bindError.message}`);
                    // Fallback: don't bind tools if the model doesn't support them
                    hasTools = false;
                    modelWithTools = model;
                }
            } else {
                modelWithTools = model;
            }
        } catch (error) {
            // If we can't even initialize the base model, log and proceed
            console.error(`❌ Error initializing model ${this.modelName}:`, error.message);
            throw error;
        }

        const toolNode = hasTools ? new ToolNode(tools) : null;

        const agent = async (state) => {
            try {
                const messages = await modelWithTools.invoke(state.messages);
                return { messages: [messages] };
            } catch (invokeError) {
                // If there's an error during invoke (like model not found), handle it gracefully
                console.error(`Error during model invocation:`, invokeError.message);
                // Return an error message as a message
                return { 
                    messages: [new AIMessage({
                        content: `Error: ${invokeError.message}`
                    })] 
                };
            }
        };

        // Function to format the response for output
        const formatMessages = (state) => {
            const { messages } = state;
            // Return the last message content for output
            if (messages && messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                // If there's content, return it; otherwise return a JSON representation
                const content = lastMessage.content || JSON.stringify(lastMessage);
                // If it contains an error, make it clear
                if (typeof content === 'string' && content.includes('Error:')) {
                    return { formatted_response: content };
                }
                return { formatted_response: content };
            }
            return { formatted_response: 'No response generated' };
        };

        // Define the agent workflow
        const workflow = new StateGraph({
            channels: {
                messages: {
                    value: (x, y) => y, // reducer function - use latest value
                    default: () => []
                },
                formatted_response: {
                    value: (x, y) => y, // reducer function - use latest value
                    default: () => ""
                }
            }
        });

        workflow.addNode('agent', agent);
        workflow.addNode('formatMessages', formatMessages);

        if (hasTools) {
            workflow.addNode('tools', toolNode);
            
            const shouldInvokeTools = (state) => {
                const { messages } = state;
                const lastMessage = messages[messages.length - 1];
                // Check if there are any tool calls to execute
                if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
                    return 'tools';
                }
                return 'formatMessages'; // Go to formatMessages if no tool calls
            };

            workflow.addConditionalEdges('agent', shouldInvokeTools, {
                tools: 'tools',
                formatMessages: 'formatMessages'
            });

            workflow.addEdge('tools', 'agent');
        } else {
            // If no tools, always go to formatMessages
            workflow.addEdge('agent', 'formatMessages');
        }

        workflow.addEdge('formatMessages', END);
        
        workflow.setEntryPoint('agent');

        this.agent = workflow.compile();
    }

    async generateText(prompt, options = {}) {
        if (!this.agent) {
            throw new Error('Agent not initialized. Please call initialize() first.');
        }
        
        return Promise.race([
            (async () => {
                try {
                    const response = await this.agent.invoke({
                        messages: [new HumanMessage(prompt)],
                    });
                    // The response should contain the formatted_response from the formatMessages node
                    return response.formatted_response || (response.messages && response.messages.length > 0 ? 
                        response.messages[response.messages.length - 1]?.content || 'No content' : 'No response');
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
            })(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Request timed out after ${options.timeout || 30000}ms`)), 
                options.timeout || 30000)
            )
        ]);
    }

    async streamText(prompt, options = {}) {
        if (!this.agent) {
            throw new Error('Agent not initialized. Please call initialize() first.');
        }

        // Create an async iterator that implements timeout
        const asyncIterator = {
            async *[Symbol.asyncIterator]() {
                const timeout = options.timeout || 60000;
                
                // Create a timeout promise to handle timeout
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Streaming request timed out after ${timeout}ms`)), timeout)
                );
                
                // Set up the actual streaming operation as a Promise that can be raced with timeout
                const streamPromise = (async () => {
                    try {
                        // Use LangGraph's streaming with 'values' mode to get state changes during workflow
                        const stream = this.agent.stream({
                            messages: [new HumanMessage(prompt)],
                        }, {
                            streamMode: 'values'
                        });

                        // Process the stream and collect all results to be yielded later
                        const results = [];
                        for await (const stateUpdate of stream) {
                            // Check if there's formatted_response in the state update
                            if (stateUpdate && stateUpdate.formatted_response) {
                                results.push(stateUpdate.formatted_response);
                            }
                            // Also check for messages in the state
                            else if (stateUpdate && stateUpdate.messages && stateUpdate.messages.length > 0) {
                                const lastMessage = stateUpdate.messages[stateUpdate.messages.length - 1];
                                if (lastMessage && lastMessage.content) {
                                    results.push(lastMessage.content);
                                }
                            }
                        }
                        return results; // Return the collected results
                    } catch (error) {
                        // Throw specific error types for better error handling upstream
                        if (error.message.includes('model') && error.message.includes('not found')) {
                            throw new ModelNotFoundError(this.modelName);
                        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
                            throw new ConnectionError(`Connection to ${this.providerType} service failed. Please ensure the service is running at ${this.baseURL}`);
                        } else {
                            throw new Error(`LangChainProvider streamText failed: ${error.message}`);
                        }
                    }
                })();

                // Wait for results with timeout protection
                const results = await Promise.race([streamPromise, timeoutPromise]);
                
                // Yield all collected results
                for (const result of results) {
                    yield result;
                }
            }
        };

        return asyncIterator;
    }

    async generateEmbedding() {
        throw new Error("Embeddings not fully implemented for LangChainProvider due to LangChain's varied embedding support across providers");
    }
}