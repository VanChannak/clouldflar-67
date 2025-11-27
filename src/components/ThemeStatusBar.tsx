import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeStatusBar = () => {
  const { theme } = useTheme();

  useEffect(() => {
    // Update theme-color meta tag dynamically based on current theme
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (metaThemeColor) {
      const newColor = theme === 'dark' ? '#0f1419' : '#ffffff';
      metaThemeColor.setAttribute('content', newColor);
    }
  }, [theme]);

  return null;
};
