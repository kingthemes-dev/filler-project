/**
 * Reusable loading state components
 */

import { motion } from 'framer-motion';
import { Loader2, ShoppingCart, Heart, User, Mail } from 'lucide-react';

// Basic loading spinner
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin ${className}`} />
  );
}

// Loading overlay
export function LoadingOverlay({ isLoading, children }: { isLoading: boolean; children: React.ReactNode }) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="flex flex-col items-center space-y-2">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600">Ładowanie...</p>
        </div>
      </div>
    </div>
  );
}

// Skeleton components
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <Skeleton className="w-full h-48 mb-4" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Button loading states
export function LoadingButton({ 
  isLoading, 
  children, 
  loadingText = 'Ładowanie...',
  className = '',
  ...props 
}: {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  [key: string]: any;
}) {
  return (
    <button 
      className={`flex items-center justify-center space-x-2 ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  );
}

// Page loading state
export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full mx-auto mb-4"
        />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Ładowanie...</h2>
        <p className="text-gray-600">Proszę czekać, ładujemy zawartość</p>
      </motion.div>
    </div>
  );
}

// Specific loading states for different actions
export function AddToCartLoading({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  return (
    <div className="flex items-center space-x-2 text-blue-600">
      <ShoppingCart className="w-4 h-4" />
      <span className="text-sm">Dodawanie do koszyka...</span>
    </div>
  );
}

export function AddToFavoritesLoading({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  return (
    <div className="flex items-center space-x-2 text-red-600">
      <Heart className="w-4 h-4" />
      <span className="text-sm">Dodawanie do ulubionych...</span>
    </div>
  );
}

export function LoginLoading({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  return (
    <div className="flex items-center space-x-2 text-gray-600">
      <User className="w-4 h-4" />
      <span className="text-sm">Logowanie...</span>
    </div>
  );
}

export function NewsletterLoading({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  return (
    <div className="flex items-center space-x-2 text-purple-600">
      <Mail className="w-4 h-4" />
      <span className="text-sm">Zapisywanie do newslettera...</span>
    </div>
  );
}

// Inline loading indicator
export function InlineLoading({ text = 'Ładowanie...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center space-x-2 text-gray-600">
        <LoadingSpinner size="sm" />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

// Error loading state
export function ErrorLoading({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry?: () => void; 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Ups! Coś poszło nie tak</h3>
      <p className="text-gray-600 mb-4 max-w-md">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Spróbuj ponownie
        </button>
      )}
    </div>
  );
}
