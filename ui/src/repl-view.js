/**
 * REPLView - A module that creates and manages the REPL UI elements
 */
import { createElement } from './utils/common.js';
import { createCommandHistoryManager, createInputHandler, createOutputLogger } from './utils/event-handlers.js';

export function init(container, onCommand) {
    // Create the input element
    const input = createElement('input', {
        type: 'text',
        id: 'repl-input',
        placeholder: 'Enter NARS command (e.g., <a --> b>.)'
    }, {
        width: '100%',
        padding: '8px',
        boxSizing: 'border-box'
    });

    // Create the output area (log)
    const output = createElement('pre', {
        id: 'repl-output'
    }, {
        width: '100%',
        height: '300px',
        overflowY: 'auto',
        border: '1px solid #ccc',
        padding: '10px',
        backgroundColor: '#f9f9f9',
        marginTop: '10px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap'
    });
    output.textContent = 'SeNARS REPL - Ready\n';

    // Create command history manager
    const historyManager = createCommandHistoryManager('replCommandHistory', 100);

    // Create output logger
    const logger = createOutputLogger(output);

    // Input handler with history support
    const inputHandler = createInputHandler(input, (command) => {
        logger.add(`> ${command}`);
        onCommand?.(command);
    }, historyManager);

    container.appendChild(input);
    container.appendChild(output);

    // Return an object with methods to update the view
    return {
        addOutput: function(text) {
            logger.add(text);
        },
        clearOutput: function() {
            logger.clear();
            logger.add('SeNARS REPL - Ready\n');
        },
        setInput: function(value) {
            input.value = value;
        },
        getInput: function() {
            return input.value;
        },
        addToHistory: function(command) {
            historyManager.add(command);
        },
        setCommandHandler: function(handler) {
            // Reinitialize input handler with new command handler
            inputHandler.destroy();
            createInputHandler(input, handler, historyManager);
        },
        destroy: function() {
            inputHandler.destroy();
        }
    };
}