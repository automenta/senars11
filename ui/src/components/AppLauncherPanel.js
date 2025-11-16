/**
 * App Launcher Panel - Shows application selection options
 * Extracted from MergedLauncher for docking framework integration
 */

import React, {useCallback, useMemo} from 'react';
import {Button, Card} from './GenericComponents.js';
import {themeUtils} from '../utils/themeUtils.js';
import {UI_APPS} from '../constants/uiApps.js';

// Navigation handler for app selection
const navigateToApp = (app) => {
    const targetUrl = app.id === 'minimal-repl' ? '/repl/#minimal' : app.path;
    window.location.href = targetUrl;
};

// Predefined common styles
const COMMON_STYLES = Object.freeze({
    content: {display: 'flex', alignItems: 'center'},
    icon: {fontSize: '1.5rem', marginRight: themeUtils.get('SPACING.SM')},
    description: {marginBottom: themeUtils.get('SPACING.MD')}
});

const AppLauncherPanel = () => {
    // Filter out the 'merged' app to prevent circular navigation
    const availableApps = useMemo(() =>
            UI_APPS.filter(app => app.id !== 'merged'),
        []
    );

    // Create app card element with optimized event handlers
    const createAppCard = useCallback((app) => {
        const cardStyle = {
            cursor: 'pointer',
            transform: 'scale(1)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            borderLeft: `4px solid ${app.color}`,
            ':hover': {
                transform: 'scale(1.02)',
                boxShadow: themeUtils.get('SHADOWS.MD')
            }
        };

        const handleCardClick = () => navigateToApp(app);
        const handleLaunchClick = (e) => {
            e.stopPropagation();
            navigateToApp(app);
        };

        return React.createElement('div', {
                key: app.id,
                style: cardStyle,
                onClick: handleCardClick
            },
            React.createElement(Card, {
                    title: React.createElement('div', {style: COMMON_STYLES.content},
                        React.createElement('span', {style: COMMON_STYLES.icon}, app.icon),
                        app.name
                    )
                },
                React.createElement('p', {style: COMMON_STYLES.description}, app.description),
                React.createElement(Button, {
                    variant: 'light',
                    size: 'sm',
                    onClick: handleLaunchClick
                }, 'Launch')
            )
        );
    }, []);

    // Memoize app cards to prevent unnecessary re-rendering
    const appCards = useMemo(() =>
            availableApps.map(createAppCard),
        [availableApps, createAppCard]
    );

    return React.createElement('div', {style: {padding: themeUtils.get('SPACING.MD')}},
        React.createElement('h3', {
            style: {
                marginBottom: themeUtils.get('SPACING.LG'),
                textAlign: 'center'
            }
        }, 'Applications'),
        React.createElement('div', {
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: themeUtils.get('SPACING.MD')
            }
        }, appCards)
    );
};

export default AppLauncherPanel;