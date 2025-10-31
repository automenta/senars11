# Reasoning Engine UI

A web-based user interface for a reasoning engine built with React, FlexLayout, Zustand, and WebSockets.

## Overview

This UI provides an IDE-like environment for interacting with a reasoning engine. It features:

- Dynamic panel docking and layout management
- Real-time communication with a server via WebSockets
- Comprehensive error handling
- Theme support (light/dark)
- Message validation using Zod schemas
- Enhanced component patterns with virtualization support
- Improved performance with memoization and optimized rendering

## Tech Stack

- **Framework**: React (using plain JavaScript, no JSX)
- **Build Tool**: Vite
- **Layout**: FlexLayout-React for IDE-like docking
- **State Management**: Zustand
- **Validation**: Zod
- **Styling**: CSS Modules with shared variables
- **Testing**: Playwright (E2E), Vitest (unit)
- **Code Quality**: ESLint + Prettier

## Project Structure

```
./ui/
├── src/
│   ├── components/          # React components (e.g., Panel.js using createElement)
│   │   ├── Panel.js         # Base panel component with enhanced functionality
│   │   ├── GenericPanel.js  # Generic panel for displaying lists of items
│   │   ├── ListPanel.js     # Advanced list panel with filtering/sorting
│   │   ├── VirtualizedList.js # Virtualized list for performance with large datasets
│   │   └── ErrorBoundary.js # Error boundary component
│   ├── stores/              # Zustand stores (e.g., uiStore.js)
│   ├── utils/               # Helpers (e.g., websocket.js, consoleBridge.js)
│   │   ├── formatters.js    # Formatting utilities
│   │   ├── helpers.js       # General helper functions
│   │   ├── theme.js         # Theme management utilities
│   │   ├── messages.js      # Message utility functions
│   │   └── performance.js   # Performance optimization utilities
│   ├── schemas/             # Shared Zod schemas (e.g., messages.js)
│   ├── layouts/             # FlexLayout configs (JSON or JS exports)
│   ├── styles/              # Shared CSS variables and styles
│   ├── App.js               # Root component with FlexLayout and WebSocket setup
│   └── main.js              # Entry point (ReactDOM.render)
├── e2e-tests/               # Playwright tests (end-to-end tests)
├── src/__tests__/           # Vitest unit tests
├── index.html               # Vite entry HTML
├── vite.config.js           # Vite config
├── playwright.config.js     # Playwright config
├── eslint.config.js         # ESLint rules
├── .prettierrc              # Prettier config
└── package.json             # Dependencies/scripts
```

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   This will start the Vite development server on http://localhost:5173

3. **Run tests:**
    - All tests: `npm run test`
    - Unit tests: `npm run test:unit`
    - E2E tests: `npm run test:e2e`

4. **Code quality checks:**
   ```bash
   npm run lint
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

## Development Workflow

- All components use `React.createElement()` instead of JSX
- Layouts are managed using FlexLayout-React
- State is managed with Zustand stores with enhanced update patterns
- WebSocket communication is handled via enhanced service with better error handling
- Styles use CSS variables for theme consistency
- Zod schemas validate all incoming WebSocket messages

## Key Improvements

### Component Architecture
- **Enhanced Base Panel**: The `Panel.js` component now supports additional props like `showWebSocketStatus`, `showHeader`, `headerExtra`, etc.
- **ListPanel Component**: Advanced list component with built-in filtering, sorting, and search capabilities
- **Virtualized Lists**: Added `VirtualizedList.js` for performance when rendering large datasets
- **GenericPanel Enhancements**: Improved with auto-scroll, timestamp, count display, and other features

### State Management
- **Enhanced Store**: The `uiStore.js` now includes additional update methods for each entity type (updateTask, updateConcept, updateNotification, etc.)
- **Batch Updates**: Added `batchUpdate` function for updating multiple properties at once
- **Reset Functionality**: Added `resetStore` function to completely reset the store to initial state

### Performance Optimizations
- **Virtualization**: Implemented virtualized list rendering for components handling large datasets
- **Memoization**: Added memoization utilities for expensive calculations
- **Debounced/Throttled Functions**: Optimized user input handling
- **Proper Keys**: Ensured proper key attributes for efficient rendering

### Styling System
- **CSS Variables**: Introduced `styles/variables.css` for consistent theming
- **Theme Consistency**: All components now use shared CSS variables for consistent appearance
- **Dark/Light Themes**: Improved theme switching with better variable definitions

### Utility Functions
- **Enhanced Helpers**: The `utils/helpers.js` file now includes more comprehensive utility functions
- **Formatters**: The `utils/formatters.js` file has additional formatting functions
- **Message Utilities**: Added `utils/messages.js` for consistent notification creation
- **Performance Utilities**: Added `utils/performance.js` for rendering optimization

### Testing
- **Comprehensive Unit Tests**: Added detailed unit tests for store functionality
- **Utility Function Tests**: Added tests for helper functions
- **Better Coverage**: Improved test coverage for critical functionality

## WebSocket Protocol

The UI communicates with the server via WebSockets using the following message types:

- `layoutUpdate`: Updates the current UI layout
- `panelUpdate`: Updates a specific panel configuration
- `reasoningStep`: Adds a reasoning step to the UI
- `sessionUpdate`: Manages active reasoning sessions
- `notification`: Shows user notifications
- `error`: Reports errors from the server
- `log`: Forwards console logs to the server
- `conceptUpdate`: Updates concept information
- `taskUpdate`: Updates task information
- `demoState`: Updates demo state
- `systemMetrics`: Updates system metrics
- `narseseInput`: Processes Narsese input
- And more...

## Theme System

The UI supports light and dark themes that can be toggled. Themes are persisted in localStorage and respect system
preferences by default. The new CSS variables system ensures consistent theming across all components.

## Error Handling

The application includes:

- React Error Boundaries for component-level errors
- Global error handling via Zustand store with improved notification system
- Console bridging to forward browser logs to the server
- Comprehensive WebSocket error handling with reconnection logic and better error messaging

## Demo Movie Generation

To create movies of all demos for visual verification:

1. Make sure the UI is running: `npm run dev`
2. Run the movie generator script: `node demo-movie-generator.js`
3. For lower disk usage, use FPS control: `node demo-movie-generator.js --fps-control`

The script will:
- Navigate to the UI
- Run each available demo
- Record the UI interactions as videos or screenshots
- Save recordings in the `demo-videos` directory

The FPS control option captures screenshots at a specified rate (default 1 FPS) which significantly reduces disk space usage compared to full video recording.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run the test suite: `npm test`
6. Submit a pull request