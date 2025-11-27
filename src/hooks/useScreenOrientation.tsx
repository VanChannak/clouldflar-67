import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

export function useScreenOrientation(allowLandscape: boolean = false) {
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    // Prevent re-initialization on re-renders
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const lockOrientation = async () => {
      try {
        if (allowLandscape) {
          // Allow all orientations on player pages
          await ScreenOrientation.unlock();
        } else {
          // Lock to portrait on other pages
          await ScreenOrientation.lock({ orientation: 'portrait' });
        }
      } catch (error) {
        console.error('Failed to set screen orientation:', error);
      }
    };

    lockOrientation();

    return () => {
      // Cleanup: reset to portrait when component unmounts
      if (Capacitor.isNativePlatform() && allowLandscape) {
        ScreenOrientation.lock({ orientation: 'portrait' }).catch(console.error);
      }
      isInitializedRef.current = false;
    };
  }, [allowLandscape]);
}
