'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  ShieldCheckIcon, 
  SparklesIcon,
  ChartBarIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  CircleStackIcon,
  CloudArrowUpIcon,
  CloudIcon,
  CodeBracketIcon,
  BookOpenIcon,
  ArrowDownTrayIcon,
  WrenchScrewdriverIcon,
  CubeTransparentIcon,
  DocumentDuplicateIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import NavigationHeader from './navigation/NavigationHeader';
import NavigationSection from './navigation/NavigationSection';
import NavigationItem from './navigation/NavigationItem';
import NavigationFooter from './navigation/NavigationFooter';
import type { NavigationItemData } from './navigation/NavigationSection';
// import {
//   NavigationHeader,
//   NavigationSection,
//   NavigationItem,
//   NavigationFooter,
//   NavigationItemData  
// } from './navigation';

// Dashboard as a standalone item
const dashboardItem: NavigationItemData = {
  name: 'Dashboard',
  href: '/dashboard',
  icon: HomeIcon,
  description: 'System overview and metrics'
};

// Organized navigation following the logical workflow
const navigationSections: Array<{ name: string; items: NavigationItemData[] }> = [
  {
    name: 'Data Sources',
    items: [
      { name: 'File Upload', href: '/sources/files', icon: CloudArrowUpIcon, description: 'Upload files and documents' },
      { name: 'Databases', href: '/sources/databases', icon: CircleStackIcon, description: 'Connect to databases' },
      { name: 'APIs', href: '/sources/apis', icon: CodeBracketIcon, description: 'Connect to REST APIs' },
      { name: 'Inbound API', href: '/sources/inbound', icon: ArrowDownTrayIcon, description: 'Receive data via API endpoints' },
      { name: 'Cloud Storage', href: '/sources/cloud', icon: CloudIcon, description: 'Connect to S3, Azure, GCS' }
    ]
  },
  {
    name: 'Data Management',
    items: [
      { name: 'Data Discovery', href: '/discovery', icon: MagnifyingGlassIcon, description: 'View and explore data sources' },
      { name: 'Global Catalog', href: '/catalog', icon: BookOpenIcon, description: 'Define and manage data fields' },
      { name: 'Global Query', href: '/query', icon: SparklesIcon, description: 'Ask questions about your data' }
    ]
  },
  {
    name: 'Data Quality',
    items: [
      { name: 'Quality Assessment', href: '/quality', icon: ChartBarIcon, description: 'Profile and analyze data quality' },
      { name: 'Quality Rules', href: '/quality-rules', icon: AdjustmentsHorizontalIcon, description: 'Define and manage quality rules' },
      { name: 'Remediation', href: '/remediation', icon: WrenchScrewdriverIcon, description: 'Fix data quality issues' },
      { name: 'Normalization', href: '/normalization', icon: CubeTransparentIcon, description: 'Standardize data formats' },
      { name: 'Fix Templates', href: '/templates', icon: DocumentDuplicateIcon, description: 'Reusable transformation patterns' }
    ]
  },
  {
    name: 'Privacy & Protection', 
    items: [
      { name: 'Pattern Definition', href: '/redaction-modular', icon: ShieldCheckIcon, description: 'Define PII detection patterns' },
      { name: 'Data Annotation', href: '/annotation-modular', icon: DocumentCheckIcon, description: 'Annotate sensitive data patterns' },
      { name: 'Compliance', href: '/compliance', icon: BookOpenIcon, description: 'Compliance reporting and audit' }
    ]
  },
  {
    name: 'Generation & Assembly',
    items: [
      { name: 'Synthetic Data', href: '/synthetic-modular', icon: SparklesIcon, description: 'Generate privacy-safe datasets' },
      { name: 'Data Assembly', href: '/assembly', icon: ArrowPathIcon, description: 'Combine and prepare datasets' }
    ]
  },
  {
    name: 'Automation & Deployment',
    items: [
      { name: 'Pipeline Builder', href: '/pipeline', icon: Squares2X2Icon, description: 'Orchestrate automated workflows' },
      { name: 'Environments', href: '/environments', icon: CloudArrowUpIcon, description: 'Deploy to target environments' }
    ]
  }
];

interface NavigationProps {
  isCollapsed?: boolean;
}

export default function Navigation({ isCollapsed = false }: NavigationProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // State to track which sections are collapsed - start with all collapsed
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(navigationSections.map(section => section.name))
  );
  
  // Load saved section states from localStorage
  useEffect(() => {
    const savedStates = localStorage.getItem('navSectionStates');
    if (savedStates) {
      try {
        const parsed = JSON.parse(savedStates);
        setCollapsedSections(new Set(parsed));
      } catch (e) {
        console.error('Failed to parse saved navigation states:', e);
        // If error, default to all collapsed
        setCollapsedSections(new Set(navigationSections.map(section => section.name)));
      }
    }
  }, []);
  
  // Auto-expand the section containing the current path
  useEffect(() => {
    if (pathname) {
      // Check if we're on the dashboard
      if (pathname === '/dashboard') {
        // Collapse all sections when on dashboard
        setCollapsedSections(() => {
          const newSet = new Set(navigationSections.map(section => section.name));
          // Save to localStorage
          localStorage.setItem('navSectionStates', JSON.stringify(Array.from(newSet)));
          return newSet;
        });
      } else {
        // Find which section contains the current path
        const currentSection = navigationSections.find(section =>
          section.items.some(item => item.href === pathname)
        );
        
        if (currentSection) {
          setCollapsedSections(prev => {
            const newSet = new Set(prev);
            // Collapse all sections
            navigationSections.forEach(section => {
              newSet.add(section.name);
            });
            // Then expand only the current section
            newSet.delete(currentSection.name);
            // Save to localStorage
            localStorage.setItem('navSectionStates', JSON.stringify(Array.from(newSet)));
            return newSet;
          });
        }
      }
    }
  }, [pathname]);
  
  // Toggle a section's collapsed state
  const toggleSection = (sectionName: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (prev.has(sectionName)) {
        // Section is currently collapsed, so open it (remove from collapsed set)
        // First close all other sections
        navigationSections.forEach(section => {
          if (section.name !== sectionName) {
            newSet.add(section.name);
          }
        });
        // Then open the clicked section
        newSet.delete(sectionName);
      } else {
        // Section is currently open, so close it (add to collapsed set)
        newSet.add(sectionName);
      }
      // Save to localStorage
      localStorage.setItem('navSectionStates', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  return (
    <nav className={`flex flex-col gap-y-5 bg-gray-900 ${isCollapsed ? 'px-2' : 'px-6'} py-8`}>
      <NavigationHeader isCollapsed={isCollapsed} />
      
      <div className="space-y-6">
        {/* Dashboard as a standalone link */}
        <ul className="space-y-1">
          <NavigationItem
            name={dashboardItem.name}
            href={dashboardItem.href}
            icon={dashboardItem.icon}
            description={dashboardItem.description}
            isActive={pathname === dashboardItem.href}
            isCollapsed={isCollapsed}
          />
        </ul>
        
        {/* Other sections */}
        {navigationSections.map((section) => (
          <NavigationSection
            key={section.name}
            name={section.name}
            items={section.items}
            isCollapsed={isCollapsed}
            currentPath={pathname}
            isSectionCollapsed={collapsedSections.has(section.name)}
            onToggle={() => toggleSection(section.name)}
          />
        ))}
      </div>

      <NavigationFooter
        isCollapsed={isCollapsed}
        currentPath={pathname}
        isDevelopment={isDevelopment}
        onLogout={logout}
      />
    </nav>
  );
}