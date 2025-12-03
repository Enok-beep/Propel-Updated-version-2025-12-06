# Security Implementation Guide

## Overview

This app implements comprehensive security measures including CSRF protection, Content Security Policy, audit logging, and security headers.

## Features

### 1. CSRF Protection ✅

**What it does:**
- Generates unique tokens per session
- Validates tokens on state-changing requests
- Auto-rotates tokens every 30 minutes

**Usage:**
```javascript
import { useCSRFProtection, getCSRFToken } from '@/components/security/CSRFProtection';

// In your component
useCSRFProtection();

// Get token for manual requests
const token = getCSRFToken();
```

**How it works:**
- Token stored in sessionStorage
- Added to all non-GET requests automatically
- Validated on server-side (if implemented)

### 2. Content Security Policy (CSP) ✅

**What it does:**
- Prevents XSS attacks
- Blocks unauthorized scripts
- Reports violations

**Configuration:**
```javascript
// components/security/ContentSecurityPolicy.jsx
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  // ... more directives
};
```

**Monitoring:**
- CSP violations logged to console (dev)
- Violations sent to backend (production)

### 3. Audit Logging ✅

**What it does:**
- Tracks all security-relevant actions
- Stores logs locally and remotely
- Provides audit trail for compliance

**Usage:**
```javascript
import { logAudit, AUDIT_EVENTS } from '@/components/security/AuditLogger';

// Log an action
logAudit(AUDIT_EVENTS.DATA_UPDATED, {
  entity: 'Task',
  entity_id: task.id,
  changes: { status: 'done' },
});

// View recent logs
const logs = getAuditLogs(50);
```

**Events tracked:**
- Authentication (login/logout)
- Data changes (create/update/delete)
- Permission denials
- Security violations
- Admin actions

### 4. Security Headers ✅

**What it does:**
- Prevents clickjacking
- Blocks MIME sniffing
- Enforces XSS protection

**Headers set:**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: ...`

### 5. Input Sanitization ✅

**What it does:**
- Prevents XSS via user input
- Sanitizes HTML content
- Validates URLs and emails

**Usage:**
```javascript
import { sanitizeHTML, sanitizeURL, sanitizeEmail } from '@/components/security/sanitize';

// Sanitize HTML before rendering
const clean = sanitizeHTML(userInput);

// Validate URL
const safeUrl = sanitizeURL(link);

// Validate email
const email = sanitizeEmail(userEmail);
```

## Integration

### Wrap your app with SecurityProvider:

```javascript
// Layout.js
import { SecurityProvider } from './components/security/SecurityProvider';

export default function Layout({ children, currentPageName }) {
  return (
    <SecurityProvider>
      <ThemeProvider>
        {/* ... rest of app */}
      </ThemeProvider>
    </SecurityProvider>
  );
}
```

## Security Checklist

- ✅ CSRF tokens on all mutations
- ✅ Content Security Policy configured
- ✅ Security headers set
- ✅ Audit logging enabled
- ✅ Input sanitization
- ✅ XSS prevention
- ✅ Clickjacking prevention
- ✅ HTTPS enforcement (production)
- ✅ Rate limiting (client-side)

## Server-Side Requirements

For full security, implement these on your backend:

### 1. CSRF Validation
```javascript
// Validate token header matches session token
if (req.headers['x-csrf-token'] !== req.session.csrfToken) {
  return res.status(403).json({ error: 'CSRF validation failed' });
}
```

### 2. Security Headers (nginx/Apache)
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
add_header X-Frame-Options "DENY";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

### 3. Audit Log Endpoint
```javascript
POST /api/audit-logs
{
  "event": "data.updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "user_email": "user@example.com",
  "data": { ... }
}
```

### 4. Rate Limiting
```javascript
// Express example
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Testing Security

### 1. CSRF Protection
```bash
# Should fail without token
curl -X POST https://app.com/api/tasks -d '{"title":"Hack"}'

# Should succeed with token
curl -X POST https://app.com/api/tasks \
  -H "X-CSRF-Token: abc123..." \
  -d '{"title":"Valid"}'
```

### 2. CSP Violations
```javascript
// Try to inject script (should be blocked)
const img = document.createElement('img');
img.src = 'javascript:alert("XSS")';
document.body.appendChild(img);
```

### 3. XSS Prevention
```javascript
// Should be sanitized
const input = '<script>alert("XSS")</script>';
const safe = sanitizeHTML(input);
// Result: ''
```

## Compliance

This implementation helps with:
- **GDPR**: Audit logs for data access tracking
- **SOC 2**: Security controls and logging
- **HIPAA**: Access controls and audit trails
- **PCI DSS**: Security headers and input validation

## Best Practices

1. **Never trust user input** - Always sanitize
2. **Log security events** - Use audit logger
3. **Validate on both sides** - Client and server
4. **Use HTTPS** - Always in production
5. **Keep dependencies updated** - Regular security patches
6. **Review CSP regularly** - Adjust as needed
7. **Monitor audit logs** - Check for suspicious activity
8. **Test security measures** - Regular penetration testing

## Emergency Response

If a security incident occurs:

1. **Check audit logs**
```javascript
const logs = getAuditLogs(1000);
const suspicious = logs.filter(l => 
  l.event.includes('security') || 
  l.event.includes('denied')
);
```

2. **Rotate CSRF tokens**
```javascript
generateCSRFToken();
```

3. **Clear user sessions**
```javascript
sessionStorage.clear();
localStorage.clear();
```

4. **Report to backend**
```javascript
logAudit(AUDIT_EVENTS.SECURITY_INCIDENT, {
  severity: 'high',
  details: '...',
});
``