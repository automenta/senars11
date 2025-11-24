export class DemoClient {
    constructor(wsManager) {
        this.wsManager = wsManager;
    }

    listDemos() {
        this.wsManager.sendMessage('demoControl', {
            command: 'list',
            demoId: 'system' // Dummy ID required by validator
        });
    }

    startDemo(demoId, params = {}) {
        this.wsManager.sendMessage('demoControl', {
            command: 'start',
            demoId: demoId,
            parameters: params
        });
    }

    stopDemo(demoId) {
        this.wsManager.sendMessage('demoControl', {
            command: 'stop',
            demoId: demoId
        });
    }
}
