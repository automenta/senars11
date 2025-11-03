#!/usr/bin/env node

import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {WebSocketMonitor} from './src/server/WebSocketMonitor.js';
import {NAR} from './src/nar/NAR.js';
import {DemoWrapper} from './src/demo/DemoWrapper.js';
import SeNARSSelfAnalyzer from './self-analyze.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse arguments to support flexible server configuration
const args = process.argv.slice(2);

const DEFAULT_CONFIG = Object.freeze({
    nar: {
        lm: {enabled: false},
        reasoningAboutReasoning: {enabled: true}
    },
    persistence: {
        defaultPath: './agent.json'
    },
    webSocket: {
        port: parseInt(process.env.WS_PORT) || 8080,
        host: process.env.WS_HOST || 'localhost',
        maxConnections: 20
    },
    ui: {
        port: parseInt(process.env.PORT) || 5173
    }
});

/**
 * Parse command line arguments to support flexible configuration
 */
function parseArgs(args) {
    let config = {...DEFAULT_CONFIG};

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--ws-port' && args[i + 1]) {
            config = {
                ...config,
                webSocket: {
                    ...config.webSocket,
                    port: parseInt(args[i + 1])
                }
            };
            i++; // Skip next argument since it's the value
        } else if (args[i] === '--port' && args[i + 1]) {
            config = {
                ...config,
                ui: {
                    ...config.ui,
                    port: parseInt(args[i + 1])
                }
            };
            i++; // Skip next argument since it's the value
        } else if (args[i] === '--host' && args[i + 1]) {
            config = {
                ...config,
                webSocket: {
                    ...config.webSocket,
                    host: args[i + 1]
                }
            };
            i++; // Skip next argument since it's the value
        }
    }

    return config;
}

/**
 * Initialize and start the WebSocket server
 */
async function startWebSocketServer(config = DEFAULT_CONFIG) {
    console.log(`Starting WebSocket server on ${config.webSocket.host}:${config.webSocket.port}...`);

    const nar = new NAR(config.nar);
    await nar.initialize();

    const monitor = new WebSocketMonitor(config.webSocket);
    await monitor.start();
    nar.connectToWebSocketMonitor(monitor);

    // Register a handler for NAR instance requests from the UI
    monitor.registerClientMessageHandler('requestNAR', async (message, client, monitorInstance) => {
        // For security reasons, we only send information that's safe for the UI, not the full NAR instance
        const narInfo = {
            cycleCount: nar.cycleCount,
            isRunning: nar.isRunning,
            config: nar.config.toJSON(),
            stats: nar.getStats(),
            reasoningState: nar.getReasoningState ? nar.getReasoningState() : null
        };

        monitorInstance._sendToClient(client, {
            type: 'narInstance',
            payload: narInfo
        });
    });

    // Initialize DemoWrapper to provide remote control and introspection
    const demoWrapper = new DemoWrapper();
    await demoWrapper.initialize(nar, monitor);

    // Send list of available demos to connected UIs
    await demoWrapper.sendDemoList();

    // Start periodic metrics updates
    demoWrapper.runPeriodicMetricsUpdate();

    // Start the NAR reasoning cycle
    nar.start();

    console.log('WebSocket server started successfully');

    return {nar, monitor, demoWrapper};
}

/**
 * Start the Vite development server
 */
function startViteDevServer(config = DEFAULT_CONFIG) {
    console.log(`Starting Vite dev server on port ${config.ui.port}...`);

    // Change to ui directory and run vite dev server
    const viteProcess = spawn('npx', ['vite', 'dev', '--port', config.ui.port.toString()], {
        cwd: join(__dirname, 'ui'),
        stdio: 'inherit', // This allows the Vite server to control the terminal properly
        env: {
            ...process.env,
            // Pass WebSocket connection info to UI
            VITE_WS_HOST: config.webSocket.host,
            VITE_WS_PORT: config.webSocket.port.toString(),
            VITE_WS_PATH: DEFAULT_CONFIG.webSocket.path || undefined,
            PORT: config.ui.port.toString() // Also set PORT for compatibility
        }
    });

    viteProcess.on('error', (err) => {
        console.error('Error starting Vite server:', err.message);
        process.exit(1);
    });

    viteProcess.on('close', (code) => {
        console.log(`Vite server exited with code ${code}`);
        // Don't exit the main process if vite server closes, just log it
        // This allows graceful shutdown to be triggered by user pressing Ctrl+C
        console.log('Vite server closed. Press Ctrl+C to shut down the WebSocket server as well.');
    });

    return viteProcess;
}

/**
 * Save the NAR state to file
 */
async function saveNarState(nar) {
    const fs = await import('fs');
    const state = nar.serialize();
    await fs.promises.writeFile(DEFAULT_CONFIG.persistence.defaultPath, JSON.stringify(state, null, 2));
    console.log('Current state saved to agent.json');
}

/**
 * Shutdown sequence for all services
 */
async function shutdownServices(webSocketServer) {
    // Save NAR state
    try {
        await saveNarState(webSocketServer.nar);
    } catch (saveError) {
        console.error('Error saving state on shutdown:', saveError.message);
    }

    // Stop WebSocket server
    if (webSocketServer.monitor) {
        await webSocketServer.monitor.stop();
    }

    if (webSocketServer.nar) {
        webSocketServer.nar.stop();
    }
}

