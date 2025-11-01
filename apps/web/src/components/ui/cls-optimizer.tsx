/**
 * CLS Optimization Component
 * Prevents layout shifts by reserving space for dynamic content
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface CLSOptimizerProps {
  children: React.ReactNode;
  minHeight?: number;
  minWidth?: number;
  className?: string;
  fallback?: React.ReactNode;
}

export function CLSOptimizer({ 
  children, 
  minHeight = 200, 
  minWidth = 300, 
  className = '',
  fallback 
}: CLSOptimizerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ height: minHeight, width: minWidth });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reserve space to prevent CLS
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height, width } = entry.contentRect;
        setDimensions({ 
          height: Math.max(height, minHeight), 
          width: Math.max(width, minWidth) 
        });
      }
    });

    resizeObserver.observe(container);

    // Mark as loaded after a short delay to prevent flash
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [minHeight, minWidth]);

  return (
    <div
      ref={containerRef}
      className={`cls-optimizer ${className}`}
      style={{
        minHeight: dimensions.height,
        minWidth: dimensions.width,
        transition: 'all 0.2s ease-in-out',
        opacity: isLoaded ? 1 : 0.8,
      }}
    >
      {!isLoaded && fallback && (
        <div className="cls-fallback">
          {fallback}
        </div>
      )}
      <div className={`cls-content ${isLoaded ? 'loaded' : 'loading'}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Image CLS Optimizer
 * Specifically for images to prevent layout shifts
 */
interface ImageCLSOptimizerProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export function ImageCLSOptimizer({
  src,
  alt,
  width = 300,
  height = 200,
  className = '',
  priority = false,
  placeholder: _placeholder = 'blur',
  blurDataURL
}: ImageCLSOptimizerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const defaultBlurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

  return (
    <div
      className={`image-cls-optimizer ${className}`}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
      }}
    >
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div
          className="image-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${blurDataURL || defaultBlurDataURL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div
          className="image-error"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            fontSize: '14px',
          }}
        >
          Image failed to load
        </div>
      )}

      {/* Actual image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </div>
  );
}

/**
 * Product Card CLS Optimizer
 * Specifically for product cards to prevent layout shifts
 */
interface ProductCardCLSOptimizerProps {
  children: React.ReactNode;
  className?: string;
}

export function ProductCardCLSOptimizer({ children, className = '' }: ProductCardCLSOptimizerProps) {
  return (
    <CLSOptimizer
      minHeight={400}
      minWidth={280}
      className={`product-card-cls ${className}`}
      fallback={
        <div className="product-card-skeleton">
          <div className="skeleton-image" />
          <div className="skeleton-content">
            <div className="skeleton-title" />
            <div className="skeleton-price" />
          </div>
        </div>
      }
    >
      {children}
    </CLSOptimizer>
  );
}

/**
 * Skeleton Loader Component
 * Provides consistent loading states to prevent CLS
 */
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  rounded?: boolean;
}

export function Skeleton({ 
  width = '100%', 
  height = 20, 
  className = '', 
  rounded = false 
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${rounded ? 'rounded' : ''} ${className}`}
      style={{
        width,
        height,
        backgroundColor: '#e5e7eb',
        borderRadius: rounded ? '50%' : '4px',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
  );
}

// CSS for animations (should be added to global CSS)
const skeletonStyles = `
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton {
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.product-card-skeleton {
  padding: 16px;
}

.skeleton-image {
  width: 100%;
  height: 200px;
  background-color: #e5e7eb;
  border-radius: 8px;
  margin-bottom: 12px;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-title {
  height: 20px;
  width: 80%;
  background-color: #e5e7eb;
  border-radius: 4px;
}

.skeleton-price {
  height: 16px;
  width: 60%;
  background-color: #e5e7eb;
  border-radius: 4px;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = skeletonStyles;
  document.head.appendChild(styleSheet);
}
