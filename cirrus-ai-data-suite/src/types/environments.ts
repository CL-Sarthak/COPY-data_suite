export interface Environment {
  id: string;
  name: string;
  type: 'production' | 'uat' | 'test' | 'development';
  securityLevel: 'top-secret' | 'secret' | 'confidential' | 'unclassified';
  deploymentTarget: DeploymentTarget;
  dataPolicy: DataPolicy;
  status: 'active' | 'syncing' | 'error' | 'inactive';
  lastSync?: Date;
  recordCount?: number;
}

export interface DeploymentTarget {
  type: 'cloud' | 'on-premise' | 'hybrid' | 'air-gapped';
  provider?: 'aws' | 'azure' | 'gcp' | 'private';
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKey?: string;
    secretKey?: string;
    connectionString?: string;
  };
}

export interface DataPolicy {
  redactionLevel: 'none' | 'minimal' | 'standard' | 'maximum';
  syntheticDataOnly: boolean;
  allowedPatterns: string[];
  deniedPatterns: string[];
  retentionDays: number;
  encryptionRequired: boolean;
  auditLogging: boolean;
}

export interface DeploymentJob {
  id: string;
  environmentId: string;
  sourceDataset: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  progress: number;
  recordsProcessed: number;
  recordsDeployed: number;
  errorMessage?: string;
}

export interface EnvironmentSync {
  environmentId: string;
  lastSyncTime: Date;
  nextScheduledSync?: Date;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  dataSources: string[];
  transformations: DataTransformation[];
}

export interface DataTransformation {
  type: 'redact' | 'synthesize' | 'filter' | 'aggregate';
  configuration: {
    patterns?: string[];
    privacyLevel?: string;
    aggregationLevel?: number;
    filterCriteria?: Record<string, unknown>;
  };
}

export interface EnvironmentCompliance {
  environmentId: string;
  complianceFrameworks: ComplianceFramework[];
  validationResults: ValidationResult[];
  lastAudit: Date;
  nextAudit: Date;
}

export interface ComplianceFramework {
  name: 'HIPAA' | 'GDPR' | 'SOC2' | 'ISO27001' | 'NIST' | 'FedRAMP';
  status: 'compliant' | 'non-compliant' | 'pending';
  requirements: string[];
  violations: string[];
}

export interface ValidationResult {
  ruleName: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  timestamp: Date;
}