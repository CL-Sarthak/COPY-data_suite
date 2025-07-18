'use client';

import Link from 'next/link';
import { ComponentType } from 'react';

interface NavigationItemProps {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
  isActive: boolean;
  isCollapsed: boolean;
}

export default function NavigationItem({
  name,
  href,
  icon: Icon,
  description,
  isActive,
  isCollapsed
}: NavigationItemProps) {
  return (
    <li>
      <Link
        href={href}
        className={`
          group flex ${isCollapsed ? 'justify-center' : 'gap-x-3'} rounded-md p-2 text-sm font-medium items-center transition-all
          ${isActive 
            ? 'bg-gray-800 text-white border-l-4 border-blue-500 pl-1.5' 
            : 'text-gray-300 hover:bg-gray-800 hover:text-white border-l-4 border-transparent'
          }
        `}
        title={isCollapsed ? name : description}
      >
        <Icon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} shrink-0`} />
        {!isCollapsed && <span className="truncate">{name}</span>}
      </Link>
    </li>
  );
}