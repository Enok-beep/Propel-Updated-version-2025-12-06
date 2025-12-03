import { useEffect, useRef, useCallback } from 'react';

/**
 * Enhanced touch gesture handlers for mobile
 * Supports swipe, long-press, double-tap, pinch
 */
export function useTouchGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onLongPress,
  onDoubleTap,
  onPinch,
  element,
  threshold = 80,
  timeThreshold = 300,
  longPressDelay = 500,
  enabled = true
}) {
  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const lastTap = useRef(0);
  const longPressTimer = useRef(null);
  const pinchStartDistance = useRef(null);

  const getTouchDistance = useCallback((touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;

    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Handle pinch gesture
    if (e.touches.length === 2) {
      pinchStartDistance.current = getTouchDistance(e.touches);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      return;
    }

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress(e);
        // Haptic feedback on supported devices
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, longPressDelay);
    }
  }, [enabled, onLongPress, longPressDelay, getTouchDistance]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled) return;

    // Handle pinch gesture
    if (e.touches.length === 2 && pinchStartDistance.current && onPinch) {
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / pinchStartDistance.current;
      onPinch(scale);
      return;
    }

    // Cancel long press if moved too much
    if (longPressTimer.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStart.current.x);
      const deltaY = Math.abs(touch.clientY - touchStart.current.y);
      
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, [enabled, onPinch, getTouchDistance]);

  const handleTouchEnd = useCallback((e) => {
    if (!enabled) return;

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Reset pinch
    pinchStartDistance.current = null;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Double tap detection
    if (onDoubleTap && deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      const now = Date.now();
      if (now - lastTap.current < 400) {
        onDoubleTap(e);
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
    }

    // Swipe detection
    if (deltaTime < timeThreshold) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > threshold || absY > threshold) {
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(20);
        }

        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight(e);
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft(e);
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown(e);
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp(e);
          }
        }
      }
    }
  }, [enabled, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap, threshold, timeThreshold]);

  useEffect(() => {
    const el = element?.current || document;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [element, handleTouchStart, handleTouchMove, handleTouchEnd]);
}

/**
 * Pull-to-refresh gesture
 */
export function usePullToRefresh({ onRefresh, threshold = 80, enabled = true }) {
  const startY = useRef(0);
  const isPulling = useRef(false);
  const pullDistance = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling.current) return;

      const currentY = e.touches[0].clientY;
      pullDistance.current = currentY - startY.current;

      if (pullDistance.current > 0 && window.scrollY === 0) {
        e.preventDefault();
        // Visual feedback could be added here
      }
    };

    const handleTouchEnd = () => {
      if (isPulling.current && pullDistance.current > threshold) {
        onRefresh?.();
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
      isPulling.current = false;
      pullDistance.current = 0;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, enabled]);
}

export default useTouchGestures;