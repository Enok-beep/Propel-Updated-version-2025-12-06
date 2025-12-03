import React, { useEffect } from 'react';
import { useFocusVisible } from './useFocusManagement';
import { SkipLink } from './useFocusManagement';

/**
 * Accessibility Provider
 * Sets up global a11y features
 */

export function AccessibilityProvider({ children }) {
  useFocusVisible();

  useEffect(() => {
    // Add lang attribute
    document.documentElement.lang = 'en';

    // Add reduced motion support
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const updateMotionPreference = () => {
      if (prefersReducedMotion.matches) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    };

    updateMotionPreference();
    prefersReducedMotion.addEventListener('change', updateMotionPreference);

    // Add high contrast support
    const prefersHighContrast = window.matchMedia('(prefers-contrast: more)');
    
    const updateContrastPreference = () => {
      if (prefersHighContrast.matches) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
    };

    updateContrastPreference();
    prefersHighContrast.addEventListener('change', updateContrastPreference);

    return () => {
      prefersReducedMotion.removeEventListener('change', updateMotionPreference);
      prefersHighContrast.removeEventListener('change', updateContrastPreference);
    };
  }, []);

  return (
    <>
      <SkipLink />
      {children}
    </>
  );
}

export default AccessibilityProvider;