import { base44 } from '@/api/base44Client';

/**
 * Audit Logging System
 * Tracks security-relevant actions for compliance and debugging
 */

export const AUDIT_EVENTS = {
  // Authentication
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login_failed',
  
  // Data Access
  DATA_READ: 'data.read',
  DATA_CREATED: 'data.created',
  DATA_UPDATED: 'data.updated',
  DATA_DELETED: 'data.deleted',
  
  // Security
  PERMISSION_DENIED: 'security.permission_denied',
  CSRF_VIOLATION: 'security.csrf_violation',
  CSP_VIOLATION: 'security.csp_violation',
  
  // Admin Actions
  USER_INVITED: 'admin.user_invited',
  USER_REMOVED: 'admin.user_removed',
  ROLE_CHANGED: 'admin.role_changed',
  SETTINGS_CHANGED: 'admin.settings_changed',
};

class AuditLogger {
  constructor() {
    this.buffer = [];
    this.flushInterval = null;
    this.startAutoFlush();
  }

  log(event, data = {}) {
    const entry = {
      event,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href,
      ...data,
    };

    this.buffer.push(entry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔒 Audit Log:', entry);
    }

    // Flush if buffer is large
    if (this.buffer.length >= 10) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      // Store in localStorage for offline support
      const stored = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      stored.push(...entries);
      
      // Keep only last 100 entries
      const trimmed = stored.slice(-100);
      localStorage.setItem('audit_logs', JSON.stringify(trimmed));

      // In production, send to backend
      if (process.env.NODE_ENV === 'production') {
        // This would call your backend audit log endpoint
        // await base44.integrations.Core.LogAuditEntries({ entries });
      }
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Put entries back in buffer
      this.buffer.unshift(...entries);
    }
  }

  startAutoFlush() {
    // Flush every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  stopAutoFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

  getRecentLogs(count = 50) {
    const stored = JSON.parse(localStorage.getItem('audit_logs') || '[]');
    return stored.slice(-count);
  }

  clearLogs() {
    localStorage.removeItem('audit_logs');
    this.buffer = [];
  }
}

// Singleton instance
const auditLogger = new AuditLogger();

// Export convenience functions
export function logAudit(event, data) {
  auditLogger.log(event, data);
}

export function flushAuditLogs() {
  return auditLogger.flush();
}

export function getAuditLogs(count) {
  return auditLogger.getRecentLogs(count);
}

export function clearAuditLogs() {
  auditLogger.clearLogs();
}

// React hook for audit logging
export function useAuditLog() {
  return {
    log: logAudit,
    flush: flushAuditLogs,
    getLogs: getAuditLogs,
    clear: clearAuditLogs,
  };
}

export default auditLogger;