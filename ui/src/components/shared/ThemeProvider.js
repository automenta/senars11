/**
 * Theme Provider: Context provider for theme management
 * Following AGENTS.md: Modular, Abstract, Parameterized
 */

import React, { createContext, useContext, useMemo } from 'react';
import { themeUtils } from '../../utils/themeUtils.js';

const ThemeContext = createContext();

export const ThemeProvider = ({ children, theme = 'light', ...props }) => {
  const value = useMemo(() => ({
    theme,
    themeUtils,
    setTheme: () => {}, // Will be implemented if needed
    toggleTheme: () => {}, // Will be implemented if needed
    getColor: (path) => themeUtils.get(path),
    withOpacity: (cssVar, opacity) => themeUtils.withOpacity(cssVar, opacity)
  }), [theme]);

  return React.createElement(
    ThemeContext.Provider,
    { value, ...props },
    children
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};