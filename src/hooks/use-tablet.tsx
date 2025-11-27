import { useEffect, useState } from "react";

// Cover all iPad sizes: iPad mini (768px), iPad Air (820px), iPad Pro 11" (834px), iPad Pro 12.9" (1024px)
const MIN_TABLET_WIDTH = 768;
const MAX_TABLET_WIDTH = 1024; // iPad Pro 12.9" portrait - PCs typically start at 1280px+

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState<boolean>(false);

  useEffect(() => {
    const checkIsTablet = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // For tablets, check if EITHER dimension is in tablet range (768-1024)
      // This handles both portrait and landscape orientations
      // Portrait: width 768-1024, height > 768
      // Landscape: height 768-1024, width > 768
      const minDimension = Math.min(width, height);
      const maxDimension = Math.max(width, height);
      
      const isTabletSize = (
        minDimension >= MIN_TABLET_WIDTH && 
        minDimension <= MAX_TABLET_WIDTH &&
        maxDimension >= MIN_TABLET_WIDTH
      );
      
      console.log('[use-tablet] width:', width, 'height:', height, 'min:', minDimension, 'max:', maxDimension, 'isTabletSize:', isTabletSize);
      setIsTablet(isTabletSize);
    };
    
    checkIsTablet();
    window.addEventListener("resize", checkIsTablet);
    return () => window.removeEventListener("resize", checkIsTablet);
  }, []);

  return isTablet;
}
