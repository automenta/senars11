import {useState} from 'react';

export const useCommandHistory = () => {
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const addToHistory = (command) => {
        const trimmedCommand = command.trim();
        if (trimmedCommand && (commandHistory[0] !== trimmedCommand)) {
            setCommandHistory(prev => [trimmedCommand, ...prev.slice(0, 99)]); // Keep last 100 commands
        }
        setHistoryIndex(-1); // Reset history index after submitting
    };

    const navigateHistory = (direction, setInputValue) => {
        if (direction === 'up' && commandHistory.length > 0) {
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            setInputValue(commandHistory[newIndex]);
        } else if (direction === 'down') {
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[newIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInputValue('');
            }
        }
    };

    return {commandHistory, historyIndex, setHistoryIndex, addToHistory, navigateHistory};
};
