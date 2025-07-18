'use client';

import NavigationItem from './NavigationItem';
import { ComponentType } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface NavigationItemData {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}

interface NavigationSectionProps {
  name: string;
  items: NavigationItemData[];
  isCollapsed: boolean;
  currentPath: string | null;
  isSectionCollapsed: boolean;
  onToggle: () => void;
}

export default function NavigationSection({
  name,
  items,
  isCollapsed,
  currentPath,
  isSectionCollapsed,
  onToggle
}: NavigationSectionProps) {
  // In collapsed sidebar mode, always show items
  const showItems = isCollapsed || !isSectionCollapsed;
  
  return (
    <div>
      {!isCollapsed && (
        <div className="px-2 mb-3">
          <button
            onClick={onToggle}
            className="flex items-center justify-between w-full text-left hover:text-gray-300 transition-colors group"
          >
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-300">
              {name}
            </h3>
            {isSectionCollapsed ? (
              <ChevronRightIcon className="h-3 w-3 text-gray-500 group-hover:text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-3 w-3 text-gray-500 group-hover:text-gray-400" />
            )}
          </button>
        </div>
      )}
      
      {showItems && (
        <ul className="space-y-1">
          {items.map((item) => (
            <NavigationItem
              key={item.name}
              name={item.name}
              href={item.href}
              icon={item.icon}
              description={item.description}
              isActive={currentPath === item.href}
              isCollapsed={isCollapsed}
            />
          ))}
        </ul>
      )}
    </div>
  );
}