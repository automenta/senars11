/**
 * StatusBarView - Manages the status bar UI element
 */
export default class StatusBarView {
    constructor(store) {
        this.store = store;
        this.statusBarElement = document.getElementById('status-bar');
        this.unsubscribe = null;

        if (!this.statusBarElement) {
            console.error('Status bar element not found');
            return;
        }

        this.init();
    }

    init() {
        this.unsubscribe = this.store.subscribe((state) => {
            this.handleStoreChange(state);
        });

        this.handleStoreChange(this.store.getState());
    }

    handleStoreChange(state) {
        if (!this.statusBarElement) return;

        const statusInfo = this._getStatusInfo(state.connectionStatus);
        const liveUpdateText = state.isLiveUpdateEnabled ? 'ON' : 'PAUSED';

        this.statusBarElement.textContent = `${statusInfo.text} | Live Updates: ${liveUpdateText}`;
        this.statusBarElement.className = statusInfo.class;
    }

    _getStatusInfo(status) {
        const statusMap = {
            'connecting': { text: 'Connecting...', class: 'status-connecting' },
            'connected': { text: 'Connected', class: 'status-connected' },
            'disconnected': { text: 'Disconnected', class: 'status-disconnected' },
            'error': { text: 'Error', class: 'status-error' }
        };

        return statusMap[status] ?? { text: status, class: 'status-unknown' };
    }

    destroy() {
        this.unsubscribe?.();
    }
}