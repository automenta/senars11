import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Layout, Model} from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import useUiStore from '../stores/uiStore.js';
import Panel from '../components/Panel.js';
import {contentMap} from '../components/panelContent.js';
import {themeUtils} from '../utils/themeUtils.js';
import {createLayout, createLayoutElements} from './LayoutUtils.js';
import {debounce} from '../utils/performance.js';

/**
 * AppLayout: Main layout component using flexlayout-react
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, DRY
 */
const AppLayout = ({layoutType = 'ide', onLayoutChange, children}) => {
    const [model, setModel] = useState(null);
    const layoutRef = useRef(null);

    // Memoized component factory to prevent unnecessary re-creation
    const componentFactory = useCallback((node) => {
        const component = node.getComponent();
        const ContentComponent = contentMap[component] || (() => React.createElement('div', null, `Content for ${component}`));
        const title = component.replace('Panel', '') || 'Panel';

        return React.createElement(Panel, {title},
            React.createElement(ContentComponent)
        );
    }, []);

    // Memoize layout initialization parameters to avoid unnecessary re-creation
    const layoutInitialization = useMemo(() => {
        const layoutElements = createLayoutElements(React, themeUtils);
        return createLayout(layoutElements, layoutType);
    }, [layoutType]);

    // Initialize layout model
    useEffect(() => {
        setModel(Model.fromJson(layoutInitialization));
    }, [layoutInitialization]);

    // Monitor WebSocket service status for debugging
    useEffect(() => {
        if (!model) return;

        const wsService = useUiStore.getState().wsService;
        if (!wsService) {
            console.warn('WebSocket service not available in AppLayout');
        } else {
            console.log('AppLayout: WebSocket service already initialized, connection state:', wsService.state);
        }
    }, [model]);

    // Debounced layout change handler to prevent excessive updates
    const debouncedLayoutChange = useMemo(() =>
            debounce((jsonLayout) => {
                useUiStore.getState().setLayout(jsonLayout);
                onLayoutChange?.(jsonLayout);
            }, 300),
        [onLayoutChange]
    );

    // Handle layout changes and persist to store
    const handleLayoutChange = useCallback((newModel) => {
        try {
            const jsonLayout = newModel.toJson();
            // Use debounced version to avoid excessive updates
            debouncedLayoutChange(jsonLayout);
        } catch (error) {
            console.error('Error serializing layout:', error);
        }
    }, [debouncedLayoutChange]);

    // Memoized loading element to avoid recreation
    const loadingElement = useMemo(() => (
        React.createElement('div', {
                className: 'loading',
                style: {
                    padding: themeUtils.get('SPACING.LG'),
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
                    color: themeUtils.get('TEXT.PRIMARY')
                }
            },
            React.createElement('p', null, 'Loading layout...')
        )
    ), []);

    // Memoized error element to handle layout errors
    const [hasError, setHasError] = useState(false);
    const errorElement = useMemo(() => (
        React.createElement('div', {
                style: {
                    padding: themeUtils.get('SPACING.LG'),
                    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
                    color: themeUtils.get('COLORS.DANGER'),
                    textAlign: 'center'
                }
            },
            React.createElement('h3', null, 'Layout Error'),
            React.createElement('p', null, 'Failed to initialize layout. Please try refreshing the page.'),
            React.createElement('button', {
                onClick: () => window.location.reload(),
                style: {
                    padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.MD')}`,
                    backgroundColor: themeUtils.get('COLORS.DANGER'),
                    color: themeUtils.get('TEXT.LIGHT'),
                    border: 'none',
                    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                    cursor: 'pointer'
                }
            }, 'Refresh Page')
        )
    ), []);

    if (hasError) {
        return errorElement;
    }

    return React.createElement(React.Fragment, null,
        model
            ? React.createElement(Layout, {
                model,
                ref: layoutRef,
                onModelChange: handleLayoutChange,
                factory: componentFactory,
                key: `flexlayout-root-${layoutType}`,
                onRenderNodeError: (error, node) => {
                    console.error('Layout node rendering error:', error, node);
                    setHasError(true);
                }
            })
            : loadingElement,
        children
    );
};

export default AppLayout;