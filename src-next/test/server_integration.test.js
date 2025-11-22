import {Server} from '../interface/Server.js';
import {Reasoner} from '../engine/Reasoner.js';
import WebSocket from 'ws';

describe('Server Integration', () => {
    let server;
    let reasoner;
    let ws;
    let port = 3001;

    beforeAll((done) => {
        reasoner = new Reasoner();
        server = new Server(reasoner, port);
        server.start();
        // Wait for server to start? httpServer.listen is async.
        setTimeout(done, 500);
    });

    afterAll(() => {
        server.httpServer.close();
        server.wss.close();
        if (ws) ws.close();
    });

    test('WebSocket End-to-End', (done) => {
        ws = new WebSocket(`ws://localhost:${port}`);
        let doneCalled = false;

        ws.on('open', () => {
            // Send input
            ws.send(JSON.stringify({type: 'input', content: '(A --> B).'}));
            // Send second input to trigger reasoning
            setTimeout(() => {
                ws.send(JSON.stringify({type: 'input', content: '(B --> C).'}));
            }, 100);
        });

        const messages = [];
        ws.on('message', (data) => {
            if (doneCalled) return;
            const msg = JSON.parse(data);
            messages.push(msg);

            // Check for derivation A-->C
            if (msg.type === 'derivation' && msg.task.includes('A --> C')) {
                doneCalled = true;
                expect(true).toBe(true);
                done();
            }
        });
    }, 2000); // 2s timeout
});
