/**
 * SemanticZoom manages detail levels based on zoom scale.
 */
export class SemanticZoom {
    constructor(graphViewport) {
        this.viewport = graphViewport;
        this.currentLevel = 'overview';

        // Thresholds
        this.levels = {
            overview: { min: 0, max: 0.8 },
            component: { min: 0.8, max: 2.0 },
            detail: { min: 2.0, max: 10.0 }
        };

        this._setupListener();
    }

    _setupListener() {
        this.viewport.on('viewport', (data) => {
            this._checkZoomLevel(data.zoom);
        });
    }

    _checkZoomLevel(zoom) {
        let newLevel = this.currentLevel;

        if (zoom < this.levels.overview.max) {
            newLevel = 'overview';
        } else if (zoom < this.levels.component.max) {
            newLevel = 'component';
        } else {
            newLevel = 'detail';
        }

        if (newLevel !== this.currentLevel) {
            const oldLevel = this.currentLevel;
            this.currentLevel = newLevel;
            this.viewport.trigger('zoomLevelChange', {
                level: newLevel,
                oldLevel,
                zoom
            });
            this._updateStyles(newLevel);
        }
    }

    _updateStyles(level) {
        const cy = this.viewport.cy;
        if (!cy) return;

        const styles = {
            overview: { 'label': '', 'width': 'data(weight)', 'height': 'data(weight)' },
            component: { 'label': 'data(label)', 'font-size': '10px' },
            detail: { 'label': 'data(label)', 'font-size': '12px' }
        };

        const style = styles[level];
        if (style) {
            cy.batch(() => cy.nodes().style(style));
        }
    }
}
