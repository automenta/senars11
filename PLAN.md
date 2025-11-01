# SeNARS Complete Development Plan (Final, Enhanced)

## Introduction

This document presents the complete, reprioritized development plan for SeNARS. It has been revised to prioritize the
development and validation of a correct, reliable, and secure core reasoning system using ephemeral test cases *before*
implementing end-user functionality such as persistence or visualization UIs.

This plan codifies key architectural principles and technology choices to ensure a robust, maintainable, and agile
foundation for research and development. Each phase includes a stated **"Agile Focus"** and initiatives ordered by
priority.

---

## Core Development Principles & Technology Choices

To align with the JavaScript platform and modern development practices, we will adhere to the following principles:

1. **Flexible Configuration:** Configuration can be provided via inline JSON within `.js` initialization code,
   overriding sane defaults. For sensitive information like API keys, `.env` files (or similar conventions) will be
   consulted. This approach simplifies testing by unifying configuration within the code, while still allowing for
   external configuration files in application-level functionality.

2. **Jest for Testing:** The project will standardize on the **Jest** testing framework. Instead of building custom test
   runners or fluent APIs, we will leverage Jest's powerful ecosystem for assertions, mocking, and coverage reporting,
   which is already established in the project.

3. **Zod for Validation:** For all data validation (configuration schemas, API inputs, event payloads), we will use *
   *Zod**. Its schema-first approach provides robust, static, and runtime type safety with minimal boilerplate,
   improving reliability and developer experience.

4. **Lightweight Event Emitter:** The `EventBus` will be implemented using a minimal, well-tested library like `mitt` or
   `tiny-emitter`. This avoids reinventing core eventing logic and ensures high performance.

5. **Functional Core, Imperative Shell:** The reasoning engine, evaluation logic, and truth-value functions will be
   implemented as **pure functions**. The "shell" will manage state and side effects (I/O, etc.). This separation is
   critical for testability and reliability.

6. **Configuration as Code:** All agent behaviors, rule sets, and plugin configurations will be defined declaratively in
   the `config.json`, not hard-coded. The `AgentBuilder` is the mechanism that enforces this principle.

---

### Phase 9: Observability & Foundational Engineering

*Goal: Establish a comprehensive, unified observability framework and a formal plugin architecture.*

**Agile Focus:** Establish the event-driven backbone and implement the minimum viable logging and developer tools
necessary to observe and debug the core reasoning loop.

**Key Initiatives (In Priority Order):**

* **9.1: Enforce Event-Driven Communication & Define Ubiquitous Language:**
    * **Action:** Mandate the use of the `EventBus` for all cross-component communication. Refactor to publish events.
    * **Implementation Details:**
        * **Ubiquitous Language**: Events (`task.new`, `cycle.start`, etc.) will carry a `traceId` to allow for tracing
          a single causal chain of operations through the asynchronous system.

* **9.2: Implement Basic Structured Logging:**
    * **Action:** Create a single `LoggingSubscriber` that listens to all events on the bus and outputs structured JSON
      logs to the console.

* **9.3: Establish a Unified Configuration Schema with Zod:**
    * **Action:** Consolidate all configuration into a single, hierarchical JSON schema. Use **Zod** to parse and
      validate the configuration object at startup.
    * **Example Snippet (`config.json`):**
      ```json
      {
        "agent": {
          "observability": { "logging": { "level": "info" } },
          "plugins": [ { "name": "my-plugin", "config": { "apiKey": "${ENV_VAR}" } } ]
        }
      }
      ```

* **9.4: Define and Implement the Formal Plugin API:**
    * **Action:** Specify a formal `Plugin` interface and integrate it into the `AgentBuilder`.

* **9.5: Create a Core Agent Factory:**
    * **Action:** Develop a simple factory function (e.g., `createAgent(config)`) that abstracts the `AgentBuilder` for
      common use cases, making it easier for researchers to start experiments.

**Acceptance Criteria:**

- [ ] All core reasoning loop communication is mediated by the `EventBus` and includes a `traceId`.
- [ ] A `LoggingSubscriber` outputs structured logs for all core events.
- [ ] All system configuration is managed through a single, Zod-validated JSON schema.

---

### Phase 10: Fault Tolerance & Reliability Architecture

*Goal: Architect and implement a robust fault tolerance system that ensures predictable behavior in the face of internal
and external failures.*

**Agile Focus:** Eliminate the most immediate and critical stability risks: infinite loops and cascading failures from
external API calls.

**Key Initiatives (In Priority Order):**

* **10.1: Implement Bounded Evaluation:**
    * **Action:** Modify the `Task` object to include a `budget`. The `Cycle.js` loop must decrement this budget and
      halt processing of a task if it is exhausted.
    * **Pattern:**
      ```javascript
      const task = {
        term: '(A ==> B)',
        truth: { f: 0.9, c: 0.9 },
        budget: { cycles: 100, depth: 10 }
      };
      ```

