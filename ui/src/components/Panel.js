import React, {memo} from 'react';
import useUiStore from '../stores/uiStore.js';
import ErrorBoundary from './ErrorBoundary.js';
import {WebSocketStatus} from './GenericComponents.js';
import {themeUtils} from '../utils/themeUtils.js';
import styles from './Panel.module.css';

const Panel = memo(({
    title,
    children,
    showWebSocketStatus = true,
    showHeader = true,
    className = '',
    style = {},
    headerExtra = null
}) => {
    const wsConnected = useUiStore(state => state.wsConnected);
    const panelClassName = `${styles.panel} ${className || ''}`.trim();

    const statusStyle = {
        fontSize: themeUtils.get('FONTS.SIZE.SM'),
        marginLeft: themeUtils.get('SPACING.SM'),
        padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
        backgroundColor: themeUtils.getWebSocketStatusBgColor(wsConnected),
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
    };

    return (
        <div className={panelClassName} style={style}>
            {showHeader && (
                <div className={styles['panel-header']}>
                    <h3 className={styles['panel-title']}>{title}</h3>
                    {showWebSocketStatus && (
                        <div className={styles['panel-status']}>
                            <WebSocketStatus showLabel style={statusStyle} />
                        </div>
                    )}
                    {headerExtra}
                </div>
            )}
            <div className={styles['panel-content']}>
                <ErrorBoundary>{children}</ErrorBoundary>
            </div>
        </div>
    );
});

export default Panel;