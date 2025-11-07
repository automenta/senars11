/**
 * Session Manager for SeNARS REPL
 * Handles creation, destruction, and management of REPL sessions
 */
import {generateId} from '../src/utils/helpers.js';
import {addStructuredOutputLine, createCellGroup, getCurrentCellGroup} from '../src/utils/cellRenderer.js';
import * as dataProcessor from '../src/utils/dataProcessor.js';
import {groupRelatedItems} from '../src/utils/groupUtils.js';

class SessionManager {
    constructor() {
        this.activeSessions = {};
        this.sessionHistories = {};
        this.container = document.getElementById('session-container');
        this.selector = document.getElementById('session-selector');

        this.sessionActivity = {};
        this.sessionResourceLimits = {};
        this.activeTabSessions = new Set();
        this.debouncedSaves = {};
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.bindEvents();
        window.addEventListener('beforeunload', () => this.persistAllHistories());
        this.setupResourceManagement();
        this.setupDebouncedHistorySaves();
        this.setupReducedMotionListener();
        this.loadAllHistories();
        this.createSession('main');
    }

    createCell(sessionId, type, content) {
        return {
            id: `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            content,
            timestamp: Date.now(),
            sessionId,
            pinned: false
        };
    }

    addCellToHistory(sessionId, type, content) {
        if (!this.sessionHistories[sessionId]) {
            this.sessionHistories[sessionId] = [];
        }

        const cell = this.createCell(sessionId, type, content);
        this.sessionHistories[sessionId].push(cell);

        if (this.sessionHistories[sessionId].length > 500) {
            const firstUnpinnedIndex = this.sessionHistories[sessionId].findIndex(cell => !cell.pinned);
            firstUnpinnedIndex !== -1 ?
                this.sessionHistories[sessionId].splice(firstUnpinnedIndex, 1) :
                this.sessionHistories[sessionId].shift();
        }

        this.clearMemoizedResultsForSession(sessionId);
        this.persistSessionHistory(sessionId);
    }

    persistSessionHistory(sessionId) {
        if (!this.debouncedSaveFunctions) {
            this.debouncedSaveFunctions = new Map();
        }

        if (!this.debouncedSaveFunctions.has(sessionId)) {
            const saveFn = (sid) => {
                try {
                    const history = this.sessionHistories[sid] || [];
                    sessionStorage.setItem(`nars-history-${sid}`, JSON.stringify(history));
                } catch (error) {
                    this.handlePersistenceError(`Failed to persist history for session ${sid}`, error);
                }
            };

            this.createDebouncedSaveFunction(sessionId, saveFn);
        }

        const debouncedSave = this.debouncedSaveFunctions.get(sessionId);
        debouncedSave?.(sessionId);
    }

    createDebouncedSaveFunction(sessionId, saveFn) {
        import('../src/utils/utilityFunctions.js')
            .then((utils) => {
                if (utils.debounce) {
                    const debouncedSave = utils.debounce(saveFn, 500);
                    this.debouncedSaveFunctions.set(sessionId, debouncedSave);
                    debouncedSave(sessionId);
                } else {
                    saveFn(sessionId);
                }
            })
            .catch(() => saveFn(sessionId));
    }

    clearMemoizedResultsForSession(sessionId) {
        if (!this.memoizedResults) return;

        Array.from(this.memoizedResults.entries())
            .filter(([key, _]) =>
                key.includes(`_${sessionId}_`) ||
                key.startsWith(`filterHistoryByText_${sessionId}_`) ||
                key.startsWith(`filterHistoryByType_${sessionId}_`) ||
                key.startsWith(`filterHistoryByDateRange_${sessionId}_`) ||
                key.startsWith(`filterHistoryCombined_${sessionId}_`)
            )
            .forEach(([key, _]) => this.memoizedResults.delete(key));
    }

    handlePersistenceError(message, error) {
        console.warn(`${message}:`, error);
    }

    loadSessionHistory(sessionId) {
        const startTime = performance.now();
        try {
            const historyStr = sessionStorage.getItem(`nars-history-${sessionId}`);
            this.sessionHistories[sessionId] = historyStr ? JSON.parse(historyStr) : [];
        } catch (error) {
            this.handlePersistenceError(`Failed to load history for session ${sessionId}`, error);
            this.sessionHistories[sessionId] = [];
        } finally {
            const endTime = performance.now();
            window.DEBUG_PERFORMANCE && console.log(`[PERFORMANCE] loadSessionHistory: ${endTime - startTime.toFixed(2)}ms`, {sessionId});
        }
    }

    persistAllHistories() {
        Object.keys(this.activeSessions).forEach(sessionId => {
            try {
                const history = this.sessionHistories[sessionId] || [];
                sessionStorage.setItem(`nars-history-${sessionId}`, JSON.stringify(history));
            } catch (error) {
                this.handlePersistenceError(`Failed to persist history for session ${sessionId}`, error);
            }
        });
    }

    loadAllHistories() {
        Object.keys(this.activeSessions).forEach(sessionId => {
            this.loadSessionHistory(sessionId);
            this.renderHistory(sessionId);
        });
    }

    renderHistory(sessionId) {
        const session = this.activeSessions[sessionId];
        if (!session || !this.sessionHistories[sessionId]) return;

        session.output.innerHTML = '';
        const history = this.sessionHistories[sessionId];
        this.setupVirtualScrolling(sessionId, history);
    }

    setupVirtualScrolling(sessionId, history) {
        const session = this.activeSessions[sessionId];
        if (!session) return;

        session.history = history;
        session.visibleCells = new Map();
        session.cellCache = new Map();

        session.output.addEventListener('scroll', () => this.handleScroll(sessionId));
        this.handleScroll(sessionId);
    }

    clearSessionHistory(sessionId) {
        if (this.sessionHistories[sessionId]) {
            this.sessionHistories[sessionId] = this.sessionHistories[sessionId].filter(cell => cell.pinned);
            this.clearMemoizedResultsForSession(sessionId);
            this.persistSessionHistory(sessionId);
            this.renderHistory(sessionId);
        }
    }

    handleScroll(sessionId) {
        const session = this.activeSessions[sessionId];
        if (!session || !session.history) return;

        const {scrollTop, clientHeight: viewportHeight} = session.output;
        const history = session.history;
        const rowHeight = 24;

        const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - 10);
        const endIdx = Math.min(
            history.length - 1,
            Math.ceil((scrollTop + viewportHeight) / rowHeight) + 10
        );

        this.updateVisibleCells(sessionId, startIdx, endIdx);
    }

    updateVisibleCells(sessionId, startIdx, endIdx) {
        const session = this.activeSessions[sessionId];
        if (!session?.history) return;

        const {history, visibleCells, cellCache} = session;
        const shouldBeVisible = new Set();
        for (let i = startIdx; i <= endIdx; i++) shouldBeVisible.add(i);

        for (const [index, cellElement] of visibleCells.entries()) {
            if (!shouldBeVisible.has(index)) {
                cellElement.remove();
                visibleCells.delete(index);
            }
        }

        for (let i = startIdx; i <= endIdx; i++) {
            if (!visibleCells.has(i) && history[i]) {
                let cellElement = cellCache.get(i);
                if (!cellElement) {
                    cellElement = this.createCellElement(sessionId, history[i]);
                    cellCache.set(i, cellElement);
                }
                this.setPositionAndAppendCell(session.output, cellElement, i);
                visibleCells.set(i, cellElement);
            }
        }
    }

    setPositionAndAppendCell(outputElement, cellElement, index) {
        cellElement.style.position = 'absolute';
        cellElement.style.top = `${index * 24}px`;
        outputElement.appendChild(cellElement);
    }

    pinCell(sessionId, cellId) {
        const history = this.sessionHistories[sessionId];
        if (!history) return;

        const cellIndex = history.findIndex(cell => cell.id === cellId);
        if (cellIndex !== -1) {
            history[cellIndex].pinned = true;
            this.clearMemoizedResultsForSession(sessionId);
            this.persistSessionHistory(sessionId);
        }
    }

    unpinCell(sessionId, cellId) {
        const history = this.sessionHistories[sessionId];
        if (!history) return;

        const cellIndex = history.findIndex(cell => cell.id === cellId);
        if (cellIndex !== -1) {
            history[cellIndex].pinned = false;
            this.clearMemoizedResultsForSession(sessionId);
            this.persistSessionHistory(sessionId);
        }
    }

    renderCell(sessionId, cell) {
        const session = this.activeSessions[sessionId];
        if (!session) return;

        let cellGroup = getCurrentCellGroup(session.output);
        if (!cellGroup) {
            cellGroup = createCellGroup();
            session.output.appendChild(cellGroup);
        }

        if (cell.type === 'input') {
            const lineElement = document.createElement('div');
            lineElement.className = 'output-line input-line';
            lineElement.textContent = `${sessionId}> ${cell.content}`;
            cellGroup.appendChild(lineElement);
        } else {
            const adaptedCell = {
                text: cell.content.text || '',
                punctuation: cell.content.punctuation,
                truth: cell.content.truth,
                priority: cell.content.priority
            };
            addStructuredOutputLine(session.output, adaptedCell);
        }
    }

    createSendToSessionMenu(sourceSessionId, lineContent) {
        const menu = document.createElement('div');
        menu.className = 'send-to-menu';
        menu.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      padding: 4px 0;
      min-width: 150px;
    `;

        const title = document.createElement('div');
        title.textContent = 'Send to...';
        title.style.cssText = `
      padding: 4px 12px;
      font-weight: bold;
      border-bottom: 1px solid var(--border-color);
    `;
        menu.appendChild(title);

        const targetSessions = Object.keys(this.activeSessions).filter(id => id !== sourceSessionId);

        if (targetSessions.length === 0) {
            const noSessions = document.createElement('div');
            noSessions.textContent = 'No other sessions';
            noSessions.style.cssText = `
        padding: 6px 12px;
        color: var(--text-secondary);
        font-style: italic;
      `;
            menu.appendChild(noSessions);
        } else {
            targetSessions.forEach(sessionId => {
                const option = document.createElement('div');
                option.textContent = sessionId;
                option.style.cssText = `
          padding: 6px 12px;
          cursor: pointer;
        `;

                option.addEventListener('mouseenter', () => option.style.backgroundColor = 'var(--background-secondary)');
                option.addEventListener('mouseleave', () => option.style.backgroundColor = 'white');
                option.addEventListener('click', () => {
                    this.sendContentToSession(sessionId, lineContent);
                    menu.remove();
                });

                menu.appendChild(option);
            });
        }

        const closeMenu = (event) => {
            if (!menu.contains(event.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => document.addEventListener('click', closeMenu), 0);

        return menu;
    }

    sendContentToSession(targetSessionId, content) {
        const session = this.activeSessions[targetSessionId];
        if (!session || !session.input) return;

        session.input.value = content.text || content;
        session.input.focus();
    }

    filterHistoryByText(sessionId, searchText, useRegex = false) {
        if (!searchText?.trim()) {
            return this.sessionHistories[sessionId] ?? [];
        }

        const cacheKey = `filterHistoryByText_${sessionId}_${searchText}_${useRegex}`;

        if (!this.memoizedResults) this.memoizedResults = new Map();
        if (this.memoizedResults.has(cacheKey)) return this.memoizedResults.get(cacheKey);

        const history = this.sessionHistories[sessionId] ?? [];
        const searchLower = searchText.toLowerCase();

        const filterFn = useRegex ? this.createRegexFilter(searchText) : (cell) => this.matchesText(cell, searchLower);
        const result = history.filter(filterFn);

        this.memoizedResults.set(cacheKey, result);
        return result;
    }

    createRegexFilter(searchText) {
        try {
            const regex = new RegExp(searchText, 'i');
            return (cell) => this.matchesRegex(cell, regex);
        } catch (e) {
            console.warn('Invalid regex, falling back to text search:', e);
            const searchLower = searchText.toLowerCase();
            return (cell) => this.matchesText(cell, searchLower);
        }
    }

    matchesRegex(cell, regex) {
        const content = this.getCellContent(cell);
        return regex.test(content);
    }

    matchesText(cell, searchText) {
        const content = this.getCellContent(cell);
        return content.toLowerCase().includes(searchText);
    }

    getCellContent(cell) {
        return cell.type === 'input' ? cell.content : cell.content.text || '';
    }

    filterHistoryByType(sessionId, type) {
        if (type === 'all') return this.sessionHistories[sessionId] || [];

        const cacheKey = `filterHistoryByType_${sessionId}_${type}`;

        if (!this.memoizedResults) this.memoizedResults = new Map();
        if (this.memoizedResults.has(cacheKey)) return this.memoizedResults.get(cacheKey);

        const history = this.sessionHistories[sessionId] || [];
        const result = history.filter(cell => cell.type === type);

        this.memoizedResults.set(cacheKey, result);
        return result;
    }

    filterHistoryByDateRange(sessionId, startDate, endDate) {
        const startRounded = Math.floor(startDate / 1000) * 1000;
        const endRounded = Math.floor(endDate / 1000) * 1000;
        const cacheKey = `filterHistoryByDateRange_${sessionId}_${startRounded}_${endRounded}`;

        if (!this.memoizedResults) this.memoizedResults = new Map();
        if (this.memoizedResults.has(cacheKey)) return this.memoizedResults.get(cacheKey);

        const history = this.sessionHistories[sessionId] || [];
        const result = history.filter(cell => cell.timestamp >= startDate && cell.timestamp <= endDate);

        this.memoizedResults.set(cacheKey, result);
        return result;
    }

    filterHistoryCombined(sessionId, filters) {
        const textHash = filters.text ? btoa(filters.text).substring(0, 10) : 'none';
        const type = filters.type || 'all';
        const startDate = filters.startDate ? Math.floor(filters.startDate / 1000) : 'none';
        const endDate = filters.endDate ? Math.floor(filters.endDate / 1000) : 'none';
        const useRegex = filters.useRegex || false;

        const cacheKey = `filterHistoryCombined_${sessionId}_${textHash}_${type}_${startDate}_${endDate}_${useRegex}`;

        if (!this.memoizedResults) this.memoizedResults = new Map();
        if (this.memoizedResults.has(cacheKey)) return this.memoizedResults.get(cacheKey);

        let history = this.sessionHistories[sessionId] || [];

        if (filters.text) {
            history = this.filterHistoryByText(sessionId, filters.text, filters.useRegex);
        }

        if (filters.type && filters.type !== 'all') {
            history = history.filter(cell => cell.type === filters.type);
        }

        if (filters.startDate || filters.endDate) {
            const startDate = filters.startDate || 0;
            const endDate = filters.endDate || Date.now();
            history = history.filter(cell => cell.timestamp >= startDate && cell.timestamp <= endDate);
        }

        this.memoizedResults.set(cacheKey, history);
        return history;
    }

    paginateHistory(sessionId, page = 1, pageSize = 50) {
        const history = this.sessionHistories[sessionId] ?? [];
        const total = history.length;
        const totalPages = Math.ceil(total / pageSize);

        const safePage = this.getSafePageNumber(page, totalPages);
        const startIndex = (safePage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, total);
        const data = history.slice(startIndex, endIndex);

        return {
            data,
            page: safePage,
            pageSize,
            total,
            totalPages,
            hasNext: endIndex < total,
            hasPrev: startIndex > 0
        };
    }

    getSafePageNumber(page, totalPages) {
        return Math.max(1, Math.min(page, totalPages || 1));
    }

    createSession(id) {
        if (this.activeSessions[id]) {
            console.warn(`Session ${id} already exists`);
            return;
        }

        const sessionElement = document.createElement('div');
        sessionElement.className = 'session';
        sessionElement.setAttribute('data-session-id', id);
        sessionElement.setAttribute('role', 'region');
        sessionElement.setAttribute('aria-label', `Session ${id}`);

        const header = this.createSessionHeader(id);
        const inputArea = this.createInputArea(id);
        const output = document.createElement('div');
        output.className = 'output-area';
        output.setAttribute('aria-live', 'polite');
        output.setAttribute('aria-label', `Session ${id} output`);
        output.setAttribute('role', 'log');

        const status = document.createElement('div');
        status.className = 'status';
        status.textContent = '●';
        status.setAttribute('aria-label', `Session ${id} status`);

        const instructions = document.createElement('div');
        instructions.id = `session-${id}-instructions`;
        instructions.className = 'sr-only';
        instructions.textContent = 'Enter Narsese commands and press Enter to submit';

        sessionElement.appendChild(header);
        sessionElement.appendChild(inputArea);
        sessionElement.appendChild(output);
        sessionElement.appendChild(status);
        sessionElement.appendChild(instructions);

        this.container.appendChild(sessionElement);

        this.activeSessions[id] = {
            element: sessionElement,
            input: inputArea.querySelector('.repl-input'),
            output: output,
            status: status
        };

        console.log(`Created session: ${id}`);
        this.updateSessionDropdown();
    }

    createSessionHeader(id) {
        const header = document.createElement('div');
        header.className = 'session-header';

        const title = document.createElement('span');
        title.className = 'session-title';
        title.textContent = id;
        title.setAttribute('aria-label', `Session ${id} title`);

        const closeButton = document.createElement('button');
        closeButton.className = 'close-session-btn';
        closeButton.textContent = '×';
        closeButton.setAttribute('aria-label', `Close session ${id}`);
        closeButton.setAttribute('aria-describedby', `session-${id}-description`);
        closeButton.addEventListener('click', () => this.destroySession(id));

        header.appendChild(title);
        header.appendChild(closeButton);

        return header;
    }

    createInputArea(id) {
        const inputArea = this.createInputAreaElement();

        const input = document.createElement('textarea');
        input.className = 'repl-input';
        input.placeholder = `${id}> `;
        input.rows = 1;
        input.setAttribute('aria-label', `${id} input`);
        input.setAttribute('aria-describedby', `session-${id}-instructions`);

        const submitButton = document.createElement('button');
        submitButton.className = 'submit-btn';
        submitButton.textContent = 'Submit';
        submitButton.setAttribute('aria-label', `Submit command for session ${id}`);

        inputArea.appendChild(input);
        inputArea.appendChild(submitButton);

        return inputArea;
    }

    createInputAreaElement() {
        const inputArea = document.createElement('div');
        inputArea.className = 'input-area';
        return inputArea;
    }

    destroySession(id) {
        if (!this.activeSessions[id]) {
            console.warn(`Session ${id} does not exist`);
            return;
        }

        const sessionElement = this.activeSessions[id].element;
        sessionElement.remove();
        delete this.activeSessions[id];

        console.log(`Destroyed session: ${id}`);
        this.updateSessionDropdown();
    }

    bindEvents() {
        this.setupNewSessionButton();
        this.createSessionSelector();
    }

    setupNewSessionButton() {
        const newSessionBtn = document.getElementById('new-session-btn');
        newSessionBtn?.addEventListener('click', () => this.createSession(generateId()));
    }

    createSessionSelector() {
        const selectorContainer = this.createSelectorContainer();

        const selectorLabel = document.createElement('label');
        selectorLabel.textContent = 'Sessions:';
        selectorLabel.htmlFor = 'session-dropdown';

        this.sessionDropdown = document.createElement('select');
        this.sessionDropdown.id = 'session-dropdown';

        selectorContainer.appendChild(selectorLabel);
        selectorContainer.appendChild(this.sessionDropdown);
        this.selector.appendChild(selectorContainer);

        this.updateSessionDropdown();
    }

    createSelectorContainer() {
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'session-selector-container';
        selectorContainer.setAttribute('role', 'toolbar');
        selectorContainer.setAttribute('aria-label', 'Session management controls');
        return selectorContainer;
    }

    updateSessionDropdown() {
        if (!this.sessionDropdown) return;

        this.sessionDropdown.innerHTML = '';

        Object.keys(this.activeSessions).forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${id} ${this.getSessionStatusIcon(id)}`;
            this.sessionDropdown.appendChild(option);
        });

        this.setupSwipeGestures();
    }

    setupSwipeGestures() {
        if (!this.sessionDropdown) return;

        let touchStartX = 0;
        let touchStartY = 0;

        this.sessionDropdown.addEventListener('touchstart', (event) => {
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        }, {passive: true});

        this.sessionDropdown.addEventListener('touchend', (event) => {
            if (!touchStartX || !touchStartY) return;

            const touchEndX = event.changedTouches[0].clientX;
            const touchEndY = event.changedTouches[0].clientY;

            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;

            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
                if (diffX > 0) {
                    this.switchToNextSession();
                } else {
                    this.switchToPreviousSession();
                }
            }

            touchStartX = 0;
            touchStartY = 0;
        });
    }

    switchToNextSession() {
        const sessionIds = Object.keys(this.activeSessions);
        if (sessionIds.length <= 1) return;

        const currentIndex = sessionIds.indexOf(this.currentSessionId || 'main');
        const nextIndex = (currentIndex + 1) % sessionIds.length;
        const nextSessionId = sessionIds[nextIndex];

        this.switchToSession(nextSessionId);
    }

    switchToPreviousSession() {
        const sessionIds = Object.keys(this.activeSessions);
        if (sessionIds.length <= 1) return;

        const currentIndex = sessionIds.indexOf(this.currentSessionId || 'main');
        const prevIndex = (currentIndex - 1 + sessionIds.length) % sessionIds.length;
        const prevSessionId = sessionIds[prevIndex];

        this.switchToSession(prevSessionId);
    }

    switchToSession(sessionId) {
        if (this.sessionDropdown) {
            this.sessionDropdown.value = sessionId;
        }
        this.currentSessionId = sessionId;
        console.log(`Switched to session: ${sessionId}`);
    }

    getSessionStatusIcon(id) {
        const session = this.activeSessions[id];
        if (!session || !session.status) return this.getDefaultStatusIcon();

        const status = session.status.getAttribute('data-status');
        return this.getStatusIcon(status);
    }

    getDefaultStatusIcon() {
        return '⏹️';
    }

    getStatusIcon(status) {
        return {
            'connected': '▶️',
            'disconnected': '⏹️',
            'error': '❌'
        }[status] ?? this.getDefaultStatusIcon();
    }

    updateSessionStatus(id, status) {
        const session = this.activeSessions[id];
        if (session && session.status) {
            session.status.setAttribute('data-status', status);
            this.updateSessionDropdown();
        }
    }

    getSessionStatus(id) {
        const session = this.activeSessions[id];
        return session?.status?.getAttribute('data-status') || null;
    }

    getSession(id) {
        return this.activeSessions[id] || null;
    }

    registerReplCore(sessionId, replCore) {
        const session = this.activeSessions[sessionId];
        if (session) {
            session.replCore = replCore;
        }
    }

    setupReducedMotionListener() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addListener((e) => {
            this.reducedMotion = e.matches;

            if (this.reducedMotion) {
                document.documentElement.classList.add('reduced-motion');
            } else {
                document.documentElement.classList.remove('reduced-motion');
            }
        });

        if (this.reducedMotion) {
            document.documentElement.classList.add('reduced-motion');
        }
    }

    setupDebouncedHistorySaves() {
        import('../src/utils/utilityFunctions.js').then((utils) => {
            if (utils.debounce) {
                const saveHistory = (sessionId) => {
                    try {
                        const history = this.sessionHistories[sessionId] || [];
                        sessionStorage.setItem(`nars-history-${sessionId}`, JSON.stringify(history));
                    } catch (error) {
                        this.handlePersistenceError(`Failed to persist history for session ${sessionId}`, error);
                    }
                };
            }
        }).catch(error => console.warn('Could not import debounce utility for history saves:', error));
    }

    setupResourceManagement() {
        this.container.addEventListener('focusin', (event) => {
            const sessionElement = event.target.closest('[data-session-id]');
            if (sessionElement) {
                const sessionId = sessionElement.getAttribute('data-session-id');
                this.updateSessionActivity(sessionId);
            }
        });

        this.container.addEventListener('click', (event) => {
            const sessionElement = event.target.closest('[data-session-id]');
            if (sessionElement) {
                const sessionId = sessionElement.getAttribute('data-session-id');
                this.updateSessionActivity(sessionId);
            }
        });

        this.container.addEventListener('focus', (event) => {
            if (event.target.classList.contains('repl-input')) {
                const sessionElement = event.target.closest('[data-session-id]');
                if (sessionElement) {
                    const sessionId = sessionElement.getAttribute('data-session-id');
                    this.updateSessionActivity(sessionId);
                }
            }
        }, true);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.activeTabSessions.clear();
            } else {
                const activeSessionElement = document.querySelector('[data-session-id]');
                if (activeSessionElement) {
                    const sessionId = activeSessionElement.getAttribute('data-session-id');
                    if (sessionId) {
                        this.activeTabSessions.add(sessionId);
                    }
                }
            }
        });

        setInterval(() => this.manageSessionResources(), 5 * 60 * 1000);
    }

    updateSessionActivity(sessionId) {
        this.sessionActivity[sessionId] = Date.now();
        this.activeTabSessions.add(sessionId);
    }

    manageSessionResources() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        Object.keys(this.activeSessions).forEach(sessionId => {
            const lastActivity = this.sessionActivity[sessionId] || now;
            const timeSinceActivity = now - lastActivity;

            if (!this.activeTabSessions.has(sessionId) && timeSinceActivity > 10000) {
                this.throttleSession(sessionId);
            }

            if (timeSinceActivity > oneHour && sessionId !== 'main') {
                console.log(`Auto-closing inactive session ${sessionId}`);
                this.destroySession(sessionId);
            }
        });
    }

    throttleSession(sessionId) {
        const session = this.activeSessions[sessionId];
        if (!session) return;

        if (!this.sessionResourceLimits[sessionId]) {
            this.sessionResourceLimits[sessionId] = {
                lastUpdate: 0,
                throttleRate: 1000
            };
        }
    }

    createAgentHUD() {
        document.querySelector('.agent-hud')?.remove();

        const hud = this.createHUDContainer();
        const header = this.createHUDHeader();
        const grid = this.createAgentGrid();

        Object.keys(this.activeSessions).forEach(sessionId => {
            const card = this.createAgentCard(sessionId);
            grid.appendChild(card);
        });

        const buttonContainer = this.createHUDButtonContainer();

        hud.appendChild(header);
        hud.appendChild(grid);
        hud.appendChild(buttonContainer);

        document.body.appendChild(hud);
        this.agentHUD = hud;
    }

    createHUDContainer() {
        const hud = document.createElement('div');
        hud.className = 'agent-hud';
        hud.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--background-primary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 10000;
      min-width: 500px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      padding: 20px;
      font-family: ui-monospace, monospace;
    `;
        return hud;
    }

    createHUDHeader() {
        const header = document.createElement('div');
        header.className = 'agent-hud-header';
        header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    `;

        const title = document.createElement('div');
        title.className = 'agent-hud-title';
        title.textContent = 'Agent Status Dashboard';
        title.style.cssText = `
      font-size: 1.4em;
      font-weight: bold;
      color: var(--text-primary);
    `;

        const closeButton = document.createElement('button');
        closeButton.className = 'agent-hud-close';
        closeButton.textContent = '×';
        closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 1.8em;
      cursor: pointer;
      padding: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    `;
        closeButton.addEventListener('mouseenter', () => closeButton.style.backgroundColor = 'var(--background-secondary)');
        closeButton.addEventListener('mouseleave', () => closeButton.style.backgroundColor = 'transparent');
        closeButton.addEventListener('click', () => {
            this.agentHUD?.remove();
            this.agentHUD = null;
        });

        header.appendChild(title);
        header.appendChild(closeButton);

        return header;
    }

    createAgentGrid() {
        const grid = document.createElement('div');
        grid.className = 'agent-grid';
        grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    `;
        return grid;
    }

    createHUDButtonContainer() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
    `;

        const networkToggle = this.createNetworkViewButton();
        const refreshButton = this.createRefreshButton();

        buttonContainer.appendChild(networkToggle);
        buttonContainer.appendChild(refreshButton);

        return buttonContainer;
    }

    createNetworkViewButton() {
        const networkToggle = document.createElement('button');
        networkToggle.textContent = '🌐 Network View';
        networkToggle.className = 'network-view-toggle';
        networkToggle.style.cssText = `
      padding: 10px 20px;
      background: linear-gradient(135deg, var(--session-main), #2980b9);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 1em;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
        networkToggle.addEventListener('mouseenter', () => {
            networkToggle.style.transform = 'translateY(-2px)';
            networkToggle.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });
        networkToggle.addEventListener('mouseleave', () => {
            networkToggle.style.transform = 'translateY(0)';
            networkToggle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        networkToggle.addEventListener('click', () => this.showNetworkView());

        return networkToggle;
    }

    createRefreshButton() {
        const refreshButton = document.createElement('button');
        refreshButton.textContent = '🔄 Refresh';
        refreshButton.className = 'refresh-btn';
        refreshButton.style.cssText = `
      margin-left: 12px;
      padding: 10px 20px;
      background: linear-gradient(135deg, var(--session-agent1), #c0392b);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 1em;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
        refreshButton.addEventListener('mouseenter', () => {
            refreshButton.style.transform = 'translateY(-2px)';
            refreshButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });
        refreshButton.addEventListener('mouseleave', () => {
            refreshButton.style.transform = 'translateY(0)';
            refreshButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        refreshButton.addEventListener('click', () => this.refreshAgentHUD());

        return refreshButton;
    }

    createAgentCard(sessionId) {
        const card = document.createElement('div');
        card.className = 'agent-card';
        card.setAttribute('data-session-id', sessionId);
        card.style.cssText = `
      background: var(--background-primary);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      padding: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    `;

        const session = this.activeSessions[sessionId];
        const status = session && session.status ? session.status.getAttribute('data-status') : 'disconnected';

        const header = document.createElement('div');
        header.className = 'agent-card-header';
        header.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    `;

        const indicator = this.createStatusIndicator(status);
        const idElement = document.createElement('div');
        idElement.textContent = sessionId;
        idElement.className = 'agent-card-id';
        idElement.style.cssText = `
      font-weight: bold;
      flex-grow: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

        header.appendChild(indicator);
        header.appendChild(idElement);

        const stats = this.createStatsContainer(status);

        const sessionColorClass = this.getSessionColorClass(sessionId);
        if (sessionColorClass) {
            card.style.borderLeft = `3px solid var(${sessionColorClass})`;
        }

        card.appendChild(header);
        card.appendChild(stats);

        return card;
    }

    createStatusIndicator(status) {
        const indicator = document.createElement('div');
        indicator.className = `agent-status-indicator ${status}`;
        indicator.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
      background-color: ${this.getStatusColor(status)};
    `;
        return indicator;
    }

    getStatusColor(status) {
        return {
            'connected': '#2ecc71',
            'disconnected': '#e74c3c',
            'error': '#f39c12'
        }[status] ?? '#95a5a6';
    }

    createStatsContainer(status) {
        const stats = document.createElement('div');
        stats.className = 'agent-stats';
        stats.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    `;

        const cyclesElement = document.createElement('div');
        cyclesElement.className = 'agent-stat-item';
        cyclesElement.innerHTML = '<strong>Cycles:</strong> <span class="cycles-value">0</span>';
        cyclesElement.style.cssText = `
      font-size: 0.9em;
    `;

        const memoryElement = document.createElement('div');
        memoryElement.className = 'agent-stat-item';
        memoryElement.innerHTML = '<strong>Memory:</strong> <span class="memory-value">0MB</span>';
        memoryElement.style.cssText = `
      font-size: 0.9em;
    `;

        const stateElement = document.createElement('div');
        stateElement.className = 'agent-stat-item';
        stateElement.innerHTML = '<strong>State:</strong> <span class="state-value">' + (status || 'unknown') + '</span>';
        stateElement.style.cssText = `
      font-size: 0.9em;
      grid-column: span 2;
    `;

        stats.appendChild(cyclesElement);
        stats.appendChild(memoryElement);
        stats.appendChild(stateElement);

        return stats;
    }

    getSessionColorClass(sessionId) {
        if (sessionId === 'main') return '--session-main';

        const sessionColors = [
            '--session-agent1',
            '--session-agent2',
            '--session-agent3',
            '--session-agent4',
            '--session-agent5',
            '--session-agent6'
        ];

        let hash = 0;
        for (let i = 0; i < sessionId.length; i++) {
            hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % sessionColors.length;
        return sessionColors[index];
    }

    updateAgentCard(sessionId, statusData) {
        const card = document.querySelector(`.agent-card[data-session-id="${sessionId}"]`);
        if (!card) return;

        const cyclesElement = card.querySelector('.cycles-value');
        if (cyclesElement && statusData.cycles !== undefined) {
            cyclesElement.textContent = statusData.cycles;
        }

        const memoryElement = card.querySelector('.memory-value');
        if (memoryElement && statusData.memory !== undefined) {
            memoryElement.textContent = statusData.memory;
        }

        const stateElement = card.querySelector('.state-value');
        if (stateElement && statusData.state !== undefined) {
            stateElement.textContent = statusData.state;
        }

        const indicator = card.querySelector('.agent-status-indicator');
        if (indicator && statusData.status !== undefined) {
            indicator.className = `agent-status-indicator ${statusData.status}`;
        }
    }

    refreshAgentHUD() {
        if (!this.agentHUD) return;

        const grid = this.agentHUD.querySelector('.agent-grid');
        if (!grid) return;

        grid.innerHTML = '';

        Object.keys(this.activeSessions).forEach(sessionId => {
            const card = this.createAgentCard(sessionId);
            grid.appendChild(card);
        });
    }

    hideAgentHUD() {
        if (this.agentHUD) {
            this.agentHUD.remove();
            this.agentHUD = null;
        }
    }

    showNetworkView() {
        document.querySelector('.network-view')?.remove();

        const view = document.createElement('div');
        view.className = 'network-view';

        const content = document.createElement('div');
        content.className = 'network-view-content';

        const header = document.createElement('div');
        header.className = 'network-view-header';

        const title = document.createElement('div');
        title.className = 'network-view-title';
        title.textContent = 'Inter-Session Belief Network';

        const closeButton = document.createElement('button');
        closeButton.className = 'network-view-close';
        closeButton.textContent = '×';
        closeButton.addEventListener('click', () => view.remove());

        header.appendChild(title);
        header.appendChild(closeButton);

        const graph = document.createElement('div');
        graph.className = 'network-graph';
        graph.style.cssText = `
      width: 100%;
      height: calc(100% - 50px);
      position: relative;
    `;

        const networkData = this.createNetworkVisualizationData();
        const processedData = this.processVisualizationData(networkData, {groupingStrategy: 'relationship'});

        this.renderNetworkGraph(graph, processedData);

        const refreshButton = document.createElement('button');
        refreshButton.className = 'network-refresh';
        refreshButton.textContent = '↻ Refresh';
        refreshButton.addEventListener('click', () => {
            graph.innerHTML = '';
            const newData = this.createNetworkVisualizationData();
            const newProcessedData = this.processVisualizationData(newData, {groupingStrategy: 'relationship'});
            this.renderNetworkGraph(graph, newProcessedData);
        });

        header.appendChild(refreshButton);

        content.appendChild(header);
        content.appendChild(graph);
        view.appendChild(content);

        document.body.appendChild(view);
    }

    hideNetworkView() {
        document.querySelector('.network-view')?.remove();
    }

    renderNetworkGraph(container, data) {
        container.innerHTML = '';

        const graphContainer = this.createGraphContainer();
        const canvas = this.createCanvas(container);
        graphContainer.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (ctx) {
            const nodes = this.initializeNodePositions(data.nodes, canvas);
            this.animateNetworkGraph(ctx, nodes, data.edges, canvas);
        }

        const legend = this.createNetworkLegend();
        graphContainer.appendChild(legend);
        container.appendChild(graphContainer);
    }

    createGraphContainer() {
        const graphContainer = document.createElement('div');
        graphContainer.className = 'network-graph-container';
        graphContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      background-color: var(--background-secondary);
      border-radius: 4px;
      overflow: hidden;
    `;
        return graphContainer;
    }

    createCanvas(container) {
        const canvas = document.createElement('canvas');
        canvas.width = container.clientWidth || 600;
        canvas.height = container.clientHeight || 400;
        return canvas;
    }

    initializeNodePositions(nodes, canvas) {
        return nodes.map(node => ({
            ...node,
            x: node.x || Math.random() * canvas.width,
            y: node.y || Math.random() * canvas.height,
            vx: 0,
            vy: 0
        }));
    }

    animateNetworkGraph(ctx, nodes, edges, canvas) {
        let animationId = null;
        const nodeRadius = 25;

        const repulsion = 1500;
        const attraction = 0.02;
        const damping = 0.85;
        const centerForce = 0.002;

        const simulatePhysics = () => {
            nodes.forEach(node => {
                node.vx = 0;
                node.vy = 0;
            });

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const nodeA = nodes[i];
                    const nodeB = nodes[j];

                    const dx = nodeA.x - nodeB.x;
                    const dy = nodeA.y - nodeB.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const minDistance = 20;
                    if (distance > minDistance) {
                        const force = repulsion / (distance * distance);
                        const fx = (dx / distance) * force;
                        const fy = (dy / distance) * force;

                        nodeA.vx += fx;
                        nodeA.vy += fy;
                        nodeB.vx -= fx;
                        nodeB.vy -= fy;
                    }
                }
            }

            edges.forEach(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);

                if (sourceNode && targetNode) {
                    const dx = targetNode.x - sourceNode.x;
                    const dy = targetNode.y - sourceNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > 0) {
                        const force = attraction * distance;
                        const fx = (dx / distance) * force;
                        const fy = (dy / distance) * force;

                        sourceNode.vx += fx;
                        sourceNode.vy += fy;
                        targetNode.vx -= fx;
                        targetNode.vy -= fy;
                    }
                }
            });

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            nodes.forEach(node => {
                const dx = centerX - node.x;
                const dy = centerY - node.y;
                node.vx += dx * centerForce;
                node.vy += dy * centerForce;
            });

            nodes.forEach(node => {
                node.vx *= damping;
                node.vy *= damping;
                node.x += node.vx;
                node.y += node.vy;

                const padding = nodeRadius + 10;
                node.x = Math.max(padding, Math.min(canvas.width - padding, node.x));
                node.y = Math.max(padding, Math.min(canvas.height - padding, node.y));
            });
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            edges.forEach(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);

                if (sourceNode && targetNode) {
                    const gradient = ctx.createLinearGradient(
                        sourceNode.x, sourceNode.y,
                        targetNode.x, targetNode.y
                    );

                    const strength = edge.size || 1;
                    if (strength > 2) {
                        gradient.addColorStop(0, '#2ecc71');
                        gradient.addColorStop(1, '#3498db');
                    } else if (strength > 1) {
                        gradient.addColorStop(0, '#f39c12');
                        gradient.addColorStop(1, '#e67e22');
                    } else {
                        gradient.addColorStop(0, '#e74c3c');
                        gradient.addColorStop(1, '#c0392b');
                    }

                    ctx.beginPath();
                    ctx.moveTo(sourceNode.x, sourceNode.y);
                    ctx.lineTo(targetNode.x, targetNode.y);
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = Math.max(1, strength);
                    ctx.stroke();
                }
            });

            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeRadius + 3, 0, Math.PI * 2);
                const glowGradient = ctx.createRadialGradient(
                    node.x, node.y, nodeRadius,
                    node.x, node.y, nodeRadius + 3
                );
                glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = glowGradient;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
                ctx.fillStyle = node.color || '#666';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                const label = node.label || '';
                ctx.font = 'bold 12px Arial';
                const textWidth = ctx.measureText(label).width;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(
                    node.x - textWidth / 2 - 4,
                    node.y - nodeRadius - 16,
                    textWidth + 8,
                    16
                );

                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, node.x, node.y - nodeRadius - 8);

                if (node.beliefs || node.cycles) {
                    const info = `${node.beliefs || 0} beliefs`;
                    ctx.font = '10px Arial';
                    const infoWidth = ctx.measureText(info).width;

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(
                        node.x - infoWidth / 2 - 4,
                        node.y + nodeRadius + 2,
                        infoWidth + 8,
                        14
                    );

                    ctx.fillStyle = '#fff';
                    ctx.fillText(info, node.x, node.y + nodeRadius + 9);
                }
            });
        };

        const animate = () => {
            simulatePhysics();
            render();
            animationId = requestAnimationFrame(animate);
        };

        animate();

        const cleanup = () => animationId && cancelAnimationFrame(animationId);

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.removedNodes.forEach(node => {
                    if (node === graph?.parentElement || node.contains?.(graph)) {
                        cleanup();
                        observer.disconnect();
                    }
                });
            });
        });

        observer.observe(document.body, {childList: true, subtree: true});
    }

    createNetworkLegend() {
        const legend = document.createElement('div');
        legend.className = 'network-legend';
        legend.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 4px;
      padding: 10px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      font-size: 12px;
    `;

        legend.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Legend</div>
      <div style="display: flex; align-items: center; margin-bottom: 3px;">
        <div style="width: 20px; height: 3px; background: linear-gradient(to right, #2ecc71, #3498db); margin-right: 5px;"></div>
        <span>Strong connection</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 3px;">
        <div style="width: 20px; height: 2px; background: linear-gradient(to right, #f39c12, #e67e22); margin-right: 5px;"></div>
        <span>Medium connection</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 3px;">
        <div style="width: 20px; height: 1px; background: linear-gradient(to right, #e74c3c, #c0392b); margin-right: 5px;"></div>
        <span>Weak connection</span>
      </div>
    `;

        return legend;
    }

    processVisualizationData(data, options = {}) {
        try {
            if (dataProcessor.processDataWithFilters && options.filters) {
                data = dataProcessor.processDataWithFilters(data, options.filters);
            }

            if (groupRelatedItems && options.groupingStrategy) {
                data = groupRelatedItems(data, options.groupingStrategy);
            }
        } catch (error) {
            console.warn('Could not process visualization data with dataProcessor, using fallback:', error);
            if (options.groupingStrategy) {
                data = this.groupRelatedItems(data, options.groupingStrategy);
            }
        }

        return data;
    }

    groupRelatedItems(items, groupingStrategy = 'timestamp') {
        const strategyFn = this.getGroupingStrategy(groupingStrategy);
        return strategyFn ? strategyFn(items) : items;
    }

    getGroupingStrategy(groupingStrategy) {
        const groupingStrategies = {
            timestamp: this.groupByTimestamp.bind(this),
            type: this.groupByType.bind(this),
            relationship: this.groupByRelationship.bind(this)
        };

        return groupingStrategies[groupingStrategy] ?? null;
    }

    groupByTimestamp(items) {
        const groupedByTime = new Map();
        items.forEach(item => {
            const timestamp = item.timestamp || item.creationTime || Date.now();
            const interval = Math.floor(timestamp / 10000);
            if (!groupedByTime.has(interval)) {
                groupedByTime.set(interval, []);
            }
            groupedByTime.get(interval).push(item);
        });
        return Array.from(groupedByTime.values()).flat();
    }

    groupByType(items) {
        const groupedByType = new Map();
        items.forEach(item => {
            const type = item.type || 'unknown';
            if (!groupedByType.has(type)) {
                groupedByType.set(type, []);
            }
            groupedByType.get(type).push(item);
        });
        return Array.from(groupedByType.values()).flat();
    }

    groupByRelationship(items) {
        return items;
    }

    createNetworkVisualizationData() {
        const sessionIds = Object.keys(this.activeSessions);
        const nodes = this.createNetworkNodes(sessionIds);
        const edges = this.createNetworkEdges(sessionIds);

        return this.processVisualizationData({nodes, edges}, {groupingStrategy: 'relationship'});
    }

    createNetworkNodes(sessionIds) {
        const centerX = 300;
        const centerY = 200;
        const radius = 150;

        return sessionIds.map((sessionId, index) => {
            const angle = (index / sessionIds.length) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            return {
                id: sessionId,
                label: sessionId,
                color: this.getSessionColor(sessionId),
                size: 20,
                x: x,
                y: y
            };
        });
    }

    createNetworkEdges(sessionIds) {
        const edges = [];

        for (let i = 0; i < sessionIds.length; i++) {
            for (let j = i + 1; j < sessionIds.length; j++) {
                const strength = Math.random();
                if (strength > 0.3) {
                    edges.push({
                        id: `edge-${sessionIds[i]}-${sessionIds[j]}`,
                        source: sessionIds[i],
                        target: sessionIds[j],
                        label: 'belief propagation',
                        size: strength * 3 + 1
                    });
                }
            }
        }

        return edges;
    }

    getSessionColor(sessionId) {
        if (sessionId === 'main') return '#3498db';

        const sessionColors = [
            '#e74c3c', // --session-agent1
            '#9b59b6', // --session-agent2
            '#1abc9c', // --session-agent3
            '#f39c12', // --session-agent4
            '#34495e', // --session-agent5
            '#2ecc71'  // --session-agent6
        ];

        let hash = 0;
        for (let i = 0; i < sessionId.length; i++) {
            hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % sessionColors.length;
        return sessionColors[index];
    }
}

// Initialize session manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sessionManager = new SessionManager();
});

export default SessionManager;