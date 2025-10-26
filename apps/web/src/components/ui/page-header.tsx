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
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
        {breadcrumbs.length > 0 && (
          <Breadcrumbs 
            items={breadcrumbs} 
            variant="minimal" 
            size="sm" 
          />
        )}
      </div>
    </div>
  );
}
