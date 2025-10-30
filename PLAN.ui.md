# Web UI Specification for Reasoning Engine

## Overview

This specification outlines the architecture and setup for a web-based user interface (UI) for a reasoning engine. The
UI will be built in plain JavaScript, emphasizing a component-based structure with logic-oriented hierarchies to handle
shared elements and complex interactions. It will resemble an IDE with docking capabilities for dynamic panel
management. Communication with a server component will occur via WebSockets. The focus is on rapid development,
simplicity, and direct implementation, avoiding unnecessary complexity while ensuring robustness through testing and
error handling.

The UI will be dynamic, with no reliance on a static build/dist directory during development. All code will be testable
in a browser-emulated environment to prevent runtime errors. While the server-side (e.g., using Zod for schemas) is
referenced for integration, this spec concentrates on the client-side frontend framework and related concerns.

Key goals:

- Scalable from simple to complex IDE-like features.
- Minimal boilerplate, especially for WebSocket protocols.
- High testability to eliminate surprises like console errors.
- Agent-oriented extensibility (e.g., for external AI control via WebSockets), but without delving into specific
  components or operational logic.

## Technology Stack

- **Build Tool/Dev Server**: Vite
    - Reasons: Lightning-fast development server with live reload/hot module replacement (HMR) for instant updates.
      Supports plain JavaScript without requiring a full build step in development mode. Handles dynamic imports and
      avoids "dist" directory pains until production bundling is needed.
    - Configuration: Initialize with `npm create vite@latest` (select React template but configure for plain JS, no
      TypeScript). Use default Vite setup for React, but override to avoid JSX transpilation.

- **Frontend Framework**: React (using plain JavaScript, no JSX)
    - Reasons: Component-based architecture ideal for logic-oriented hierarchies and shared elements. Scalable for
      complex, dynamic UIs.
    - Implementation Style: Use `React.createElement()` exclusively for rendering elements and components. This keeps
      everything in pure JavaScript files (.js), avoiding JSX syntax, transpilers, or build-step issues related to JSX
      parsing.
    - Version: Latest stable (e.g., via npm/yarn).
    - Key Features to Leverage:
        - Component hierarchies: Root components will compose child components in a tree structure, with props for data
          flow and shared logic.
        - Hooks: Use built-in hooks like `useState`, `useEffect` for local state and side effects (e.g., WebSocket
          connections).

- **Docking Framework**: FlexLayout
    - Reasons: Provides IDE-like features such as drag-and-drop panels, nested tabs, splits, and persistence. Built
      specifically for React, avoiding DOM manipulation hacks. Integrates seamlessly with `React.createElement()`.
      Superior to alternatives like Golden Layout (legacy issues) or react-dock (too simplistic for full IDE
      capabilities).
    - Integration: Install via npm (`npm install flexlayout-react`). Define layouts as JSON configs, where each
      panel/tab is a React component created via `createElement`. Supports dynamic addition/removal of panels via API
      calls, enabling logic-oriented hierarchies.
    - Configuration: Use dark/light themes if needed; persist layout state in localStorage for session continuity.

- **State Management**: Zustand
    - Reasons: Lightweight, minimal boilerplate compared to Redux. Ideal for complex hierarchies—slice state by
      component or feature. Easy to test and integrate with WebSockets (e.g., update store on message receipt).
    - Integration: Install via npm (`npm install zustand`). Create a single store, export slices (e.g., for UI state,
      WebSocket data). Use in components via hooks like `useStore`.
    - Best Practices: Keep state serializable for easy debugging/testing. Avoid over-fetching; use for shared data
      across docked panels.

- **Styling**: Vanilla CSS Modules
    - Reasons: Scoped styling per component, no extra build steps beyond Vite's built-in CSS handling. Avoids
      bloat/config of alternatives like Tailwind. Hot-reloads in Vite for dynamic development.
    - Implementation: For each component, create a companion `.module.css` file. Import as
      `import styles from './Component.module.css';` and apply via `className: styles.className` in `createElement`
      props. Use BEM naming convention (e.g., `.panel--active`) for predictability.
    - Fallback Option: If minimal modern styling is needed without config, include Pico.css via CDN in index.html for
      quick, consistent defaults.

- **WebSocket Integration**: Native WebSocket API
    - Reasons: Simple, direct for real-time server communication. No additional libraries needed.
    - Setup: In a root or dedicated component, use `useEffect` to establish connection:
      `const ws = new WebSocket('ws://server-url');`. Handle events: `ws.onmessage`, `ws.onopen`, etc.
    - Protocol: Meta-programmed to minimize boilerplate. Share Zod schemas between server and client (import a shared
      `.js` file defining schemas). On client, validate incoming messages with `zodSchema.safeParse(data)` before
      dispatching to Zustand or components. For outgoing, generate messages from schemas dynamically if needed (e.g.,
      AI-generated handlers).
    - Zod Usage (Client-Side): Install Zod (`npm install zod`). Define message types (e.g., reasoning steps, errors) as
      schemas. Wrap listener: if parse succeeds, update state; else, log error. This ensures type safety without
      TypeScript.

