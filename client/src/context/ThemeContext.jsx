import React, { createContext, useContext, useEffect } from 'react';
const ThemeContext = createContext(null);
const DARK_THEME = Object.freeze({ theme: 'dark' });
function applyDarkTheme() {
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.style.colorScheme = 'dark';
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', '#0A0C0D');
}
export function ThemeProvider({ children }) {
  useEffect(() => {
    applyDarkTheme();
  }, []);
  return <ThemeContext.Provider value={DARK_THEME}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
