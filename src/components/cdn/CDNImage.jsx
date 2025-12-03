import React from 'react';

/**
 * CDN-optimized image component
 * Supports responsive images, lazy loading, and CDN delivery
 */

// CDN configuration - can be env-based
const CDN_BASE_URL = process.env.REACT_APP_CDN_URL || '';
const IMAGE_CDN = process.env.REACT_APP_IMAGE_CDN || 'https://cdn.propelapp.com';

export function CDNImage({ 
  src, 
  alt, 
  width, 
  height, 
  quality = 85,
  format = 'auto',
  responsive = true,
  lazy = true,
  className,
  ...props 
}) {
  // Transform local URLs to CDN URLs
  const getCDNUrl = (src, params = {}) => {
    if (!src) return '';
    
    // Already a CDN URL
    if (src.startsWith('http')) return src;
    
    // Build query params for image optimization
    const queryParams = new URLSearchParams();
    if (quality) queryParams.set('q', quality);
    if (format) queryParams.set('f', format);
    if (width) queryParams.set('w', width);
    if (height) queryParams.set('h', height);
    
    const query = queryParams.toString();
    return `${IMAGE_CDN}${src}${query ? `?${query}` : ''}`;
  };

  // Generate srcset for responsive images
  const getSrcSet = () => {
    if (!responsive || !width) return undefined;
    
    const sizes = [0.5, 1, 1.5, 2];
    return sizes
      .map(multiplier => {
        const w = Math.round(width * multiplier);
        return `${getCDNUrl(src, { width: w })} ${w}w`;
      })
      .join(', ');
  };

  return (
    <img
      src={getCDNUrl(src)}
      srcSet={responsive ? getSrcSet() : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? 'lazy' : 'eager'}
      className={className}
      {...props}
    />
  );
}

// Utility to get optimized asset URL
export function getCDNAssetUrl(path, options = {}) {
  const { version, cache = true } = options;
  
  if (path.startsWith('http')) return path;
  
  const url = `${CDN_BASE_URL}${path}`;
  
  if (version) {
    return `${url}?v=${version}`;
  }
  
  if (!cache) {
    return `${url}?t=${Date.now()}`;
  }
  
  return url;
}

// Font loading helper
export function preloadFont(fontUrl) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = getCDNAssetUrl(fontUrl);
  document.head.appendChild(link);
}

// Prefetch critical assets
export function prefetchAssets(urls) {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = getCDNAssetUrl(url);
    document.head.appendChild(link);
  });
}

export default CDNImage;