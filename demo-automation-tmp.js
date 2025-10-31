
// Use a dynamic import to load the WebSocket library
async function runDemoAutomation() {
    // Add a small delay to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const { WebSocket } = await import('ws');
    
    // Function to try connecting with retries
    async function connectWithRetry(url, retries = 5) {
        for (let i = 0; i < retries; i++) {
            try {
                return new Promise((resolve, reject) => {
                    const ws = new WebSocket(url);
                    
                    ws.on('open', () => {
                        console.log('Demo automation connected on attempt', i + 1);
                        resolve(ws);
                    });
                    
                    ws.on('error', (error) => {
                        if (i === retries - 1) {
                            console.error('Failed to connect after', retries, 'attempts:', error.message);
                            reject(error);
                        } else {
                            console.log('Connection attempt', i + 1, 'failed, retrying...', error.message);
                        }
                    });
                    
                    ws.on('close', () => {
                        console.log('WebSocket closed');
                    });
                });
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            }
        }
    }

    let ws;
    try {
        ws = await connectWithRetry('ws://localhost:8083/ws');
    } catch (error) {
        console.error('Could not connect to WebSocket:', error.message);
        return;
    }

    ws.on('open', () => {
        console.log('Demo automation connected');
        
        // Send initial system metrics
        ws.send(JSON.stringify({ 
            type: 'systemMetrics', 
            payload: {
                wsConnected: true,
                cpu: 25,
                memory: 30,
                activeTasks: 0,
                reasoningSpeed: 0
            }
        }));

        // Send initial demo list
        ws.send(JSON.stringify({
            type: 'demoList',
            payload: [
                { id: 'derivation-demo', name: 'Belief Derivation Demo', description: 'Shows how beliefs are derived from other beliefs' },
                { id: 'priority-demo', name: 'Priority Fluctuation Demo', description: 'Shows how concept priorities change over time' },
                { id: 'reasoning-chain', name: 'Reasoning Chain Demo', description: 'Multi-step reasoning process' }
            ]
        }));

        // Simulate periodic activity
        setInterval(() => {
            // Send system metrics
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                    type: 'systemMetrics', 
                    payload: {
                        wsConnected: true,
                        cpu: Math.random() * 40 + 10, // 10-50%
                        memory: Math.random() * 50 + 20, // 20-70%
                        activeTasks: Math.floor(Math.random() * 10),
                        reasoningSpeed: Math.floor(Math.random() * 500) + 50
                    }
                }));
            }
        }, 3000);

        // Generate derivations
        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && Math.random() > 0.7) { // 30% chance each interval
                const baseTerms = ['cat', 'dog', 'bird', 'fish', 'animal', 'mammal', 'pet', 'living'];
                const term1 = baseTerms[Math.floor(Math.random() * baseTerms.length)];
                const term2 = baseTerms[Math.floor(Math.random() * baseTerms.length)];
                
                if (term1 !== term2) {
                    const derivation = {
                        type: 'reasoningStep',
                        payload: {
                            id: 'reasoning_' + Date.now(),
                            timestamp: Date.now(),
                            input: `<${term1} --> ${term2}>.`,
                            output: `<${term2} --> ${term1}>?`,
                            rule: ['deduction', 'induction', 'abduction', 'comparison'][Math.floor(Math.random() * 4)],
                            confidence: Math.random(),
                            priority: Math.random()
                        }
                    };
                    
                    ws.send(JSON.stringify(derivation));
                    
                    // Also send as a task update
                    ws.send(JSON.stringify({
                        type: 'taskUpdate',
                        payload: {
                            id: 'task_' + Date.now(),
                            content: derivation.payload.output,
                            priority: derivation.payload.priority,
                            creationTime: Date.now(),
                            type: Math.random() > 0.8 ? 'goal' : Math.random() > 0.5 ? 'question' : 'belief'
                        }
                    }));
                }
            }
        }, 2000);

        // Simulate priority fluctuations
        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                const concepts = [
                    { term: 'cat', priority: Math.random(), occurrenceTime: Date.now(), truth: { frequency: Math.random(), confidence: Math.random() } },
                    { term: 'dog', priority: Math.random(), occurrenceTime: Date.now(), truth: { frequency: Math.random(), confidence: Math.random() } },
                    { term: 'bird', priority: Math.random(), occurrenceTime: Date.now(), truth: { frequency: Math.random(), confidence: Math.random() } },
                    { term: 'fish', priority: Math.random(), occurrenceTime: Date.now(), truth: { frequency: Math.random(), confidence: Math.random() } }
                ];
                
                concepts.forEach(concept => {
                    ws.send(JSON.stringify({
                        type: 'conceptUpdate',
                        payload: { 
                            concept: concept,
                            changeType: Math.random() > 0.9 ? 'removed' : Math.random() > 0.8 ? 'added' : 'updated'
                        }
                    }));
                });
            }
        }, 1500);

        // Send periodic notifications
        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && Math.random() > 0.9) { // 10% chance
                ws.send(JSON.stringify({
                    type: 'notification',
                    payload: {
                        type: Math.random() > 0.5 ? 'success' : 'info',
                        title: 'Demo Event',
                        message: ['Derivation complete', 'Priority updated', 'New concept formed', 'Reasoning step'][Math.floor(Math.random() * 4)],
                        timestamp: Date.now()
                    }
                }));
            }
        }, 4000);

    });

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'narseseInput') {
            console.log('Processing narsese input:', message.payload.input);
            if (ws.readyState === WebSocket.OPEN) {
                // Echo back as a task to show it was processed
                ws.send(JSON.stringify({
                    type: 'taskUpdate',
                    payload: {
                        id: 'echo_' + Date.now(),
                        content: message.payload.input,
                        priority: Math.random(),
                        creationTime: Date.now(),
                        type: message.payload.input.includes('?') ? 'question' : message.payload.input.includes('!') ? 'goal' : 'belief'
                    }
                }));
            }
        }
    });

    ws.on('close', () => {
        console.log('Demo automation disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error in automation:', error.message);
    });
}

// Execute the demo automation
runDemoAutomation().catch(err => console.error('Demo automation error:', err));
