import {z} from 'zod';
import {BaseProvider} from './BaseProvider.js';
import {ChatOllama} from '@langchain/ollama';
import {ChatOpenAI} from '@langchain/openai';
import {AIMessage, HumanMessage} from '@langchain/core/messages';
import {END, START, StateGraph} from '@langchain/langgraph';
import {ToolNode} from '@langchain/langgraph/prebuilt';
import {ConnectionError, ModelNotFoundError} from '../util/ErrorHandler.js';
import {DynamicTool} from '@langchain/core/tools';

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
                                args = {content: input};
                            }
                        }
                        const result = await (typeof tool.execute === 'function'
                            ? tool.execute(args)
                            : {error: 'Tool has no execute method'});
                        return JSON.stringify(result);
                    } catch (error) {
                        return JSON.stringify({error: error.message});
                    }
                },
                schema: tool.schema || {type: 'object', properties: {}, required: []}
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

        // Create the agent node that invokes the model
        const agentNode = async (state) => {
            try {
                const messages = await modelWithTools.invoke(state.messages);
                return {messages: [messages]};
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

        // Define the agent state using Zod for newer LangGraph versions
        const AgentState = z.object({
            messages: z.array(z.any()).default([]),
        });

        // Build the graph using the proper LangGraph patterns
        const workflow = new StateGraph(AgentState);

        // Add nodes
        workflow.addNode("agent", agentNode);
        if (hasTools) {
            workflow.addNode("tools", toolNode);
        }

        // Add edges - START to agent
        workflow.addEdge(START, "agent");

        // Add conditional edges for tool calling
        if (hasTools) {
            workflow.addConditionalEdges("agent", (state) => {
                const lastMsg = state.messages[state.messages.length - 1];
                return lastMsg?.tool_calls?.length > 0 ? "tools" : END;
            });
            workflow.addEdge("tools", "agent"); // Loop back to agent after tool execution
        } else {
            // If no tools, always end after agent
            workflow.addEdge("agent", END);
        }

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
                    // The response contains messages; get the last message content
                    if (response.messages && response.messages.length > 0) {
                        const lastMessage = response.messages[response.messages.length - 1];
                        return lastMessage.content || JSON.stringify(lastMessage);
                    }
                    return 'No response generated';
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

        const timeout = options.timeout || 60000;

        // Create a callback-based timeout mechanism
        return {
            async* [Symbol.asyncIterator]() {
                let timeoutId;

                try {
                    // Set up the timeout
                    timeoutId = setTimeout(() => {
                        throw new Error(`Streaming request timed out after ${timeout}ms`);
                    }, timeout);

                    // Use LangGraph's streaming to get real-time state updates
                    const stream = this.agent.stream(
                        {messages: [new HumanMessage(prompt)]},
                        {
                            streamMode: 'values'
                        }
                    );

                    // Process the stream in real-time and yield content immediately
                    for await (const chunk of stream) {
                        // Clear and reset timeout on each chunk to avoid premature timeout
                        clearTimeout(timeoutId);

                        // Look for content in the state update (now using the new state structure)
                        if (chunk && chunk.messages && chunk.messages.length > 0) {
                            const lastMessage = chunk.messages[chunk.messages.length - 1];
                            if (lastMessage && lastMessage.content) {
                                yield lastMessage.content;
                            }
                        }

                        // Reset the timeout after each chunk
                        timeoutId = setTimeout(() => {
                            throw new Error(`Streaming request timed out after ${timeout}ms`);
                        }, timeout);
                    }

                    // Clear timeout after the stream completes successfully
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                } catch (error) {
                    // Clear timeout on error
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }

                    // Throw specific error types for better error handling upstream
                    if (error.message.includes('model') && error.message.includes('not found')) {
                        throw new ModelNotFoundError(this.modelName);
                    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
                        throw new ConnectionError(`Connection to ${this.providerType} service failed. Please ensure the service is running at ${this.baseURL}`);
                    } else {
                        throw new Error(`LangChainProvider streamText failed: ${error.message}`);
                    }
                }
            }
        };
    }

    async generateEmbedding() {
        throw new Error("Embeddings not fully implemented for LangChainProvider due to LangChain's varied embedding support across providers");
    }
}