/**
 * Application Template: Base template for creating new applications
 * Following AGENTS.md: Modular, Abstract, Parameterized
 */

import React from 'react';
import {BaseApp} from './BaseApp.js';
import {LayoutManager} from './shared/Layout.js';
import {useWebSocket} from '../hooks/useWebSocket.js';
import {LoadingSpinner} from './shared/index.js';
import {themeUtils} from '../utils/themeUtils.js';

// Base application template with common infrastructure
export const BaseApplicationTemplate = ({
                                            appId = 'base-app',
                                            appConfig = {},
                                            layoutType = 'ide',
                                            availableLayouts = ['ide'],
                                            contentMap = {},
                                            requiresWebSocket = true,
                                            onInit = null,
                                            children,
                                            ...props
                                        }) => {
    React.useEffect(() => {
        if (onInit && typeof onInit === 'function') {
            onInit();
        }
    }, []);

    if (requiresWebSocket) {
        const {wsConnected, loading} = useWebSocket();

        if (loading && !wsConnected) {
            return React.createElement('div', {
                    style: {
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY')
                    }
                },
                React.createElement(LoadingSpinner, {size: themeUtils.get('SPACING.XL')})
            );
        }
    }

    return React.createElement(BaseApp, {
            appId,
            appConfig: {title: 'Base App', ...appConfig},
            ...props
        },
        React.createElement(LayoutManager, {
            layoutType,
            availableLayouts,
            contentMap
        }, children)
    );
};

// Application factory for creating new apps easily
export const createApplication = (config) => {
    const {
        appId,
        appConfig = {},
        layoutType = 'ide',
        availableLayouts = ['ide'],
        contentMap = {},
        requiresWebSocket = true,
        onInit = null
    } = config;

    return (props = {}) => {
        return React.createElement(BaseApplicationTemplate, {
            appId,
            appConfig: {...appConfig, ...props.appConfig},
            layoutType: props.layoutType || layoutType,
            availableLayouts,
            contentMap,
            requiresWebSocket,
            onInit,
            ...props
        });
    };
};

// Predefined templates for common application types
export const ApplicationTemplates = {
    // Dashboard template
    Dashboard: (config) => createApplication({
        layoutType: 'dashboard',
        availableLayouts: ['dashboard', 'ide'],
        ...config
    }),

    // Graph visualization template
    Graph: (config) => createApplication({
        layoutType: 'graph',
        availableLayouts: ['graph', 'ide'],
        ...config
    }),

    // Analysis template
    Analysis: (config) => createApplication({
        layoutType: 'ide',
        availableLayouts: ['ide', 'dashboard', 'graph'],
        ...config
    })
};