import {themeUtils} from './themeUtils.js';

export const createPanelHeader = (React, {title, ...props}) =>
  React.createElement('div', {
    style: {
      fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
      fontSize: themeUtils.get('FONTS.SIZE.BASE'),
      marginBottom: themeUtils.get('SPACING.MD'),
      color: themeUtils.get('TEXT.PRIMARY'),
      ...props.style
    }
  }, title);

export const createSection = (React, {title, children, ...props}) =>
  React.createElement('div', {
    style: {
      marginBottom: themeUtils.get('SPACING.LG'),
      padding: themeUtils.get('SPACING.MD'),
      backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
      borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
      border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
      ...props.style
    }
  },
  title && React.createElement('h3', {
    style: {
      margin: `0 0 ${themeUtils.get('SPACING.SM')} 0`,
      fontSize: themeUtils.get('FONTS.SIZE.MD'),
      color: themeUtils.get('TEXT.PRIMARY')
    }
  }, title),
  ...Array.isArray(children) ? children : [children]
  );

export const createMetricDisplay = (React, {label, value, ...props}) =>
  React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: `${themeUtils.get('SPACING.SM')} 0`,
      borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
      ...props.style
    }
  },
  React.createElement('span', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.MEDIUM')}}, label),
  React.createElement('span', {
    style: {
      fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
      color: props.color || themeUtils.get('TEXT.PRIMARY')
    }
  }, value)
  );

export const createStatusIndicator = (React, {isConnected, label, ...props}) =>
  React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      ...props.style
    }
  },
  React.createElement('div', {
    style: {
      width: '0.75rem',
      height: '0.75rem',
      borderRadius: '50%',
      backgroundColor: isConnected
        ? themeUtils.get('COLORS.SUCCESS')
        : themeUtils.get('COLORS.DANGER'),
      marginRight: themeUtils.get('SPACING.SM')
    }
  }),
  React.createElement('span', null, label || (isConnected ? 'Connected' : 'Disconnected'))
  );

export const createEmptyState = (React, {message, icon = '🔍', ...props}) =>
  React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: themeUtils.get('SPACING.LG'),
      textAlign: 'center',
      color: themeUtils.get('TEXT.MUTED'),
      ...props.style
    }
  },
  React.createElement('div', {style: {fontSize: '2rem', marginBottom: themeUtils.get('SPACING.MD')}}, icon),
  React.createElement('div', null, message)
  );

export default {
  createPanelHeader,
  createSection,
  createMetricDisplay,
  createStatusIndicator,
  createEmptyState
};