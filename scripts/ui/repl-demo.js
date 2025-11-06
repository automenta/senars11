#!/usr/bin/env node

/**
 * SeNARS Generic Demo Runner
 * WebSocket-based demonstration runner that can execute any set of Narsese inputs
 * Shows end-to-end functionality with all system activity
 */

import {spawn} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {WebSocket} from 'ws';
import {setTimeout as setTimeoutPromise} from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments for custom inputs
const args = process.argv.slice(2);
const customInputs = args.length > 0 ? args : null;

// Demo configuration
const config = {
    wsPort: process.env.WS_PORT || 8080,
    wsUrl: `ws://localhost:${process.env.WS_PORT || 8080}/ws`,
    defaultInputs: [
        '<a ==> b>. %1.0;0.9%', 
        '<b ==> c>. %1.0;0.9%'
    ],
    stepsToRun: 10 // Number of reasoning steps to execute
};

// Helper function to wait for a specific time
const wait = (ms) => setTimeoutPromise(ms);

// Function to run the demo with inputs
async function runDemo(demoInputs = config.defaultInputs) {
    console.log('🎓 SeNARS Generic Demo Runner');
    console.log('===============================');
    console.log(`📋 Running ${demoInputs.length} input(s): ${demoInputs.join(', ')}`);
    console.log('');
    
    // Start the SeNARS server in the background
    console.log('🔌 Starting SeNARS server...');
    
    const serverProcess = spawn('node', [join(__dirname, '../../src/index.js')], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
            ...process.env,
            WS_PORT: config.wsPort,
            NODE_ENV: 'development'
        }
    });

    // Track when the server is ready
    let serverReady = false;
    
    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('WebSocket monitoring server started')) {
            serverReady = true;
            console.log('✅ Server ready - WebSocket server listening');
        }
        
        // Capture and display server logs relevant to our demo
        if (serverReady && output.includes('task.') && !output.includes('Connected tools')) {
            console.log('🔧 Server:', output.trim());
        }
    });
    
    serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('error') || error.includes('Error')) {
            console.error('❌ Server error:', error);
        }
    });
    
    // Wait for the server to be ready
    while (!serverReady) {
        await wait(500);
    }

    // Wait a bit more for full initialization
    await wait(2000);

    console.log('');
    console.log('📡 Connecting to SeNARS via WebSocket...');
    
    // Connect to the server via WebSocket
    const ws = new WebSocket(`${config.wsUrl}?session=demo`);
    
    // Track outputs and derivations using Maps for proper deduplication by ID
    const outputs = new Map();  // All system events
    const derivations = new Map(); // Tasks created during reasoning (not original inputs)
    const originalInputs = new Set(demoInputs); // Track what we sent as inputs
    
    ws.on('open', () => {
        console.log('✅ Connected to SeNARS server\n');
        
        // Send the demo inputs sequentially
        (async () => {
            for (let i = 0; i < demoInputs.length; i++) {
                const input = demoInputs[i];
                console.log(`📥 INPUT ${i+1}: ${input}`);
                
                // Send the input
                ws.send(JSON.stringify({
                    sessionId: 'demo',
                    type: 'reason/step',
                    payload: { text: input }
                }));
                
                // Wait between inputs to allow processing
                await wait(1200);
            }
            
            console.log('\n🔄 Running reasoning cycles...\n');
            
            // Run several reasoning steps to allow derivations
            for (let step = 1; step <= config.stepsToRun; step++) {
                console.log(`⏱️  Step ${step}/${config.stepsToRun} - Processing...`);
                
                ws.send(JSON.stringify({
                    sessionId: 'demo',
                    type: 'control/step',
                    payload: {}
                }));
                
                await wait(1000); // Wait for processing
            }
            
            console.log('\n✅ Reasoning completed!');
            
            // Close the WebSocket connection after a delay to allow final outputs
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }, 3000);
        })();
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            // Show ALL system activity - no filtering
            if (message.type === 'event' && message.eventType) {
                const taskData = message.data?.data?.task;
                if (taskData) {
                    const term = taskData.term?._name || taskData.term || 'unknown';
                    const type = taskData.type || 'unknown';
                    const truth = taskData.truth ? 
                        `f:${taskData.truth.frequency}, c:${taskData.truth.confidence}` : 
                        'no truth';
                        
                    // Show ALL events, regardless of type
                    console.log(`   • ${message.eventType.toUpperCase()}: ${type} ${term} (${truth})`);
                    
                    // Create a unique identifier for each task/event combination and add to outputs Map
                    const taskId = `${term}-${type}-${truth}-${message.eventType}`;
                    const outputObj = {type, term, truth, eventType: message.eventType, original: message, id: taskId};
                    outputs.set(taskId, outputObj);
                    
                    // Track all tasks that get added during reasoning - no filtering
                    if (message.eventType === 'task.added' && type === 'BELIEF') {
                        const derivationId = `${term}-${truth}-${message.eventType}`;
                        const derivationObj = {term, truth, eventType: message.eventType, id: derivationId};
                        derivations.set(derivationId, derivationObj);
                    }
                } else {
                    // For non-task events, show them too
                    console.log(`   • ${message.eventType.toUpperCase()}: ${JSON.stringify(message.data?.data || message.data || 'data')}`);
                    
                    const eventTaskId = `event-${message.eventType}-${JSON.stringify(message.data)}`;
                    const outputObj = {eventType: message.eventType, data: message.data, original: message, id: eventTaskId};
                    outputs.set(eventTaskId, outputObj);
                }
            } 
            else if (message.type === 'narseseInput') {
                console.log(`   • NARSESE_INPUT: ${JSON.stringify(message.payload)}`);
                const narseseTaskId = `narseseInput-${JSON.stringify(message.payload)}`;
                outputs.set(narseseTaskId, {type: 'narseseInput', payload: message.payload, original: message, id: narseseTaskId});
            }
            else if (message.type === 'control/ack') {
                console.log(`   • CONTROL_ACK: ${JSON.stringify(message.payload)}`);
                const controlTaskId = `control-ack-${JSON.stringify(message.payload)}`;
                outputs.set(controlTaskId, {type: 'control/ack', payload: message.payload, original: message, id: controlTaskId});
            }
            else {
                // Show any other message types
                console.log(`   • ${message.type.toUpperCase()}: ${JSON.stringify(message)}`);
                const otherTaskId = `other-${message.type}-${JSON.stringify(message)}`;
                outputs.set(otherTaskId, {type: message.type, data: message, original: message, id: otherTaskId});
            }
        } catch (e) {
            // Ignore non-JSON messages or parsing errors
        }
    });
    
    ws.on('error', (error) => {
        // Only show WebSocket errors if not expected (like after intentional close)
        if (error.message && !error.message.includes('ECONNREFUSED')) {
            console.error('📡 WebSocket error:', error.message);
        }
    });
    
    ws.on('close', () => {
        // Final summary after demo completes
        setTimeout(() => {
            console.log('\n🏁 Demo completed!');
            console.log('================================');
            console.log('📊 DERIVATION SUMMARY:');
            
            if (derivations.size > 0) {
                console.log('✅ Successful derivations found:');
                let i = 0;
                derivations.forEach((derivation) => {
                    console.log(`   ${i+1}. ${derivation.term} (${derivation.truth})`);
                    i++;
                });
                
                console.log(`\n✅ Success! ${derivations.size} new derivations captured during reasoning.`);
            } else {
                console.log('ℹ️  No new derivations captured during reasoning - this may be expected depending on the inputs.');
            }
            
            console.log('\n📋 All outputs received:');
            let j = 0;
            outputs.forEach((output) => {
                if (output.term && output.type) {
                    console.log(`   ${j+1}. ${output.term} [${output.type}]`);
                } else if (output.type === 'narseseInput' && output.payload) {
                    console.log(`   ${j+1}. NarseseInput: ${output.payload.input} [success: ${output.payload.success}]`);
                } else if (output.eventType) {
                    console.log(`   ${j+1}. ${output.eventType} [${output.type || 'event'}]`);
                } else {
                    console.log(`   ${j+1}. ${output.type || 'unknown'}: ${JSON.stringify(output.data || 'data')}`);
                }
                j++;
            });
            
            console.log('\n🔌 Server shutting down...');
            serverProcess.kill();
            console.log('✅ End-to-End Demo finished successfully!');
        }, 100);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n🛑 Demo interrupted by user');
        serverProcess.kill();
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
        process.exit(0);
    });
}

// Run the demo
if (customInputs) {
    console.log(`Using custom inputs: ${customInputs.join(', ')}`);
    runDemo(customInputs).catch(error => {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    });
} else {
    runDemo().catch(error => {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    });
}