/**
 * ClientMessageHandlers - Modular handlers for WebSocket client messages
 */
import {SUPPORTED_MESSAGE_TYPES} from '../config/constants.js';

export class ClientMessageHandlers {
    constructor(webSocketMonitor) {
        this.monitor = webSocketMonitor;
    }

    handleSubscribe(client, message) {
        this._handleSubscription(client, message, 'subscribe');
    }

    handleUnsubscribe(client, message) {
        this._handleSubscription(client, message, 'unsubscribe');
    }

    handleNarseseInput(client, message, nar) {
        // NOTE: nar is passed explicitly here from WebSocketMonitor's routing

        // Check if there's a ReplMessageHandler attached to the monitor
        if (this.monitor._replMessageHandler) {
            // Let the ReplMessageHandler handle this message
            // TODO: ReplMessageHandler likely needs to be session-aware or instantiated per session
            // For now, existing single-instance REPL logic might be broken for multi-session if it depends on global state
            this.monitor._replMessageHandler.processMessage(message)
                .then(result => {
                    this._sendToClient(client, result);
                })
                .catch(error => {
                    console.error('Error in ReplMessageHandler:', error);
                    this._sendToClient(client, {
                        type: 'error',
                        message: error.message
                    });
                });
        } else {
            // Fallback to the original NAR-based handling
            this._handleNarseseInput(client, message, nar);
        }
    }

    handleTestLMConnection(client, message) {
        return this._handleTestLMConnection(client, message);
    }

    handlePing(client) {
        this._sendToClient(client, {type: 'pong', timestamp: Date.now()});
    }

    handleLog(client, message) {
        this._handleClientLog(client, message);
    }

    handleRequestCapabilities(client, message) {
        this._handleRequestCapabilities(client, message);
    }

    // Private methods
    _handleSubscription(client, message, action) {
        if (!client.subscriptions) client.subscriptions = new Set();

        const eventTypes = message.eventTypes ?? ['all'];

        if (action === 'subscribe') {
            eventTypes.forEach(type => client.subscriptions.add(type));
            this._sendToClient(client, {
                type: 'subscription_ack',
                subscribedTo: Array.from(client.subscriptions),
                timestamp: Date.now()
            });
        } else if (action === 'unsubscribe') {
            eventTypes.forEach(type => client.subscriptions.delete(type));
            this._sendToClient(client, {
                type: 'unsubscription_ack',
                unsubscribedFrom: eventTypes,
                timestamp: Date.now()
            });
        }
    }

    _handleNarseseInput(client, message, nar) {
        console.log(`[CLIENT HANDLERS] _handleNarseseInput called with message:`, message);
        return new Promise(async (resolve) => {
            try {
                if (!message.payload || !message.payload.input) {
                    console.log(`[CLIENT HANDLERS] Missing payload or input in message:`, message);
                    this._sendToClient(client, {
                        type: 'narseseInput',
                        payload: {
                            input: message.payload?.input || '',
                            success: false,
                            message: 'Missing input in payload'
                        }
                    });
                    resolve();
                    return;
                }

                const narseseString = message.payload.input;
                console.log(`[CLIENT HANDLERS] Extracted narseseString: "${narseseString}"`);

                // Validate that we have a NAR instance to process the input
                if (!nar) {
                    console.log(`[CLIENT HANDLERS] NAR instance not available for session`);
                    this._sendToClient(client, {
                        type: 'narseseInput',
                        payload: {
                            input: narseseString,
                            success: false,
                            message: 'NAR instance not available'
                        }
                    });
                    resolve();
                    return;
                }

                // Process the input with the NAR
                console.log(`[CLIENT HANDLER] About to call NAR.input with: "${narseseString}"`);
                try {
                    const result = await nar.input(narseseString);

                    this._sendToClient(client, {
                        type: 'narseseInput',
                        payload: {
                            input: narseseString,
                            success: result,
                            message: result ? 'Input processed successfully' : 'Input processing failed'
                        }
                    });
                } catch (error) {
                    console.error('Error processing narsese input:', error);
                    this._sendToClient(client, {
                        type: 'narseseInput',
                        payload: {
                            input: narseseString,
                            success: false,
                            message: `Error: ${error.message}`
                        }
                    });
                }
            } catch (error) {
                console.error('Error in _handleNarseseInput:', error);
                this._sendToClient(client, {
                    type: 'narseseInput',
                    payload: {
                        input: message.payload?.input || '',
                        success: false,
                        message: `Internal error: ${error.message}`
                    }
                });
            }
            resolve();
        });
    }