* **10.2: Implement Circuit Breakers for External Dependencies:**
    * **Action:** Wrap all external calls (especially to LM providers) in a Circuit Breaker pattern.

* **10.3: Design and Implement Fallback Strategies:**
    * **Action:** Develop intelligent fallback mechanisms, such as degrading to pure NAL reasoning when an LM is
      unavailable.

* **10.4: Memory Corruption Detection:**
    * **Action:** Implement checksums or other validation mechanisms for critical memory structures. (Note: Recovery
      will depend on persistence, but detection can be implemented first).

**Acceptance Criteria:**

- [ ] All reasoning tasks are subject to configurable resource and time bounds.
- [ ] All external API calls are protected by a configurable circuit breaker.

---

### Phase 11: Security & Advanced Validation

*Goal: Secure the agent's execution environment and rigorously validate the correctness of its reasoning on ephemeral
test cases.*

**Agile Focus:** Prove that the core reasoning system is both secure and logically correct *before* adding features that
expose it to the outside world or persist its state.

**Key Initiatives (In Priority Order):**

* **11.1: Design a Capability-Based Security Model:**
    * **Action:** Implement a security model where tools and plugins are granted specific, limited capabilities defined
      in a manifest.

* **11.2: Implement a Sandboxed Tool Execution Environment:**
    * **Action:** Execute all external tools in a sandboxed environment with strict resource limits.

* **11.3: Implement Property-Based Testing for NAL Rules:**
    * **Action:** Use **Jest** with a library like `fast-check` to test the logical invariants of the NAL rule engine
      and truth-value functions.

* **11.4: Establish a Reasoning Benchmark Suite:**
    * **Action:** Create a dedicated test harness and a suite of complex, ephemeral problems stored in JSON files. The
      CI pipeline will run these benchmarks to validate the *quality* and *correctness* of NAL-LM hybrid reasoning and
      catch regressions.
    * **Validation Scenario Example (`/benchmarks/tesla_premise.json`):**
      ```json
      {
        "name": "Tesla Premise Injection",
        "input": [
          "(my_car --> Tesla).",
          "(Tesla --> car).",
          "my_car needs electricity?"
        ],
        "expected": {
          "answer": "(my_car --> needs_electricity).",
          "trace": [ "lm.request", "nal.deduction" ]
        }
      }
      ```

**Acceptance Criteria:**

- [ ] Tools and plugins operate under a capability-based security model.
- [ ] The quality and correctness of hybrid reasoning are validated against a JSON-based benchmark suite.
- [ ] NAL rules are validated by property-based tests.

---

### Phase 12: Foundation Enhancement (UI Development)

**Agile Focus**: Maximize reliability and usability of the web-based user interface to establish a robust user experience foundation.

**Technology Stack & Architecture**:
- **Build Tool/Dev Server**: Vite - Lightning-fast development server with live reload/hot module replacement (HMR) for instant updates.
- **Frontend Framework**: React (using plain JavaScript, no JSX) - Component-based architecture ideal for logic-oriented hierarchies and shared elements, using `React.createElement()` exclusively.
- **Docking Framework**: FlexLayout - Provides IDE-like features such as drag-and-drop panels, nested tabs, splits, and persistence.
- **State Management**: Zustand - Lightweight, minimal boilerplate compared to Redux, ideal for complex hierarchies with slice state by component or feature.
- **Styling**: Vanilla CSS Modules - Scoped styling per component with no extra build steps beyond Vite's built-in CSS handling.
- **WebSocket Integration**: Native WebSocket API - Simple, direct for real-time server communication with Zod schema validation.
- **Testing Framework**: Playwright + Vitest - End-to-end browser emulation and unit tests on components/state.
- **Linting and Formatting**: ESLint + Prettier - Enforce code consistency and catch issues early.

**Project Structure**:
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

**Current Architecture Status**:
- **Core Framework**: Vite + React + Zustand + FlexLayout
- **Advanced Data Processing**: Fluent API with DataProcessor class supporting filtering, sorting, mapping, and transformation
- **Sophisticated Component Architecture**: DataPanel with advanced filtering, sorting, pagination, and virtualization
- **Message Processing Pipeline**: Middleware-based architecture with validation and error handling
- **Unified Theming System**: themeUtils for consistent styling across all components
- **Factory Functions**: createTaskDataPanel, createConceptDataPanel for rapid panel creation
- **State Management**: Action creators and organized state patterns in Zustand store
- **Component Utilities**: Panel utilities for standardized component creation

**Key Initiatives (In Priority Order):**