- **Error Handling**:
    - **React Error Boundaries**: Wrap root and key components (e.g., docked panels) with custom error boundary
      components using `componentDidCatch`. Fallback UI: Display "Oops, something went wrong" with a retry button. Log
      errors to console.
    - **Console Bridge**: Forward browser console logs (override `console.log/error`) to WebSocket server for
      centralized monitoring. Implement as a utility function: e.g.,
      `const originalLog = console.log; console.log = (...args) => { ws.send(JSON.stringify({type: 'log', data: args})); originalLog(...args); };`.

- **Testing Framework**: Playwright
    - Reasons: End-to-end browser emulation for real-world testing. Simulates full interactions (clicks, WebSocket
      events) to catch runtime errors early. Browser-like environment (Chromium, Firefox, WebKit) ensures no surprises
      in production.
    - Integration: Install via npm (`npm install @playwright/test`). Configure in `playwright.config.js` for headless
      mode, screenshots on failure.
    - Scope: Write tests for:
        - Component rendering (e.g., assert DOM structure via `page.locator`).
        - WebSocket interactions (mock server, send messages, assert UI updates).
        - Docking: Simulate drags, tab switches, validate layout changes.
        - Error scenarios: Inject failures, check boundaries trigger fallbacks.
        - Zod validation: Mock invalid messages, ensure graceful handling.
    - Complementary: Use Vitest (Vite's built-in) with jsdom for unit tests on components/state (e.g.,
      `npm install vitest`). Focus on isolated logic; Playwright for integration.

- **Linting and Formatting**: ESLint + Prettier
    - Reasons: Enforce code consistency, catch issues early. Configured for React without JSX.
    - Setup: Install (`npm install eslint prettier eslint-config-prettier eslint-plugin-react`). Configure
      `.eslintrc.js` with rules like `'react/jsx-uses-react': 'off'` (since no JSX). Run via scripts: `npm run lint`.
    - Integration: Vite plugin for ESLint to lint on save.

## Project Structure

```
./ui/
├── src/
│   ├── components/          # React components (e.g., Panel.js using createElement)
│   │   └── Panel.module.css # Scoped styles
│   ├── stores/              # Zustand stores (e.g., uiStore.js)
│   ├── utils/               # Helpers (e.g., websocket.js, consoleBridge.js)
│   ├── schemas/             # Shared Zod schemas (e.g., messages.js)
│   ├── layouts/             # FlexLayout configs (JSON or JS exports)
│   ├── App.js               # Root component with FlexLayout and WebSocket setup
│   └── main.js              # Entry point (ReactDOM.render)
├── tests/                   # Playwright tests (e.g., ui.test.js)
├── index.html               # Vite entry HTML (optional Pico.css CDN)
├── vite.config.js           # Vite config (plugins for React, CSS modules)
├── playwright.config.js     # Playwright config
├── .eslintrc.js             # ESLint rules
├── .prettierrc              # Prettier config
├── package.json             # Dependencies/scripts
└── README.md                # Setup instructions
```

## Development Workflow

1. Initialize: `npm create vite@latest my-ui --template react` (adapt for plain JS).
2. Install Dependencies: `npm install react react-dom flexlayout-react zustand zod @playwright/test vitest`.
3. Setup Scripts in package.json:
    - `dev`: `vite`
    - `test`: `vitest`
    - `e2e`: `playwright test`
    - `lint`: `eslint src`
4. Develop: Code components with `createElement`, connect WebSocket in App.js, define layouts in FlexLayout.
5. Test: Write/run Playwright scripts to emulate browser, mock WebSockets, assert no runtime errors.
6. Extend: For agent control/demos, expose WebSocket endpoints for external commands (e.g., 'updatePanel').

## Assumptions and Extensibility

- Server: Assumes a Node.js backend with WebSocket support (e.g., ws library). Zod schemas shared via monorepo or copied
  file.
- No Production Build Details: Focus on dev; use `vite build` for dist when ready.
- Future-Proof: Architecture supports adding features like interaction demos or AI control without rework—e.g.,
  dedicated WebSocket channels per panel.
- Constraints: No TypeScript, no JSX, minimal build steps. If needs evolve, revisit (e.g., add Redux if Zustand
  insufficient).

This spec is self-contained; implement by following the structure and installing listed tools. AI can generate code
snippets based on this foundation.