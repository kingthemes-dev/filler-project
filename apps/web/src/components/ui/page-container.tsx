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
      className={`max-w-[var(--container-max-w)] mx-auto mobile-container ${className}`}
      style={{ ['--container-max-w' as any]: UI_SPACING.CONTAINER_MAX_W }}
    >
      {children}
    </div>
  );
}