* **12.1: Reliability & Robustness:**
    * **Action:** Implement global error boundary system with graceful failure modes based on React's componentDidCatch
    * **Action:** Develop automatic recovery mechanisms for connection and data validation failures
    * **Action:** Create proactive WebSocket diagnostics and connection health monitoring
    * **Action:** Implement state persistence with serialization/deserialization for session continuity using localStorage
    * **Action:** Add comprehensive error reporting with enhanced logging and diagnostic capabilities
    * **Action:** Implement ConsoleBridge to forward browser console logs to WebSocket server for centralized monitoring
    * **Implementation Detail:** Build a centralized error handling system that can catch, log, and recover from various failure modes across the UI

* **12.2: Usability & Accessibility:**
    * **Action:** Implement advanced theming system with light/dark/auto modes and user preference persistence using CSS variables
    * **Action:** Develop full keyboard navigation with power-user shortcuts and accessibility compliance
    * **Action:** Create responsive design for adaptive layouts across various screen sizes and devices
    * **Action:** Build contextual help system with tooltips and assistance throughout the UI
    * **Action:** Add smooth animations and transitions for enhanced user experience
    * **Action:** Apply WCAG 2.1 AA standards compliance for accessibility
    * **Implementation Detail:** Use WCAG 2.1 AA standards compliance to ensure accessibility for all users

* **12.3: Web UI Integration:**
    * **Action:** Complete the WebSocket API integration from Phase 12 of the original plan for real-time monitoring
    * **Action:** Connect the UI components to actual agent data streams using Zod schema validation
    * **Action:** Implement real-time visualization of agent's reasoning processes
    * **Action:** Share Zod schemas between server and client for type safety without TypeScript
    * **Implementation Detail:** The web-based UI connects to the WebSocket API to provide a real-time view into the agent's mind

* **12.4: Component Architecture Enhancement:**
    * **Action:** Optimize component performance with React.memo and useMemo for expensive computations
    * **Action:** Implement virtualized lists for handling large datasets efficiently
    * **Action:** Create standardized panels with consistent theming using the themeUtils system
    * **Action:** Build error boundaries wrapping root and key components to catch errors gracefully
    * **Implementation Detail:** Use FlexLayout's features for drag-and-drop panels, nested tabs, splits, and persistence

---

### Phase 13: Versatility & Performance Enhancement

**Agile Focus**: Expand applicability and optimize for high-performance operation across diverse use cases.

**Key Initiatives (In Priority Order):**

* **13.1: Versatility & Extensibility:**
    * **Action:** Build plugin architecture framework for extending UI functionality
    * **Action:** Create API abstraction layers supporting different backend implementations
    * **Action:** Implement real-time collaboration features for multi-user interaction
    * **Action:** Develop data import/export system with multiple format support for interchange
    * **Action:** Create custom visualization components for domain-specific data
    * **Action:** Add export capabilities for data and visualizations
    * **Implementation Detail:** Design modular architecture to support different reasoning engine backends

* **13.2: Performance & Scalability:**
    * **Action:** Implement sophisticated virtualization for large datasets processing
    * **Action:** Apply memoization strategies optimizing expensive computations with React.memo and useMemo
    * **Action:** Create lazy loading components using dynamic imports for non-critical UI elements
    * **Action:** Establish performance benchmarking with continuous tracking and optimization
    * **Action:** Implement granular state slices for performance isolation of application features
    * **Implementation Detail:** Optimize rendering performance for real-time data updates

* **13.3: Interactive Dashboards:**
    * **Action:** Build real-time data dashboards with drill-down capabilities
    * **Action:** Create customizable dashboard layouts
    * **Action:** Implement dynamic panel configurations
    * **Implementation Detail:** Enable users to create personalized views of agent data

---

### Phase 14: Quality & Flexibility

**Agile Focus**: Ensure high-quality delivery and maximize architectural flexibility for future enhancements.

**Key Initiatives (In Priority Order):**

* **14.1: Quality Assurance:**
    * **Action:** Implement integration tests verifying complete user flows and component interactions
    * **Action:** Create visual regression testing for automatic UI change detection
    * **Action:** Develop property-based testing for data processing function validation
    * **Action:** Establish comprehensive linting and quality standards enforcement
    * **Implementation Detail:** Automated testing pipeline ensures UI stability and functionality

* **14.2: Development Experience:**
    * **Action:** Build component storybook for development environment and documentation
    * **Action:** Create development utilities for testing various data scenarios
    * **Action:** Implement hot-reload capabilities for faster development cycles
    * **Implementation Detail:** Developer tools accelerate UI development and maintenance

---

### Phase 15: Ubiquity & Innovation

**Agile Focus**: Maximize accessibility and introduce advanced features for broader adoption.

**Key Initiatives (In Priority Order):**

