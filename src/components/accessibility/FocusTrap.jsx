import { useEffect, useRef } from 'react';

/**
 * Focus Trap Component
 * Traps focus within a container (for modals, dialogs)
 */

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function FocusTrap({ children, enabled = true, autoFocus = true, restoreFocus = true }) {
  const containerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    // Store previously focused element
    previouslyFocusedRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const getFocusableElements = () => {
      return Array.from(container.querySelectorAll(FOCUSABLE_ELEMENTS));
    };

    // Focus first element
    if (autoFocus) {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }

    // Handle Tab key
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      if (restoreFocus && previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [enabled, autoFocus, restoreFocus]);

  return (
    <div ref={containerRef} data-focus-trap={enabled}>
      {children}
    </div>
  );
}

export default FocusTrap;