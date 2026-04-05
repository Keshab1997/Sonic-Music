
import { useRef, useState, useCallback, useEffect } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || isRefreshing) return;
      const el = containerRef.current;
      if (el && el.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
      }
    },
    [enabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || isRefreshing || startY.current === 0) return;
      const el = containerRef.current;
      if (el && el.scrollTop <= 0) {
        const dy = e.touches[0].clientY - startY.current;
        if (dy > 0) {
          setPullDistance(Math.min(dy * 0.5, threshold * 1.5));
        }
      }
    },
    [enabled, isRefreshing, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || isRefreshing) return;
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(40); // Show spinner
      try {
        await onRefresh();
      } finally {
        // Small delay for visual feedback
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  }, [enabled, isRefreshing, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, pullDistance, isRefreshing };
}

