'use client';

import Image from 'next/image';

interface NavigationHeaderProps {
  isCollapsed: boolean;
}

export default function NavigationHeader({ isCollapsed }: NavigationHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center mb-8">
      <Image 
        src="/cirruslabs-logo.png" 
        alt="CirrusLabs" 
        width={isCollapsed ? 48 : 200} 
        height={isCollapsed ? 48 : 200} 
        className={`${isCollapsed ? 'mb-0' : 'mb-4'} transition-all duration-300`}
      />
      {!isCollapsed && (
        <div>
          <h1 className="text-white font-semibold text-lg">Data Preparedness Studio</h1>
          <p className="text-gray-400 text-sm">AI Data Suite</p>
        </div>
      )}
    </div>
  );
}