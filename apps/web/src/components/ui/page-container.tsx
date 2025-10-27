'use client';

import React from 'react';
import { UI_SPACING } from '@/config/constants';

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div
      className={`max-w-[var(--container-max-w)] mobile-container mx-2 sm:mx-4 md:mx-6 lg:mx-8 ${className}`}
      style={{ ['--container-max-w' as any]: UI_SPACING.CONTAINER_MAX_W }}
    >
      {children}
    </div>
  );
}


