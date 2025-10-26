'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalCloseButtonProps {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ModalCloseButton({ 
  onClick, 
  ariaLabel = "Zamknij",
  className = '',
  size = 'md'
}: ModalCloseButtonProps) {
  const sizeClasses = {
    sm: 'p-2 w-8 h-8',
    md: 'p-3 w-10 h-10', 
    lg: 'p-4 w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <motion.button
      onClick={onClick}
      className={`group relative ${sizeClasses[size]} bg-white border-2 border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 ${className}`}
      aria-label={ariaLabel}
      whileHover={{ 
        scale: 1.05,
        rotate: 5
      }}
      whileTap={{ 
        scale: 0.95,
        rotate: -5
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20,
        delay: 0.1
      }}
    >
      <div className="relative">
        <X className={`${iconSizes[size]} text-gray-600 group-hover:text-gray-800 transition-colors duration-300`} />
        {/* Subtle glow effect on hover */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10" />
      </div>
    </motion.button>
  );
}