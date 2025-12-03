import { useEffect } from 'react';

/**
 * Security Headers Configuration
 * Adds client-side security headers via meta tags
 */

export const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy
  'Permissions-Policy': [
    'geolocation=(self)',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
  ].join(', '),
};

export function SecurityHeaders() {
  useEffect(() => {
    // Add security headers as meta tags
    Object.entries(SECURITY_HEADERS).forEach(([name, content]) => {
      const existing = document.querySelector(`meta[http-equiv="${name}"]`);
      if (existing) {
        existing.content = content;
      } else {
        const meta = document.createElement('meta');
        meta.httpEquiv = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    });

    // Add viewport security
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && !viewport.content.includes('user-scalable=no')) {
      // Don't disable user scaling - it's an accessibility issue
      // Just ensure viewport is properly set
      viewport.content = 'width=device-width, initial-scale=1, maximum-scale=5';
    }

    // Remove potentially dangerous meta tags
    const dangerousMeta = document.querySelectorAll('meta[http-equiv="refresh"]');
    dangerousMeta.forEach(meta => meta.remove());

  }, []);

  return null;
}

// Server-side headers configuration (for reference)
export const SERVER_SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': 'default-src "self"',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), microphone=(), camera=()',
};

export default SecurityHeaders;