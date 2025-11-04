# Shared TUI Components in SeNARS

This document describes the shared TUI components that have been implemented to reduce code duplication between `Repl.js` and `SeNARSInterface.js`.

## Overview

Previously, both `Repl.js` and `SeNARSInterface.js` contained duplicated code for handling common commands like help, status, memory, trace, reset, save, load, and demo. To improve maintainability and reduce redundancy, we've implemented a shared command processing system.

## Shared Components

### 1. CommandProcessor.js

The `CommandProcessor.js` class provides a centralized way to handle common commands that are shared between different TUI interfaces.

#### Features:
- Centralized command handling for common operations
- Consistent command mappings using `DEMO_COMMANDS` constants
- Shared implementation of help, status, memory, trace, reset, save, load, and demo commands
- Interface-agnostic design that works with both REPL and Blessed-based interfaces

#### Methods:
- `_help()` - Displays available commands and usage information
- `_status()` - Shows system status including running state, cycle count, and memory statistics
- `_memory()` - Displays memory statistics with formatted numbers
- `_trace()` - Shows recent beliefs with formatted task information
- `_reset()` - Resets the NAR system
- `_save()` - Saves current agent state to file
- `_load()` - Loads agent state from file
- `_demo()` - Handles demo/example commands with file path mapping
- `_quit()` - Basic quit handler (overridden by specific interfaces)

### 2. DisplayUtils.js

The `DisplayUtils.js` class provides shared formatting utilities for consistent display across different interfaces.

#### Features:
- Table creation with customizable headers and column widths
- Text truncation with ellipsis
- Number formatting with thousand separators
- Percentage formatting
- File size formatting (bytes to human-readable units)
- Duration formatting (milliseconds to human-readable time)
- Progress bar creation
- Key-value pair formatting
- Indented text formatting
- List formatting with emojis

### 3. Integration with Interfaces

#### Repl.js Changes:
- Instantiates `CommandProcessor` to handle shared commands
- Maintains interface-specific commands (next, run, stop) locally
- Delegates standard commands to the shared processor
- Uses `DisplayUtils` for consistent formatting

#### SeNARSInterface.js Changes:
- Instantiates `CommandProcessor` to handle shared commands
- Overrides the demo command with interface-specific implementation
- Adds interface-specific quit command handling
- Delegates standard commands to the shared processor
- Uses `DisplayUtils` for consistent formatting
- Uses `FormattingUtils` for task-specific formatting (maintained for backward compatibility)

## Benefits

1. **Reduced Code Duplication**: Common command implementations exist in one place
2. **Easier Maintenance**: Updates to shared commands only need to be made in one location
3. **Consistent Behavior**: Both interfaces now behave identically for shared commands
4. **Improved Extensibility**: Adding new shared commands is straightforward
5. **Better Formatting Consistency**: Shared `DisplayUtils` ensures consistent output formatting

## Future Improvements

1. Further unify formatting by consolidating `FormattingUtils` and `DisplayUtils`
2. Add more shared commands as needed
3. Enhance the command processor with better error handling and validation
4. Add unit tests for the shared components