* **15.1: Ubiquity & Accessibility:**
    * **Action:** Implement cross-platform support ensuring web, mobile, and desktop compatibility
    * **Action:** Achieve WCAG 2.1 AA standards compliance for accessibility
    * **Action:** Build internationalization framework for multi-language support
    * **Action:** Develop offline-first capabilities with local storage and synchronization
    * **Action:** Create comprehensive API documentation auto-generated from code
    * **Implementation Detail:** UI accessible across all devices and user capabilities

* **15.2: Flexibility & Innovation:**
    * **Action:** Build feature flags system for gradual rollout and A/B testing
    * **Action:** Implement machine learning integration for intelligent UI adaptation and recommendations
    * **Action:** Create advanced analytics for usage patterns and performance insights
    * **Action:** Develop interactive tutorials for guided user onboarding
    * **Action:** Build customizable interfaces with user-configurable dashboards and workflows
    * **Implementation Detail:** Adaptive UI that learns and responds to user behavior patterns

---

### Phase 16: Full Autonomy Visualization

**Agile Focus**: Enable visualization and interaction with the agent's curiosity and autonomous learning mechanisms.

**Key Initiatives:**

* **16.1: Curiosity Mechanism Visualization:**
    * **Action:** Implement UI components to visualize the agent's curiosity-driven learning
    * **Action:** Display autonomous question generation and exploration patterns
    * **Action:** Visualize knowledge gap identification processes
    * **Implementation Detail:** Connect to the curiosity mechanism from the original Phase 14 to provide real-time visualization

**Acceptance Criteria:**

- [ ] The UI provides real-time insight into the agent's reasoning processes
- [ ] Users can interact with and influence the agent's autonomous learning
- [ ] The system's curiosity and self-improvement mechanisms are visible and understandable

---

## Optional Future Enhancement Phases

These phases represent additional enhancements that could be implemented to further improve the system's capabilities
and performance:

### Phase 17: Advanced UI Capabilities (Optional)

*Goal: Extend the UI with advanced capabilities for handling complex user interactions and data presentations.*

**Agile Focus:** Enable the UI to handle increasingly sophisticated user workflows and data visualization needs.

**Key Initiatives:**

* **17.1: Advanced Interaction Patterns:**
    * **Action:** Implement gesture-based controls and advanced interaction paradigms
    * **Action:** Add voice command integration for accessibility
    * **Benefits:** Enhanced user experience and broader accessibility options

* **17.2: Advanced Visualization:**
    * **Action:** Add 3D visualization capabilities for complex data relationships
    * **Action:** Implement advanced graph visualization for concept relationships
    * **Benefits:** More intuitive understanding of complex reasoning processes

* **17.3: Collaborative Features:**
    * **Action:** Implement real-time collaborative editing and shared workspaces
    * **Action:** Add role-based access controls and permissions
    * **Benefits:** Multi-user support with appropriate security and collaboration features

### Phase 18: Performance Optimization (Optional)

*Goal: Optimize UI performance through advanced caching, rendering, and resource management.*

**Agile Focus:** Maximize UI responsiveness and minimize resource consumption through sophisticated optimization
techniques.

**Key Initiatives:**

* **18.1: Advanced Caching Strategies:**
    * **Action:** Add multi-level caching with LRU eviction and adaptive cache sizing for UI components
    * **Benefits:** Reduced rendering time for frequently accessed components and improved response times

* **18.2: Advanced Rendering Optimization:**
    * **Action:** Implement virtualization for large-scale component rendering
    * **Action:** Add WebAssembly integration for performance-critical operations
    * **Benefits:** More efficient rendering of complex UI elements and reduced browser resource consumption

* **18.3: Resource Management:**
    * **Action:** Add sophisticated resource monitoring and management capabilities for the UI
    * **Benefits:** Better system stability under load and more predictable performance characteristics

### Phase 19: Advanced Agent Integration (Optional)

*Goal: Extend the UI to support advanced agent capabilities and complex reasoning patterns.*

**Agile Focus:** Enable the UI to handle increasingly sophisticated agent behaviors and reasoning processes.

**Key Initiatives:**

* **19.1: Multi-Agent Support:**
    * **Action:** Add support for visualizing multiple interacting agents
    * **Action:** Implement coordination and communication visualization
    * **Benefits:** Better understanding of complex multi-agent systems

* **19.2: Advanced Reasoning Visualization:**
    * **Action:** Add support for visualizing complex reasoning chains and inference patterns
    * **Action:** Implement debugging tools for reasoning processes
    * **Benefits:** Enhanced understanding and debugging of complex reasoning operations

* **19.3: Predictive Analytics:**
    * **Action:** Add predictive capabilities to anticipate user needs
    * **Action:** Implement intelligent recommendation systems
    * **Benefits:** More proactive and intelligent user interface
