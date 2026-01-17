import {Config} from '../config/Config.js';
import {CommandRegistry} from '@senars/core';

export class CommandProcessor {
    constructor(webSocketManager, logger, graphManager = null) {
        this.webSocketManager = webSocketManager;
        this.logger = logger;
        this.graphManager = graphManager;
        this.history = [];
        this.maxHistorySize = Config.getConstants().MAX_HISTORY_SIZE;
        this.commandRegistry = new CommandRegistry({logger: this.logger});
        this._registerUICommands();
    }

    _registerUICommands() {
        const commands = [
            ['/nodes', ctx => this._listNodes(ctx), 'List all nodes in graph'],
            ['/tasks', ctx => this._listTasks(ctx), 'Show task nodes'],
            ['/concepts', ctx => this._listConcepts(ctx), 'Show concept nodes'],
            ['/refresh', ctx => this.executeRefresh(ctx), 'Request graph refresh'],
            ['/goals', ctx => this._listGoals(ctx), 'Show current goals'],
            ['/beliefs', ctx => this._listBeliefs(ctx), 'Show current beliefs'],
            ['/step', ctx => this._executeStep(ctx), 'Execute single reasoning step'],
            ['/run', ctx => this._executeRun(ctx), 'Start continuous execution'],
            ['/stop', ctx => this._executeStop(ctx), 'Stop continuous execution'],
            ['/inspect', ctx => this._executeInspect(ctx), 'Inspect a term or node'],
            ['/viz', ctx => this._executeViz(ctx), 'Visualize data (graph, chart, md)']
        ];
        commands.forEach(([cmd, handler, desc]) =>
            this.commandRegistry.registerCommand(cmd, handler, {description: desc})
        );
    }

    getAvailableCommands() {
        return this.commandRegistry.getCommandList();
    }

    _listNodes(ctx) {
        if (!this._validateGraphManager()) return;
        const count = this.graphManager.getNodeCount();
        this.logger.log(`Total nodes in graph: ${count}`, 'info', '📊');
        return true;
    }

    _listTasks(ctx) {
        if (!this._validateGraphManager()) return;
        const tasks = this.graphManager.getTaskNodes();
        this.logger.log(`Task nodes: ${tasks.length}`, 'info', '📋');
        return true;
    }

    _listConcepts(ctx) {
        if (!this._validateGraphManager()) return;
        const concepts = this.graphManager.getConceptNodes();
        this.logger.log(`Concept nodes: ${concepts.length}`, 'info', '💡');
        return true;
    }

    _listGoals(ctx) {
        this.webSocketManager.sendMessage('command.execute', {command: 'goals', args: []});
        return true;
    }

    _listBeliefs(ctx) {
        this.webSocketManager.sendMessage('command.execute', {command: 'beliefs', args: []});
        return true;
    }

    _executeStep(ctx) {
        this.executeControlCommand('control/step', {});
        this.logger.log('Single step executed', 'info', '⏯');
        return true;
    }

    _executeRun(ctx) {
        this.executeControlCommand('control/run', {});
        this.logger.log('Continuous execution started', 'info', '▶️');
        return true;
    }

    _executeStop(ctx) {
        this.executeControlCommand('control/stop', {});
        this.logger.log('Execution stopped', 'info', '⏸');
        return true;
    }

    _executeInspect(ctx) {
        const args = ctx.args || [];
        if (args.length === 0) {
            this.logger.log('Usage: /inspect <term>', 'error');
            return false;
        }

        const term = args[0];
        // For now, we mock fetching data or grab from GraphManager if available
        if (this.graphManager && this.graphManager.cy) {
            const node = this.graphManager.cy.getElementById(term);
            const neighborhood = node.length ? node.neighborhood().add(node) : null;

            if (neighborhood && neighborhood.length > 0) {
                 // Convert to format for GraphWidget
                 const graphData = [];
                 neighborhood.nodes().forEach(n => {
                     graphData.push({
                         id: n.id(),
                         label: n.data('label'),
                         type: n.data('type'),
                         val: n.data('weight') || 50
                     });
                 });
                 neighborhood.edges().forEach(e => {
                     graphData.push({
                         source: e.data('source'),
                         target: e.data('target'),
                         label: e.data('label')
                     });
                 });

                 this.logger.logWidget('GraphWidget', graphData);
                 return true;
            }
        }

        // Fallback: request from backend
        this.webSocketManager.sendMessage('command.execute', { command: 'inspect', args: [term] });
        return true;
    }

