'use client';

import Link from 'next/link';
import { 
  ArrowRightOnRectangleIcon,
  InformationCircleIcon,
  CodeBracketIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

interface NavigationFooterProps {
  isCollapsed: boolean;
  currentPath: string | null;
  isDevelopment: boolean;
  onLogout: () => void;
}

export default function NavigationFooter({
  isCollapsed,
  currentPath,
  isDevelopment,
  onLogout
}: NavigationFooterProps) {
  const footerLinks = [
    { name: 'Help', href: '/help', icon: QuestionMarkCircleIcon },
    { name: 'About this app', href: '/about', icon: InformationCircleIcon },
    { name: 'API Documentation', href: '/api-docs', icon: CodeBracketIcon }
  ];

  return (
    <div className="mt-auto pt-8 border-t border-gray-800 space-y-3">
      {footerLinks.map((link) => (
        <Link 
          key={link.name}
          href={link.href}
          className={`flex ${isCollapsed ? 'justify-center' : 'gap-x-3'} items-center text-sm rounded-md p-2 transition-colors ${
            currentPath === link.href
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title={isCollapsed ? link.name : undefined}
        >
          <link.icon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
          {!isCollapsed && link.name}
        </Link>
      ))}
      
      {!isDevelopment && (
        <button
          onClick={onLogout}
          className={`flex ${isCollapsed ? 'justify-center' : 'gap-x-3'} items-center text-gray-400 hover:text-white text-sm w-full rounded-md p-2 transition-colors hover:bg-gray-800`}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <ArrowRightOnRectangleIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
          {!isCollapsed && "Sign Out"}
        </button>
      )}
      
      <div className={`mt-6 pt-4 border-t border-gray-800 ${isCollapsed ? 'text-center' : ''}`}>
        <p className="text-xs text-gray-500">
          {isCollapsed ? '©' : '©'} {new Date().getFullYear()} {!isCollapsed && 'CirrusLabs'}
        </p>
      </div>
    </div>
  );
}