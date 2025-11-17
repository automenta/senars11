/**
 * REPLView - A module that creates and manages the REPL UI elements
 */
export function init(container, onCommand) {
    // Create the input element
    const input = document.createElement('input');
    Object.assign(input, {
        type: 'text',
        id: 'repl-input',
        placeholder: 'Enter NARS command (e.g., <a --> b>.)'
    });
    Object.assign(input.style, {
        width: '100%',
        padding: '8px',
        boxSizing: 'border-box'
    });

    // Create the output area (log)
    const output = document.createElement('pre');
    Object.assign(output, { id: 'repl-output' });
    Object.assign(output.style, {
        width: '100%',
        height: '300px',
        overflowY: 'auto',
        border: '1px solid #ccc',
        padding: '10px',
        backgroundColor: '#f9f9f9',
        marginTop: '10px'
    });
    output.textContent = 'SeNARS REPL - Ready\n';

    // Store the command handler to be set later
    let commandHandler = null;

    // Command history state
    let historyIndex = -1;
    let commandHistory = loadCommandHistory();

    // Add event listener for Enter key press
    input.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const command = input.value.trim();
            if (command) {
                output.textContent += `> ${command}\n`;
                commandHandler?.(command);
                input.value = '';
            }
        }
    });

    input.addEventListener('keydown', handleArrowKeys);

    container.appendChild(input);
    container.appendChild(output);

    function handleArrowKeys(event) {
        if (event.key === 'ArrowUp') {
            if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
                historyIndex++;
                input.value = commandHistory[commandHistory.length - 1 - historyIndex] ?? '';
                event.preventDefault();
            }
        } else if (event.key === 'ArrowDown') {
            if (historyIndex >= 0) {
                historyIndex--;
                input.value = historyIndex < 0 ? '' : commandHistory[commandHistory.length - 1 - historyIndex] ?? '';
                event.preventDefault();
            }
        }
    }

    function loadCommandHistory() {
        try {
            const saved = localStorage.getItem('replCommandHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('Could not load command history from localStorage:', e);
            return [];
        }
    }

    function saveCommandHistory() {
        try {
            localStorage.setItem('replCommandHistory', JSON.stringify(commandHistory));
        } catch (e) {
            console.warn('Could not save command history to localStorage:', e);
        }
    }

    // Return an object with methods to update the view
    return {
        addOutput: function(text) {
            output.textContent += text + '\n';
            output.scrollTop = output.scrollHeight;
        },
        clearOutput: function() {
            output.textContent = '';
        },
        setInput: function(value) {
            input.value = value;
        },
        getInput: function() {
            return input.value;
        },
        addToHistory: function(command) {
            if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== command) {
                commandHistory.push(command);

                if (commandHistory.length > 100) {
                    commandHistory = commandHistory.slice(-100);
                }

                saveCommandHistory();
            }
            historyIndex = -1;
        },
        setCommandHandler: function(handler) {
            commandHandler = handler;
        }
    };
}