    _executeViz(ctx) {
        const args = ctx.args || [];
        if (args.length < 2) {
            this.logger.log('Usage: /viz <type> <data_json_or_text>', 'error');
            return false;
        }

        const type = args[0];
        const dataStr = args.slice(1).join(' ');

        try {
            if (type === 'md' || type === 'markdown') {
                this.logger.logMarkdown(dataStr);
            } else if (type === 'graph') {
                const data = JSON.parse(dataStr);
                this.logger.logWidget('GraphWidget', data);
            } else if (type === 'chart') {
                const data = JSON.parse(dataStr);
                this.logger.logWidget('ChartWidget', data);
            } else {
                this.logger.log(`Unknown visualization type: ${type}`, 'error');
            }
        } catch (e) {
             this.logger.log(`Error parsing visualization data: ${e.message}`, 'error');
        }
        return true;
    }

    processCommand(command, isDebug = false, mode = 'narsese') {
        const trimmedCommand = command?.trim();
        if (!trimmedCommand) return false;

        this._addToHistory(trimmedCommand);
        this.logger.log(`> ${trimmedCommand}`, 'input', '⌨️');

        if (trimmedCommand.startsWith('/')) {
            this._processDebugCommand(trimmedCommand);
            return true;
        }

        if (!this.webSocketManager.isConnected()) {
            this.logger.log('Cannot send: Not connected', 'error', '❌');
            return false;
        }

        this.webSocketManager.sendMessage(
            mode === 'agent' ? 'agent/input' : 'narseseInput',
            {input: trimmedCommand}
        );
        return true;
    }

    _processDebugCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();

        // Fix: args was missing in ctx for command registry execution
        const context = {
            webSocketManager: this.webSocketManager,
            logger: this.logger,
            graphManager: this.graphManager,
            commandProcessor: this,
            args: parts.slice(1)
        };

        if (this.commandRegistry.commands.has(cmd)) {
            this.commandRegistry.executeCommand(command, context);
        } else if (this.webSocketManager.isConnected()) {
            this.webSocketManager.sendMessage('command.execute', {
                command: cmd.substring(1),
                args: parts.slice(1)
            });
        } else {
            this.logger.log('Cannot forward command: Not connected', 'error', '❌');
        }
    }

    /**
     * Register a new command with the command registry
     */
    registerCommand(command, handler) {
        this.commandRegistry.registerCommand(command, handler);
        return this;
    }

    /**
     * Unregister a command from the command registry
     */
    unregisterCommand(command) {
        return this.commandRegistry.unregisterCommand(command);
    }

    _addToHistory(command) {
        this.history.push({command, timestamp: new Date(), status: 'sent'});
        this.history.length > this.maxHistorySize && (this.history = this.history.slice(-this.maxHistorySize));
    }

    /**
     * Get command history
     */
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }

    /**
     * Execute a control command
     */
    executeControlCommand(type, payload = {}) {
        this.webSocketManager.sendMessage(type, payload);
    }

    /**
     * Execute a refresh command
     */
    executeRefresh() {
        this.executeControlCommand('control/refresh', {});
        this.logger.log('Graph refresh requested', 'info', '🔄');
    }

    /**
     * Execute a toggle live command
     */
    executeToggleLive() {
        this.executeControlCommand('control/toggleLive', {});
    }

    _validateGraphManager() {
        if (!this.graphManager) {
            this.logger.log('Graph manager not initialized', 'error', '❌');
            return false;
        }
        return true;
    }
}
