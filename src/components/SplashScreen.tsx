import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import logoDark from '@/assets/khmerzoon.png';
import logoLight from '@/assets/logo-light-new.png';

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const { effectiveTheme } = useTheme();
  const logo = effectiveTheme === 'light' ? logoLight : logoDark;

  useEffect(() => {
    // Start fade out animation after 2 seconds
    const fadeOutTimer = setTimeout(() => {
      setIsAnimatingOut(true);
    }, 2000);

    // Remove splash screen after animation completes
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2800);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-800 ${
        isAnimatingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-pulse">
        {/* Logo with scale animation */}
        <div className="animate-scale-in">
          <img 
            src={logo} 
            alt="KHMERZOON" 
            className="w-24 h-24 md:w-32 md:h-32 object-contain animate-bounce"
          />
        </div>
        
        {/* App name with fade and slide animation */}
        <div className="animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-wider text-primary dark:text-white">
            KHMERZOON
          </h1>
        </div>

        {/* Animated underline */}
        <div className="w-32 md:w-48 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
