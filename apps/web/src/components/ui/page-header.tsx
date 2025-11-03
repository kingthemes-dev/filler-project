'use client';

import React from 'react';
import Breadcrumbs from './breadcrumbs';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  subtitle?: string;
  className?: string;
}

export default function PageHeader({ 
  title, 
  breadcrumbs = [], 
  subtitle,
  className = '' 
}: PageHeaderProps) {
  return (
    <div className={`mb-8 ${className}`}>
      {/* Header with Title and Breadcrumbs */}
      <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-white border border-gray-200 rounded-3xl px-4 lg:px-8 pt-5 pb-6 sm:pt-6 sm:pb-8">
        <div className="flex flex-col items-center justify-center gap-2 lg:gap-3 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-lg text-gray-600">
              {subtitle}
            </p>
          )}
        {breadcrumbs.length > 0 && (
          <Breadcrumbs 
            items={breadcrumbs} 
            variant="minimal" 
            size="sm" 
          />
        )}
        </div>
      </div>
    </div>
  );
}
