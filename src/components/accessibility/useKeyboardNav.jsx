import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard Navigation Hook
 * Handles Tab, Arrow keys, Enter, Escape navigation
 */

export function useKeyboardNav({
  items = [],
  onSelect,
  onEscape,
  enabled = true,
  orientation = 'vertical', // 'vertical' or 'horizontal'
  loop = true,
  initialIndex = 0,
}) {
  const selectedIndexRef = useRef(initialIndex);
  const itemRefs = useRef([]);

  const focusItem = useCallback((index) => {
    if (itemRefs.current[index]) {
      itemRefs.current[index].focus();
      selectedIndexRef.current = index;
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!enabled || items.length === 0) return;

    const currentIndex = selectedIndexRef.current;
    let nextIndex = currentIndex;

    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    switch (e.key) {
      case nextKey:
        e.preventDefault();
        nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          nextIndex = loop ? 0 : items.length - 1;
        }
        focusItem(nextIndex);
        break;

      case prevKey:
        e.preventDefault();
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = loop ? items.length - 1 : 0;
        }
        focusItem(nextIndex);
        break;

      case 'Home':
        e.preventDefault();
        focusItem(0);
        break;

      case 'End':
        e.preventDefault();
        focusItem(items.length - 1);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onSelect) {
          onSelect(items[currentIndex], currentIndex);
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (onEscape) {
          onEscape();
        }
        break;

      default:
        break;
    }
  }, [enabled, items, orientation, loop, onSelect, onEscape, focusItem]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getItemProps = useCallback((index) => ({
    ref: (el) => {
      itemRefs.current[index] = el;
    },
    tabIndex: index === selectedIndexRef.current ? 0 : -1,
    role: 'option',
    'aria-selected': index === selectedIndexRef.current,
  }), []);

  return {
    getItemProps,
    selectedIndex: selectedIndexRef.current,
    focusItem,
  };
}

export default useKeyboardNav;