    async _handleTestLMConnection(client, message) {
        try {
            const config = message.payload;

            if (!config || !config.provider) {
                return this._sendToClient(client, this._createTestResult(false, 'Missing configuration or provider in payload'));
            }

            // Note: Test LM Connection likely needs to be done on a per-session NAR or a generic one.
            // For now, we check monitor._nar which is legacy.
            // Ideally we grab the session from client map.
            // But since this handler doesn't have access to session map easily without passing it down...
            // We might need to refactor this.
            // For now, let's assume we can't easily access a specific NAR here without refactoring signature
            // Or we accept that this test might fail if no global NAR is present.

            // For safety, we should check if monitor has a session for this client if possible,
            // but since we are inside handler, we rely on arguments.
            // The signature didn't pass nar here.

            // WORKAROUND: use a dummy or error out for now.
             return this._sendToClient(client, this._createTestResult(false, 'LM Testing temporarily unavailable during session migration'));

        } catch (error) {
            console.error('Error in _handleTestLMConnection:', error);
            this._sendToClient(client, this._createTestResult(false, `Internal error: ${error.message}`));
        }
    }

    // Helper method to create standardized test result messages
    _createTestResult(success, message, additionalData = {}) {
        return {
            type: 'testLMConnection',
            success,
            message,
            ...additionalData
        };
    }

    // Helper method to create a test provider based on configuration
    async _createTestProvider(config) {
        const providerType = config.provider;

        switch (providerType) {
            case 'openai':
                const {LangChainProvider} = await import('../lm/LangChainProvider.js');
                return new LangChainProvider({
                    provider: 'openai',
                    modelName: config.model,
                    apiKey: config.apiKey,
                    temperature: config.temperature,
                    maxTokens: config.maxTokens
                });

            case 'ollama':
                const {LangChainProvider: OllamaProvider} = await import('../lm/LangChainProvider.js');
                return new OllamaProvider({
                    provider: 'ollama',
                    modelName: config.model,
                    baseURL: config.baseURL,
                    temperature: config.temperature,
                    maxTokens: config.maxTokens
                });

            case 'anthropic':
                // Use a dummy provider for Anthropic since we don't have a real one
                const {DummyProvider} = await import('../lm/DummyProvider.js');
                return new DummyProvider({
                    id: 'test-anthropic',
                    responseTemplate: `Anthropic test response for: {prompt}`
                });

            default:
                // For other providers, use a dummy provider
                const {DummyProvider: GenericDummyProvider} = await import('../lm/DummyProvider.js');
                return new GenericDummyProvider({
                    id: `test-${providerType}`,
                    responseTemplate: `Test response for ${providerType}: {prompt}`
                });
        }
    }

    // Handler for client log messages
    _handleClientLog(client, message) {
        // Log the client message to server console for debugging
        const logMessage = `[CLIENT-${client.clientId}] ${message.level.toUpperCase()}: ${message.data.join(' ')}`;
        console.log(logMessage);

        // Optionally broadcast this log to other connected clients or store for debugging
        if (message.level === 'error' || message.level === 'warn') {
            // Broadcast error/warning logs to all clients for debugging purposes
        }
    }

    // Handler for requesting client capabilities
    _handleRequestCapabilities(client, message) {
        const clientId = client.clientId;
        const capabilities = this.monitor.clientCapabilities.get(clientId) || [];

        this._sendToClient(client, {
            type: 'capabilities',
            data: {
                clientId,
                capabilities,
                serverVersion: '10.0.0',
                supportedMessageTypes: SUPPORTED_MESSAGE_TYPES
            },
            timestamp: Date.now()
        });
    }

    _sendToClient(client, message) {
        // Validate that we have both client and monitor before sending
        if (!client) {
            console.warn('Attempt to send message to null/undefined client:', message);
            return;
        }

        if (!this.monitor || typeof this.monitor._sendToClient !== 'function') {
            console.error('Monitor or its _sendToClient method is not available');
            return;
        }

        this.monitor._sendToClient(client, message);
    }
}
