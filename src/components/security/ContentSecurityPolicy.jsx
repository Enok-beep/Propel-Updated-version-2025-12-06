import { useEffect } from 'react';

/**
 * Content Security Policy Configuration
 * Protects against XSS, clickjacking, and other code injection attacks
 */

const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for React inline scripts
    'https://cdn.jsdelivr.net', // If using CDN for libraries
    'https://www.googletagmanager.com', // Analytics
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components/emotion
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:',
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'https://api.base44.com',
    'wss://api.base44.com',
    'https://*.base44.com',
    'https://*.supabase.co',
    'wss://*.supabase.co',
  ],
  'frame-ancestors': ["'none'"], // Prevent clickjacking
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
};

export function generateCSPString() {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, values]) => {
      if (values.length === 0) return directive;
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

export function ContentSecurityPolicy() {
  useEffect(() => {
    // Add CSP meta tag
    const cspString = generateCSPString();
    
    let meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      document.head.appendChild(meta);
    }
    meta.content = cspString;

    // Report CSP violations
    const handleCSPViolation = (e) => {
      console.error('CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy,
      });
      
      // In production, send to logging service
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/csp-report', {
          method: 'POST',
          body: JSON.stringify({
            blockedURI: e.blockedURI,
            violatedDirective: e.violatedDirective,
            timestamp: new Date().toISOString(),
          }),
        });
      }
    };

    document.addEventListener('securitypolicyviolation', handleCSPViolation);
    
    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
    };
  }, []);

  return null;
}

export default ContentSecurityPolicy;