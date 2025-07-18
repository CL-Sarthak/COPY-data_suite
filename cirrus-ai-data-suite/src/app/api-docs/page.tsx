'use client';

import AppLayout from '@/components/AppLayout';
import { 
  CodeBracketIcon,
  LockClosedIcon,
  BeakerIcon,
  CogIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function ApiDocsPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            API Documentation
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Data Preparedness Studio REST API
          </p>
          <p className="text-gray-500 max-w-3xl mx-auto">
            Complete reference for integrating with the Data Preparedness Studio platform. 
            Build custom applications using our comprehensive API for data discovery, transformation, 
            pattern detection, synthetic data generation, and automated pipeline orchestration.
          </p>
        </div>

        {/* Quick Start */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CodeBracketIcon className="h-6 w-6 mr-2 text-blue-600" />
            Quick Start
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Base URL</h3>
              <div className="bg-gray-800 text-gray-100 p-3 rounded-lg font-mono text-sm">
                https://your-app.vercel.app/api
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Content Type</h3>
              <div className="bg-gray-800 text-gray-100 p-3 rounded-lg font-mono text-sm">
                application/json
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Example Request</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
{`curl -X GET "https://your-app.vercel.app/api/data-sources" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>
          </div>
        </div>

        {/* Core Endpoints */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          
          {/* Database Connections API */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <CircleStackIcon className="h-5 w-5 mr-2 text-blue-600" />
              Database Connections API
            </h2>
            
            <div className="space-y-4">
              <EndpointCard
                method="GET"
                path="/api/database-connections"
                description="List all database connections"
                response="Array of database connection objects"
              />
              <EndpointCard
                method="POST"
                path="/api/database-connections"
                description="Create a new database connection"
                requestBody={{
                  name: "string",
                  type: "postgres | mysql",
                  host: "string",
                  port: "number",
                  database: "string",
                  username: "string",
                  password: "string"
                }}
              />
              <EndpointCard
                method="POST"
                path="/api/database-connections/test"
                description="Test database connection"
                requestBody={{
                  type: "postgres | mysql",
                  host: "string",
                  port: "number",
                  database: "string",
                  username: "string",
                  password: "string"
                }}
              />
              <EndpointCard
                method="GET"
                path="/api/database-connections/{id}/schema"
                description="Get database schema with tables and columns"
                response="Schema object with tables, columns, and foreign keys"
              />
              <EndpointCard
                method="POST"
                path="/api/database-connections/{id}/import"
                description="Import data from database table"
                requestBody={{
                  tableName: "string",
                  limit: "number (optional)",
                  mode: "full | relational (optional)",
                  primaryTable: "string (for relational mode)",
                  maxDepth: "number (optional)"
                }}
              />
            </div>
          </div>

          {/* API Connections */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <ArrowPathIcon className="h-5 w-5 mr-2 text-green-600" />
              API Connections
            </h2>
            
            <div className="space-y-4">
              <EndpointCard
                method="GET"
                path="/api/api-connections"
                description="List all API connections"
                response="Array of API connection objects"
              />
              <EndpointCard
                method="POST"
                path="/api/api-connections"
                description="Create a new API connection"
                requestBody={{
                  name: "string",
                  url: "string",
                  method: "GET | POST",
                  authType: "none | apiKey | bearer | basic",
                  authConfig: "object (auth details)",
                  headers: "object (optional)",
                  queryParams: "object (optional)",
                  refreshInterval: "number (minutes, optional)"
                }}
              />
              <EndpointCard
                method="POST"
                path="/api/api-connections/test"
                description="Test API connection"
                requestBody={{
                  url: "string",
                  method: "GET | POST",
                  authType: "string",
                  authConfig: "object",
                  headers: "object",
                  queryParams: "object"
                }}
              />
              <EndpointCard
                method="POST"
                path="/api/api-connections/{id}/import"
                description="Import data from API"
                requestBody={{
                  extractPath: "string (JSONPath, optional)"
                }}
              />
              <EndpointCard
                method="POST"
                path="/api/api-connections/refresh"
                description="Refresh all API connections"
                response="Array of refresh results"
              />
            </div>
          </div>

          {/* Inbound API */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <ArrowPathIcon className="h-5 w-5 mr-2 text-purple-600" />
              Inbound API
            </h2>
            
            <div className="space-y-4">
              <EndpointCard
                method="GET"
                path="/api/inbound-connections"
                description="List all inbound API endpoints"
                response="Array of inbound API configurations"
              />
              <EndpointCard
                method="POST"
                path="/api/inbound-connections"
                description="Create a new inbound API endpoint"
                requestBody={{
                  name: "string",
                  description: "string (optional)",
                  dataMode: "append | replace",
                  customUrl: "string (optional)",
                  apiKeyHeader: "string (default: X-API-Key)",
                  requireApiKey: "boolean (default: true)"
                }}
              />
              <EndpointCard
                method="PUT"
                path="/api/inbound-connections/{id}"
                description="Update inbound API configuration"
                requestBody={{
                  name: "string",
                  description: "string",
                  dataMode: "append | replace",
                  customUrl: "string",
                  requireApiKey: "boolean"
                }}
              />
              <EndpointCard
                method="POST"
                path="/api/inbound/{apiKey}"
                description="Push data to inbound endpoint (legacy URL)"
                requestBody={{
                  "any": "JSON data to ingest"
                }}
                response="Success message with records processed count"
              />
              <EndpointCard
                method="POST"
                path="/api/inbound/{customUrl}"
                description="Push data to inbound endpoint (custom URL)"
                requestBody={{
                  "any": "JSON data to ingest"
                }}
                response="Success message with records processed count"
              />
              <EndpointCard
                method="GET"
                path="/api/inbound-connections/updates"
                description="Server-Sent Events endpoint for real-time updates"
                response="SSE stream with connection updates"
              />
            </div>
          </div>
          
          {/* Pipeline API */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <CogIcon className="h-5 w-5 mr-2 text-indigo-600" />
              Pipeline API
            </h2>
            
            <div className="space-y-4">
              <EndpointCard
                method="GET"
                path="/api/pipelines"
                description="List all pipelines"
                response="Array of pipeline objects with configurations"
              />
              <EndpointCard
                method="POST"
                path="/api/pipelines"
                description="Create a new pipeline"
                requestBody={{
                  name: "string",
                  description: "string",
                  nodes: "array",
                  edges: "array"
                }}
              />
              <EndpointCard
                method="POST"
                path="/api/pipelines/{id}/execute"
                description="Execute a pipeline"
                requestBody={{
                  triggeredBy: "string",
                  context: "object (optional)"
                }}
              />
              <EndpointCard
                method="GET"
                path="/api/pipelines/{id}/execution/{executionId}"
                description="Get pipeline execution status"
                response="Execution progress, metrics, and current status"
              />
              <EndpointCard
                method="GET"
                path="/api/pipelines/{id}/lineage"
                description="Get data lineage information"
                response="Complete source-to-output lineage with transformations"
              />
            </div>
          </div>
          
          {/* Data Sources API */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <CircleStackIcon className="h-5 w-5 mr-2 text-blue-600" />
              Data Sources API
            </h2>
            
            <div className="space-y-4">
              <EndpointCard
                method="GET"
                path="/api/data-sources"
                description="List all data sources"
                response="Array of data source objects with metadata"
              />
              <EndpointCard
                method="POST"
                path="/api/data-sources"
                description="Create a new data source"
                requestBody={{
                  name: "string",
                  type: "filesystem | database | api",
                  configuration: "object",
                  files: "array (for file uploads)"
                }}
              />
              <EndpointCard
                method="GET"
                path="/api/data-sources/{id}"
                description="Get specific data source details"
              />
              <EndpointCard
                method="GET"
                path="/api/data-sources/{id}/schema"
                description="Get data source schema and structure"
              />
              <EndpointCard
                method="GET"
                path="/api/data-sources/{id}/transform"
                description="Transform data to unified JSON format with pagination support"
                queryParams={{
                  page: "number (default: 1)",
                  pageSize: "number (default: 10)", 
                  skipPagination: "boolean (optional, return all records)"
                }}
                response="Transformed data catalog with records and pagination metadata"
              />
            </div>
          </div>

          {/* Pattern Detection API */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-green-600" />
              Pattern Detection API
            </h2>
            
            <div className="space-y-4">
              <EndpointCard
                method="GET"
                path="/api/patterns"
                description="List all defined patterns"
              />
              <EndpointCard
                method="POST"
                path="/api/patterns"
                description="Create a new detection pattern"
                requestBody={{
                  name: "string",
                  pattern: "string (regex)",
                  description: "string",
                  type: "pii | custom"
                }}
              />
              <EndpointCard
                method="POST"
                path="/api/patterns/test"
                description="Test pattern against sample text"
                requestBody={{
                  pattern: "string",
                  testText: "string"
                }}
              />
              <EndpointCard
                method="POST"
                path="/api/ml/detect"
                description="ML-powered entity detection"
                requestBody={{
                  text: "string"
                }}
                response="Detected entities with confidence scores and match positions"
              />
              <EndpointCard
                method="GET"
                path="/api/ml/status"
                description="Get ML provider configuration status"
                response="ML configuration details including provider and API key status"
              />
            </div>
          </div>

          {/* Synthetic Data API */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
              Synthetic Data API
            </h2>
            
            <div className="space-y-4">
              <EndpointCard
                method="GET"
                path="/api/synthetic"
                description="List all synthetic datasets"
              />
              <EndpointCard
                method="POST"
                path="/api/synthetic"
                description="Create new synthetic dataset"
                requestBody={{
                  name: "string",
                  description: "string",
                  schema: "object",
                  template: "string"
                }}
              />
              <EndpointCard
                method="POST"
                path="/api/synthetic/{id}/generate"
                description="Generate synthetic data"
              />
              <EndpointCard
                method="GET"
                path="/api/synthetic/{id}/download"
                description="Download generated synthetic data"
              />
            </div>
          </div>

          {/* Data Catalog API */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <ArrowPathIcon className="h-5 w-5 mr-2 text-orange-600" />
              Data Catalog API
            </h2>
            
            <div className="space-y-4">
              <EndpointCard
                method="GET"
                path="/api/catalog/fields"
                description="Get all catalog fields"
                queryParams={{
                  category: "string (optional)"
                }}
              />
              <EndpointCard
                method="POST"
                path="/api/catalog/mappings"
                description="Create field mapping"
                requestBody={{
                  sourceId: "string",
                  sourceFieldName: "string",
                  catalogFieldId: "string",
                  transformationRule: "string"
                }}
              />
              <EndpointCard
                method="GET"
                path="/api/catalog/suggestions"
                description="Get field mapping suggestions"
              />
            </div>
          </div>

        </div>

        {/* Authentication & Security */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <LockClosedIcon className="h-6 w-6 mr-2 text-red-600" />
            Authentication & Security
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">API Keys</h3>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Currently in development mode. Authentication will be required for production deployments.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <strong className="text-gray-800">Required Environment Variables:</strong>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    <li>• <code className="bg-gray-800 text-gray-100 px-2 py-1 rounded">ANTHROPIC_API_KEY</code> - For redaction functionality</li>
                    <li>• <code className="bg-gray-800 text-gray-100 px-2 py-1 rounded">DATABASE_URL</code> - For persistent storage</li>
                    <li>• <code className="bg-gray-800 text-gray-100 px-2 py-1 rounded">BLOB_READ_WRITE_TOKEN</code> - For Vercel Blob storage</li>
                    <li>• <code className="bg-gray-800 text-gray-100 px-2 py-1 rounded">GOOGLE_APPLICATION_CREDENTIALS_JSON</code> - For ML detection (optional)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Rate Limits</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-800">File Upload Size:</span>
                  <span className="font-mono text-gray-800">10MB (standard) / 4MB (Vercel)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-800">API Response Size:</span>
                  <span className="font-mono text-gray-800">50MB (standard) / 4MB (Vercel)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-800">Request Timeout:</span>
                  <span className="font-mono text-gray-800">30 seconds</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Handling */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <ShieldCheckIcon className="h-6 w-6 mr-2 text-red-600" />
            Error Handling
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">HTTP Status Codes</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-3">
                  <span className="bg-green-600 text-white px-2 py-1 rounded font-mono font-semibold">200</span>
                  <span className="text-gray-800">OK - Request successful</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-blue-600 text-white px-2 py-1 rounded font-mono font-semibold">201</span>
                  <span className="text-gray-800">Created - Resource created successfully</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-yellow-600 text-white px-2 py-1 rounded font-mono font-semibold">400</span>
                  <span className="text-gray-800">Bad Request - Invalid request parameters</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-red-600 text-white px-2 py-1 rounded font-mono font-semibold">404</span>
                  <span className="text-gray-800">Not Found - Resource does not exist</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-red-600 text-white px-2 py-1 rounded font-mono font-semibold">500</span>
                  <span className="text-gray-800">Internal Server Error</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Error Response Format</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                <pre className="text-sm">
{`{
  "error": "Validation failed",
  "message": "Missing required field: name",
  "details": {
    "field": "name",
    "code": "REQUIRED_FIELD_MISSING"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Code Examples */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <BeakerIcon className="h-6 w-6 mr-2 text-purple-600" />
            Code Examples
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">JavaScript/TypeScript</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
{`// Create a new data source
const response = await fetch('/api/data-sources', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Customer Data',
    type: 'filesystem',
    configuration: {
      files: [
        {
          name: 'customers.csv',
          content: 'base64-encoded-content',
          type: 'text/csv'
        }
      ]
    }
  }),
});

const dataSource = await response.json();
console.log('Created data source:', dataSource);

// Analyze with pattern detection
const analysisResponse = await fetch('/api/ml/detect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'John Doe, SSN: 123-45-6789, Email: john@example.com'
  }),
});

const analysis = await analysisResponse.json();
console.log('Detected patterns:', analysis.matches);

// Connect to a database
const dbConnection = await fetch('/api/database-connections', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Production Database',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'user',
    password: 'password'
  }),
});

const db = await dbConnection.json();
console.log('Connected to database:', db);

// Create an inbound API endpoint
const inboundResponse = await fetch('/api/inbound-connections', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Customer Data Webhook',
    dataMode: 'append',
    customUrl: 'customer-webhook',
    requireApiKey: true
  }),
});

const inbound = await inboundResponse.json();
console.log('Inbound endpoint created:', inbound.apiKey);

// Push data to inbound endpoint
const pushResponse = await fetch('/api/inbound/customer-webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': inbound.apiKey,
  },
  body: JSON.stringify({
    customers: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' }
    ]
  }),
});

console.log('Data pushed:', await pushResponse.json());`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Python</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
{`import requests
import json

# Create a new data source
data_source_data = {
    "name": "Customer Data",
    "type": "filesystem",
    "configuration": {
        "files": [
            {
                "name": "customers.csv",
                "content": "base64-encoded-content",
                "type": "text/csv"
            }
        ]
    }
}

response = requests.post(
    "https://your-app.vercel.app/api/data-sources",
    headers={"Content-Type": "application/json"},
    json=data_source_data
)

data_source = response.json()
print(f"Created data source: {data_source}")

# Generate synthetic data
synthetic_data = {
    "name": "Test Dataset",
    "schema": {
        "fields": [
            {"name": "customer_id", "type": "string"},
            {"name": "email", "type": "email"},
            {"name": "age", "type": "integer", "min": 18, "max": 80}
        ]
    },
    "recordCount": 1000
}

synthetic_response = requests.post(
    "https://your-app.vercel.app/api/synthetic",
    headers={"Content-Type": "application/json"},
    json=synthetic_data
)

synthetic_dataset = synthetic_response.json()
print(f"Created synthetic dataset: {synthetic_dataset}")

# Execute a pipeline
pipeline_execution = {
    "triggeredBy": "external_ml_system",
    "context": {
        "modelTrainingJob": "job_12345",
        "dataRequirements": {
            "format": "parquet",
            "size": "100GB",
            "privacy_level": "high"
        }
    }
}

execution_response = requests.post(
    f"https://your-app.vercel.app/api/pipelines/{pipeline_id}/execute",
    headers={"Content-Type": "application/json"},
    json=pipeline_execution
)

execution = execution_response.json()
print(f"Pipeline execution started: {execution}")`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CogIcon className="h-6 w-6 mr-2 text-indigo-600" />
            Advanced Features
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Batch Processing</h3>
              <p className="text-gray-600 text-sm mb-3">
                Process multiple data sources simultaneously for improved efficiency.
              </p>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-gray-800">
                <strong>Endpoint:</strong> <code className="bg-gray-800 text-gray-100 px-1 rounded">POST /api/data-sources/profile/batch</code>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Real-time Transformation</h3>
              <p className="text-gray-600 text-sm mb-3">
                Transform data formats on-the-fly with automatic schema detection.
              </p>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-gray-800">
                <strong>Endpoint:</strong> <code className="bg-gray-800 text-gray-100 px-1 rounded">GET /api/data-sources/&#123;id&#125;/transform</code>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Cross-field Analysis</h3>
              <p className="text-gray-600 text-sm mb-3">
                Automatically detect relationships between PII fields for comprehensive protection.
              </p>
              <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-gray-800">
                <strong>Feature:</strong> Enabled automatically in pattern detection
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Environment Adaptation</h3>
              <p className="text-gray-600 text-sm mb-3">
                Automatic optimization based on deployment environment (Vercel, local, enterprise).
              </p>
              <div className="bg-purple-50 border border-purple-200 p-3 rounded text-sm text-gray-800">
                <strong>Feature:</strong> Automatic file size and payload optimization
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">AIOps Integration</h3>
              <p className="text-gray-600 text-sm mb-3">
                External ML systems can trigger automated data preparation pipelines with monitoring and lineage tracking.
              </p>
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded text-sm text-gray-800">
                <strong>Endpoint:</strong> <code className="bg-gray-800 text-gray-100 px-1 rounded">POST /api/pipelines/&#123;id&#125;/execute</code>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Lineage Tracking</h3>
              <p className="text-gray-600 text-sm mb-3">
                Complete source-to-output data lineage with transformation details for compliance and governance.
              </p>
              <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-gray-800">
                <strong>Endpoint:</strong> <code className="bg-gray-800 text-gray-100 px-1 rounded">GET /api/pipelines/&#123;id&#125;/lineage</code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500">
          <p>© 2025 CirrusLabs. Complete API reference for the Data Preparedness Studio platform.</p>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}

interface EndpointCardProps {
  method: string;
  path: string;
  description: string;
  requestBody?: Record<string, string>;
  queryParams?: Record<string, string>;
  response?: string;
}

function EndpointCard({ method, path, description, requestBody, queryParams, response }: EndpointCardProps) {
  const methodColors = {
    GET: 'bg-green-600 text-white',
    POST: 'bg-blue-600 text-white',
    PUT: 'bg-yellow-600 text-white',
    DELETE: 'bg-red-600 text-white',
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center space-x-3 mb-2">
        <span className={`px-2 py-1 rounded text-xs font-medium ${methodColors[method as keyof typeof methodColors]}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-gray-700">{path}</code>
      </div>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      
      {requestBody && (
        <div className="mb-2">
          <strong className="text-xs text-gray-700">Request Body:</strong>
          <div className="bg-gray-800 text-gray-100 p-2 rounded text-xs font-mono mt-1">
            {JSON.stringify(requestBody, null, 2)}
          </div>
        </div>
      )}
      
      {queryParams && (
        <div className="mb-2">
          <strong className="text-xs text-gray-700">Query Parameters:</strong>
          <div className="bg-gray-800 text-gray-100 p-2 rounded text-xs font-mono mt-1">
            {JSON.stringify(queryParams, null, 2)}
          </div>
        </div>
      )}
      
      {response && (
        <div>
          <strong className="text-xs text-gray-700">Response:</strong>
          <p className="text-xs text-gray-700 mt-1">{response}</p>
        </div>
      )}
    </div>
  );
}