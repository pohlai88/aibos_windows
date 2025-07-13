/** @jsxImportSource react */
import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { getColor } from '../utils/themeHelpers.ts';
import { useUIState } from '../store/uiState.ts';
import { animation } from '../utils/designTokens.ts';

interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  delay?: number;
  maxWidth?: number;
  className?: string;
  disabled?: boolean;
  showArrow?: boolean;
  theme?: 'dark' | 'light' | 'auto';
  size?: 'sm' | 'md' | 'lg';
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  shortcut,
  position = 'top',
  delay = 300,
  maxWidth = 300,
  className = '',
  disabled = false,
  showArrow = true,
  theme = 'auto',
  size = 'md'
}) => {
  const { colorMode } = useUIState();
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  // Generate unique ID for accessibility
  const tooltipId = useId();

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = React.useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Check if child is already focusable
  const isChildFocusable = React.useMemo(() => {
    if (!React.isValidElement(children)) return false;
    
    const childType = typeof children.type === 'string' 
      ? children.type.toLowerCase()
      : '';
    
    return ['button', 'a', 'input', 'select', 'textarea'].includes(childType) ||
           children.props?.tabIndex !== undefined ||
           children.props?.role === 'button';
  }, [children]);

  // Position classes mapping
  const positionClasses = {
    'top': 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    'bottom': 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    'left': 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    'right': 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    'top-left': 'bottom-full right-0 mb-2',
    'top-right': 'bottom-full left-0 mb-2',
    'bottom-left': 'top-full right-0 mt-2',
    'bottom-right': 'top-full left-0 mt-2'
  };

  // Arrow classes mapping (without color - will be applied dynamically)
  const arrowClasses = {
    'top': 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full',
    'bottom': 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-full',
    'left': 'right-0 top-1/2 transform -translate-y-1/2 translate-x-full',
    'right': 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-full',
    'top-left': 'bottom-0 right-2 translate-y-full',
    'top-right': 'bottom-0 left-2 translate-y-full',
    'bottom-left': 'top-0 right-2 -translate-y-full',
    'bottom-right': 'top-0 left-2 -translate-y-full'
  };

  // Arrow border classes based on position
  const arrowBorderClasses = {
    'top': 'border-t',
    'bottom': 'border-b',
    'left': 'border-l',
    'right': 'border-r',
    'top-left': 'border-t',
    'top-right': 'border-t',
    'bottom-left': 'border-b',
    'bottom-right': 'border-b'
  };

  // Get theme-aware styles
  const getThemeStyles = useCallback(() => {
    const effectiveTheme = theme === 'auto' ? colorMode : theme;
    
    if (effectiveTheme === 'light') {
      return {
        background: getColor('white', 'light'),
        color: getColor('gray.900', 'light'),
        border: `1px solid ${getColor('gray.200', 'light')}`,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        arrowBorder: getColor('gray.200', 'light'),
      };
    } else {
      return {
        background: getColor('gray.800', 'dark'),
        color: getColor('white', 'dark'),
        border: `1px solid ${getColor('gray.700', 'dark')}`,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        arrowBorder: getColor('gray.700', 'dark'),
      };
    }
  }, [theme, colorMode]);

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  // Debounced viewport check for performance
  const checkViewportPosition = useCallback(
    React.useMemo(() => {
      let timeoutId: number;
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
          if (!isVisible || !tooltipRef.current || !triggerRef.current) return;
          
          const tooltip = tooltipRef.current;
          const tooltipRect = tooltip.getBoundingClientRect();
          
          const viewportWidth = globalThis.innerWidth;
          const viewportHeight = globalThis.innerHeight;
          
          // Reset any previous adjustments
          tooltip.style.left = '';
          tooltip.style.right = '';
          tooltip.style.top = '';
          tooltip.style.bottom = '';
          tooltip.style.marginBottom = '';
          tooltip.style.marginTop = '';
          
          // Check right overflow
          if (tooltipRect.right > viewportWidth) {
            tooltip.style.left = 'auto';
            tooltip.style.right = '0';
          }
          
          // Check left overflow
          if (tooltipRect.left < 0) {
            tooltip.style.right = 'auto';
            tooltip.style.left = '0';
          }
          
          // Check bottom overflow
          if (tooltipRect.bottom > viewportHeight) {
            tooltip.style.top = 'auto';
            tooltip.style.bottom = '100%';
            tooltip.style.marginBottom = '0.5rem';
            tooltip.style.marginTop = '0';
          }
          
          // Check top overflow
          if (tooltipRect.top < 0) {
            tooltip.style.bottom = 'auto';
            tooltip.style.top = '100%';
            tooltip.style.marginTop = '0.5rem';
            tooltip.style.marginBottom = '0';
          }
        }, 50); // Small delay for performance
      };
    }, [isVisible]),
    [isVisible]
  );

  // Handle mouse enter with delay
  useEffect(() => {
    if (!isVisible || !triggerRef.current) return;

    const handleMouseEnter = () => {
      if (delay > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsVisible(true);
        }, delay);
      } else {
        setIsVisible(true);
      }
    };

    const handleMouseLeave = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
      setIsVisible(false);
    };

    const trigger = triggerRef.current;
    trigger.addEventListener('mouseenter', handleMouseEnter);
    trigger.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      trigger.removeEventListener('mouseenter', handleMouseEnter);
      trigger.removeEventListener('mouseleave', handleMouseLeave);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
  }, [delay, isVisible]);

  // Handle focus/blur for accessibility
  const handleFocus = useCallback(() => {
    if (disabled) return;
    setIsVisible(true);
  }, [disabled]);

  const handleBlur = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
    
    return undefined;
  }, [isVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Check viewport position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      // Initial check
      checkViewportPosition();
      
      // Check on window resize
      const handleResize = () => checkViewportPosition();
      globalThis.addEventListener('resize', handleResize);
      
      return () => globalThis.removeEventListener('resize', handleResize);
    }
    return undefined;
  }, [isVisible, checkViewportPosition]);

  if (disabled) {
    return <>{children}</>;
  }

  const themeStyles = getThemeStyles();
  const wrapperProps = isChildFocusable
    ? {}
    : {
        tabIndex: 0,
        role: 'button',
        onFocus: handleFocus,
        onBlur: handleBlur
      };

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      {...wrapperProps}
      aria-describedby={isVisible ? tooltipId : undefined}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          style={{
            maxWidth,
            ...themeStyles,
            transition: prefersReducedMotion 
              ? 'none' 
              : `opacity ${animation.duration.normal} ${animation.easing.smooth}, transform ${animation.duration.normal} ${animation.easing.smooth}`
          }}
          className={`
            absolute z-[9999] ${positionClasses[position]}
            ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
            ${sizeClasses[size]}
            rounded-lg
            whitespace-normal
            pointer-events-none
          `}
          role="tooltip"
          aria-hidden={!isVisible}
        >
          {/* Arrow */}
          {showArrow && (
            <div 
              className={`
                absolute w-0 h-0 border-4 border-transparent
                ${arrowClasses[position]}
              `}
              style={{
                [arrowBorderClasses[position]]: `4px solid ${themeStyles.arrowBorder}`
              }}
            />
          )}
          
          {/* Tooltip content */}
          <div className="flex items-center space-x-2">
            <span>{content}</span>
            {shortcut && (
              <>
                <span style={{ color: getColor('gray.400', theme === 'auto' ? colorMode : theme) }}>•</span>
                <kbd 
                  className="px-1.5 py-0.5 rounded text-xs font-mono border"
                  style={{
                    backgroundColor: getColor('gray.700', theme === 'auto' ? colorMode : theme),
                    borderColor: getColor('gray.600', theme === 'auto' ? colorMode : theme),
                    color: getColor('white', theme === 'auto' ? colorMode : theme)
                  }}
                >
                  {shortcut}
                </kbd>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 