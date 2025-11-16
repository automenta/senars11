import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import Launcher from './Launcher.js';
import './index.css';
import {initializeTheme} from './utils/theme.js';
import RootErrorBoundary from './components/RootErrorBoundary.js';

// Route configuration
const ROUTE_CONFIG = {
    repl: {pattern: '/repl', hashPattern: 'minimal'},
    simple: {pattern: ['/simple-uis', '/simple-ui']},
    layout: {
        graph: 'Graph UI',
        'self-analysis': 'Self Analysis',
        merged: 'Unified Interface'
    }
};

// Dynamic import functions
const loadReplComponent = async (minimal = false) => {
    if (minimal) {
        const {default: MinimalRepl} = await import('./components/MinimalRepl.js');
        return MinimalRepl;
    }
    const {default: ReplApp} = await import('./repl-app.js');
    return ReplApp;
};

const loadSimpleUIComponent = async () => {
    const {default: SimpleUIApp} = await import('./simple-ui-app.js');
    return SimpleUIApp;
};

// Check if a path contains any of the provided patterns
const matchesRoute = (path, patterns) => {
    if (typeof patterns === 'string') {
        return path.includes(patterns);
    }
    if (Array.isArray(patterns)) {
        return patterns.some(pattern => path.includes(pattern));
    }
    return false;
};

// Determine the route component based on current URL
const getRouteComponent = () => {
    const {pathname: path, hash, search} = window.location;
    const urlParams = new URLSearchParams(search);
    const layoutParam = urlParams.get('layout');

    // Handle REPL routes
    if (matchesRoute(path, ROUTE_CONFIG.repl.pattern) || hash.includes(ROUTE_CONFIG.repl.hashPattern)) {
        const minimal = hash.includes(ROUTE_CONFIG.repl.hashPattern) || path.includes('minimal-repl');
        return {loader: () => loadReplComponent(minimal), type: 'repl'};
    }

    // Handle Simple UI routes
    if (matchesRoute(path, ROUTE_CONFIG.simple.pattern)) {
        return {loader: loadSimpleUIComponent, type: 'simple'};
    }

    // Handle Layout-based routes
    if (layoutParam && ROUTE_CONFIG.layout[layoutParam]) {
        const title = ROUTE_CONFIG.layout[layoutParam];
        const layoutType = layoutParam === 'self-analysis' ? 'analysis' : layoutParam;
        return {
            component: (props) => React.createElement(App, {
                appId: 'ide',
                appConfig: {layoutType, title},
                ...props
            }),
            type: 'layout'
        };
    }

    // Default route
    if (['/', '/index.html', ''].includes(path)) {
        return {
            component: (props) => React.createElement(App, {
                appId: 'ide',
                appConfig: {layoutType: 'merged', title: 'Unified Interface'},
                ...props
            }),
            type: 'default'
        };
    }

    // Fallback to default app component
    return {component: App, type: 'fallback'};
};

// Initialize theme before rendering the app
initializeTheme();

// Add performance monitoring in development
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    import('./utils/performance.js').then(() => {
        console.debug('Performance monitoring enabled in development mode');
    });
}

// Unified render function with proper error handling
const renderComponent = (ComponentToRender, containerId = 'root') => {
    const rootElement = document.getElementById(containerId);
    if (!rootElement) {
        throw new Error(`Root element with id '${containerId}' not found`);
    }

    const root = createRoot(rootElement);
    root.render(
        React.createElement(React.StrictMode, null,
            React.createElement(RootErrorBoundary, null,
                typeof ComponentToRender === 'function'
                    ? React.createElement(ComponentToRender, null)
                    : ComponentToRender
            )
        )
    );
};

// Render the appropriate app based on the current path with root error boundary
async function renderApp() {
    try {
        const routeInfo = getRouteComponent();

        if (routeInfo.loader) {
            // Handle async component loading
            const Component = await routeInfo.loader();
            renderComponent(Component);
        } else if (routeInfo.component) {
            // Handle direct component reference
            renderComponent(routeInfo.component);
        } else {
            // Fallback to App component
            renderComponent(App);
        }
    } catch (error) {
        console.error('Error loading app:', error);
        // Fallback to launcher wrapped in error boundary if there's an error
        renderComponent(Launcher);
    }
}

renderApp();