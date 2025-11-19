const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create HTTP server to serve static files
const server = http.createServer((req, res) => {
    let filePath = req.url;
    
    // Default to index.html if requesting the root
    if (filePath === '/' || filePath === '/index.html') {
        filePath = './index.html';
    }
    
    // If the path doesn't have an extension, assume it's HTML
    if (!path.extname(filePath)) {
        filePath += '.html';
    }
    
    const fullPath = path.join(__dirname, filePath);
    
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            // Set content type based on file extension
            let contentType = 'text/html';
            if (fullPath.endsWith('.js')) {
                contentType = 'application/javascript';
            } else if (fullPath.endsWith('.css')) {
                contentType = 'text/css';
            } else if (fullPath.endsWith('.json')) {
                contentType = 'application/json';
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server: server, path: '/ws' });

// Keep track of connected clients
const clients = new Set();

// Simulate concept storage for demo purposes
const concepts = new Map();
const tasks = [];

wss.on('connection', (ws, req) => {
    console.log('New client connected:', req.socket.remoteAddress);
    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connection',
        data: { 
            clientId: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            message: 'Connected to SeNARS monitoring server',
            serverVersion: '10.0.0',
            capabilities: ['narseseInput', 'testLMConnection', 'subscribe', 'unsubscribe']
        }
    }));

    // Handle incoming messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            console.log('Received:', message);
            
            // Process different message types
            switch (message.type) {
                case 'narseseInput':
                    handleNarseseInput(message.payload.input, ws);
                    break;
                    
                case 'control/refresh':
                    // Simulate sending concept data for the graph
                    if (concepts.size > 0) {
                        const conceptData = Array.from(concepts.values());
                        ws.send(JSON.stringify({
                            type: 'memorySnapshot',
                            payload: { concepts: conceptData }
                        }));
                    }
                    ws.send(JSON.stringify({
                        type: 'control.result',
                        payload: { command: 'refresh', result: 'Graph refreshed' }
                    }));
                    break;
                    
                case 'control/toggleLive':
                    ws.send(JSON.stringify({
                        type: 'control.result',
                        payload: { command: 'toggleLive', result: 'Live updates toggled' }
                    }));
                    break;
                    
                case 'subscribe':
                    // Handle subscription requests
                    ws.send(JSON.stringify({
                        type: 'subscription.result',
                        payload: { 
                            success: true, 
                            channel: message.payload.channel,
                            message: `Subscribed to ${message.payload.channel}`
                        }
                    }));
                    break;
                    
                default:
                    // Send back an unknown command response
                    ws.send(JSON.stringify({
                        type: 'error',
                        payload: { message: `Unknown command: ${message.type}` }
                    }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Invalid message format', error: error.message }
            }));
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Handle Narsese input
function handleNarseseInput(input, ws) {
    // In a real implementation, this would parse and process the Narsese
    // For now, we'll provide basic validation and mocking
    
    const trimmed = input.trim();
    
    // Simple validation for common Narsese patterns
    if (trimmed.startsWith('*')) {
        // System commands
        if (trimmed === '*step' || trimmed === '*run' || trimmed === '*stop' || trimmed === '*reset') {
            // Simulate system command processing
            ws.send(JSON.stringify({
                type: 'narsese.result',
                payload: { 
                    input: trimmed,
                    result: `✅ System command executed: ${trimmed}`,
                    success: true,
                    timestamp: Date.now()
                }
            }));
        } else {
            ws.send(JSON.stringify({
                type: 'narsese.result',
                payload: { 
                    input: trimmed,
                    result: `✅ Input processed successfully: ${trimmed}`,
                    success: true,
                    timestamp: Date.now()
                }
            }));
        }
    } else if (trimmed.startsWith('<') && (trimmed.endsWith('.') || trimmed.endsWith('?') || trimmed.endsWith('!'))) {
        // Check if it's a valid Narsese statement
        try {
            // Basic validation: <subject --> predicate>. or <subject --> predicate>?
            const statementRegex = /^<(.+?)\s*-->\s*(.+?)>([.!?])(\s*%[0-9.]+;[0-9.]+%)?$/;
            const similarityRegex = /^<(.+?)\s*<->\s*(.+?)>([.!?])(\s*%[0-9.]+;[0-9.]+%)?$/;
            const implicationRegex = /^<(.+?)\s*==>\s*(.+?)>([.!?])(\s*%[0-9.]+;[0-9.]+%)?$/;
            
            if (statementRegex.test(trimmed) || similarityRegex.test(trimmed) || implicationRegex.test(trimmed)) {
                // Valid Narsese statement - simulate concept creation
                const conceptId = `concept_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const term = trimmed.substring(1, trimmed.lastIndexOf('>'));
                
                const concept = {
                    id: conceptId,
                    term: term,
                    type: trimmed.endsWith('.') ? 'belief' : trimmed.endsWith('?') ? 'question' : 'goal',
                    truth: { frequency: 1.0, confidence: 0.9 },
                    creationTime: Date.now()
                };
                
                concepts.set(conceptId, concept);
                
                // Send concept.created event
                ws.send(JSON.stringify({
                    type: 'concept.created',
                    payload: concept
                }));
                
                // Send task.added event
                ws.send(JSON.stringify({
                    type: 'task.added',
                    payload: {
                        id: `task_${Date.now()}`,
                        input: trimmed,
                        term: term,
                        type: trimmed.endsWith('.') ? 'belief' : trimmed.endsWith('?') ? 'question' : 'goal'
                    }
                }));
                
                // Send result
                ws.send(JSON.stringify({
                    type: 'narsese.result',
                    payload: { 
                        input: trimmed,
                        result: `✅ Input processed successfully (${Date.now().toString().slice(-4)}ms)`,
                        success: true,
                        timestamp: Date.now()
                    }
                }));
            } else {
                // Invalid Narsese format
                ws.send(JSON.stringify({
                    type: 'narsese.error',
                    payload: { 
                        input: trimmed,
                        error: `Narsese parsing failed: Invalid Narsese format - ${trimmed}`
                    }
                }));
                
                ws.send(JSON.stringify({
                    type: 'narsese.result',
                    payload: { 
                        input: trimmed,
                        result: `❌ Error: Invalid Narsese format - ${trimmed}`,
                        success: false,
                        timestamp: Date.now()
                    }
                }));
            }
        } catch (parseError) {
            ws.send(JSON.stringify({
                type: 'narsese.error',
                payload: { 
                    input: trimmed,
                    error: `Narsese parsing failed: ${parseError.message}`
                }
            }));
            
            ws.send(JSON.stringify({
                type: 'narsese.result',
                payload: { 
                    input: trimmed,
                    result: `❌ Error: Narsese parsing failed: ${parseError.message}`,
                    success: false,
                    timestamp: Date.now()
                }
            }));
        }
    } else {
        // Invalid format
        ws.send(JSON.stringify({
            type: 'narsese.error',
            payload: { 
                input: trimmed,
                error: `Narsese parsing failed: Expected format like '<subject --> predicate>.'`
            }
        }));
        
        ws.send(JSON.stringify({
            type: 'narsese.result',
            payload: { 
                input: trimmed,
                result: `❌ Error: Narsese parsing failed: Expected format like '<subject --> predicate>.'`,
                success: false,
                timestamp: Date.now()
            }
        }));
    }
}

// Start the server
const PORT = 8080;
server.listen(PORT, () => {
    console.log(`SeNARS WebSocket server running on port ${PORT}`);
    console.log(`UI available at http://localhost:${PORT}/index.html`);
});