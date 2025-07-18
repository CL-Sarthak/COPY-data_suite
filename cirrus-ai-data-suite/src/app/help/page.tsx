'use client';

import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  MagnifyingGlassIcon,
  ArrowRightIcon,
  FolderOpenIcon,
  CloudArrowUpIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon as SearchIcon,
  Squares2X2Icon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface HelpSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  links: Array<{
    title: string;
    description: string;
    href: string;
  }>;
}

const helpSections: HelpSection[] = [
  {
    title: 'Getting Started',
    description: 'Learn the basics and get up and running quickly',
    icon: FolderOpenIcon,
    links: [
      { title: 'Quick Start Guide', description: 'Get started in 5 minutes', href: '/docs/quickstart' },
      { title: 'Installation', description: 'Set up your environment', href: '/README.md' },
      { title: 'First Steps', description: 'Upload your first data source', href: '#first-steps' }
    ]
  },
  {
    title: 'Data Sources',
    description: 'Connect and import data from various sources',
    icon: CloudArrowUpIcon,
    links: [
      { title: 'File Upload', description: 'Upload CSV, JSON, PDF, and more', href: '#file-upload' },
      { title: 'Database Connections', description: 'Connect to PostgreSQL, MySQL, and more', href: '/docs/help/database-sources.md' },
      { title: 'API Integrations', description: 'Import from REST APIs', href: '/docs/help/api-sources.md' },
      { title: 'Inbound API', description: 'Receive data via webhooks', href: '/docs/help/inbound-api.md' }
    ]
  },
  {
    title: 'Data Management',
    description: 'Explore, catalog, and organize your data',
    icon: SearchIcon,
    links: [
      { title: 'Data Discovery', description: 'Browse and search your data sources', href: '#data-discovery' },
      { title: 'Global Catalog', description: 'Define standard field mappings', href: '#global-catalog' },
      { title: 'Field Mapping', description: 'Map source fields to catalog fields', href: '#field-mapping' },
      { title: 'Data Quality', description: 'Analyze and improve data quality', href: '#data-quality' }
    ]
  },
  {
    title: 'Privacy & Security',
    description: 'Protect sensitive data and ensure compliance',
    icon: ShieldCheckIcon,
    links: [
      { title: 'Pattern Detection', description: 'Define PII/PHI detection patterns', href: '#pattern-detection' },
      { title: 'Data Annotation', description: 'Train patterns with your data', href: '#data-annotation' },
      { title: 'Compliance Reports', description: 'Generate compliance documentation', href: '#compliance' },
      { title: 'Redaction Methods', description: 'Mask, remove, or replace sensitive data', href: '#redaction' }
    ]
  },
  {
    title: 'Data Processing',
    description: 'Transform, generate, and assemble data',
    icon: ArrowPathIcon,
    links: [
      { title: 'Synthetic Data', description: 'Generate privacy-safe test data', href: '#synthetic-data' },
      { title: 'Data Assembly', description: 'Combine and merge datasets', href: '#data-assembly' },
      { title: 'Transformations', description: 'Convert between formats', href: '#transformations' },
      { title: 'Export Options', description: 'Export in various formats', href: '#export' }
    ]
  },
  {
    title: 'Automation',
    description: 'Build automated workflows and pipelines',
    icon: Squares2X2Icon,
    links: [
      { title: 'Pipeline Builder', description: 'Create visual data pipelines', href: '#pipeline-builder' },
      { title: 'Scheduled Tasks', description: 'Automate recurring imports', href: '#scheduled-tasks' },
      { title: 'API Triggers', description: 'Execute pipelines via API', href: '#api-triggers' },
      { title: 'Environment Deployment', description: 'Deploy to different environments', href: '#environments' }
    ]
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sections and links based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery) return helpSections;

    const query = searchQuery.toLowerCase();
    return helpSections
      .map(section => {
        const matchingLinks = section.links.filter(link =>
          link.title.toLowerCase().includes(query) ||
          link.description.toLowerCase().includes(query)
        );

        // Include section if title/description matches or has matching links
        if (
          section.title.toLowerCase().includes(query) ||
          section.description.toLowerCase().includes(query) ||
          matchingLinks.length > 0
        ) {
          return {
            ...section,
            links: matchingLinks.length > 0 ? matchingLinks : section.links
          };
        }

        return null;
      })
      .filter(Boolean) as HelpSection[];
  }, [searchQuery]);

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
            <p className="text-gray-600 mt-2">
              Find answers, guides, and resources to help you use Cirrus Data Suite effectively
            </p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative max-w-2xl">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help topics..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-600 mt-2">
                Found {filteredSections.reduce((acc, section) => acc + section.links.length, 0)} results
              </p>
            )}
          </div>

          {/* Quick Links */}
          {!searchQuery && (
            <div className="mb-12">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/discovery"
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium text-gray-900 mb-1">Start with Data Discovery</h3>
                  <p className="text-sm text-gray-600">Upload files and explore your data</p>
                </Link>
                <Link
                  href="/sources/databases"
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium text-gray-900 mb-1">Connect a Database</h3>
                  <p className="text-sm text-gray-600">Import data from PostgreSQL or MySQL</p>
                </Link>
                <Link
                  href="/pipeline"
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium text-gray-900 mb-1">Build a Pipeline</h3>
                  <p className="text-sm text-gray-600">Automate your data workflows</p>
                </Link>
              </div>
            </div>
          )}

          {/* Help Sections */}
          <div className="space-y-8">
            {filteredSections.map((section) => (
              <div key={section.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <section.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                    <p className="text-gray-600 mt-1">{section.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.links.map((link) => (
                    <a
                      key={link.title}
                      href={link.href}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                          {link.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{link.description}</p>
                      </div>
                      <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* No Results */}
          {searchQuery && filteredSections.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No help topics found for &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear search
              </button>
            </div>
          )}

          {/* Additional Resources */}
          <div className="mt-12 bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Documentation</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/api-docs" className="text-blue-600 hover:text-blue-700">
                      API Documentation
                    </a>
                  </li>
                  <li>
                    <a href="/docs/help/index.md" className="text-blue-600 hover:text-blue-700">
                      Full Documentation
                    </a>
                  </li>
                  <li>
                    <a href="/CLAUDE.md" className="text-blue-600 hover:text-blue-700">
                      Developer Notes
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Examples</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#" className="text-blue-600 hover:text-blue-700">
                      Sample Pipelines
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-blue-600 hover:text-blue-700">
                      Pattern Library
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-blue-600 hover:text-blue-700">
                      Use Cases
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Support</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/about" className="text-blue-600 hover:text-blue-700">
                      About Cirrus Data Suite
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-blue-600 hover:text-blue-700">
                      Contact Support
                    </a>
                  </li>
                  <li>
                    <a href="/FEATURE_BACKLOG.md" className="text-blue-600 hover:text-blue-700">
                      Feature Roadmap
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}