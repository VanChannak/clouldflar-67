import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from './use-mobile';
import { useIsTablet } from './use-tablet';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 100,
  resistance = 3.5,
}: UsePullToRefreshOptions) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const startScrollY = useRef(0);
  const minPullDistance = useRef(20); // Minimum distance before triggering

  useEffect(() => {
    if (!isMobile && !isTablet) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only activate if at the very top of the page
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        startScrollY.current = window.scrollY;
        isDragging.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      // Only trigger pull-to-refresh if:
      // 1. Still at top of page
      // 2. Pulling down (positive diff)
      // 3. Pulled past minimum threshold
      if (window.scrollY === 0 && diff > minPullDistance.current) {
        e.preventDefault();
        setPullDistance(Math.min(diff / resistance, threshold * 1.2));
      } else {
        // Reset if scrolling started
        isDragging.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isDragging.current) return;

      isDragging.current = false;

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isTablet, pullDistance, threshold, resistance, onRefresh, isRefreshing]);

  return {
    pullDistance,
    isRefreshing,
    isEnabled: isMobile || isTablet,
  };
};
