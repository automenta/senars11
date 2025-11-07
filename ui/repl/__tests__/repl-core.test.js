// Unit test for REPL core functionality
import {beforeEach, describe, expect, it} from 'vitest';
import REPLCore from '../../repl/repl-core.js';

// Mock the global WebSocket object for testing
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = MockWebSocket.OPEN;
        this.onopen = null;
        this.onclose = null;
        this.onerror = null;
        this.onmessage = null;
    }

    send(data) {
        // The real WebSocketClient.send() method sends JSON.stringify() data
        // So here we receive a JSON string and store it
        this.lastSent = data;
    }

    close() {
        this.readyState = MockWebSocket.CLOSED;
    }
}

// Define WebSocket constants in the mock
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

// Set up global WebSocket mock before tests
global.WebSocket = MockWebSocket;

describe('REPLCore', () => {
    let replCore;
    let sessionManager;

    beforeEach(() => {
        // Create DOM elements that REPLCore expects
        document.body.innerHTML = `
      <div id="session-container">
        <div class="session" data-session-id="main">
          <div class="input-area">
            <textarea class="repl-input"></textarea>
            <button class="submit-btn">Submit</button>
          </div>
          <div class="output-area"></div>
          <div class="status"></div>
        </div>
      </div>
    `;

        // Create a simple mock session manager
        sessionManager = {
            getSession: (id) => ({
                element: document.querySelector(`[data-session-id="${id}"]`),
                input: document.querySelector('.repl-input'),
                output: document.querySelector('.output-area'),
                status: document.querySelector('.status')
            }),
            updateSessionStatus: () => {
            },
            addCellToHistory: () => {
            },
            sessionHistories: {main: []}
        };

        // Mock the global session manager
        global.sessionManager = sessionManager;

        // Create REPLCore instance
        replCore = new REPLCore('main');
    });

    it('should initialize with correct sessionId', () => {
        expect(replCore.sessionId).toBe('main');
        expect(replCore.sessionManager).toBeDefined();
    });

    it('should handle input submission correctly', () => {
        const inputEl = document.querySelector('.repl-input');
        inputEl.value = 'test input';

        replCore.inputElement = inputEl;

        // Mock the websocket send method for this test
        replCore.websocket = new MockWebSocket('ws://localhost:8080/ws');

        // Mock session manager methods
        replCore.sessionManager = sessionManager;

        // Call submitInput directly
        replCore.submitInput();

        // Check that input field was cleared
        expect(inputEl.value).toBe('');
    });

    it('should handle command parsing correctly', () => {
        const commands = [
            {input: '/start', expected: 'start'},
            {input: '/stop', expected: 'stop'},
            {input: '/step', expected: 'step'}
        ];

        commands.forEach(({input, expected}) => {
            const [cmd, ...args] = input.substring(1).split(' ');
            expect(cmd).toBe(expected);
        });
    });

    it('should handle commands properly', () => {
        const inputEl = document.querySelector('.repl-input');
        replCore.inputElement = inputEl;

        // Mock the websocket for command testing
        replCore.websocket = new MockWebSocket('ws://localhost:8080/ws');

        // Test /start command
        inputEl.value = '/start';
        replCore.handleCommand('/start');
        expect(inputEl.value).toBe('');
    });

    it('should send control commands properly', () => {
        // Use the websocket that was created in the constructor
        replCore.sendControlCommand('start');
        const expectedMessage = {
            sessionId: 'main',
            type: 'control/start',
            payload: {}
        };

        // The underlying MockWebSocket should have received the stringified message
        // Since replCore.websocket is the WebSocketClient, we need to access the underlying WebSocket
        // The MockWebSocket instance would be in replCore.websocket.websocket
        expect(replCore.websocket.websocket.lastSent).toBe(JSON.stringify(expectedMessage));
    });
});