/**
 * ContextualWidget manages HTML overlays on graph nodes.
 */
export class ContextualWidget {
    constructor(graphViewport, container) {
        this.viewport = graphViewport;
        this.container = container;
        this.activeWidgets = new Map(); // nodeId -> DOM element

        this._setupListeners();
    }

    _setupListeners() {
        this.viewport.on('zoomLevelChange', (data) => {
            if (data.level === 'detail') {
                this.showWidgets();
            } else {
                this.hideWidgets();
            }
        });

        this.viewport.on('viewport', () => {
             this.updatePositions();
        });
    }

    attach(nodeId, contentHtml) {
        if (this.activeWidgets.has(nodeId)) return;

        const div = document.createElement('div');
        div.className = 'zui-widget';
        div.style.position = 'absolute';
        div.style.display = 'none'; // Hidden by default
        div.style.pointerEvents = 'none'; // Let clicks pass through to graph unless we enable interaction
        div.style.background = 'rgba(0,0,0,0.8)';
        div.style.color = '#fff';
        div.style.padding = '5px';
        div.style.borderRadius = '4px';
        div.style.fontSize = '10px';
        div.style.zIndex = '1000';
        div.innerHTML = contentHtml;

        this.container.appendChild(div);
        this.activeWidgets.set(nodeId, div);

        // Initial position update if possible
        this.updateNodeWidget(nodeId);
    }

    showWidgets() {
        this.activeWidgets.forEach((div, nodeId) => {
             div.style.display = 'block';
             this.updateNodeWidget(nodeId);
        });
    }

    hideWidgets() {
        this.activeWidgets.forEach(div => div.style.display = 'none');
    }

    updatePositions() {
        if (!this.viewport.cy) return;

        // Only update if visible
        this.activeWidgets.forEach((div, nodeId) => {
            if (div.style.display !== 'none') {
                this.updateNodeWidget(nodeId);
            }
        });
    }

    updateNodeWidget(nodeId) {
        const node = this.viewport.cy.getElementById(nodeId);
        if (node.length === 0) return;

        const pos = node.renderedPosition();
        const div = this.activeWidgets.get(nodeId);

        // Position slightly offset from center
        div.style.left = (pos.x + 10) + 'px';
        div.style.top = (pos.y - 20) + 'px';
    }

    remove(nodeId) {
        const div = this.activeWidgets.get(nodeId);
        if (div) {
            div.remove();
            this.activeWidgets.delete(nodeId);
        }
    }
}
