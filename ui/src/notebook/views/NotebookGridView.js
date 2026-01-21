export class NotebookGridView {
    constructor(container, cells, onSwitchView) {
        this.container = container;
        this.cells = cells;
        this.onSwitchView = onSwitchView;
    }

    render(isIconMode = false) {
        this.container.style.overflowY = 'auto';
        this.container.style.display = 'grid';

        const size = isIconMode ? '100px' : '200px';
        this.container.style.gridTemplateColumns = `repeat(auto-fill, minmax(${size}, 1fr))`;
        this.container.style.gap = '10px';
        this.container.style.padding = '10px';

        for (const cell of this.cells) {
            const wrapper = this._createCellWrapper(cell, isIconMode);
            this.container.appendChild(wrapper);
        }
    }

    _createCellWrapper(cell, isIconMode) {
        const wrapper = document.createElement('div');
        wrapper.className = 'grid-cell-wrapper';
        wrapper.style.cssText = `
            background: #252526; border: 1px solid #3c3c3c; border-radius: 4px;
            padding: 8px; height: ${isIconMode ? '100px' : '150px'}; overflow: hidden; position: relative;
            cursor: pointer; transition: transform 0.2s; display: flex; flex-direction: column;
        `;
        wrapper.onmouseenter = () => wrapper.style.transform = 'scale(1.02)';
        wrapper.onmouseleave = () => wrapper.style.transform = 'scale(1)';
        wrapper.onclick = () => {
             this.onSwitchView('list', cell.id);
        };

        const iconMap = {
            code: '💻', result: '✨', markdown: '📝', widget: '🧩', prompt: '🤖'
        };

        const icon = document.createElement('div');
        icon.style.cssText = `font-size: ${isIconMode ? '24px' : '16px'}; text-align: center; margin-bottom: 4px;`;
        icon.textContent = iconMap[cell.type] ?? '📄';

        wrapper.appendChild(icon);

        if (!isIconMode) {
            const typeBadge = document.createElement('div');
            typeBadge.style.cssText = 'font-size: 10px; color: #888; text-transform: uppercase; text-align: center; margin-bottom: 4px;';
            typeBadge.textContent = cell.type;
            wrapper.appendChild(typeBadge);
        }

        const contentPreview = document.createElement('div');
        contentPreview.style.cssText = 'font-size: 10px; color: #ccc; word-break: break-all; flex: 1; overflow: hidden; opacity: 0.8;';

        let text = typeof cell.content === 'string' ? cell.content : JSON.stringify(cell.content);
        if (text.length > 200) text = text.substring(0, 200) + '...';
        contentPreview.textContent = text;

        wrapper.appendChild(contentPreview);
        return wrapper;
    }
}
