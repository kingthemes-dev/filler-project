'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalCloseButtonProps {
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'absolute' | 'relative';
}

export default function ModalCloseButton({ 
  onClick, 
  className = '', 
  size = 'md',
  position = 'absolute'
}: ModalCloseButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-14 h-14'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <motion.button
      onClick={onClick}
      className={`
        ${position === 'absolute' ? 'absolute top-4 right-4 z-10' : ''}
        ${sizeClasses[size]}
        flex items-center justify-center 
        rounded-xl border border-gray-300 
        bg-white shadow-sm
        hover:border-gray-400 hover:bg-gray-50 
        transition-colors duration-200
        ${className}
      `}
      whileHover={{ 
        scale: 1.05,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}
      whileTap={{ 
        scale: 0.95,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25 
      }}
      aria-label="Zamknij"
    >
      <motion.div
        whileHover={{ rotate: 90 }}
        whileTap={{ rotate: 180 }}
        transition={{ duration: 0.2 }}
      >
        <X className={`${iconSizes[size]} text-gray-600`} />
      </motion.div>
    </motion.button>
  );
}
