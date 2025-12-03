import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * CSRF Token Management
 * Automatically handles token generation and validation
 */

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';

export function generateCSRFToken() {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  return token;
}

export function getCSRFToken() {
  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  if (!token) {
    token = generateCSRFToken();
  }
  return token;
}

export function validateCSRFToken(token) {
  const storedToken = getCSRFToken();
  return token === storedToken;
}

// Axios/Fetch interceptor to add CSRF token
export function attachCSRFToken(config) {
  const token = getCSRFToken();
  if (config.method !== 'GET') {
    config.headers = config.headers || {};
    config.headers[CSRF_HEADER] = token;
  }
  return config;
}

// React hook for CSRF protection
export function useCSRFProtection() {
  useEffect(() => {
    // Generate token on mount
    const token = getCSRFToken();
    
    // Add meta tag for forms
    let meta = document.querySelector('meta[name="csrf-token"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'csrf-token';
      document.head.appendChild(meta);
    }
    meta.content = token;

    // Rotate token periodically (every 30 minutes)
    const interval = setInterval(() => {
      generateCSRFToken();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}

// HOC to wrap components with CSRF protection
export function withCSRFProtection(Component) {
  return function CSRFProtectedComponent(props) {
    useCSRFProtection();
    return <Component {...props} />;
  };
}

export default useCSRFProtection;