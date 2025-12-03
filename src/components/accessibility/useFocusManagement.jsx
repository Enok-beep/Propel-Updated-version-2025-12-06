import { useEffect, useRef, useCallback } from 'react';

/**
 * Focus Management Utilities
 * Handles focus restoration, announcements, and skip links
 */

export function useFocusManagement() {
  const focusHistoryRef = useRef([]);

  const saveFocus = useCallback(() => {
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body) {
      focusHistoryRef.current.push(activeElement);
    }
  }, []);

  const restoreFocus = useCallback(() => {
    const lastFocused = focusHistoryRef.current.pop();
    if (lastFocused && lastFocused.focus) {
      lastFocused.focus();
    }
  }, []);

  const focusElement = useCallback((selector) => {
    const element = typeof selector === 'string' 
      ? document.querySelector(selector)
      : selector;
    
    if (element && element.focus) {
      element.focus();
      return true;
    }
    return false;
  }, []);

  return {
    saveFocus,
    restoreFocus,
    focusElement,
  };
}

/**
 * Live Region Announcer
 * For screen reader announcements
 */
let announcer = null;

export function announce(message, priority = 'polite') {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(announcer);
  }

  // Clear and set new message
  announcer.textContent = '';
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
}

/**
 * Skip Link Component
 */
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      onClick={(e) => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.tabIndex = -1;
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }}
    >
      {children}
    </a>
  );
}

/**
 * Focus visible utilities
 */
export function useFocusVisible() {
  useEffect(() => {
    // Add focus-visible polyfill behavior
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-nav');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
}

export default useFocusManagement;