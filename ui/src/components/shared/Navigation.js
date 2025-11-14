import React, { memo } from 'react';
import { Button } from './GenericComponents.js';
import { themeUtils } from '../../utils/themeUtils.js';

// Navigation item component
export const NavItem = memo(({
  children,
  active = false,
  onClick,
  href,
  disabled = false,
  style = {},
  ...props
}) => {
  const itemStyle = {
    padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.MD')}`,
    textDecoration: 'none',
    color: active ? themeUtils.get('COLORS.PRIMARY') : themeUtils.get('TEXT.SECONDARY'),
    backgroundColor: active ? 'var(--primary-color)10' : 'transparent',
    border: 'none',
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontWeight: active ? themeUtils.get('FONTS.WEIGHT.BOLD') : themeUtils.get('FONTS.WEIGHT.NORMAL'),
    display: 'block',
    width: '100%',
    textAlign: 'left',
    ...style
  };

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    if (href) {
      window.location.href = href;
    }

    onClick?.(e);
  };

  return React.createElement('button', { style: itemStyle, onClick: handleClick, disabled: disabled, ...props }, children);
});

// Navigation bar component
export const NavBar = memo(({
  children,
  orientation = 'horizontal',
  style = {},
  ...props
}) => {
  const navStyle = {
    display: 'flex',
    flexDirection: orientation === 'vertical' ? 'column' : 'row',
    alignItems: orientation === 'vertical' ? 'stretch' : 'center',
    gap: themeUtils.get('SPACING.XS'),
    padding: themeUtils.get('SPACING.SM'),
    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    ...style
  };

  return React.createElement('nav', { style: navStyle, ...props }, children);
});

// Breadcrumb component
export const Breadcrumb = memo(({
  items = [],
  separator = '/',
  style = {},
  itemStyle = {},
  ...props
}) => {
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: themeUtils.get('SPACING.SM'),
    padding: themeUtils.get('SPACING.SM'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.SECONDARY'),
    ...style
  };

  if (items.length === 0) return null;

  // Build elements without using complex mapping
  const elements = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    elements.push(
      React.createElement('span', {
        key: `item-${i}`,
        style: {
          color: i === items.length - 1 ? themeUtils.get('TEXT.PRIMARY') : themeUtils.get('TEXT.SECONDARY'),
          fontWeight: i === items.length - 1 ? themeUtils.get('FONTS.WEIGHT.BOLD') : 'normal',
          ...itemStyle
        },
        onClick: item.onClick
      }, item.label)
    );
    
    if (i < items.length - 1) {
      elements.push(
        React.createElement('span', { key: `sep-${i}`, style: itemStyle }, separator)
      );
    }
  }

  return React.createElement('div', { style: containerStyle, ...props }, ...elements);
});

// Sidebar component - Simplified to avoid complex structure
export const Sidebar = ({ children, title, collapsed = false, onCollapse, width = '250px', style = {}, ...props }) => {
  // This function doesn't use React.memo because it has complex structure that's causing build errors
  const isCurrentlyCollapsed = collapsed;

  const sidebarStyle = {
    width: isCurrentlyCollapsed ? themeUtils.get('SPACING.XL') : width,
    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    padding: isCurrentlyCollapsed ? themeUtils.get('SPACING.XS') : themeUtils.get('SPACING.SM'),
    transition: 'width 0.3s',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    ...style
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `0 0 ${themeUtils.get('SPACING.SM')} 0`,
    borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    marginBottom: themeUtils.get('SPACING.SM')
  };

  const titleStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.BASE'),
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    color: themeUtils.get('TEXT.PRIMARY'),
    margin: 0
  };

  const collapseButtonStyle = {
    background: 'none',
    border: 'none',
    color: themeUtils.get('TEXT.SECONDARY'),
    cursor: 'pointer',
    fontSize: themeUtils.get('FONTS.SIZE.LG'),
    padding: 0,
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const toggleCollapse = () => {
    onCollapse?.(!isCurrentlyCollapsed);
  };

  if (isCurrentlyCollapsed && title) {
    return React.createElement('div', { style: sidebarStyle, ...props },
      React.createElement('div', { style: headerStyle },
        React.createElement('h3', { style: titleStyle }, title),
        React.createElement('button', {
          style: collapseButtonStyle,
          onClick: toggleCollapse
        }, isCurrentlyCollapsed ? '▶' : '◀')
      ),
      React.createElement('div', null, children),
      React.createElement('div', {
        style: {
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          cursor: 'pointer',
          textAlign: 'center',
          fontSize: themeUtils.get('FONTS.SIZE.XS'),
          color: themeUtils.get('TEXT.MUTED'),
          padding: themeUtils.get('SPACING.XS')
        },
        onClick: toggleCollapse
      }, '…')
    );
  } else if (isCurrentlyCollapsed) {
    return React.createElement('div', { style: sidebarStyle, ...props },
      React.createElement('div', {
        style: {
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          cursor: 'pointer',
          textAlign: 'center',
          fontSize: themeUtils.get('FONTS.SIZE.XS'),
          color: themeUtils.get('TEXT.MUTED'),
          padding: themeUtils.get('SPACING.XS')
        },
        onClick: toggleCollapse
      }, '…')
    );
  } else if (title) {
    return React.createElement('div', { style: sidebarStyle, ...props },
      React.createElement('div', { style: headerStyle },
        React.createElement('h3', { style: titleStyle }, title),
        React.createElement('button', {
          style: collapseButtonStyle,
          onClick: toggleCollapse
        }, isCurrentlyCollapsed ? '▶' : '◀')
      ),
      React.createElement('div', null, children)
    );
  } else {
    return React.createElement('div', { style: sidebarStyle, ...props },
      React.createElement('div', null, children)
    );
  }
};