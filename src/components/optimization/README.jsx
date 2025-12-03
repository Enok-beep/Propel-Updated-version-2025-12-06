# Performance Optimization Guide

## Bundle Size Target: <200KB

### Current Optimizations

#### 1. **Code Splitting**
```javascript
import { LazyDashboard, LazyTasks } from '@/components/optimization/LazyLoad';

// Route-based splitting
<LazyRoute component={LazyDashboard} />
```

#### 2. **Lazy Loading**
```javascript
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

#### 3. **CDN Configuration**
```javascript
import { CDNImage, getCDNAssetUrl } from '@/components/cdn/CDNImage';

<CDNImage 
  src="/images/hero.jpg" 
  width={800} 
  quality={85}
  responsive 
/>
```

### Bundle Analysis

**Development:**
- Press `Ctrl+Shift+B` to open Bundle Analyzer
- Monitor real-time bundle size
- Identify large dependencies

**Build Time:**
```bash
npm run build
npm run analyze  # View bundle composition
```

### Optimization Checklist

#### Images
- ✅ Use CDNImage component
- ✅ Enable lazy loading
- ✅ Serve WebP format
- ✅ Responsive srcset

#### JavaScript
- ✅ Code splitting by route
- ✅ Lazy load heavy components
- ✅ Tree shaking enabled
- ✅ Minification in production

#### CSS
- ✅ Tailwind CSS purging
- ✅ Critical CSS inline
- ✅ Non-critical CSS async

#### Fonts
- ✅ Preload critical fonts
- ✅ Font-display: swap
- ✅ WOFF2 format

#### Third-party
- ✅ Async loading
- ✅ Defer non-critical scripts
- ✅ CDN delivery

### CDN Setup

#### Environment Variables
```bash
REACT_APP_CDN_URL=https://cdn.propelapp.com
REACT_APP_IMAGE_CDN=https://images.propelapp.com
```

#### Cloudflare Configuration
```javascript
// cloudflare-cdn.config.js
module.exports = {
  zone_id: 'YOUR_ZONE_ID',
  caching: {
    browser_cache_ttl: 31536000,  // 1 year
    edge_cache_ttl: 86400,         // 1 day
  },
  compression: {
    gzip: true,
    brotli: true,
  },
  minify: {
    html: true,
    css: true,
    js: true,
  },
};
```

### Performance Budget

| Asset Type | Target | Maximum |
|------------|--------|---------|
| JS (gzipped) | 150KB | 200KB |
| CSS (gzipped) | 30KB | 50KB |
| Images | Optimized | Lazy loaded |
| Fonts | Preloaded | 2 families max |

### Monitoring

**Web Vitals Targets:**
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1
- FCP: <1.8s
- TTFB: <0.8s

**Bundle Size:**
- Press `Ctrl+Shift+B` in dev mode
- Check build output
- Use source-map-explorer

### Best Practices

1. **Import wisely**
```javascript
// ❌ Bad - imports entire library
import _ from 'lodash';

// ✅ Good - imports only needed function
import debounce from 'lodash/debounce';
```

2. **Use dynamic imports**
```javascript
// Heavy feature that's not always used
const handleExport = async () => {
  const { exportData } = await import('./exportUtils');
  exportData(tasks);
};
```

3. **Optimize images**
```javascript
// Always use CDNImage for external images
<CDNImage src="/hero.jpg" width={1200} quality={85} />
```

4. **Lazy load routes**
```javascript
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

5. **Preload critical assets**
```javascript
// In Layout or App component
useEffect(() => {
  prefetchAssets(['/critical.js', '/fonts/main.woff2']);
}, []);
``