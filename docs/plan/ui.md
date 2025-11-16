# SeNARS UI Development Plan (v4 - Final)

## 1. Vision & Guiding Principles

This document outlines a phased, actionable plan to build a new web UI for SeNARS. The primary goal is a **maintainable, testable, and intuitive application** that serves as a powerful, scalable window into the reasoning engine.

### Guiding Principles:
- **Project Consistency**: The UI will be written in **JavaScript (ES6+) with JSX**, using JSDoc for annotations, to maintain consistency with the core SeNARS codebase.
- **Scalable State Management**: The architecture will handle high-speed engine operation and large memory states by implementing a **client-controlled, partial, and batch-updated state synchronization** model.
- **Simplicity Over Complexity**: We will build one single-page application with one build process and a clean, decoupled architecture.
- **Testability is Non-Negotiable**: Every piece of logic and every component will be developed with testing in mind.
- **Incremental, Verifiable Steps**: The project is decomposed into small, achievable tasks, each with a clear, verifiable outcome.

---

## 2. Asynchronous State Synchronization Strategy

The core architectural challenge is to decouple the high-speed NAR engine (the "producer") from the human-speed UI (the "consumer"). The UI cannot and should not attempt to render every single event in real-time. Our goal is **asynchronous eventual consistency**, ensuring the UI is a coherent, recent, and useful representation of the engine's state.

This is a **producer-consumer** problem, not a multi-user collaboration problem, so CRDTs (like Y.js) are not the appropriate model. We will use a multi-layered batching and throttling strategy instead.

### Layer 1: Server-Side Buffering & Throttling (Recommended)

The `WebSocketMonitor` should be modified to buffer high-frequency events from the NAR engine. Instead of broadcasting every event instantly, it should collect them and send them in batches at a fixed, UI-friendly interval (e.g., 5-10 times per second). This transforms a flood of micro-updates into a predictable stream.

### Layer 2: Client-Side Batch Processing

The client will be designed to handle these event batches efficiently. The `nar-service` will receive a single message containing an array of events and pass the entire batch to the state store, which will process it in a single state update. This prevents component re-rendering churn.

### Layer 3: Client-Controlled View & Updates

The client will manage a "focus window" on the potentially vast server state.
1.  **Snapshot-Based View**: The user defines a view (e.g., "top 100 concepts by priority") and requests a *snapshot*. The client's graph is populated exclusively from this snapshot.
2.  **Filtered Real-time Updates**: The real-time event stream is used to update the graph *only if* the concepts involved are already in the client's current view.
3.  **User Control**: A "Live Update" toggle will allow the user to pause the processing of the real-time stream, freezing the UI for inspection without disconnecting from the server.

---

## 3. Phase 0: Project Foundation & Setup

**Goal**: To create a clean, modern, and fully configured project environment using JavaScript.

| Task ID | Action | Details & Commands | Verification |
| :--- | :--- | :--- | :--- |
| **0.1** | **Archive Legacy UI** | The `ui` directory has been renamed to `ui-old`. | `ui-old/` exists; `ui/` is absent. |
| **0.2** | **Scaffold New Project** | `npm create vite@latest ui -- --template react` | New `ui/` directory is created with a JS+JSX template. |
| **0.3** | **Install Dependencies** | `cd ui && npm install zustand reactflow vitest @testing-library/react` | Dependencies are in `ui/package.json`. |
| **0.4** | **Install Dev Dependencies** | `cd ui && npm install -D playwright @vitejs/plugin-react eslint eslint-plugin-react` | Dev dependencies are in `ui/package.json`. |
| **0.5** | **Configure Vite** | Edit `ui/vite.config.js` to set a specific port (e.g., 5173) and a WebSocket proxy. | `npm run dev` starts the server and proxies WebSocket traffic. |
| **0.6** | **Initialize Storybook** | `cd ui && npx storybook@latest init` | `.storybook/` and `src/stories/` exist. `npm run storybook` works. |
| **0.7** | **Update Root Scripts** | Modify root `package.json` scripts (`web:dev`, `test:ui`). | Scripts in root `package.json` correctly run commands inside the `ui/` directory. |

---

## 4. Phase 1: Isolated Component Development with Storybook

**Goal**: To build and visually test all core UI components in isolation before integration.

