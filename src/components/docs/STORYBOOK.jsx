# Storybook Setup Guide

## Installation

Since Base44 apps run on a custom platform, Storybook configuration files need to be added to your project root manually (outside the Base44 file structure).

### 1. Install Dependencies

```bash
npm install --save-dev @storybook/react @storybook/react-webpack5 @storybook/addon-links @storybook/addon-essentials @storybook/addon-interactions @storybook/addon-a11y
```

### 2. Create Storybook Config

Create `.storybook/main.js` in your project root:

```javascript
const path = require('path');

module.exports = {
  stories: [
    '../components/**/*.stories.@(js|jsx|ts|tsx)',
    '../pages/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  webpackFinal: async (config) => {
    // Add @ alias support
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../'),
    };
    return config;
  },
};
```

### 3. Create Preview Config

Create `.storybook/preview.js`:

```javascript
import { ThemeProvider } from '../components/theme/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: false,
    },
  },
});

export const decorators = [
  (Story) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div style={{ padding: '2rem' }}>
          <Story />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  ),
];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: 'dark',
    values: [
      { name: 'dark', value: '#0A0B0F' },
      { name: 'light', value: '#F5F7F9' },
    ],
  },
};
```

### 4. Add Scripts to package.json

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### 5. Run Storybook

```bash
npm run storybook
```

---

## Writing Stories

### Example Stories

See these files for examples:
- `components/ui-custom/Card.stories.jsx`
- `components/tasks/TaskCard.stories.jsx`

### Story Template

```jsx
import { Component } from './Component';

export default {
  title: 'Category/Component',
  component: Component,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'accent'],
    },
  },
};

export const Default = {
  args: {
    prop1: 'value',
    prop2: true,
  },
};

export const Variant = {
  args: {
    prop1: 'different',
    prop2: false,
  },
};
```

---

## Best Practices

1. **Write stories for all reusable components**
2. **Include all variants and states**
3. **Add accessibility testing** with `@storybook/addon-a11y`
4. **Document props** with JSDoc or TypeScript
5. **Test interactions** with `@storybook/addon-interactions`

---

## TypeScript Support

Storybook works with TypeScript out of the box. Just use `.stories.tsx` extension.

---

## Deployment

Build static Storybook for deployment:

```bash
npm run build-storybook
```

Outputs to `storybook-static/` directory.