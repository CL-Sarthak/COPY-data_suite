'use client';

import AppLayout from '@/components/AppLayout';
import { useState, useEffect } from 'react';
import { DemoWatermark, DemoBadge, useDemoPage } from '@/components/DemoWatermark';
import { 
  ShieldCheckIcon, 
  DocumentCheckIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  CloudIcon,
  ServerIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  coverage: number;
  lastAssessment: string;
  requiredControls: number;
  implementedControls: number;
}

interface RiskItem {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  status: 'open' | 'mitigated' | 'accepted';
  dataSource?: string;
  detectedDate: string;
}

export default function CompliancePage() {
  const demoPageProps = useDemoPage();
  const [activeTab, setActiveTab] = useState<'overview' | 'frameworks' | 'risks' | 'reports'>('overview');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Simulate sync with LockThreat
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSync(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const frameworks: ComplianceFramework[] = [
    {
      id: '1',
      name: 'GDPR',
      description: 'General Data Protection Regulation',
      status: 'compliant',
      coverage: 94,
      lastAssessment: '2025-06-25',
      requiredControls: 87,
      implementedControls: 82
    },
    {
      id: '2',
      name: 'CCPA',
      description: 'California Consumer Privacy Act',
      status: 'compliant',
      coverage: 91,
      lastAssessment: '2025-06-24',
      requiredControls: 45,
      implementedControls: 41
    },
    {
      id: '3',
      name: 'HIPAA',
      description: 'Health Insurance Portability and Accountability Act',
      status: 'partial',
      coverage: 78,
      lastAssessment: '2025-06-20',
      requiredControls: 54,
      implementedControls: 42
    },
    {
      id: '4',
      name: 'SOC 2',
      description: 'Service Organization Control 2',
      status: 'partial',
      coverage: 85,
      lastAssessment: '2025-06-22',
      requiredControls: 116,
      implementedControls: 98
    }
  ];

  const risks: RiskItem[] = [
    {
      id: '1',
      title: 'Unencrypted PII in Customer Database',
      severity: 'critical',
      category: 'Data Protection',
      status: 'open',
      dataSource: 'customer_db_prod',
      detectedDate: '2025-06-26'
    },
    {
      id: '2',
      title: 'Missing Data Retention Policy for Marketing Data',
      severity: 'high',
      category: 'Data Governance',
      status: 'open',
      dataSource: 'marketing_analytics',
      detectedDate: '2025-06-25'
    },
    {
      id: '3',
      title: 'Incomplete Access Logs for Financial Records',
      severity: 'medium',
      category: 'Audit & Logging',
      status: 'mitigated',
      dataSource: 'finance_system',
      detectedDate: '2025-06-20'
    },
    {
      id: '4',
      title: 'Outdated Privacy Policy Documentation',
      severity: 'low',
      category: 'Documentation',
      status: 'accepted',
      detectedDate: '2025-06-15'
    }
  ];

  const handleSync = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
      setLastSync(new Date());
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50 border-green-200';
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'non-compliant': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'high': return <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />;
      case 'medium': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'low': return <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />;
      default: return null;
    }
  };

  return (
    <AppLayout>
      <DemoWatermark />
      
      <div className={`p-8 ${demoPageProps.className}`} style={demoPageProps.style}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">Compliance & Risk Management</h1>
                  <DemoBadge />
                </div>
                <p className="text-gray-600 mt-2">
                  Powered by LockThreat AI-driven GRC platform for real-time compliance insights
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">LockThreat Integration</p>
                  <p className="text-sm font-medium text-gray-900">
                    {syncStatus === 'synced' ? 'Connected' : syncStatus === 'syncing' ? 'Syncing...' : 'Error'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last sync: {lastSync.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncStatus === 'syncing'}
                  className={`p-2 rounded-lg border ${
                    syncStatus === 'syncing' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                  } transition-colors`}
                >
                  <ArrowPathIcon className={`h-5 w-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* LockThreat Integration Banner */}
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-36 h-20 rounded-lg flex items-center justify-center p-2">
                    <Image
                      src="/lockthreat-logo.svg"
                      alt="LockThreat Logo"
                      width={140}
                      height={42}
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">LockThreat GRC Integration Active</h3>
                  <p className="text-sm text-gray-600">
                    Monitoring 150+ compliance frameworks across your data infrastructure with AI-powered insights
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CloudIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Multi-cloud</span>
                  <ServerIcon className="h-4 w-4 text-gray-500 ml-2" />
                  <span className="text-gray-600">On-premise</span>
                  <CpuChipIcon className="h-4 w-4 text-gray-500 ml-2" />
                  <span className="text-gray-600">AI-driven</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                {[
                  { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                  { id: 'frameworks', label: 'Compliance Frameworks', icon: DocumentCheckIcon },
                  { id: 'risks', label: 'Risk Assessment', icon: ExclamationTriangleIcon },
                  { id: 'reports', label: 'Reports & Audit', icon: ShieldCheckIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'overview' | 'frameworks' | 'risks' | 'reports')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* Compliance Score */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-600">Overall Compliance Score</h3>
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">87%</p>
                    <p className="text-sm text-green-600 mt-1">+3% from last month</p>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-600">Active Frameworks</h3>
                      <DocumentCheckIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">12</p>
                    <p className="text-sm text-gray-500 mt-1">of 150+ available</p>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-600">Open Risks</h3>
                      <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">7</p>
                    <p className="text-sm text-orange-600 mt-1">2 critical, 3 high</p>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-600">Data Sources</h3>
                      <ServerIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">24</p>
                    <p className="text-sm text-gray-500 mt-1">Monitored by LockThreat</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Compliance Activity</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">GDPR Assessment Completed</p>
                        <p className="text-sm text-gray-600">All data processing activities reviewed and documented</p>
                        <p className="text-xs text-gray-500 mt-1">2 hours ago via LockThreat Automated Scan</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                      <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">New Risk Detected</p>
                        <p className="text-sm text-gray-600">Unencrypted PII found in customer_db_prod</p>
                        <p className="text-xs text-gray-500 mt-1">5 hours ago via AI Risk Detection</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ClockIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">SOC 2 Audit Scheduled</p>
                        <p className="text-sm text-gray-600">Annual compliance audit scheduled for July 15, 2025</p>
                        <p className="text-xs text-gray-500 mt-1">Yesterday via LockThreat Workflow</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'frameworks' && (
              <div className="space-y-4">
                {frameworks.map((framework) => (
                  <div key={framework.id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{framework.name}</h3>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(framework.status)}`}>
                            {framework.status.replace('-', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{framework.description}</p>
                        
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Coverage</p>
                            <p className="text-xl font-semibold text-gray-900">{framework.coverage}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Controls</p>
                            <p className="text-xl font-semibold text-gray-900">
                              {framework.implementedControls}/{framework.requiredControls}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Last Assessment</p>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(framework.lastAssessment).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Integration</p>
                            <p className="text-sm font-medium text-gray-900">LockThreat AI</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${framework.coverage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 p-2">
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'risks' && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Active Risk Items</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-600 rounded-full"></span>
                        Critical: 1
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-orange-600 rounded-full"></span>
                        High: 1
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-yellow-600 rounded-full"></span>
                        Medium: 1
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                        Low: 1
                      </span>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {risks.map((risk) => (
                    <div key={risk.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        {getSeverityIcon(risk.severity)}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{risk.title}</h3>
                              <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                                <span>Category: {risk.category}</span>
                                {risk.dataSource && <span>Data Source: {risk.dataSource}</span>}
                                <span>Detected: {new Date(risk.detectedDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              risk.status === 'open' ? 'bg-red-100 text-red-700' :
                              risk.status === 'mitigated' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {risk.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <button className="text-sm text-blue-600 hover:text-blue-800">View Details</button>
                            <button className="text-sm text-blue-600 hover:text-blue-800">Create Remediation Task</button>
                            <span className="text-sm text-gray-500">• Tracked in LockThreat</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Reports</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <DocumentCheckIcon className="h-10 w-10 text-blue-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">GDPR Compliance Report</h3>
                          <p className="text-sm text-gray-600">Complete assessment of data processing activities</p>
                          <p className="text-xs text-gray-500 mt-1">Generated by LockThreat • June 25, 2025</p>
                        </div>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="h-10 w-10 text-green-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">Risk Assessment Summary</h3>
                          <p className="text-sm text-gray-600">Quarterly risk analysis across all data sources</p>
                          <p className="text-xs text-gray-500 mt-1">Generated by LockThreat • June 20, 2025</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <CpuChipIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">AI-Powered Insights</h3>
                      <p className="text-blue-800 mt-1">
                        LockThreat&apos;s AI engine continuously analyzes your compliance posture and provides:
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-blue-700">
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 mt-0.5" />
                          <span>Predictive risk analysis based on data patterns</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 mt-0.5" />
                          <span>Automated compliance gap detection</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 mt-0.5" />
                          <span>Real-time alerts for regulatory changes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircleIcon className="h-4 w-4 mt-0.5" />
                          <span>Customizable compliance workflows</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}