| Task ID | Component | Action & Details | Verification |
| :--- | :--- | :--- | :--- |
| **1.1** | **`LogPanel` & `LogEntry`** | Create `.jsx` and `.stories.jsx` files for these components. | Stories exist for different event types and for verifying auto-scrolling. Unit tests pass. |
| **1.2** | **`InputBar` & `ControlBar`** | Create `.jsx` and `.stories.jsx` files. | Stories exist for enabled/disabled states. Callbacks are tested. Unit tests pass. |
| **1.3** | **`ViewControls`** | Create `src/components/ViewControls.jsx` and stories. Controls: Number input for "Limit", dropdown for "Sort By", a "Refresh View" button, and a **"Live Update" toggle switch**. Props: `onRefresh`, `onToggleLive`. | Stories exist for all states. Callbacks are fired with the correct parameters. Unit tests pass. |
| **1.4** | **`GraphPanel`** | Create `src/components/GraphPanel.jsx` and stories using `ReactFlow`. Props: `nodes`, `edges`. | Stories exist for an empty graph and a simple populated graph. |
| **1.5** | **`AppLayout`** | Create `src/components/AppLayout.jsx`. Assemble all other components into the final UI layout. | The component renders the full layout structure correctly in Storybook. |

---

## 5. Phase 2: Application Assembly & State Management

**Goal**: To wire the components together with a central state store and a communication service designed for the new synchronization strategy.

| Task ID | Action | Details & Concerns | Verification |
| :--- | :--- | :--- | :--- |
| **2.1** | **Implement WebSocket Service** | Create `ui/src/services/nar-service.js`. Must include `requestMemorySnapshot(options)` and logic to handle incoming messages that may contain a single event or an array (batch) of events. | Unit tests (with a mock WebSocket) verify that snapshot requests are formatted correctly and that batched event messages are parsed and emitted as a single `batch` event. |
| **2.2** | **Define State Store** | Create `ui/src/store/nar-store.js` using Zustand. State must include `viewQuery`, `liveUpdateEnabled`, `logEntries`, `graphNodes`, `graphEdges`. Actions must include `handleSnapshot(snapshot)` (replaces graph state), `handleEventBatch(events)` (appends to log and filters for graph updates), and `toggleLiveUpdate()`. | Unit tests for all actions, verifying that `handleSnapshot` replaces state and `handleEventBatch` correctly appends/filters. |
| **2.3** | **Assemble the Application** | In `ui/src/App.jsx`, use Zustand hooks to connect components to the store. Wire the `ViewControls` to their corresponding store actions. The "Refresh View" button will call the `requestMemorySnapshot` service method. | The application renders. Interacting with the `ViewControls` correctly updates the Zustand store. Clicking "Refresh View" calls the correct service method. |
| **2.4** | **Connect State to Service** | In `App.jsx`, use a `useEffect` hook to initialize the `nar-service` and subscribe the Zustand store to its events. A `snapshot` event calls `handleSnapshot`; a `batch` event calls `handleEventBatch`, but only if `liveUpdateEnabled` is true in the store. | Manual testing: Run the UI and backend. 1. Click "Refresh View" to load a snapshot. 2. Verify the graph renders. 3. With "Live Update" on, send a command and verify the view updates. 4. Toggle "Live Update" off, send another command, and verify the view *does not* change. |

---

## 6. Phase 3: End-to-End Integration & Refinement

**Goal**: To ensure the entire system works together reliably and to build a comprehensive suite of automated E2E tests for the new logic.

| Task ID | Action | Details & Concerns | Verification |
| :--- | :--- | :--- | :--- |
| **3.1** | **Write E2E Tests** | Create `ui/e2e/snapshot-and-live-update.spec.js` using Playwright. Test the flow described in **Task 2.4** automatically. Use `data-testid` attributes on key elements for stable selectors. | The E2E test suite runs and passes reliably in a headless browser (`npm run test:e2e`). |
| **3.2** | **Styling & Polish** | Apply basic, clean CSS. Add loading indicators for when a snapshot is being fetched and visual feedback for the "Live Update" status. | The application is visually coherent and provides clear feedback to the user about its state. Manual review. |
| **3.3** | **JSDoc Annotation** | Add JSDoc comments to all components, services, and store functions to document props, state shape, and method signatures, providing essential documentation and enabling better editor support. | Key functions and components are documented. Manual code review. |