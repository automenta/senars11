# Reasoning Engine UI

A web-based user interface for a reasoning engine built with React, FlexLayout, Zustand, and WebSockets.

## Overview

This UI provides an IDE-like environment for interacting with a reasoning engine. It features:
- Dynamic panel docking and layout management
- Real-time communication with a server via WebSockets
- Comprehensive error handling
- Theme support (light/dark)
- Message validation using Zod schemas

## Tech Stack

- **Framework**: React (using plain JavaScript, no JSX)
- **Build Tool**: Vite
- **Layout**: FlexLayout-React for IDE-like docking
- **State Management**: Zustand
- **Validation**: Zod
- **Styling**: CSS Modules
- **Testing**: Playwright (E2E), Vitest (unit)
- **Code Quality**: ESLint + Prettier

## Project Structure

```
./ui/
├── src/
│   ├── components/          # React components (e.g., Panel.js using createElement)
│   ├── stores/              # Zustand stores (e.g., uiStore.js)
│   ├── utils/               # Helpers (e.g., websocket.js, consoleBridge.js)
│   ├── schemas/             # Shared Zod schemas (e.g., messages.js)
│   ├── layouts/             # FlexLayout configs (JSON or JS exports)
│   ├── App.js               # Root component with FlexLayout and WebSocket setup
│   └── main.js              # Entry point (ReactDOM.render)
├── tests/                   # Playwright tests (e.g., ui.test.js)
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
   - Unit tests: `npm run test`
   - E2E tests: `npm run e2e`

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
- State is managed with Zustand stores
- WebSocket communication is handled via custom service
- Styles are scoped using CSS modules
- Zod schemas validate all incoming WebSocket messages

## WebSocket Protocol

The UI communicates with the server via WebSockets using the following message types:

- `layoutUpdate`: Updates the current UI layout
- `panelUpdate`: Updates a specific panel configuration
- `reasoningStep`: Adds a reasoning step to the UI
- `sessionUpdate`: Manages active reasoning sessions
- `notification`: Shows user notifications
- `error`: Reports errors from the server
- `log`: Forwards console logs to the server

## Theme System

The UI supports light and dark themes that can be toggled. Themes are persisted in localStorage and respect system preferences by default.

## Error Handling

The application includes:
- React Error Boundaries for component-level errors
- Global error handling via Zustand store
- Console bridging to forward browser logs to the server
- Comprehensive WebSocket error handling with reconnection logic