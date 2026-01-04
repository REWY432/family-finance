import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 100, resistance = 2.5 }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current scroll position (works on iOS)
  const getScrollTop = useCallback(() => {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only activate if we're at the very top of the page
    const scrollTop = getScrollTop();
    startScrollTop.current = scrollTop;
    
    // Only start pulling if we're at the top (with small tolerance for iOS bounce)
    if (scrollTop <= 5) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [getScrollTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const scrollTop = getScrollTop();
    
    // If user scrolled down after starting, cancel pull-to-refresh
    if (scrollTop > 5) {
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    // Only activate if pulling down AND we started at the top
    if (diff > 0 && startScrollTop.current <= 5) {
      // Prevent default scroll to avoid conflict
      if (diff > 10) {
        e.preventDefault();
      }
      setPullDistance(Math.min(diff / resistance, threshold * 1.5));
    } else {
      // User is scrolling up normally
      setPullDistance(0);
    }
  }, [isPulling, isRefreshing, resistance, threshold, getScrollTop]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    // Listen on document for better iOS compatibility
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isPulling,
    isTriggered: pullDistance >= threshold
  };
}
