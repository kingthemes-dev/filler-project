/**
 * Accessibility utilities and helpers
 */

import React, { useEffect, useRef, useState } from 'react';

// ARIA attributes and roles
export const ARIA = {
  // Common ARIA roles
  roles: {
    BUTTON: 'button',
    LINK: 'link',
    IMAGE: 'img',
    HEADING: 'heading',
    LIST: 'list',
    LISTITEM: 'listitem',
    NAVIGATION: 'navigation',
    MAIN: 'main',
    BANNER: 'banner',
    CONTENTINFO: 'contentinfo',
    COMPLEMENTARY: 'complementary',
    SEARCH: 'search',
    FORM: 'form',
    TEXTBOX: 'textbox',
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    DIALOG: 'dialog',
    ALERT: 'alert',
    ALERTDIALOG: 'alertdialog',
    MODAL: 'dialog'
  },
  
  // ARIA states and properties
  states: {
    EXPANDED: 'aria-expanded',
    SELECTED: 'aria-selected',
    CHECKED: 'aria-checked',
    DISABLED: 'aria-disabled',
    HIDDEN: 'aria-hidden',
    LABELLEDBY: 'aria-labelledby',
    DESCRIBEDBY: 'aria-describedby',
    REQUIRED: 'aria-required',
    INVALID: 'aria-invalid',
    LIVE: 'aria-live',
    ATOMIC: 'aria-atomic',
    RELEVANT: 'aria-relevant',
    PRESSED: 'aria-pressed',
    LEVEL: 'aria-level',
    POSINSET: 'aria-posinset',
    SIZESET: 'aria-setsize'
  }
} as const;

// Keyboard navigation utilities
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
} as const;

// Focus management
export function useFocusManagement() {
  const focusHistory = useRef<HTMLElement[]>([]);
  
  const saveFocus = () => {
    if (document.activeElement instanceof HTMLElement) {
      focusHistory.current.push(document.activeElement);
    }
  };
  
  const restoreFocus = () => {
    const lastElement = focusHistory.current.pop();
    if (lastElement) {
      lastElement.focus();
    }
  };
  
  const trapFocus = (container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_KEYS.TAB) {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  };
  
  return {
    saveFocus,
    restoreFocus,
    trapFocus
  };
}

// Get focusable elements
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');
  
  return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
}

// Screen reader utilities
export function useScreenReader() {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message]);
    
    // Clear announcement after a delay
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(msg => msg !== message));
    }, 1000);
  };
  
  return {
    announcements,
    announce
  };
}

// High contrast mode detection
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false);
  
  useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows High Contrast mode
      const isWindowsHighContrast = window.matchMedia('(-ms-high-contrast: active)').matches;
      // Check for forced-colors media query
      const isForcedColors = window.matchMedia('(forced-colors: active)').matches;
      
      setIsHighContrast(isWindowsHighContrast || isForcedColors);
    };
    
    checkHighContrast();
    
    const mediaQuery = window.matchMedia('(-ms-high-contrast: active), (forced-colors: active)');
    mediaQuery.addEventListener('change', checkHighContrast);
    
    return () => {
      mediaQuery.removeEventListener('change', checkHighContrast);
    };
  }, []);
  
  return isHighContrast;
}

// Reduced motion detection
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  return prefersReducedMotion;
}

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string) => {
    const rgb = hexToRgb(color);
    if (!rgb) return 0;
    
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Form accessibility helpers
export function useFormAccessibility() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const getFieldError = (fieldName: string) => errors[fieldName];
  
  const setFieldError = (fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };
  
  const clearFieldError = (fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };
  
  const getFieldProps = (fieldName: string, label: string) => ({
    id: fieldName,
    'aria-label': label,
    'aria-invalid': !!errors[fieldName],
    'aria-describedby': errors[fieldName] ? `${fieldName}-error` : undefined
  });
  
  return {
    errors,
    getFieldError,
    setFieldError,
    clearFieldError,
    getFieldProps
  };
}

// Skip links
export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a 
        href="#main-content" 
        className="absolute top-0 left-0 bg-blue-600 text-white p-2 z-50 focus:outline-none focus:ring-2 focus:ring-white"
      >
        Przejdź do głównej treści
      </a>
      <a 
        href="#navigation" 
        className="absolute top-0 left-20 bg-blue-600 text-white p-2 z-50 focus:outline-none focus:ring-2 focus:ring-white"
      >
        Przejdź do nawigacji
      </a>
    </div>
  );
}

// Accessible button component
export interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function AccessibleButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  ...props
}: AccessibleButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  const isDisabled = disabled || loading;
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2" aria-hidden="true">
          {icon}
        </span>
      )}
      
      <span>{children}</span>
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
}

// Accessible modal component
export interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { trapFocus, saveFocus, restoreFocus } = useFocusManagement();
  
  useEffect(() => {
    if (isOpen) {
      saveFocus();
      document.body.style.overflow = 'hidden';
      
      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
      
      // Trap focus
      const cleanup = modalRef.current ? trapFocus(modalRef.current) : undefined;
      
      return () => {
        document.body.style.overflow = '';
        restoreFocus();
        cleanup?.();
      };
    }
  }, [isOpen, trapFocus, saveFocus, restoreFocus]);
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  if (!isOpen) return null;
  
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />
        
        <div
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} sm:w-full`}
          ref={modalRef}
          tabIndex={-1}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3
                  id="modal-title"
                  className="text-lg leading-6 font-medium text-gray-900 mb-4"
                >
                  {title}
                </h3>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default {
  ARIA,
  KEYBOARD_KEYS,
  useFocusManagement,
  getFocusableElements,
  useScreenReader,
  useHighContrast,
  useReducedMotion,
  getContrastRatio,
  useFormAccessibility,
  SkipLinks,
  AccessibleButton,
  AccessibleModal
};
