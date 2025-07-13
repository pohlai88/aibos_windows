import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface VirtualScrollingProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualScrolling<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = ''
}: VirtualScrollingProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    const visibleStart = Math.max(0, start - overscan);
    
    return { start: visibleStart, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Get visible items with empty array guard
  const visibleItems = useMemo(() => {
    if (items.length === 0) return [];
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  // Handle scroll with throttling
  const handleScroll = useMemo(() => {
    let ticking = false;
    
    return (e: React.UIEvent<HTMLDivElement>) => {
      if (!ticking) {
        globalThis.requestAnimationFrame(() => {
          setScrollTop(e.currentTarget.scrollTop);
          ticking = false;
        });
        ticking = true;
      }
    };
  }, []);

  // Scroll to item with bounds validation
  const scrollToItem = useCallback((index: number, _smooth = true) => {
    if (index < 0 || index >= items.length) return;
    if (containerRef.current) {
      const targetScrollTop = index * itemHeight;
      containerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: _smooth ? 'smooth' : 'auto'
      });
    }
  }, [itemHeight, items.length]);

  // Auto-scroll to focused item
  useEffect(() => {
    const focusedElement = document.activeElement;
    if (focusedElement && containerRef.current?.contains(focusedElement)) {
      const itemIndex = parseInt(focusedElement.getAttribute('data-index') || '0');
      if (itemIndex >= visibleRange.start && itemIndex < visibleRange.end) {
        return; // Already visible
      }
      scrollToItem(itemIndex);
    }
  }, [visibleRange, scrollToItem]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ 
          transform: `translate3d(0, ${offsetY}px, 0)`,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0
        }}>
          {visibleItems.map((item, index) => (
            <div
              key={visibleRange.start + index}
              data-index={visibleRange.start + index}
              style={{ height: itemHeight }}
              role="listitem"
            >
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for virtual scrolling state
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    const visibleStart = Math.max(0, start - overscan);
    
    return { start: visibleStart, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    if (items.length === 0) return [];
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  // Scroll to item function for hook consumers
  const scrollToItem = useCallback((index: number, _smooth = true) => {
    if (index < 0 || index >= items.length) return;
    const targetScrollTop = index * itemHeight;
    setScrollTop(targetScrollTop);
  }, [itemHeight, items.length]);

  return {
    scrollTop,
    setScrollTop,
    visibleRange,
    visibleItems,
    totalHeight,
    offsetY,
    scrollToItem
  };
} 