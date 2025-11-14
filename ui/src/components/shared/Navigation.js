import React, { memo } from 'react';
import { Button } from './GenericComponents.js';
import { themeUtils } from '../../utils/themeUtils.js';

// Navigation item component
function NavItem({
  children,
  active = false,
  onClick,
  href,
  disabled = false,
  style = {},
  ...props
}) {
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

  return React.createElement('button', {
    style: itemStyle,
    onClick: handleClick,
    disabled: disabled,
    ...props
  }, children);
}

export const NavItem = memo(NavItem);

// Navigation bar component
function NavBar({
  children,
  orientation = 'horizontal',
  style = {},
  ...props
}) {
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

  return React.createElement('nav', {
    style: navStyle,
    ...props
  }, children);
}

export const NavBar = memo(NavBar);

// Breadcrumb component
function Breadcrumb({
  items = [],
  separator = '/',
  style = {},
  itemStyle = {},
  ...props
}) {
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

  return React.createElement('div', {
      style: containerStyle,
      ...props
    },
    items.flatMap((item, index) => [
      React.createElement('span', {
        key: `item-${index}`,
        style: {
          color: index === items.length - 1 ? themeUtils.get('TEXT.PRIMARY') : themeUtils.get('TEXT.SECONDARY'),
          fontWeight: index === items.length - 1 ? themeUtils.get('FONTS.WEIGHT.BOLD') : 'normal',
          ...itemStyle
        },
        onClick: item.onClick
      }, item.label),
      index < items.length - 1 ?
      React.createElement('span', {
        key: `sep-${index}`,
        style: itemStyle
      }, separator) : null
    ]).filter(Boolean)
  );
}

export const Breadcrumb = memo(Breadcrumb);

// Sidebar component
function Sidebar({
  children,
  title,
  collapsed = false,
  onCollapse,
  width = '250px',
  style = {},
  ...props
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(collapsed);

  const sidebarStyle = {
    width: isCollapsed ? themeUtils.get('SPACING.XL') : width,
    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    padding: isCollapsed ? themeUtils.get('SPACING.XS') : themeUtils.get('SPACING.SM'),
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
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapse?.(newCollapsed);
  };

  return React.createElement('div', {
      style: sidebarStyle,
      ...props
    },
    !isCollapsed && title &&
    React.createElement('div', {
        style: headerStyle
      },
      React.createElement('h3', {
        style: titleStyle
      }, title),
      React.createElement('button', {
        style: collapseButtonStyle,
        onClick: toggleCollapse
      }, isCollapsed ? '▶' : '◀')
    ),
    !isCollapsed && children,
    isCollapsed &&
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
      },
      '…'
    )
  );
}

export const Sidebar = memo(Sidebar);