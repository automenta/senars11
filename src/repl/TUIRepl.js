import { ReplEngine } from './ReplEngine.js';
import { EventEmitter } from 'events';
import { TaskEditorComponent } from './components/TaskEditorComponent.js';
import { LogViewerComponent } from './components/LogViewerComponent.js';
import { StatusBarComponent } from './components/StatusBarComponent.js';
import { TaskInputComponent } from './components/TaskInputComponent.js';
import { ViewManager } from '../repl/ViewManager.js';
import blessed from 'blessed';
import WebSocket from 'ws';

/**
 * New TUI REPL with component-based architecture
 * Implements the full observability and control of system state through editing the active set of Input Tasks
 */
export class TUIRepl extends EventEmitter {
    constructor(config = {}) {
        super();

        this.engine = new ReplEngine(config);
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'SeNARS Reasoning Engine 🚀',
            dockBorders: true,
            fullUnicode: true, // Enable Unicode characters like emojis
            autoPadding: true
        });

        this.components = {};
        this.viewManager = null;
        
        // WebSocket remote console configuration
        this.remoteConfig = {
            wsUrl: config.remote?.wsUrl || 'ws://localhost:8080/ws',
            reconnectInterval: config.remote?.reconnectInterval || 5000,
            maxReconnectAttempts: config.remote?.maxReconnectAttempts || 10,
            enabled: config.remote?.enabled !== false, // Default to true if not explicitly disabled
            session: config.remote?.session || 'tui-session',
            auth: {
                enabled: config.remote?.auth?.enabled !== false,
                token: config.remote?.auth?.token || null,
                user: config.remote?.auth?.user || null,
                password: config.remote?.auth?.password || null
            },
            security: {
                useTLS: config.remote?.security?.useTLS || false,  // Use wss:// instead of ws://
                validateCert: config.remote?.security?.validateCert !== false,  // Validate SSL certificates
                encryption: config.remote?.security?.encryption || 'none'  // 'none', 'aes', etc.
            }
        };
        
        this.ws = null;
        this.wsConnected = false;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;

        this._setupComponents();
        this._setupEventListeners();
        this._setupViewManager();
        this._setupGlobalKeyBindings();
        
        if (this.remoteConfig.enabled) {
            this._setupRemoteConnection();
        }
    }

    _setupComponents() {
        this.components.statusBar = new StatusBarComponent({
            elementConfig: {
                bottom: '0',
                left: '0',
                width: '100%',
                height: '1',
                border: { type: 'line' },
                style: { fg: 'white', bg: 'blue', border: { fg: 'yellow' } },
                content: ''
            },
            parent: this.screen,
            eventEmitter: this,
            engine: this.engine
        });

        this.components.taskEditor = new TaskEditorComponent({
            elementConfig: {
                top: '0',
                left: '0',
                width: '40%',
                height: '100%-1',
                border: { type: 'line' },
                style: {
                    fg: 'white',
                    bg: 'black',
                    border: { fg: 'green' },
                    selected: { fg: 'black', bg: 'lightgreen' }
                },
                selectedFg: 'black',
                selectedBg: 'lightgreen',
                selectedBold: true,
                items: [],
                interactive: true,
                scrollable: true,
                mouse: true,
                keys: true,
                vi: true
            },
            parent: this.screen,
            eventEmitter: this,
            engine: this.engine
        });

        this.components.logViewer = new LogViewerComponent({
            elementConfig: {
                top: '0',
                left: '40%',
                width: '60%',
                height: '100%-1',
                border: { type: 'line' },
                style: { fg: 'white', bg: 'black', border: { fg: 'cyan' } },
                scrollable: true,
                alwaysScroll: true,
                mouse: true,
                keys: true,
                vi: true
            },
            parent: this.screen,
            eventEmitter: this,
            maxScrollback: 1000
        });

        // Initialize all components
        Object.values(this.components).forEach(component => component.init());

        // Create and initialize task input component
        this.components.taskInput = new TaskInputComponent({
            parent: this.screen,
            eventEmitter: this,
            engine: this.engine,
            onSubmit: (inputText) => {
                if (inputText?.trim()) {
                    const newTask = {
                        id: Date.now().toString(),
                        content: inputText.trim(),
                        priority: 0.5, // Default priority
                        timestamp: Date.now(),
                        processed: false,
                        pending: true
                    };

                    this.components.taskEditor.addTask(newTask);
                    this.engine.processInput(inputText.trim()).catch(error => {
                        this.components.logViewer.addError(`❌ Error processing task: ${error.message}`);
                    });
                }
            }
        });

        this.components.taskInput.init();
    }

    _setupViewManager() {
        this.viewManager = new ViewManager({
            screen: this.screen,
            eventEmitter: this,
            components: this.components
        });

        this.viewManager.addViewShortcuts(this.screen);
        this.viewManager.switchView('vertical-split');
    }

    _setupEventListeners() {
        // Engine event handlers
        const engineHandlers = {
            'engine.ready': (data) => {
                this.components.logViewer.addInfo(data.message);
                this.components.statusBar.updateContent();
            },
            'narsese.processed': (data) => {
                this.components.logViewer.addInfo(data.result);
                this._displayLatestBeliefs(data.beliefs);
                this._updateTaskStatus(data.taskId, {
                    processed: true, pending: false, success: true, completionTime: Date.now()
                });
            },
            'narsese.error': (data) => {
                this.components.logViewer.addError(`❌ Error: ${data.error}`);
                this._updateTaskStatus(data.taskId, {
                    processed: true, pending: false, error: true, errorTime: Date.now(), error: data.error
                });
            },
            'command.error': (data) => this.components.logViewer.addError(`❌ Error executing command: ${data.error}`),
            'engine.quit': () => { this.screen.destroy(); process.exit(0); },
            'nar.cycle.step': (data) => this.components.logViewer.addInfo(`⏭️  Single cycle executed. Cycle: ${data.cycle}`),
            'nar.cycle.running': () => this.components.logViewer.addInfo('🏃 Running continuously...'),
            'nar.cycle.stop': () => this.components.logViewer.addInfo('🛑 Run stopped by user.'),
            'engine.reset': () => this.components.logViewer.addInfo('🔄 NAR system reset successfully.'),
            'engine.save': (data) => this.components.logViewer.addInfo(`💾 NAR state saved successfully to ${data.filePath}`),
            'engine.load': (data) => this.components.logViewer.addInfo(`💾 NAR state loaded successfully from ${data.filePath}`)
        };

        // Register command-specific handlers
        ['help', 'status', 'memory', 'trace', 'reset', 'save', 'load', 'demo'].forEach(cmd => {
            engineHandlers[`command.${cmd}`] = (data) => this.components.logViewer.addInfo(data.result);
        });

        // Register all event handlers
        Object.entries(engineHandlers).forEach(([event, handler]) => this.engine.on(event, handler));

        // Component-specific events
        this._setupComponentEventHandlers();
    }

    _displayLatestBeliefs(beliefs) {
        if (beliefs?.length > 0) {
            this.components.logViewer.addInfo('🎯 Latest beliefs:');
            beliefs.slice(-3).forEach(task => {
                const truthStr = task.truth?.toString() ?? '';
                this.components.logViewer.addInfo(`  ${task.term?.name ?? 'Unknown'} ${truthStr} [P: ${task.priority?.toFixed(3) ?? 'N/A'}]`);
            });
        }
    }

    _updateTaskStatus(taskId, updates) {
        if (taskId) {
            this.components.taskEditor.updateTaskStatus(taskId, updates);
        }
    }

    _setupComponentEventHandlers() {
        this.components.taskEditor.on('new-task', (data) => {
            this.engine.processInput(data.task.content).catch(error => {
                this.components.logViewer.addError(`❌ Error processing task: ${error.message}`);
            });
        });

        const taskActions = {
            'task-deleted': (data) => this.components.logViewer.addInfo(`🗑️ Task deleted: ${data.task.content}`),
            'task-edited': (data) => this.components.logViewer.addInfo(`✏️ Task edited: ${data.newTask.content}`),
            'priority-adjusted': (data) => {
                if (data.task.id) {
                    this.engine.inputManager.updatePriorityById(data.task.id, data.newPriority, data.mode);
                }
                this.components.logViewer.addInfo(`⚖️ Priority adjusted for task: ${data.newPriority} (mode: ${data.mode})`);
            }
        };

        Object.entries(taskActions).forEach(([event, handler]) => {
            this.components.taskEditor.on(event, handler);
        });

        this.components.logViewer.on('log-added', (data) => {
            if (data.level === 'error') {
                this.components.statusBar.addAlert();
            }
        });

        this.components.statusBar.on('pulldown-menu-toggle', (data) => {
            if (data.isOpen) {
                this.components.logViewer.addInfo('📁 Menu opened: Use shortcuts for options');
            }
        });

        this.components.statusBar.on('menu-exit', () => {
            this.engine.shutdown();
            this.screen.destroy();
            process.exit(0);
        });

        this.components.statusBar.on('connection-state-changed', (data) => {
            this.components.logViewer.addInfo(`🌐 Connection state changed to: ${data.state}`);
        });
    }

    _setupRemoteConnection() {
        if (!this.remoteConfig.enabled) return;

        // Initialize session management
        this._setupSessionManagement();
        
        this._connectToWebSocket();
        this._setupRemoteEventListeners();
    }

    _connectToWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        try {
            const url = new URL(this.remoteConfig.wsUrl);
            url.searchParams.append('session', this.remoteConfig.session);
            
            this.ws = new WebSocket(url.toString());

            this.ws.on('open', () => {
                this.wsConnected = true;
                this.reconnectAttempts = 0;
                this.isReconnecting = false;
                
                console.log(`Connected to remote WebSocket: ${url.toString()}`);
                this.components.logViewer.addInfo(`🌐 Connected to remote server: ${this.remoteConfig.wsUrl}`);
                
                // Update status bar connection state
                if (this.components.statusBar) {
                    this.components.statusBar.setConnectionState('remote');
                }
                
                // Emit connection event
                this.emit('remote.connected', { 
                    url: this.remoteConfig.wsUrl,
                    session: this.remoteConfig.session 
                });
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this._handleRemoteMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    this.components.logViewer.addError(`❌ Remote message parse error: ${error.message}`);
                }
            });

            this.ws.on('close', () => {
                this.wsConnected = false;
                
                if (this.components.statusBar) {
                    this.components.statusBar.setConnectionState('local');
                }
                
                this.components.logViewer.addWarning(`🌐 Disconnected from remote server: ${this.remoteConfig.wsUrl}`);
                
                if (this.reconnectAttempts < this.remoteConfig.maxReconnectAttempts) {
                    this.isReconnecting = true;
                    this.reconnectAttempts++;
                    
                    this.components.logViewer.addInfo(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.remoteConfig.maxReconnectAttempts})`);
                    
                    setTimeout(() => {
                        this._connectToWebSocket();
                        this._handleSessionRestoration(); // Attempt to restore session after reconnect
                    }, this.remoteConfig.reconnectInterval);
                } else {
                    this.components.logViewer.addError('❌ Max reconnection attempts reached. Manual reconnection required.');
                    this.emit('remote.disconnected', { reason: 'max_attempts' });
                }
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.components.logViewer.addError(`❌ WebSocket error: ${error.message}`);
                
                if (!this.isReconnecting) {
                    this.emit('remote.error', { error: error.message });
                }
            });

        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            this.components.logViewer.addError(`❌ WebSocket connection setup error: ${error.message}`);
        }
    }

    _handleRemoteMessage(message) {
        const messageTypeHandlers = {
            'narsese.processed': (payload) => this.components.logViewer.addInfo(`🌐 Remote: ${payload?.result || 'Task processed'}`),
            'narsese.error': (payload) => this.components.logViewer.addError(`🌐 Remote: ${payload?.error || 'Processing error'}`),
            'nar.cycle.step': (payload) => this.components.logViewer.addInfo(`🌐 Remote cycle: ${payload?.cycle || 'Unknown'}`),
            'command.output': (payload) => this.components.logViewer.addInfo(`🌐 Remote command: ${payload?.result || 'Executed'}`),
            'engine.event': (payload) => this.components.logViewer.addInfo(`🌐 Remote event: ${JSON.stringify(payload)}`),
            'system.stats': (payload) => this.components.statusBar?.updateStats?.(payload),
            // Session management and connection quality messages
            'session-accepted': (payload) => {
                this.components.logViewer.addInfo(`🔐 Session accepted: ${payload?.sessionId || 'Unknown'}`);
                this.sessionMetadata.lastActivity = Date.now();
            },
            'session-rejected': (payload) => {
                this.components.logViewer.addError(`🔒 Session rejected: ${payload?.reason || 'Authentication failed'}`);
                this.emit('session-rejected', payload);
            },
            'session-restored': (payload) => {
                this.components.logViewer.addInfo(`🔄 Session restored: ${payload?.sessionId || 'Unknown'}`);
                this.sessionMetadata.lastActivity = Date.now();
            },
            'ping': (payload) => {
                // Respond to ping from server with pong
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    const pongMessage = {
                        type: 'pong',
                        timestamp: Date.now(),
                        serverTimestamp: payload.timestamp,
                        clientId: this.sessionMetadata.clientId
                    };
                    this.ws.send(JSON.stringify(pongMessage));
                }
            },
            'pong': (payload) => {
                // Calculate round-trip time for connection quality
                const rtt = Date.now() - payload.clientTimestamp;
                this.lastPingResponseTime = rtt;
                this.sessionMetadata.lastActivity = Date.now();
            },
            'connection-quality': (payload) => {
                this.connectionQuality = { ...this.connectionQuality, ...payload };
                this.components.statusBar?.updateConnectionQuality?.(this.connectionQuality);
            }
        };

        const handler = messageTypeHandlers[message.type] || ((payload) => this.components.logViewer.addInfo(`🌐 Remote (${message.type}): ${JSON.stringify(payload || {})}`));
        handler(message.payload);
    }

    _setupRemoteEventListeners() {
        // Listen for local events and potentially relay them to remote
        const localEventToRemote = {
            'narsese.processed': 'narsese.processed',
            'narsese.error': 'narsese.error',
            'nar.cycle.step': 'nar.cycle.step',
            'engine.reset': 'engine.reset',
            'engine.save': 'engine.save',
            'engine.load': 'engine.load'
        };

        Object.entries(localEventToRemote).forEach(([localEvent, remoteType]) => {
            this.engine.on(localEvent, (data) => {
                if (this.wsConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                    // Send event to remote server
                    const remoteMessage = {
                        type: remoteType,
                        payload: data,
                        source: 'tui-client',
                        timestamp: Date.now()
                    };
                    
                    this.ws.send(JSON.stringify(remoteMessage), (error) => {
                        if (error) {
                            console.error('Error sending to remote:', error);
                        }
                    });
                }
            });
        });
    }

    /**
     * Send a message to the remote WebSocket server
     */
    sendToRemote(message) {
        if (this.wsConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message), (error) => {
                if (error) {
                    console.error('Error sending to remote:', error);
                    this.components.logViewer.addError(`❌ Failed to send to remote: ${error.message}`);
                }
            });
            return true;
        }
        return false;
    }

    /**
     * Toggle remote connection
     */
    toggleRemoteConnection() {
        if (this.wsConnected) {
            if (this.ws) {
                this.ws.close();
            }
            this.components.logViewer.addInfo('🌐 Remote connection closed.');
        } else {
            this._connectToWebSocket();
        }
    }

    /**
     * Update connection status and UI feedback
     */
    _updateConnectionStatus() {
        if (this.components.statusBar) {
            const state = this.wsConnected ? 'remote' : 'local';
            this.components.statusBar.setConnectionState(state);
        }
    }

    _setupGlobalKeyBindings() {
        // Exit on Ctrl+C
        this.screen.key(['C-c'], () => {
            // Close WebSocket connection gracefully
            if (this.ws) {
                this.ws.close();
            }
            this.engine.shutdown();
            this.screen.destroy();
            process.exit(0);
        });

        const keyBindings = {
            'C-l': () => this.viewManager.switchView('log-only'),
            'C-t': () => this.viewManager.switchView('vertical-split'),
            'C-g': () => this.viewManager.switchView('dynamic-grouping'),
            'C-k': () => {
                this.components.logViewer.clearLogs();
                this.components.logViewer.addInfo('🗑️ Logs cleared');
            },
            'f1': () => this.components.logViewer.addInfo('💡 Press Ctrl+L/T/G to switch views, F1 for menu, Ctrl+C to exit'),
            'f2': () => this.viewManager.switchView('vertical-split'),
            'f3': () => this.viewManager.switchView('log-only'),
            'f4': () => this.viewManager.switchView('dynamic-grouping'),
            'C-h': () => this.components.logViewer.setLevelFilter('all'),
            'C-r': () => {
                this.components.logViewer.addInfo('🔄 Refreshing system...');
                this.engine.reset();
            },
            'C-R': () => this.remoteConfig.enabled && (
                this.components.logViewer.addInfo('🔄 Forcing remote reconnection...'),
                this._connectToWebSocket()
            ),
            'C-u': () => this.remoteConfig.enabled && this.toggleRemoteConnection(),
            '?': () => this.components.logViewer.addInfo('❓ Keyboard shortcuts: Ctrl+L/T/G=Views, F1-F4=Functions, Ctrl+C=Exit, Ctrl+U=Toggle remote, ?=Help')
        };

        Object.entries(keyBindings).forEach(([key, handler]) => {
            this.screen.key([key], handler);
        });
    }

    async start() {
        const welcomeMessages = [
            'Welcome to SeNARS! 🚀',
            'Type commands or enter Narsese statements.',
            'Use Ctrl+L/T/G to switch views, F1 for menu, Ctrl+C to exit.'
        ];

        welcomeMessages.forEach(msg => this.components.logViewer.addInfo(msg));

        if (this.remoteConfig.enabled) {
            this.components.logViewer.addInfo(`🌐 Remote console: ${this.remoteConfig.wsUrl} (Ctrl+U to toggle)`);
        }

        await this.engine.initialize();

        // Render the screen first
        this.screen.render();
        
        // Add a slight delay to ensure all components are properly sized
        setTimeout(() => {
            try {
                this.components.taskInput?.focus?.();
            } catch (e) {
                console.warn('Could not focus task input:', e.message);
            }
        }, 200);
    }
    
    async shutdown() {
        // Close WebSocket connection gracefully
        if (this.ws) {
            this.ws.close();
        }
        
        await this.engine.shutdown();
        this.screen.destroy();
    }
    
    /**
     * Manage session lifecycle for remote connections
     */
    _setupSessionManagement() {
        // Create session metadata
        this.sessionMetadata = {
            id: this.remoteConfig.session,
            startTime: Date.now(),
            lastActivity: Date.now(),
            reconnectCount: 0,
            clientId: `tui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            capabilities: ['tasks', 'logs', 'status']
        };
        
        // Setup ping/pong mechanism for connection health
        this._setupConnectionHealthCheck();
    }
    
    /**
     * Setup connection health check with ping/pong mechanism
     */
    _setupConnectionHealthCheck() {
        // Send ping every 30 seconds to keep connection alive
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now(),
                    clientId: this.sessionMetadata.clientId
                }));
            }
        }, 30000); // 30 seconds ping interval
        
        // Also monitor for connection quality
        this.connectionQualityMonitor = setInterval(() => {
            this._updateConnectionQuality();
        }, 5000); // Update quality metrics every 5 seconds
    }
    
    /**
     * Update connection quality metrics
     */
    _updateConnectionQuality() {
        if (!this.ws) return;
        
        const connectionState = this.ws.readyState;
        const isHealthy = connectionState === WebSocket.OPEN;
        
        // Update quality metrics
        this.connectionQuality = {
            state: connectionState,
            isHealthy,
            pingLatency: this.lastPingResponseTime || 'N/A',
            lastActivity: this.sessionMetadata.lastActivity
        };
        
        // Emit quality update if status bar is available
        if (this.components.statusBar) {
            this.components.statusBar.updateConnectionQuality(this.connectionQuality);
        }
    }
    
    /**
     * Handle session restoration when reconnecting
     */
    _handleSessionRestoration() {
        if (this.sessionMetadata) {
            this.sessionMetadata.reconnectCount++;
            this.components.logViewer.addInfo(`🔄 Restoring session: ${this.sessionMetadata.id} (attempt #${this.sessionMetadata.reconnectCount})`);
            
            // Send session restoration request
            const restoreMessage = {
                type: 'session-restore',
                payload: {
                    sessionId: this.sessionMetadata.id,
                    clientId: this.sessionMetadata.clientId,
                    metadata: this.sessionMetadata
                },
                timestamp: Date.now()
            };
            
            setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify(restoreMessage));
                }
            }, 200);
        }
    }
}