/**
 * Setup graceful shutdown handlers
 */
async function setupGracefulShutdown(webSocketServer) {
    const shutdown = async () => {
        console.log('\nShutting down gracefully...');
        await shutdownServices(webSocketServer);
        console.log('Servers stopped successfully');
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error.message);
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}

/**
 * Perform the SeNARS self-analysis and make the results available to the UI
 */
async function runSelfAnalysis(monitor) {
    console.log('Starting SeNARS self-analysis...');
    
    try {
        const analyzer = new SeNARSSelfAnalyzer();
        await analyzer.initialize();
        
        // Collect all data
        analyzer.collectTestResults();
        analyzer.collectCoverage();
        analyzer.collectProjectInfo();
        analyzer.collectStaticAnalysis();
        analyzer.collectRequirementsAnalysis();
        
        // Generate development plan
        const developmentPlan = analyzer.generateDevelopmentPlan();
        
        // Convert to Narsese and input to NAR
        const narseseInputs = analyzer.convertToNarsese();
        
        console.log(`Feeding ${narseseInputs.length} Statements to NAR`);
        
        for (const input of narseseInputs) {
            try {
                await analyzer.nar.input(input);
            } catch (error) {
                console.log(`Failed to input: ${input} - ${error.message}`);
            }
        }
        
        // Run cycles to allow reasoning
        for (let i = 0; i < 30; i++) {
            await analyzer.nar.step();
        }
        
        // Get analysis results
        const analysisResults = analyzer.analysisResults;
        
        // Calculate pass rate for tests
        if (analysisResults.tests && !analysisResults.tests.error) {
            analysisResults.tests.passRate = Math.round(
                (analysisResults.tests.passedTests / Math.max(analysisResults.tests.totalTests, 1)) * 100
            );
        }
        
        // Identify missing documentation sections
        if (analysisResults.requirements && !analysisResults.requirements.error) {
            const missing = [];
            if (!analysisResults.requirements.hasTermClassDocumentation) missing.push('Term Class');
            if (!analysisResults.requirements.hasTaskClassDocumentation) missing.push('Task Class');
            if (!analysisResults.requirements.hasTruthDocumentation) missing.push('Truth Values');
            if (!analysisResults.requirements.hasStampDocumentation) missing.push('Stamp System');
            if (!analysisResults.requirements.hasTestingStrategy) missing.push('Testing Strategy');
            if (!analysisResults.requirements.hasErrorHandling) missing.push('Error Handling');
            if (!analysisResults.requirements.hasSecurityImplementation) missing.push('Security');
            
            analysisResults.requirements.missing = missing;
        }
        
        // Build complete analysis result
        const completeAnalysis = {
            ...analysisResults,
            developmentPlan,
            timestamp: new Date().toISOString()
        };
        
        // Store the analysis data for later requests
        monitor.selfAnalysisData = completeAnalysis;
        
        // Send the analysis data to all currently connected clients
        const clients = monitor.getClients();
        for (const client of clients) {
            monitor._sendToClient(client, {
                type: 'selfAnalysisData',
                payload: completeAnalysis
            });
        }
        
        console.log('Self-analysis completed and sent to UI');
        
        // Register a handler for future requests of self-analysis data
        monitor.registerClientMessageHandler('requestSelfAnalysisData', (message, client, monitorInstance) => {
            const data = monitorInstance.selfAnalysisData;
            const error = monitorInstance.selfAnalysisError;
            
            monitorInstance._sendToClient(client, data 
                ? { type: 'selfAnalysisData', payload: data }
                : { type: 'selfAnalysisError', payload: error || { message: 'No self-analysis data available' } }
            );
        });
        
        // Dispose of the analyzer's NAR
        await analyzer.nar.dispose();
        
        return completeAnalysis;
    } catch (error) {
        console.error('Self-analysis failed:', error.message);
        
        // Store error data for later requests
        const errorData = { message: error.message, timestamp: new Date().toISOString() };
        monitor.selfAnalysisError = errorData;
        
        // Send error to all connected clients
        monitor.getClients().forEach(client => 
            monitor._sendToClient(client, { type: 'selfAnalysisError', payload: errorData })
        );
        
        // Register a handler for future requests of self-analysis data
        monitor.registerClientMessageHandler('requestSelfAnalysisData', (message, client, monitorInstance) => {
            const error = monitorInstance.selfAnalysisError;
            monitorInstance._sendToClient(client, { 
                type: 'selfAnalysisError', 
                payload: error || { message: 'No self-analysis data available' } 
            });
        });
    }
}

async function main() {
    let webSocketServer;

    try {
        // Parse command line arguments for flexible configuration
        const config = parseArgs(args);

        // Start WebSocket server with the parsed config
        webSocketServer = await startWebSocketServer(config);

        // Set up graceful shutdown
        await setupGracefulShutdown({
            nar: webSocketServer.nar,
            monitor: webSocketServer.monitor
        });

        // Start self-analysis and send data to UI
        await runSelfAnalysis(webSocketServer.monitor);

        // Start Vite dev server
        const viteProcess = startViteDevServer(config);

        // Store the websocket server info for shutdown
        webSocketServer.viteProcess = viteProcess;

        console.log('Both servers are running. Press Ctrl+C to stop.');
    } catch (error) {
        console.error('Failed to start servers:', error.message);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
});