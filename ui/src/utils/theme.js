import useUiStore from '../stores/uiStore';

// Apply theme to document and store
export const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  useUiStore.getState().setTheme(theme);
};

// Toggle between light and dark themes
export const toggleTheme = () => {
  const currentTheme = useUiStore.getState().theme;
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  return newTheme;
};

// Initialize theme from localStorage or system preference
export const initializeTheme = () => {
  const savedTheme = localStorage.getItem('ui-theme');
  const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  
  applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
  
  // Listen for system theme changes if user hasn't set a preference
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('ui-theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
};

// Save theme preference to localStorage
export const saveThemePreference = (theme) => 
  localStorage.setItem('ui-theme', theme);