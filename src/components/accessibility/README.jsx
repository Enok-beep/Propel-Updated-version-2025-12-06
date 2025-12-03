# Accessibility (A11y) Implementation

## Overview

This app implements comprehensive accessibility features including keyboard navigation, screen reader support, and focus management.

## Features

### 1. Keyboard Navigation ✅

**Arrow Keys Navigation:**
```javascript
import { useKeyboardNav } from '@/components/accessibility/useKeyboardNav';

function MyList({ items }) {
  const { getItemProps, selectedIndex } = useKeyboardNav({
    items,
    onSelect: (item) => handleSelect(item),
    orientation: 'vertical',
    loop: true,
  });

  return (
    <div role="listbox">
      {items.map((item, i) => (
        <div key={i} {...getItemProps(i)}>
          {item.title}
        </div>
      ))}
    </div>
  );
}
```

**Supported Keys:**
- `↑/↓` or `←/→` - Navigate items
- `Home` - First item
- `End` - Last item
- `Enter/Space` - Select item
- `Escape` - Close/Cancel
- `Tab` - Focus next element

### 2. Focus Management ✅

**Focus Trap (for modals):**
```javascript
import { FocusTrap } from '@/components/accessibility/FocusTrap';

function Modal({ isOpen, onClose, children }) {
  return isOpen ? (
    <FocusTrap autoFocus restoreFocus>
      <div role="dialog" aria-modal="true">
        {children}
      </div>
    </FocusTrap>
  ) : null;
}
```

**Focus Utilities:**
```javascript
import { useFocusManagement } from '@/components/accessibility/useFocusManagement';

function MyComponent() {
  const { saveFocus, restoreFocus, focusElement } = useFocusManagement();

  const openModal = () => {
    saveFocus();
    // ... open modal
  };

  const closeModal = () => {
    // ... close modal
    restoreFocus();
  };
}
```

### 3. Screen Reader Support ✅

**Live Announcements:**
```javascript
import { announce } from '@/components/accessibility/useFocusManagement';

// Announce to screen readers
announce('Task created successfully', 'polite');

// Urgent announcement
announce('Error: Failed to save', 'assertive');
```

**ARIA Attributes:**
```javascript
import { 
  getButtonProps, 
  getDialogProps,
  getListProps 
} from '@/components/accessibility/AriaUtils';

// Button with ARIA
<button {...getButtonProps({
  label: 'Delete task',
  pressed: isActive,
  controls: 'menu-id'
})}>
  Delete
</button>

// Dialog with ARIA
<div {...getDialogProps({
  labelledBy: 'dialog-title',
  describedBy: 'dialog-description',
  modal: true
})}>
  <h2 id="dialog-title">Confirm Delete</h2>
  <p id="dialog-description">Are you sure?</p>
</div>
```

**Visually Hidden Text:**
```javascript
import { VisuallyHidden } from '@/components/accessibility/AriaUtils';

<button>
  <TrashIcon />
  <VisuallyHidden>Delete task</VisuallyHidden>
</button>
```

### 4. Skip Links ✅

Automatically added to every page:
```html
<!-- Appears on Tab focus -->
<a href="#main-content" class="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

## CSS Classes

### Screen Reader Only
```css
.sr-only {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
```

### Focus Visible
```css
/* Only show focus ring on keyboard navigation */
body:not(.keyboard-nav) *:focus {
  outline: none;
}

body.keyboard-nav *:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

### Reduced Motion
```css
.reduce-motion * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
```

## Integration

### Wrap your app:
```javascript
import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider';

export default function Layout({ children }) {
  return (
    <AccessibilityProvider>
      {/* Your app */}
      {children}
    </AccessibilityProvider>
  );
}
```

## Accessibility Checklist

- ✅ Keyboard navigation (Tab, Arrow keys)
- ✅ Focus indicators visible
- ✅ Focus trap in modals
- ✅ Focus restoration
- ✅ Skip links
- ✅ ARIA labels and roles
- ✅ Live region announcements
- ✅ Screen reader text
- ✅ Semantic HTML
- ✅ Color contrast (WCAG AA)
- ✅ Reduced motion support
- ✅ High contrast support
- ✅ Keyboard shortcuts documented

## Testing

### Keyboard Testing
1. Press `Tab` - Should focus interactive elements
2. Press `Arrow keys` - Should navigate lists/menus
3. Press `Enter/Space` - Should activate buttons
4. Press `Escape` - Should close modals
5. Test focus trap in modals

### Screen Reader Testing
**macOS:**
- VoiceOver: `Cmd+F5`

**Windows:**
- NVDA (free): Download from nvaccess.org
- JAWS: Commercial option

**Testing checklist:**
- All images have alt text
- All buttons have accessible names
- Form inputs have labels
- Headings are hierarchical
- Lists are properly marked up
- Tables have headers
- Landmarks are used (main, nav, aside)

### Automated Testing
```bash
# Using axe-core
npm install --save-dev @axe-core/react

# In your app
import { useEffect } from 'react';
if (process.env.NODE_ENV === 'development') {
  const axe = require('@axe-core/react');
  axe(React, ReactDOM, 1000);
}
```

## WCAG 2.1 Compliance

This implementation targets **WCAG 2.1 Level AA** compliance:

### Perceivable
- ✅ Text alternatives for images
- ✅ Color contrast ratios
- ✅ Resizable text
- ✅ Keyboard accessible

### Operable
- ✅ Keyboard navigation
- ✅ Sufficient time limits
- ✅ Skip links
- ✅ Focus indicators

### Understandable
- ✅ Readable text
- ✅ Predictable navigation
- ✅ Input assistance
- ✅ Error identification

### Robust
- ✅ Valid HTML
- ✅ ARIA attributes
- ✅ Browser compatibility
- ✅ Assistive technology support

## Common Patterns

### Accessible Modal
```javascript
<FocusTrap>
  <div 
    {...getDialogProps({
      labelledBy: 'modal-title',
      modal: true
    })}
    className="modal"
  >
    <h2 id="modal-title">Modal Title</h2>
    <button onClick={close} aria-label="Close modal">×</button>
    {/* Content */}
  </div>
</FocusTrap>
```

### Accessible Menu
```javascript
const { getItemProps } = useKeyboardNav({
  items: menuItems,
  onSelect: handleSelect,
  onEscape: closeMenu,
});

<div {...getMenuProps({ label: 'Main menu' })}>
  {menuItems.map((item, i) => (
    <div key={i} {...getItemProps(i)} {...getMenuItemProps({})}>
      {item.label}
    </div>
  ))}
</div>
```

### Accessible Form
```javascript
<form>
  <label htmlFor="task-title">
    Task Title
    <VisuallyHidden>(required)</VisuallyHidden>
  </label>
  <input
    id="task-title"
    type="text"
    required
    aria-required="true"
    aria-describedby="title-help"
  />
  <div id="title-help" className="sr-only">
    Enter a descriptive title for your task
  </div>
</form>
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)