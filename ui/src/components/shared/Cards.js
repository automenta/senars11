/**
 * Cards: Shared card components
 * Following AGENTS.md: Modular, Consistent
 */

import React, { memo } from 'react';
import { themeUtils } from '../../utils/themeUtils.js';

// Card component
export const Card = memo(({ 
  children, 
  title, 
  style = {}, 
  headerStyle = {},
  contentStyle = {},
  ...props 
}) => {
  const cardStyle = {
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    padding: 0,
    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
    boxShadow: themeUtils.get('SHADOWS.SM'),
    display: 'flex',
    flexDirection: 'column',
    ...style
  };

  const titleStyle = {
    padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.MD')}`,
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    marginBottom: 0,
    paddingBottom: themeUtils.get('SPACING.SM'),
    borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    color: themeUtils.get('TEXT.PRIMARY'),
    ...headerStyle
  };

  const contentBaseStyle = {
    padding: themeUtils.get('SPACING.MD'),
    flex: 1,
    ...contentStyle
  };

  return React.createElement('div', { style: cardStyle, ...props },
    title && React.createElement('div', { style: titleStyle }, title),
    React.createElement('div', { style: contentBaseStyle }, children)
  );
};

// Stat card component
export const StatCard = memo(({ 
  title, 
  value, 
  description, 
  icon, 
  trend,
  style = {},
  ...props 
}) => {
  const statCardStyle = {
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    padding: themeUtils.get('SPACING.MD'),
    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
    boxShadow: themeUtils.get('SHADOWS.SM'),
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    ...style
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: themeUtils.get('SPACING.SM')
  };

  const iconStyle = {
    fontSize: '1.5rem',
    marginRight: themeUtils.get('SPACING.SM')
  };

  const titleStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    fontWeight: themeUtils.get('FONTS.WEIGHT.MEDIUM'),
    color: themeUtils.get('TEXT.SECONDARY'),
    marginBottom: themeUtils.get('SPACING.XS')
  };

  const valueStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.XL'),
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    color: themeUtils.get('TEXT.PRIMARY'),
    marginBottom: themeUtils.get('SPACING.XS')
  };

  const descriptionStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.MUTED'),
    marginBottom: themeUtils.get('SPACING.SM')
  };

  const trendStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.XS'),
    color: trend && trend.startsWith('+') ? themeUtils.get('COLORS.SUCCESS') : themeUtils.get('COLORS.DANGER')
  };

  return React.createElement('div', { style: statCardStyle, ...props },
    React.createElement('div', { style: headerStyle },
      React.createElement('div', null,
        icon && React.createElement('span', { style: iconStyle }, icon),
        React.createElement('div', { style: titleStyle }, title)
      ),
      trend && React.createElement('div', { style: trendStyle }, trend)
    ),
    React.createElement('div', { style: valueStyle }, value),
    description && React.createElement('div', { style: descriptionStyle }, description)
  );
};

// Feature card component
export const FeatureCard = memo(({
  title,
  description,
  icon,
  onClick,
  disabled = false,
  style = {},
  ...props
}) => {
  const cardStyle = {
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    padding: themeUtils.get('SPACING.MD'),
    backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.TERTIARY') : themeUtils.get('BACKGROUNDS.PRIMARY'),
    boxShadow: themeUtils.get('SHADOWS.SM'),
    cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
    transition: 'transform 0.2s, box-shadow 0.2s',
    opacity: disabled ? 0.6 : 1,
    ...style
  };

  const iconStyle = {
    fontSize: '2rem',
    marginBottom: themeUtils.get('SPACING.SM'),
    display: 'flex',
    justifyContent: 'center'
  };

  const titleStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.LG'),
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    textAlign: 'center',
    marginBottom: themeUtils.get('SPACING.SM'),
    color: themeUtils.get('TEXT.PRIMARY')
  };

  const descriptionStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    textAlign: 'center',
    color: themeUtils.get('TEXT.SECONDARY'),
    lineHeight: 1.5
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleMouseEnter = (e) => {
    if (!disabled && onClick) {
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = themeUtils.get('SHADOWS.MD');
    }
  };

  const handleMouseLeave = (e) => {
    if (!disabled && onClick) {
      e.target.style.transform = '';
      e.target.style.boxShadow = themeUtils.get('SHADOWS.SM');
    }
  };

  return React.createElement('div', {
    style: cardStyle,
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ...props
  },
    icon && React.createElement('div', { style: iconStyle }, icon),
    title && React.createElement('div', { style: titleStyle }, title),
    description && React.createElement('div', { style: descriptionStyle }, description)
  );
};