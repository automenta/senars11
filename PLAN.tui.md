# TUI REPL

A simplified, stable, and observable Text User Interface for the SeNARS engine.

## Core Principles

- **Observability**: Provide a clear, real-time stream of the reasoner's activity.
- **Stability**: Prioritize a robust and crash-free user experience.
- **Simplicity**: Maintain a clean, single-view layout that is easy to use and extend.

## Features

### Layout

- **Single-View Interface**: A simple and effective layout with three main components:
    - **Status Bar**: A persistent bar at the top of the screen displaying key real-time metrics (cycle count, concept count, etc.).
    - **Log Viewer**: The main area of the screen, which displays a color-coded, scrollable stream of events from the reasoner.
    - **Input Box**: A text input area at the bottom of the screen for entering Narsese statements and commands.

### Commands

- A command-palette-style system, accessed by typing `/` in the input box.
- **`/exit`**: Gracefully shuts down the TUI.
- **`/list-examples`**: Displays a list of available example scripts in the `examples/` directory.
- **`/load <filepath>`**: Loads and executes a Narsese script from the `examples/` directory.

### Input

- **Command History**: Users can navigate through their input history using the up and down arrow keys.
