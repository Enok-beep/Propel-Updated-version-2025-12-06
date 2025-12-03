import DOMPurify from 'dompurify';

/**
 * Input Sanitization Utilities
 * Prevents XSS attacks by sanitizing user input
 */

// Configure DOMPurify
const purifyConfig = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'blockquote',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitize HTML content
 */
export function sanitizeHTML(dirty) {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, purifyConfig);
}

/**
 * Sanitize plain text (strip all HTML)
 */
export function sanitizeText(dirty) {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeURL(url) {
  if (!url) return '';
  
  const cleaned = url.trim();
  const lower = cleaned.toLowerCase();
  
  // Block dangerous protocols
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return '';
  }
  
  // Allow relative URLs, http, https, mailto
  if (
    cleaned.startsWith('/') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:')
  ) {
    return cleaned;
  }
  
  return '';
}

/**
 * Escape HTML entities
 */
export function escapeHTML(str) {
  if (!str) return '';
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email) {
  if (!email) return '';
  
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(cleaned) ? cleaned : '';
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName) {
  if (!fileName) return '';
  
  // Remove path traversal attempts
  const cleaned = fileName.replace(/[\/\\]/g, '_');
  
  // Remove dangerous characters
  return cleaned.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Validate and sanitize number
 */
export function sanitizeNumber(value, { min, max, defaultValue = 0 } = {}) {
  const num = parseFloat(value);
  
  if (isNaN(num)) return defaultValue;
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  
  return num;
}

/**
 * Sanitize object for safe storage
 * Removes functions and circular references
 */
export function sanitizeObject(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Failed to sanitize object:', error);
    return {};
  }
}

/**
 * Validate CSRF token format
 */
export function isValidCSRFToken(token) {
  if (!token || typeof token !== 'string') return false;
  
  // 64 character hex string
  return /^[a-f0-9]{64}$/i.test(token);
}

/**
 * Rate limiting helper
 */
const rateLimits = new Map();

export function rateLimit(key, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();
  const data = rateLimits.get(key) || { attempts: 0, resetAt: now + windowMs };
  
  if (now > data.resetAt) {
    // Reset window
    data.attempts = 1;
    data.resetAt = now + windowMs;
  } else {
    data.attempts += 1;
  }
  
  rateLimits.set(key, data);
  
  return data.attempts <= maxAttempts;
}

/**
 * Rate limiter class for instance-based rate limiting
 */
export class RateLimiter {
  constructor(maxCalls, windowMs) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.calls = [];
  }

  canCall() {
    const now = Date.now();
    
    // Remove expired calls
    this.calls = this.calls.filter(timestamp => now - timestamp < this.windowMs);
    
    // Check if we can make another call
    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }
    
    return false;
  }

  reset() {
    this.calls = [];
  }
}

/**
 * React hook for safe HTML rendering
 */
export function useSafeHTML(html) {
  return sanitizeHTML(html);
}

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  escapeHTML,
  sanitizeEmail,
  sanitizeFileName,
  sanitizeNumber,
  sanitizeObject,
  isValidCSRFToken,
  rateLimit,
};