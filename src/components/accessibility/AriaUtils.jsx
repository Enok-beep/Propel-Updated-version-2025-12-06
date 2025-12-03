/**
 * ARIA Utilities and Helpers
 * Provides accessible attributes and patterns
 */

/**
 * Generate ARIA attributes for buttons
 */
export function getButtonProps({
  pressed,
  expanded,
  controls,
  describedBy,
  label,
  disabled,
}) {
  return {
    role: 'button',
    'aria-pressed': pressed !== undefined ? pressed : undefined,
    'aria-expanded': expanded !== undefined ? expanded : undefined,
    'aria-controls': controls,
    'aria-describedby': describedBy,
    'aria-label': label,
    'aria-disabled': disabled,
    tabIndex: disabled ? -1 : 0,
  };
}

/**
 * Generate ARIA attributes for dialogs
 */
export function getDialogProps({
  labelledBy,
  describedBy,
  modal = true,
}) {
  return {
    role: 'dialog',
    'aria-modal': modal,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
  };
}

/**
 * Generate ARIA attributes for lists
 */
export function getListProps({
  label,
  orientation = 'vertical',
}) {
  return {
    role: 'list',
    'aria-label': label,
    'aria-orientation': orientation,
  };
}

/**
 * Generate ARIA attributes for list items
 */
export function getListItemProps({
  selected,
  setSize,
  posInSet,
}) {
  return {
    role: 'listitem',
    'aria-selected': selected,
    'aria-setsize': setSize,
    'aria-posinset': posInSet,
  };
}

/**
 * Generate ARIA attributes for tabs
 */
export function getTabProps({
  selected,
  controls,
  id,
}) {
  return {
    role: 'tab',
    'aria-selected': selected,
    'aria-controls': controls,
    id,
    tabIndex: selected ? 0 : -1,
  };
}

/**
 * Generate ARIA attributes for tab panels
 */
export function getTabPanelProps({
  labelledBy,
  id,
  hidden,
}) {
  return {
    role: 'tabpanel',
    'aria-labelledby': labelledBy,
    id,
    hidden,
    tabIndex: hidden ? -1 : 0,
  };
}

/**
 * Generate ARIA attributes for menus
 */
export function getMenuProps({
  label,
  orientation = 'vertical',
}) {
  return {
    role: 'menu',
    'aria-label': label,
    'aria-orientation': orientation,
  };
}

/**
 * Generate ARIA attributes for menu items
 */
export function getMenuItemProps({
  disabled,
}) {
  return {
    role: 'menuitem',
    'aria-disabled': disabled,
    tabIndex: disabled ? -1 : 0,
  };
}

/**
 * Generate ARIA live region attributes
 */
export function getLiveRegionProps({
  polite = true,
  atomic = true,
}) {
  return {
    role: 'status',
    'aria-live': polite ? 'polite' : 'assertive',
    'aria-atomic': atomic,
  };
}

/**
 * Generate visually hidden but screen-reader accessible class
 */
export const srOnlyClass = 'absolute left-[-10000px] w-[1px] h-[1px] overflow-hidden';

/**
 * VisuallyHidden component
 */
export function VisuallyHidden({ children, ...props }) {
  return (
    <span className={srOnlyClass} {...props}>
      {children}
    </span>
  );
}

export default {
  getButtonProps,
  getDialogProps,
  getListProps,
  getListItemProps,
  getTabProps,
  getTabPanelProps,
  getMenuProps,
  getMenuItemProps,
  getLiveRegionProps,
  VisuallyHidden,
  srOnlyClass,
};