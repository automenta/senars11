/**
 * UI Component for Viewing Trajectories and giving Preference Feedback
 */
export class TrajectoryViewer {
    constructor(containerId, webSocketManager) {
        this.container = document.getElementById(containerId);
        this.wsManager = webSocketManager;
        this.episodes = [];

        if (!this.container) return;
        this.render();
    }

    // Placeholder for now - will hook into TrajectoryLogger events later
    render() {
        this.container.innerHTML = '<div style="padding:10px; color: #666;">Trajectory Viewer (Coming Soon)</div>';
    }
}
