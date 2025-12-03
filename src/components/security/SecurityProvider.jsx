import React from 'react';
import { useCSRFProtection } from './CSRFProtection';
import { ContentSecurityPolicy } from './ContentSecurityPolicy';
import { SecurityHeaders } from './SecurityHeaders';
import { logAudit, AUDIT_EVENTS } from './AuditLogger';

/**
 * Central Security Provider
 * Wraps app with all security features
 */

export function SecurityProvider({ children }) {
  // Enable CSRF protection
  useCSRFProtection();

  // Log app initialization
  React.useEffect(() => {
    logAudit(AUDIT_EVENTS.LOGIN, {
      action: 'app_initialized',
    });

    // Monitor for suspicious activity
    const handleError = (event) => {
      logAudit(AUDIT_EVENTS.CSP_VIOLATION, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
      });
    };

    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      logAudit(AUDIT_EVENTS.LOGOUT, {
        action: 'app_closed',
      });
    };
  }, []);

  return (
    <>
      <ContentSecurityPolicy />
      <SecurityHeaders />
      {children}
    </>
  );
}

export default SecurityProvider;