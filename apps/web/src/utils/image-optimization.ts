/**
 * Advanced Image Optimization with WebP/AVIF support
 * Free image optimization for better performance
 */

import { logger } from './logger';

// Image optimization configuration
export const IMAGE_OPTIMIZATION_CONFIG = {
  // Supported formats
  formats: ['avif', 'webp', 'jpeg', 'png'],
  
  // Quality settings
  quality: {
    avif: 80,
    webp: 85,
    jpeg: 90,
    png: 95
  },
  
  // Size breakpoints
  breakpoints: {
    mobile: 375,
    tablet: 768,
    desktop: 1200,
    large: 1920
  },
  
  // Lazy loading
  lazyLoading: true,
  intersectionThreshold: 0.1,
  
  // Placeholder
  placeholder: '/images/placeholder-product.jpg'
};

// Image optimization class
export class ImageOptimizer {
  private observer?: IntersectionObserver;
  private loadedImages: Set<string> = new Set();
  private isSupported: {
    avif: boolean;
    webp: boolean;
  } = {
    avif: false,
    webp: false
  };

  constructor() {
    this.checkFormatSupport();
    this.initializeLazyLoading();
  }

  // Check browser format support
  private async checkFormatSupport() {
    // Check AVIF support
    const avifCanvas = document.createElement('canvas');
    avifCanvas.width = 1;
    avifCanvas.height = 1;
    this.isSupported.avif = avifCanvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;

    // Check WebP support
    const webpCanvas = document.createElement('canvas');
    webpCanvas.width = 1;
    webpCanvas.height = 1;
    this.isSupported.webp = webpCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

    logger.info('Image format support detected', this.isSupported);
  }

