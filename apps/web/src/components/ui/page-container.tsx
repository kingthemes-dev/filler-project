'use client';

import React from 'react';
import { UI_SPACING } from '@/config/constants';

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`mx-4 sm:mx-4 md:mx-6 lg:mx-8 ${className}`}>
      {children}
    </div>
  );
}


