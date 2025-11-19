class SeNARSUI {
    constructor() {
        this.ws = null;
        this.connectionStatus = 'disconnected';
        this.messageCounter = 1;
        this.commandHistory = [];
        this.cy = null; // Cytoscape instance
        this.graphData = {
            nodes: new Map(),
            edges: new Map()
        };

        this.initializeElements();
        this.setupEventListeners();
        this.initializeGraph();
        this.connectWebSocket();
    }

    initializeElements() {
        this.elements = {
            statusIndicator: document.getElementById('status-indicator'),
            connectionStatus: document.getElementById('connection-status'),
            messageCount: document.getElementById('message-count'),
            logsContainer: document.getElementById('logs-container'),
            commandInput: document.getElementById('command-input'),
            sendButton: document.getElementById('send-button'),
            quickCommands: document.getElementById('quick-commands'),
            execQuick: document.getElementById('exec-quick'),
            showHistory: document.getElementById('show-history'),
            clearLogs: document.getElementById('clear-logs'),
            refreshGraph: document.getElementById('refresh-graph'),
            toggleLive: document.getElementById('toggle-live'),
            demoSelect: document.getElementById('demo-select'),
            runDemo: document.getElementById('run-demo'),
            graphDetails: document.getElementById('graph-details')
        };
    }

    setupEventListeners() {
        // Command input events
        this.elements.sendButton.addEventListener('click', () => this.sendCommand());
        this.elements.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendCommand();
        });

        // Quick command events
        this.elements.execQuick.addEventListener('click', () => {
            if (this.elements.quickCommands.value) {
                this.elements.commandInput.value = this.elements.quickCommands.value;
                this.sendCommand();
            }
        });

        // Show history
        this.elements.showHistory.addEventListener('click', () => {
            this.showCommandHistory();
        });

        // Clear logs
        this.elements.clearLogs.addEventListener('click', () => {
            this.elements.logsContainer.innerHTML = '';
            this.addLogEntry('Cleared logs', 'info', '🧹');
        });

        // Graph controls
        this.elements.refreshGraph.addEventListener('click', () => {
            this.sendMessage('control/refresh', {});
            this.addLogEntry('Graph refresh requested', 'info', '🔄');
        });

        this.elements.toggleLive.addEventListener('click', () => {
            this.sendMessage('control/toggleLive', {});
            // Toggle button text
            this.elements.toggleLive.textContent =
                this.elements.toggleLive.textContent === 'Pause Live' ? 'Resume Live' : 'Pause Live';
            this.addLogEntry('Live updates toggled', 'info', '⚙️');
        });

        // Demo events
        this.elements.runDemo.addEventListener('click', () => {
            this.runDemo(this.elements.demoSelect.value);
        });
    }

    initializeGraph() {
        this.cy = cytoscape({
            container: document.getElementById('graph-container'),
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#4ec9b0',
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'color': '#ffffff',
                        'font-size': '12px',
                        'width': 'mapData(weight, 0, 100, 20, 80)',
                        'height': 'mapData(weight, 0, 100, 20, 80)'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#dcdcdc',
                        'target-arrow-color': '#dcdcdc',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                },
                {
                    selector: 'node[type = "concept"]',
                    style: {
                        'background-color': '#4ec9b0'
                    }
                },
                {
                    selector: 'node[type = "task"]',
                    style: {
                        'background-color': '#ff8c00'
                    }
                },
                {
                    selector: 'node[type = "question"]',
                    style: {
                        'background-color': '#9d68f0'
                    }
                }
            ],
            layout: { name: 'cose' }
        });

        // Add click event for graph details
        this.cy.on('tap', 'node', (event) => {
            const node = event.target;
            this.elements.graphDetails.innerHTML = `
                <strong>Node:</strong> ${node.data('label')}<br>
                <strong>ID:</strong> ${node.id()}<br>
                <strong>Type:</strong> ${node.data('type') || 'unknown'}<br>
                <strong>Weight:</strong> ${node.data('weight') || 0}
            `;
        });

        this.cy.on('tap', 'edge', (event) => {
            const edge = event.target;
            this.elements.graphDetails.innerHTML = `
                <strong>Edge:</strong> ${edge.data('label') || 'Relationship'}<br>
                <strong>Source:</strong> ${edge.data('source')}<br>
                <strong>Target:</strong> ${edge.data('target')}<br>
                <strong>Type:</strong> ${edge.data('type') || 'unknown'}
            `;
        });
    }

    connectWebSocket() {
        try {
            // Use the same host as the page, default to localhost:8080
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname || 'localhost';
            const port = '8081'; // Connect to the backend WebSocket port
            const wsUrl = `${protocol}//${host}:${port}/ws`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.connectionStatus = 'connected';
                this.updateStatus();
                this.showNotification('Connected to SeNARS server', 'success');
            };

            this.ws.onclose = () => {
                this.connectionStatus = 'disconnected';
                this.updateStatus();
                this.showNotification('Disconnected from server', 'warning');

                // Attempt to reconnect after 3 seconds
                setTimeout(() => this.connectWebSocket(), 3000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.connectionStatus = 'error';
                this.updateStatus();
                this.showNotification('WebSocket connection error', 'error');
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                    // Update graph based on message type
                    this.updateGraph(message);
                } catch (e) {
                    console.error('Error parsing message:', e);
                    this.addLogEntry(`Invalid message format: ${event.data}`, 'error', '🚨');
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.connectionStatus = 'error';
            this.updateStatus();
            this.showNotification('Failed to establish WebSocket connection', 'error');
        }
    }

    updateStatus() {
        const statusText = this.connectionStatus.charAt(0).toUpperCase() + this.connectionStatus.slice(1);
        this.elements.connectionStatus.textContent = statusText;

        // Update indicator class
        this.elements.statusIndicator.className = 'status-indicator';
        this.elements.statusIndicator.classList.add(`status-${this.connectionStatus}`);
    }

    sendCommand() {
        const command = this.elements.commandInput.value.trim();
        if (!command) return;

        // Add to history
        this.commandHistory.push({
            command: command,
            timestamp: new Date(),
            status: 'sent'
        });

        // Add to log
        this.addLogEntry(`> ${command}`, 'input', '⌨️');

        // Send via WebSocket
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.sendMessage('narseseInput', { input: command });
        } else {
            this.addLogEntry(`Cannot send: Not connected`, 'error', '❌');
        }

        // Clear input
        this.elements.commandInput.value = '';
    }

    sendMessage(type, payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = { type, payload };
            this.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    handleMessage(message) {
        // Handle batch events
        if (message.type === 'eventBatch') {
            const events = message.data || [];
            this.addLogEntry(`Received batch of ${events.length} events`, 'debug', '📦');

            events.forEach(event => {
                // Normalize event structure to match what handleMessage expects
                // WebSocketMonitor sends { type, data, ... }
                // We expect { type, payload: data }
                this.handleMessage({
                    type: event.type,
                    payload: event.data,
                    timestamp: event.timestamp
                });
            });
            return;
        }

        // Update message count
        const count = this.messageCounter++;
        this.elements.messageCount.textContent = count;

        // Determine message type and format accordingly
        let content, type, icon;

        // Filter out noisy events or handle them specifically
        if (message.type === 'cycle.start' || message.type === 'cycle.complete') {
            return; // Too noisy for main log
        }

        switch (message.type) {
            case 'narsese.result':
                // Check if the result indicates success or failure based on content
                if (message.payload?.result && message.payload.result.startsWith('✅')) {
                    content = message.payload.result;
                    type = 'success';
                    icon = '✅';
                } else if (message.payload?.result && message.payload.result.startsWith('❌')) {
                    content = message.payload.result;
                    type = 'error';
                    icon = '❌';
                } else if (message.payload?.success === true) {
                    content = message.payload.result || message.payload.message || 'Command processed';
                    type = 'success';
                    icon = '✅';
                } else {
                    content = message.payload?.result || message.payload?.message || 'Command processed';
                    type = 'info';
                    icon = '✅';
                }
                break;
            case 'narsese.error':
                content = message.payload?.error || message.payload?.message || 'Narsese processing error';
                type = 'error';
                icon = '❌';
                break;
            case 'task.added':
            case 'task.input':
                content = message.payload?.task || message.payload?.input || JSON.stringify(message.payload);
                type = 'task';
                icon = '📥';
                break;
            case 'concept.created':
            case 'concept.updated':
            case 'concept.added':
                content = message.payload?.concept || message.payload?.term || JSON.stringify(message.payload);
                type = 'concept';
                icon = '🧠';
                break;
            case 'question.answered':
                content = message.payload?.answer || message.payload?.question || JSON.stringify(message.payload);
                type = 'info';
                icon = '❓';
                break;
            case 'reasoning.derivation':
            case 'reasoning.step':
                content = message.payload?.derivation || message.payload?.step || JSON.stringify(message.payload);
                type = 'info';
                icon = '🔍';
                break;
            case 'error':
            case 'error.message':
                content = message.payload?.message || message.payload?.error || JSON.stringify(message.payload);
                type = 'error';
                icon = '🚨';
                break;
            case 'connection':
                content = message.payload?.message || message.data?.message || 'Connected to server';
                type = 'info';
                icon = '🌐';
                break;
            case 'memorySnapshot':
                this.updateGraphFromSnapshot(message.payload);
                content = `Memory snapshot received: ${message.payload?.concepts?.length || 0} concepts`;
                type = 'info';
                icon = '📊';
                break;
            case 'info':
            case 'log':
                content = message.payload?.message || JSON.stringify(message.payload);
                type = 'info';
                icon = 'ℹ️';
                break;
            case 'control.result':
                content = message.payload?.result || message.payload?.message || 'Control command executed';
                type = 'info';
                icon = '⚙️';
                break;
            default:
                content = `${message.type}: ${JSON.stringify(message.payload || message.data || message)}`;
                type = 'info';
                icon = '📝';
        }

        this.addLogEntry(content, type, icon);

        // Update graph for relevant events
        this.updateGraph(message);
    }

    updateGraphFromSnapshot(payload) {
        if (!this.cy || !payload.concepts) return;

        // Clear existing elements
        this.cy.elements().remove();

        // Add nodes from concepts
        const nodes = [];

        payload.concepts.forEach((concept, index) => {
            nodes.push({
                group: 'nodes',
                data: {
                    id: concept.id || `concept_${index}`,
                    label: concept.term || `Concept ${index}`,
                    type: concept.type || 'concept',
                    weight: concept.truth?.confidence ? concept.truth.confidence * 100 : 50
                }
            });
        });

        // Add nodes to graph
        if (nodes.length > 0) {
            this.cy.add(nodes);
        }

        // Layout the graph
        this.cy.layout({ name: 'cose' }).run();
    }

    updateGraph(message) {
        if (!this.cy) return;

        // Handle concept creation
        if (message.type === 'concept.created' && message.payload) {
            const concept = message.payload;
            const nodeId = concept.id || `concept_${Date.now()}`;

            // Don't add duplicate nodes
            if (!this.cy.getElementById(nodeId).length) {
                this.cy.add([{
                    group: 'nodes',
                    data: {
                        id: nodeId,
                        label: concept.term || concept.id,
                        type: concept.type || 'concept',
                        weight: concept.truth?.confidence ? concept.truth.confidence * 100 : 50
                    }
                }]);

                // Update layout
                this.cy.layout({ name: 'cose' }).run();
            }
        }
        // Handle task addition
        else if (message.type === 'task.added' && message.payload) {
            const task = message.payload;
            const taskId = task.id || `task_${Date.now()}`;

            if (!this.cy.getElementById(taskId).length) {
                this.cy.add([{
                    group: 'nodes',
                    data: {
                        id: taskId,
                        label: task.term || task.input || task.id,
                        type: task.type || 'task',
                        weight: 30
                    }
                }]);

                this.cy.layout({ name: 'cose' }).run();
            }
        }
        // Handle question answered
        else if (message.type === 'question.answered' && message.payload) {
            const answer = message.payload;
            const answerId = `answer_${Date.now()}`;

            if (!this.cy.getElementById(answerId).length) {
                this.cy.add([{
                    group: 'nodes',
                    data: {
                        id: answerId,
                        label: answer.answer || answer.question || 'Answer',
                        type: 'question',
                        weight: 40
                    }
                }]);

                this.cy.layout({ name: 'cose' }).run();
            }
        }
    }

    addLogEntry(content, type = 'info', icon = '📝') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry type-${type}`;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'log-entry-icon';
        iconSpan.textContent = icon;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'log-entry-content';
        contentDiv.textContent = content;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-entry-time';
        timeSpan.textContent = new Date().toLocaleTimeString();
        timeSpan.id = `time-${this.messageCounter}`;

        logEntry.appendChild(iconSpan);
        logEntry.appendChild(contentDiv);
        logEntry.appendChild(timeSpan);

        this.elements.logsContainer.appendChild(logEntry);

        // Auto-scroll to bottom
        this.elements.logsContainer.scrollTop = this.elements.logsContainer.scrollHeight;
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        container.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                container.removeChild(notification);
            }
        }, 5000);
    }

    showCommandHistory() {
        if (this.commandHistory.length === 0) {
            this.addLogEntry('No commands in history', 'info', '📋');
            return;
        }

        this.addLogEntry(`Command History (${this.commandHistory.length} commands):`, 'info', '📋');
        const recent = this.commandHistory.slice(-10);
        recent.forEach((entry, i) => {
            const status = entry.status === 'error' ? '❌' : '✅';
            this.addLogEntry(`${status} [${this.commandHistory.length - recent.length + i + 1}] ${entry.command}`, 'debug', '📜');
        });
    }

    runDemo(demoName) {
        if (!demoName) {
            this.addLogEntry('Please select a demo', 'warning', '⚠️');
            return;
        }

        this.addLogEntry(`Running ${demoName} demo`, 'info', '🎬');

        // Define demo sequences
        const demos = {
            inheritance: [
                '<{cat} --> animal>.',
                '<{lion} --> cat>.',
                '<lion --> animal>?',
                '5'
            ],
            similarity: [
                '<(bird & flyer) <-> (bat & flyer)>.',
                '<bird <-> flyer>?',
                '<bat <-> flyer>?'
            ],
            temporal: [
                '<(sky & dark) =/> (rain & likely)>.',
                '<(clouds & gathering) =/> (sky & dark)>.',
                '<clouds & gathering> ?'
            ]
        };

        const commands = demos[demoName] || [];
        commands.forEach((cmd, i) => {
            setTimeout(() => {
                this.elements.commandInput.value = cmd;
                this.sendCommand();
            }, i * 1500);
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SeNARSUI();
});
