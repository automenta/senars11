import React, {createContext, useContext, useMemo} from 'react';
import useUiStore from '../stores/uiStore.js';
import {WebSocketStatus} from './GenericComponents.js';
import {themeUtils} from '../utils/themeUtils.js';

/**
 * App context for sharing app-specific configuration
 */
const AppContext = createContext({
    appId: null,
    appConfig: {},
    wsConnected: false,
    wsService: null
});

/**
 * Hook to access app context
 */
export const useAppContext = () => useContext(AppContext);

/**
 * AppShell: Component that provides common UI infrastructure and context for different app types
 */
const AppShell = ({
                      appId,
                      appConfig = {},
                      children,
                      showHeader = true,
                      showWebSocketStatus = true,
                      className = '',
                      style = {}
                  }) => {
    const wsConnected = useUiStore(state => state.wsConnected);
    const wsService = useUiStore(state => state.wsService);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        appId,
        appConfig,
        wsConnected,
        wsService
    }), [appId, appConfig, wsConnected, wsService]);

    // Memoized styles for performance
    const shellStyle = useMemo(() => ({
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        color: themeUtils.get('TEXT.PRIMARY'),
        ...style
    }), [style]);

    const headerStyle = useMemo(() => ({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.MD')}`,
        backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
        borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
    }), []);

    const titleStyle = useMemo(() => ({
        margin: 0,
        fontSize: themeUtils.get('FONTS.SIZE.LG')
    }), []);

    return React.createElement(
        AppContext.Provider,
        {value: contextValue},
        React.createElement('div', {className, style: shellStyle},
            showHeader && React.createElement('header', {style: headerStyle},
                React.createElement('h1', {style: titleStyle},
                    appConfig.title || appId
                ),
                showWebSocketStatus && React.createElement(WebSocketStatus, {showLabel: true})
            ),
            React.createElement('main', {style: {flex: 1, overflow: 'auto'}}, children)
        )
    );
};

export default AppShell;