  // Initialize lazy loading
  private initializeLazyLoading() {
    if (!IMAGE_OPTIMIZATION_CONFIG.lazyLoading) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.observer?.unobserve(img);
          }
        });
      },
      {
        threshold: IMAGE_OPTIMIZATION_CONFIG.intersectionThreshold,
        rootMargin: '50px'
      }
    );
  }

  // Optimize image URL
  optimizeImageUrl(
    originalUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'avif' | 'webp' | 'jpeg' | 'png';
      device?: 'mobile' | 'tablet' | 'desktop' | 'large';
    } = {}
  ): string {
    if (!originalUrl) return IMAGE_OPTIMIZATION_CONFIG.placeholder;

    // WordPress image optimization
    if (originalUrl.includes('wp-content/uploads')) {
      return this.optimizeWordPressImage(originalUrl, options);
    }

    // Next.js Image component optimization
    if (originalUrl.startsWith('/') || originalUrl.includes('localhost')) {
      return this.optimizeNextJsImage(originalUrl, options);
    }

    // External image optimization
    return this.optimizeExternalImage(originalUrl, options);
  }

  // Optimize WordPress images
  private optimizeWordPressImage(url: string, options: any): string {
    const { width, height, quality, format, device } = options;
    
    // Determine optimal format
    const optimalFormat = this.getOptimalFormat(format);
    
    // Determine optimal size
    const optimalSize = this.getOptimalSize(width, height, device);
    
    // Build optimized URL
    const urlObj = new URL(url);
    const params = new URLSearchParams();
    
    if (optimalSize.width) params.set('w', optimalSize.width.toString());
    if (optimalSize.height) params.set('h', optimalSize.height.toString());
    if (quality) params.set('q', quality.toString());
    if (optimalFormat !== 'jpeg') params.set('f', optimalFormat);
    
    // Add optimization parameters
    params.set('fit', 'cover');
    params.set('auto', 'format');
    
    return `${urlObj.origin}${urlObj.pathname}?${params.toString()}`;
  }

  // Optimize Next.js images
  private optimizeNextJsImage(url: string, options: any): string {
    const { width, height, quality, format, device } = options;
    
    const optimalFormat = this.getOptimalFormat(format);
    const optimalSize = this.getOptimalSize(width, height, device);
    
    const params = new URLSearchParams();
    
    if (optimalSize.width) params.set('w', optimalSize.width.toString());
    if (optimalSize.height) params.set('h', optimalSize.height.toString());
    if (quality) params.set('q', quality.toString());
    if (optimalFormat !== 'jpeg') params.set('f', optimalFormat);
    
    return `${url}?${params.toString()}`;
  }

  // Optimize external images
  private optimizeExternalImage(url: string, options: any): string {
    // For external images, we can use a proxy service or return original
    // In production, you might want to use a service like Cloudinary or ImageKit
    return url;
  }

  // Get optimal format based on browser support
  private getOptimalFormat(preferredFormat?: string): string {
    if (preferredFormat && IMAGE_OPTIMIZATION_CONFIG.formats.includes(preferredFormat)) {
      return preferredFormat;
    }

    // Return best supported format
    if (this.isSupported.avif) return 'avif';
    if (this.isSupported.webp) return 'webp';
    return 'jpeg';
  }

  // Get optimal size based on device and viewport
  private getOptimalSize(
    width?: number,
    height?: number,
    device?: string
  ): { width?: number; height?: number } {
    if (width && height) {
      return { width, height };
    }

    if (device && device in IMAGE_OPTIMIZATION_CONFIG.breakpoints) {
      const deviceWidth = IMAGE_OPTIMIZATION_CONFIG.breakpoints[device as keyof typeof IMAGE_OPTIMIZATION_CONFIG.breakpoints];
      return { width: deviceWidth };
    }

    // Auto-detect based on viewport
    const viewportWidth = window.innerWidth;
    if (viewportWidth <= IMAGE_OPTIMIZATION_CONFIG.breakpoints.mobile) {
      return { width: IMAGE_OPTIMIZATION_CONFIG.breakpoints.mobile };
    } else if (viewportWidth <= IMAGE_OPTIMIZATION_CONFIG.breakpoints.tablet) {
      return { width: IMAGE_OPTIMIZATION_CONFIG.breakpoints.tablet };
    } else if (viewportWidth <= IMAGE_OPTIMIZATION_CONFIG.breakpoints.desktop) {
      return { width: IMAGE_OPTIMIZATION_CONFIG.breakpoints.desktop };
    } else {
      return { width: IMAGE_OPTIMIZATION_CONFIG.breakpoints.large };
    }
  }

  // Lazy load image
  loadImage(img: HTMLImageElement) {
    const src = img.dataset.src || img.src;
    if (!src || this.loadedImages.has(src)) return;

    const optimizedSrc = this.optimizeImageUrl(src, {
      width: parseInt(img.dataset.width || '0') || undefined,
      height: parseInt(img.dataset.height || '0') || undefined,
      quality: parseInt(img.dataset.quality || '0') || undefined,
      format: img.dataset.format as any
    });

    img.src = optimizedSrc;
    this.loadedImages.add(src);

    // Track image load performance
    const startTime = performance.now();
    img.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      logger.info('Image loaded', {
        src: optimizedSrc,
        loadTime: loadTime,
        originalSize: src.length,
        optimizedSize: optimizedSrc.length
      });
    });

    img.addEventListener('error', () => {
      // Fallback to original image
      img.src = src;
      logger.warn('Optimized image failed to load, using original', { src });
    });
  }

  // Setup lazy loading for image
  setupLazyLoading(img: HTMLImageElement) {
    if (!IMAGE_OPTIMIZATION_CONFIG.lazyLoading || !this.observer) {
      this.loadImage(img);
      return;
    }

    this.observer.observe(img);
  }

  // Preload critical images
  preloadImages(urls: string[], options: any = {}) {
    urls.forEach(url => {
      const optimizedUrl = this.optimizeImageUrl(url, options);
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedUrl;
      document.head.appendChild(link);
    });
  }

  // Generate responsive image srcset
  generateSrcSet(
    baseUrl: string,
    options: {
      sizes?: number[];
      quality?: number;
      format?: string;
    } = {}
  ): string {
    const { sizes = [375, 768, 1200, 1920], quality, format } = options;
    
    return sizes
      .map(size => {
        const optimizedUrl = this.optimizeImageUrl(baseUrl, {
          width: size,
          quality,
          format: format as any
        });
        return `${optimizedUrl} ${size}w`;
      })
      .join(', ');
  }

  // Generate responsive image sizes attribute
  generateSizes(breakpoints: { [key: string]: string } = {}): string {
    const defaultBreakpoints = {
      '(max-width: 375px)': '100vw',
      '(max-width: 768px)': '50vw',
      '(max-width: 1200px)': '33vw',
      '(min-width: 1201px)': '25vw'
    };

    const finalBreakpoints = { ...defaultBreakpoints, ...breakpoints };
    
    return Object.entries(finalBreakpoints)
      .map(([media, size]) => `${media} ${size}`)
      .join(', ');
  }

  // Create optimized image element
  createOptimizedImage(
    src: string,
    options: {
      alt: string;
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      lazy?: boolean;
      className?: string;
      sizes?: string;
    }
  ): HTMLImageElement {
    const {
      alt,
      width,
      height,
      quality,
      format,
      lazy = true,
      className,
      sizes
    } = options;

    const img = document.createElement('img');
    img.alt = alt;
    img.className = className || '';
    
    if (width) img.width = width;
    if (height) img.height = height;
    if (sizes) img.sizes = sizes;

    if (lazy) {
      img.dataset.src = src;
      img.src = IMAGE_OPTIMIZATION_CONFIG.placeholder;
      if (width) img.dataset.width = width.toString();
      if (height) img.dataset.height = height.toString();
      if (quality) img.dataset.quality = quality.toString();
      if (format) img.dataset.format = format;
      
      this.setupLazyLoading(img);
    } else {
      img.src = this.optimizeImageUrl(src, { width, height, quality, format: format as any });
    }

    return img;
  }

  // Cleanup
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Create singleton instance
export const imageOptimizer = new ImageOptimizer();

// React hook for image optimization
export function useImageOptimization() {
  return {
    optimizeImageUrl: imageOptimizer.optimizeImageUrl.bind(imageOptimizer),
    setupLazyLoading: imageOptimizer.setupLazyLoading.bind(imageOptimizer),
    preloadImages: imageOptimizer.preloadImages.bind(imageOptimizer),
    generateSrcSet: imageOptimizer.generateSrcSet.bind(imageOptimizer),
    generateSizes: imageOptimizer.generateSizes.bind(imageOptimizer),
    createOptimizedImage: imageOptimizer.createOptimizedImage.bind(imageOptimizer)
  };
}

export default imageOptimizer;
