'use client';

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Navigation from '@/components/Navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasClassificationBanner, setHasClassificationBanner] = useState(false);
  
  // Load saved sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsSidebarCollapsed(JSON.parse(savedState));
    }
    
    // Check if classification banner is enabled
    const classificationLevel = process.env.NEXT_PUBLIC_CLASSIFICATION_LEVEL;
    setHasClassificationBanner(!!classificationLevel);
  }, []);

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  return (
    <div className={`flex h-screen bg-gray-50 ${hasClassificationBanner ? 'pt-7' : ''} pb-6`}>
      {/* Sidebar */}
      <div 
        className={`
          relative bg-gray-900 transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'w-20' : 'w-80'}
        `}
      >
        {/* Collapse/Expand Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-8 z-10 bg-gray-900 border border-gray-700 rounded-full p-1 hover:bg-gray-800 transition-colors"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronLeftIcon className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Navigation */}
        <div className={`h-full overflow-y-auto ${isSidebarCollapsed ? 'overflow-x-hidden' : ''}`}>
          <Navigation isCollapsed={isSidebarCollapsed} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}