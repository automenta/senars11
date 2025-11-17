import ReconnectingWebSocket from 'reconnecting-websocket';

const WEBSOCKET_URL = `ws://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}/ws`;

class NarService {
    constructor() {
        this.socket = new ReconnectingWebSocket(WEBSOCKET_URL);
        this.listeners = new Map();

        this.socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (this.listeners.has(message.type)) {
                this.listeners.get(message.type).forEach(callback => callback(message.payload));
            }
        });
    }

    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    }

    off(type, callback) {
        if (this.listeners.has(type)) {
            const listeners = this.listeners.get(type);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    send(type, payload) {
        this.socket.send(JSON.stringify({ type, payload }));
    }

    requestSnapshot() {
        this.send('control/refresh');
    }

    sendNarseseInput(input) {
        this.send('narseseInput', input);
    }
}

export const narService = new NarService();
