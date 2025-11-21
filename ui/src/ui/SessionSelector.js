/**
 * UI Component for Selecting and Creating Sessions
 */
import {Config} from '../config/Config.js';

export class SessionSelector {
    constructor(containerId, webSocketManager) {
        this.container = document.getElementById(containerId);
        this.wsManager = webSocketManager;
        this.sessions = [];

        if (!this.container) {
            console.warn(`SessionSelector container ${containerId} not found`);
            return;
        }

        this.init();
    }

    init() {
        // Subscribe to session list updates
        this.wsManager.subscribe('session/list', (msg) => {
            this.sessions = msg.sessions || [];
            this.render();
        });

        // Subscribe to connection/creation confirmations
        this.wsManager.subscribe('session/created', (msg) => {
             // Auto connect to created session? Or just refresh list?
             this.refreshSessions();
        });

        this.wsManager.subscribe('connection', (msg) => {
             // Initial connection might carry session info
             this.refreshSessions();
        });

        this.render();

        // Initial fetch
        if (this.wsManager.isConnected()) {
            this.refreshSessions();
        } else {
            // Wait for connection
            this.wsManager.subscribe('connection.status', (status) => {
                if (status === 'connected') this.refreshSessions();
            });
        }
    }

    refreshSessions() {
        this.wsManager.listSessions();
    }

    render() {
        this.container.innerHTML = '';

        const header = document.createElement('h3');
        header.textContent = 'Sessions';
        this.container.appendChild(header);

        const controls = document.createElement('div');
        controls.className = 'session-controls';

        const createBtn = document.createElement('button');
        createBtn.textContent = 'New Session';
        createBtn.onclick = () => {
            const id = prompt('Enter Session ID (optional):');
            this.wsManager.createSession(id || null);
        };
        controls.appendChild(createBtn);

        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh List';
        refreshBtn.onclick = () => this.refreshSessions();
        controls.appendChild(refreshBtn);

        this.container.appendChild(controls);

        const list = document.createElement('ul');
        list.className = 'session-list';

        if (this.sessions.length === 0) {
            const empty = document.createElement('li');
            empty.textContent = 'No active sessions found.';
            list.appendChild(empty);
        } else {
            this.sessions.forEach(s => {
                const item = document.createElement('li');
                item.className = 'session-item';
                if (s.id === this.wsManager.sessionId) {
                    item.classList.add('active');
                }

                const info = document.createElement('span');
                info.textContent = `${s.id} (${s.clientCount} clients)`;

                const connectBtn = document.createElement('button');
                connectBtn.textContent = 'Join';
                connectBtn.disabled = (s.id === this.wsManager.sessionId);
                connectBtn.onclick = () => this.wsManager.connectToSession(s.id);

                item.appendChild(info);
                item.appendChild(connectBtn);
                list.appendChild(item);
            });
        }

        this.container.appendChild(list);

        // CSS for basic styling
        if (!document.getElementById('session-styles')) {
            const style = document.createElement('style');
            style.id = 'session-styles';
            style.textContent = `
                .session-controls { margin-bottom: 10px; }
                .session-controls button { margin-right: 5px; }
                .session-list { list-style: none; padding: 0; }
                .session-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px;
                    border-bottom: 1px solid #eee;
                }
                .session-item.active { background-color: #e0f7fa; font-weight: bold; }
            `;
            document.head.appendChild(style);
        }
    }
}
