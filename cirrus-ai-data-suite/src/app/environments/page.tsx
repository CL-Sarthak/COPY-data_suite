'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Environment, DeploymentJob } from '@/types/environments';
import { useDialog } from '@/contexts/DialogContext';
import { 
  ServerStackIcon,
  CloudIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export default function Environments() {
  const dialog = useDialog();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  const [deploymentJobs, setDeploymentJobs] = useState<DeploymentJob[]>([]);

  const getEnvironmentIcon = (type: Environment['deploymentTarget']['type']) => {
    switch (type) {
      case 'cloud': return <CloudIcon className="h-5 w-5" />;
      case 'on-premise': return <ServerStackIcon className="h-5 w-5" />;
      case 'air-gapped': return <LockClosedIcon className="h-5 w-5" />;
      case 'hybrid': return <GlobeAltIcon className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: Environment['status']) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'syncing': return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default: return <CogIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getSecurityColor = (level: Environment['securityLevel']) => {
    switch (level) {
      case 'top-secret': return 'bg-red-100 text-red-900 border-red-200';
      case 'secret': return 'bg-orange-100 text-orange-900 border-orange-200';
      case 'confidential': return 'bg-yellow-100 text-yellow-900 border-yellow-200';
      case 'unclassified': return 'bg-green-100 text-green-900 border-green-200';
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return 'Never';
    const minutes = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const syncEnvironment = (envId: string) => {
    const newJob: DeploymentJob = {
      id: Date.now().toString(),
      environmentId: envId,
      sourceDataset: 'Selected datasets',
      status: 'running',
      startTime: new Date(),
      progress: 0,
      recordsProcessed: 0,
      recordsDeployed: 0
    };
    
    setDeploymentJobs([newJob, ...deploymentJobs]);
    
    // Update environment status
    setEnvironments(prev => prev.map(env => 
      env.id === envId ? { ...env, status: 'syncing' } : env
    ));
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Multi-Environment Deployment</h1>
              <p className="text-gray-600 mt-1">Manage data deployment across different security environments</p>
            </div>
            <button
              onClick={() => dialog.showAlert({
                title: 'Coming Soon',
                message: 'Environment creation functionality is coming soon.',
                type: 'info'
              })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ServerStackIcon className="h-5 w-5" />
              Add Environment
            </button>
          </div>

          {/* Environments Grid */}
          {environments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center mb-8">
              <ServerStackIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Environments Configured</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Configure your first deployment environment to begin deploying prepared datasets for AI training.
              </p>
              <button
                onClick={() => dialog.showAlert({
                title: 'Coming Soon',
                message: 'Environment creation functionality is coming soon.',
                type: 'info'
              })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ServerStackIcon className="h-5 w-5" />
                Configure First Environment
              </button>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 text-sm mb-1">Production</h4>
                  <p className="text-xs text-gray-600">Full data access, high security</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 text-sm mb-1">UAT</h4>
                  <p className="text-xs text-gray-600">Redacted data, testing ready</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 text-sm mb-1">Training</h4>
                  <p className="text-xs text-gray-600">Synthetic data only</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 text-sm mb-1">Air-Gapped</h4>
                  <p className="text-xs text-gray-600">Isolated high-security</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {environments.map((env) => (
              <div
                key={env.id}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition-shadow cursor-pointer ${
                  getSecurityColor(env.securityLevel).replace('bg-', 'border-')
                }`}
                onClick={() => setSelectedEnvironment(env)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getEnvironmentIcon(env.deploymentTarget.type)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{env.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{env.type} Environment</p>
                    </div>
                  </div>
                  {getStatusIcon(env.status)}
                </div>

                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 ${
                  getSecurityColor(env.securityLevel)
                }`}>
                  <ShieldCheckIcon className="h-4 w-4" />
                  {env.securityLevel.toUpperCase()}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">Records</p>
                    <p className="font-medium text-gray-900">
                      {env.recordCount ? env.recordCount.toLocaleString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Sync</p>
                    <p className="font-medium text-gray-900">{formatTime(env.lastSync)}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Data Policy:</span>
                    <span className="font-medium">
                      {env.dataPolicy.syntheticDataOnly ? 'Synthetic Only' : 
                       env.dataPolicy.redactionLevel === 'none' ? 'Full Data' :
                       `${env.dataPolicy.redactionLevel} Redaction`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Deployment:</span>
                    <span className="font-medium capitalize">
                      {env.deploymentTarget.type}
                      {env.deploymentTarget.provider && ` (${env.deploymentTarget.provider})`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    syncEnvironment(env.id);
                  }}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Sync Environment
                </button>
              </div>
            ))}
          </div>
          )}

          {/* Selected Environment Details */}
          {selectedEnvironment && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedEnvironment.name} - Configuration Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Data Policy</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Redaction Level:</dt>
                      <dd className="font-medium capitalize">{selectedEnvironment.dataPolicy.redactionLevel}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Synthetic Data Only:</dt>
                      <dd className="font-medium">{selectedEnvironment.dataPolicy.syntheticDataOnly ? 'Yes' : 'No'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Retention Period:</dt>
                      <dd className="font-medium">{selectedEnvironment.dataPolicy.retentionDays} days</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Encryption Required:</dt>
                      <dd className="font-medium">{selectedEnvironment.dataPolicy.encryptionRequired ? 'Yes' : 'No'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Audit Logging:</dt>
                      <dd className="font-medium">{selectedEnvironment.dataPolicy.auditLogging ? 'Enabled' : 'Disabled'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Allowed Patterns</h3>
                  <div className="space-y-1">
                    {selectedEnvironment.dataPolicy.allowedPatterns.map((pattern, idx) => (
                      <div key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-sm rounded">
                        {pattern}
                      </div>
                    ))}
                  </div>
                  
                  {selectedEnvironment.dataPolicy.deniedPatterns.length > 0 && (
                    <>
                      <h3 className="font-medium text-gray-900 mb-3 mt-4">Denied Patterns</h3>
                      <div className="space-y-1">
                        {selectedEnvironment.dataPolicy.deniedPatterns.map((pattern, idx) => (
                          <div key={idx} className="px-2 py-1 bg-red-50 text-red-700 text-sm rounded">
                            {pattern}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active Deployment Jobs */}
          {deploymentJobs.filter(job => job.status === 'running').length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Deployments</h2>
              <div className="space-y-4">
                {deploymentJobs
                  .filter(job => job.status === 'running')
                  .map((job) => {
                    const env = environments.find(e => e.id === job.environmentId);
                    return (
                      <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">
                            Deploying to {env?.name || 'Unknown'}
                          </h3>
                          <span className="text-sm text-gray-600">
                            {job.recordsDeployed.toLocaleString()} / {job.recordsProcessed.toLocaleString()} records
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{job.progress}%</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}