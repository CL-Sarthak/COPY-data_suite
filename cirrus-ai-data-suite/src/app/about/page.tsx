'use client';

import AppLayout from '@/components/AppLayout';
import { 
  ShieldCheckIcon, 
  SparklesIcon, 
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CloudIcon,
  CpuChipIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Data Preparedness Studio
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            AI Data Suite by CirrusLabs
          </p>
          <p className="text-gray-500 max-w-3xl mx-auto">
            A comprehensive platform for discovering, analyzing, redacting, and synthesizing data 
            to ensure privacy compliance and optimize AI data readiness. Features visual pipeline 
            orchestration that automates the complete data preparation workflow from discovery to deployment.
          </p>
        </div>

        {/* Implementation Status Overview */}
        <div className="bg-blue-50 rounded-xl p-6 mb-12 border border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Implementation Status</h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-green-700 mb-2">✅ Fully Implemented</h3>
              <ul className="space-y-1 text-gray-700">
                <li>• Data Discovery & File Upload</li>
                <li>• Pattern Detection (PII/Sensitive Data)</li>
                <li>• Pattern Feedback & Auto-refinement</li>
                <li>• Data Transformation & Redaction</li>
                <li>• Global Data Catalog</li>
                <li>• Visual Pipeline Builder</li>
                <li>• Multi-format File Support</li>
                <li>• Database Persistence (PostgreSQL)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-700 mb-2">🚧 Partially Implemented</h3>
              <ul className="space-y-1 text-gray-700">
                <li>• Synthetic Data Generation (LLM integration ready)</li>
                <li>• Authentication (basic implementation)</li>
                <li>• Monitoring & Logging (console-based)</li>
                <li>• ML Pattern Detection (simulated mode)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-orange-700 mb-2">📋 Under Development</h3>
              <ul className="space-y-1 text-gray-700">
                <li>• Cross-field Relationship Analysis</li>
                <li>• AIOps Integration & Automation</li>
                <li>• Advanced Authentication & RBAC</li>
                <li>• Comprehensive Audit Logging</li>
                <li>• Custom ML Model Integration</li>
                <li>• Real-time Monitoring Dashboard</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Key Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
          <FeatureCard
            icon={MagnifyingGlassIcon}
            title="Data Discovery"
            description="Automatically analyze and profile data sources to understand structure, patterns, and sensitive information"
          />
          <FeatureCard
            icon={ShieldCheckIcon}
            title="Pattern Detection"
            description="Intelligent PII detection with context-aware pattern recognition and cross-field relationship analysis"
          />
          <FeatureCard
            icon={SparklesIcon}
            title="Synthetic Data"
            description="Generate realistic synthetic datasets that preserve statistical properties while protecting privacy"
          />
          <FeatureCard
            icon={ArrowPathIcon}
            title="Data Assembly"
            description="Transform and combine multiple data sources into unified, AI-ready training datasets"
          />
          <FeatureCard
            icon={CpuChipIcon}
            title="Pipeline Builder"
            description="Visual workflow orchestration that automates data preparation tasks from discovery to deployment"
          />
        </div>

        {/* Core Capabilities */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Core Capabilities</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-blue-600" />
                Data Discovery & Analysis
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Automated data source profiling and schema detection</li>
                <li>• Statistical analysis and data quality assessment</li>
                <li>• File format support: CSV, JSON, PDF, DOCX, XLSX</li>
                <li>• Database connectivity and API integration</li>
                <li>• Real-time data validation and anomaly detection</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
                Privacy & Compliance
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Advanced PII detection (SSN, emails, phone numbers)</li>
                <li>• Context-aware pattern recognition</li>
                <li>• Cross-field relationship detection</li>
                <li>• GDPR, HIPAA, and CCPA compliance frameworks</li>
                <li>• Configurable redaction and anonymization rules</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <CpuChipIcon className="h-5 w-5 mr-2 text-purple-600" />
                Pipeline Automation
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Visual workflow builder with drag-and-drop nodes</li>
                <li>• Integration with existing data sources and patterns</li>
                <li>• Environment deployment with quality gates</li>
                <li>• ML framework compatibility (TensorFlow, PyTorch)</li>
                <li>• AIOps integration for automated execution</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Architecture Overview */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">System Architecture</h2>
          
          {/* High-Level Architecture */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">System Design</h3>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-gray-700 mb-4">
                The Data Preparedness Studio follows a microservices-inspired architecture with clear separation 
                of concerns, built on Next.js 15 with server-side API routes and client-side React components.
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <CloudIcon className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  <h4 className="font-semibold text-gray-800 mb-2">Presentation Layer</h4>
                  <p className="text-gray-600 text-sm">
                    React components with TypeScript, Tailwind CSS, and responsive design
                  </p>
                </div>
                <div className="text-center">
                  <CpuChipIcon className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                  <h4 className="font-semibold text-gray-800 mb-2">Business Logic</h4>
                  <p className="text-gray-600 text-sm">
                    Service layer with domain-specific operations and external API integrations
                  </p>
                </div>
                <div className="text-center">
                  <CircleStackIcon className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h4 className="font-semibold text-gray-800 mb-2">Data Layer</h4>
                  <p className="text-gray-600 text-sm">
                    Multi-provider storage with TypeORM entities and automated migrations
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Architecture */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Storage Architecture</h3>
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Multi-Provider Storage System</h4>
                <p className="text-gray-600 mb-3">
                  Environment-aware storage abstraction that automatically selects optimal providers:
                </p>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded">
                    <strong className="text-blue-800">Development:</strong>
                    <p className="text-gray-600">Local filesystem storage in ./data/storage with direct file serving via API routes</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <strong className="text-green-800">Production (Vercel):</strong>
                    <p className="text-gray-600">Vercel Blob storage with global CDN, public URLs, and automatic metadata handling</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <strong className="text-purple-800">Enterprise:</strong>
                    <p className="text-gray-600">AWS S3 or S3-compatible storage with signed URLs and custom endpoint support</p>
                  </div>
                </div>
              </div>
              
              <div className="border-l-4 border-green-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Database Layer</h4>
                <p className="text-gray-600 mb-3">
                  TypeORM-based data persistence with automatic environment detection:
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• <strong>Development:</strong> SQLite with file persistence (./data/app.db)</li>
                  <li>• <strong>Production:</strong> PostgreSQL/MySQL via DATABASE_URL or in-memory SQLite fallback</li>
                  <li>• <strong>Migrations:</strong> Automatic schema management with versioned migrations</li>
                  <li>• <strong>Entities:</strong> TypeScript decorators for type-safe database operations</li>
                </ul>
              </div>

              <div className="border-l-4 border-orange-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">File Processing Pipeline</h4>
                <p className="text-gray-600 mb-3">
                  Hybrid approach separating metadata and content for optimal performance:
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• <strong>Metadata:</strong> Stored in database (filename, size, type, relationships)</li>
                  <li>• <strong>Content:</strong> Stored in external storage with generated keys</li>
                  <li>• <strong>Truncation:</strong> Large files automatically truncated for database efficiency</li>
                  <li>• <strong>Streaming:</strong> Direct file serving from storage providers</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ML and AI Integration */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">AI & Machine Learning Integration</h3>
            <div className="space-y-6">
              <div className="border-l-4 border-purple-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Pattern Detection Engine</h4>
                <p className="text-gray-600 mb-3">
                  Multi-layered approach combining rule-based and ML-based detection:
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-purple-800">Field-Aware Detection:</strong>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Column name analysis (SSN, email, phone patterns)</li>
                      <li>• Data type inference and validation</li>
                      <li>• Statistical analysis for anomaly detection</li>
                      <li>• Cross-field relationship discovery</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-purple-800">Context-Aware Analysis:</strong>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Natural language processing for unstructured data</li>
                      <li>• Document analysis (PDF, DOCX content extraction)</li>
                      <li>• Contextual PII identification</li>
                      <li>• False positive reduction algorithms</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-indigo-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">External ML Services</h4>
                <p className="text-gray-600 mb-3">
                  Configurable integration with external ML providers:
                </p>
                <div className="bg-indigo-50 p-4 rounded">
                  <ul className="text-gray-700 text-sm space-y-2">
                    <li><strong>Google Cloud AI:</strong> Advanced NLP and entity recognition via Vertex AI</li>
                    <li><strong>Simulated Mode:</strong> Built-in pattern recognition for development and testing</li>
                    <li><strong>Custom Models:</strong> REST API integration for proprietary ML services</li>
                    <li><strong>Batch Processing:</strong> Asynchronous analysis for large datasets</li>
                  </ul>
                </div>
              </div>

              <div className="border-l-4 border-pink-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Synthetic Data Generation</h4>
                <p className="text-gray-600 mb-3">
                  AI-powered synthetic data creation preserving statistical properties:
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• <strong>Schema Analysis:</strong> Automatic detection of data relationships and constraints</li>
                  <li>• <strong>LLM Integration:</strong> Multi-provider support (Anthropic, OpenAI, Vertex AI) for intelligent data generation</li>
                  <li>• <strong>Distribution Preservation:</strong> Maintaining statistical characteristics of original data</li>
                  <li>• <strong>Privacy Protection:</strong> Ensuring no direct correlation to source records</li>
                  <li>• <strong>Format Flexibility:</strong> JSON, CSV, and structured output generation</li>
                </ul>
              </div>
            </div>
          </div>

          {/* API Architecture */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">API Architecture</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">RESTful API Design</h4>
                <p className="text-gray-700 text-sm mb-3">
                  Next.js API routes providing a comprehensive REST interface:
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-gray-800">Core Resources:</strong>
                    <ul className="text-gray-700 mt-1 space-y-1">
                      <li>• /api/data-sources - CRUD operations for data sources</li>
                      <li>• /api/patterns - Pattern definition and testing</li>
                      <li>• /api/synthetic - Synthetic dataset management</li>
                      <li>• /api/sessions - User session and workflow tracking</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-gray-800">Processing Endpoints:</strong>
                    <ul className="text-gray-700 mt-1 space-y-1">
                      <li>• /api/ml/detect - ML-powered pattern detection</li>
                      <li>• /api/redact - Data redaction and anonymization</li>
                      <li>• /api/catalog - Global data catalog operations</li>
                      <li>• /api/profiling - Statistical data analysis</li>
                      <li>• /api/pipelines - Pipeline execution and monitoring</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Error Handling & Resilience</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• <strong>Graceful Degradation:</strong> Fallback modes for external service failures</li>
                  <li>• <strong>Rate Limiting:</strong> Built-in protection against API abuse</li>
                  <li>• <strong>Validation:</strong> TypeScript interfaces and runtime validation</li>
                  <li>• <strong>Monitoring:</strong> Health checks and database connectivity verification</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Security Architecture */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Security & Compliance</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-red-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Data Protection</h4>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• <strong>Encryption:</strong> HTTPS/TLS for all data in transit</li>
                  <li>• <strong>Storage Security:</strong> Provider-level encryption for data at rest</li>
                  <li>• <strong>Access Control:</strong> Environment-based authentication mechanisms</li>
                  <li>• <strong>Data Isolation:</strong> Session-based data separation and cleanup</li>
                </ul>
              </div>

              <div className="border-l-4 border-amber-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Compliance Features</h4>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• <strong>GDPR Compliance:</strong> Right to erasure and data portability</li>
                  <li>• <strong>HIPAA Support:</strong> Healthcare data handling with audit trails</li>
                  <li>• <strong>CCPA Readiness:</strong> California privacy regulation compliance</li>
                  <li>• <strong>Audit Logging:</strong> Comprehensive operation tracking and reporting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">AI/ML Training Data Preparation</h3>
              <p className="text-gray-600 mb-4">
                Prepare clean, compliant datasets for machine learning model training while ensuring 
                privacy protection and regulatory compliance.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Healthcare Data Management</h3>
              <p className="text-gray-600 mb-4">
                Process patient records and medical data with HIPAA-compliant PII detection and 
                synthetic data generation for research purposes.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Financial Services Compliance</h3>
              <p className="text-gray-600 mb-4">
                Ensure regulatory compliance for financial data while maintaining utility for 
                analytics and risk modeling applications.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Enterprise Data Governance</h3>
              <p className="text-gray-600 mb-4">
                Establish comprehensive data governance frameworks with automated discovery, 
                classification, and protection of sensitive information.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Implementation */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Technical Implementation</h2>
          
          {/* Frontend Architecture */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Frontend Architecture</h3>
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">React Component Architecture</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-blue-800">Core Components:</strong>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• <strong>DataSourceTable:</strong> File upload, analysis, and management</li>
                      <li>• <strong>RedactionProcess:</strong> Pattern detection and data anonymization</li>
                      <li>• <strong>SchemaAnalyzer:</strong> Automatic data structure discovery</li>
                      <li>• <strong>FileUpload:</strong> Multi-format file processing with drag-and-drop</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-blue-800">State Management:</strong>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• <strong>Context API:</strong> Authentication and global state</li>
                      <li>• <strong>React Hooks:</strong> Local component state and side effects</li>
                      <li>• <strong>SWR/React Query:</strong> Server state management and caching</li>
                      <li>• <strong>Session Storage:</strong> Workflow persistence across pages</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Styling & Design System</h4>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• <strong>Tailwind CSS v4:</strong> Utility-first CSS framework with custom CirrusLabs theme</li>
                  <li>• <strong>Heroicons:</strong> Consistent iconography throughout the application</li>
                  <li>• <strong>Responsive Design:</strong> Mobile-first approach with breakpoint optimization</li>
                  <li>• <strong>Color Palette:</strong> Blue (#2563eb), Gray scale, and semantic colors for status</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Backend Services */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Backend Service Layer</h3>
            <div className="space-y-6">
              <div className="border-l-4 border-purple-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Service Architecture</h4>
                <div className="bg-purple-50 p-4 rounded mb-3">
                  <p className="text-gray-700 text-sm mb-2">
                    Modular service layer with clear separation of concerns and dependency injection:
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-purple-800">Data Services:</strong>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• <strong>DataSourceService:</strong> File management and metadata operations</li>
                      <li>• <strong>DataProfilingService:</strong> Statistical analysis and data quality assessment</li>
                      <li>• <strong>DataTransformationService:</strong> ETL operations and format conversion</li>
                      <li>• <strong>StorageService:</strong> Multi-provider file storage abstraction</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-purple-800">Analysis Services:</strong>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• <strong>PatternService:</strong> PII detection and pattern matching</li>
                      <li>• <strong>MLPatternService:</strong> External ML service integration</li>
                      <li>• <strong>ContextAwarePatternService:</strong> Advanced context analysis</li>
                      <li>• <strong>SyntheticDataService:</strong> AI-powered data generation</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-indigo-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Database Operations</h4>
                <div className="space-y-3">
                  <div className="bg-indigo-50 p-3 rounded">
                    <strong className="text-indigo-800">TypeORM Integration:</strong>
                    <ul className="text-gray-600 text-sm mt-1 space-y-1">
                      <li>• Entity-based data modeling with TypeScript decorators</li>
                      <li>• Automatic migration system with versioned schema changes</li>
                      <li>• Repository pattern for type-safe database operations</li>
                      <li>• Connection pooling and query optimization</li>
                    </ul>
                  </div>
                  <div className="text-sm">
                    <strong className="text-gray-800">Key Entities:</strong>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• <strong>DataSourceEntity:</strong> File metadata and storage references</li>
                      <li>• <strong>PatternEntity:</strong> Detection rules and configuration</li>
                      <li>• <strong>SyntheticDataset:</strong> Generated dataset metadata and jobs</li>
                      <li>• <strong>AnnotationSession:</strong> User workflow and analysis sessions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* File Processing Pipeline */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">File Processing Pipeline</h3>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Multi-Format Support</h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong className="text-gray-800">Structured Data:</strong>
                    <ul className="text-gray-700 mt-1 space-y-1">
                      <li>• CSV: Delimiter detection, encoding handling</li>
                      <li>• JSON: Nested object flattening, schema inference</li>
                      <li>• Excel: Multi-sheet processing, formula evaluation</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-gray-800">Documents:</strong>
                    <ul className="text-gray-700 mt-1 space-y-1">
                      <li>• PDF: Text extraction with pdf-parse library</li>
                      <li>• DOCX: Document structure preservation</li>
                      <li>• TXT: Encoding detection and normalization</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-gray-800">Processing:</strong>
                    <ul className="text-gray-700 mt-1 space-y-1">
                      <li>• Stream processing for large files</li>
                      <li>• Chunked analysis for memory efficiency</li>
                      <li>• Error recovery and partial processing</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-orange-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Content Analysis Pipeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <div className="text-gray-800">
                      <strong className="text-gray-900">Ingestion:</strong> File upload, format detection, and initial validation
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <div className="text-gray-800">
                      <strong className="text-gray-900">Parsing:</strong> Content extraction and structure analysis
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <div className="text-gray-800">
                      <strong className="text-gray-900">Profiling:</strong> Statistical analysis and data quality assessment
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                    <div className="text-gray-800">
                      <strong className="text-gray-900">Pattern Detection:</strong> PII identification and classification
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                    <div className="text-gray-800">
                      <strong className="text-gray-900">Storage:</strong> Metadata persistence and content archival
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance & Scalability */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Performance & Scalability</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Optimization Strategies</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-green-800">Frontend Optimization:</strong>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Code splitting with Next.js dynamic imports</li>
                      <li>• Image optimization with Next.js Image component</li>
                      <li>• Virtual scrolling for large datasets</li>
                      <li>• Debounced search and filtering</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-green-800">Backend Optimization:</strong>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Streaming file processing for memory efficiency</li>
                      <li>• Database connection pooling and query optimization</li>
                      <li>• CDN integration for static asset delivery</li>
                      <li>• Caching strategies for expensive operations</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-yellow-500 pl-6">
                <h4 className="font-semibold text-gray-800 mb-2">Scalability Considerations</h4>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• <strong>Serverless Architecture:</strong> Auto-scaling with Vercel&apos;s serverless functions</li>
                  <li>• <strong>Stateless Design:</strong> Session-based processing without server-side state</li>
                  <li>• <strong>Horizontal Scaling:</strong> Multi-region deployment capability</li>
                  <li>• <strong>Load Balancing:</strong> Automatic traffic distribution across edge nodes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Advanced Features</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Hybrid Pattern Detection</h3>
              <p className="text-gray-600">
                Combines field-aware detection for structured data with context-aware analysis for unstructured content, 
                achieving 95%+ accuracy while minimizing false positives through machine learning and rule-based validation.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Cross-Field Relationship Analysis</h3>
              <p className="text-gray-600">
                Automatically identifies related PII fields (e.g., SSN + Name + DOB) using correlation analysis and 
                semantic understanding to ensure comprehensive protection of connected sensitive information.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Multi-Environment Storage Abstraction</h3>
              <p className="text-gray-600">
                Environment-aware storage system with provider auto-detection, seamless failover, and unified API 
                supporting local filesystem, Vercel Blob, AWS S3, and custom storage solutions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Real-Time Data Transformation</h3>
              <p className="text-gray-600">
                Streaming data processing pipeline with live schema detection, automatic field mapping, and 
                incremental transformation supporting real-time data preparation workflows.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Intelligent Data Annotation</h3>
              <p className="text-gray-600">
                Advanced annotation interface with instant pattern highlighting, pagination for large datasets (100k+ records), 
                and optional ML-powered detection. Features pattern feedback system with auto-refinement after user input.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Global Data Catalog</h3>
              <p className="text-gray-600">
                Centralized metadata repository with field-level lineage tracking, automated tagging, and 
                cross-dataset relationship discovery for enterprise data governance.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Visual Pipeline Orchestration</h3>
              <p className="text-gray-600">
                Drag-and-drop pipeline builder that transforms manual data preparation workflows into automated, 
                repeatable processes. Connects to existing data sources, patterns, and environments for seamless integration.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">AIOps Integration Ready</h3>
              <p className="text-gray-600">
                RESTful API architecture enabling external ML systems to trigger automated data preparation pipelines, 
                with comprehensive monitoring, lineage tracking, and compliance reporting for enterprise AI operations.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500">
          <p>© 2025 CirrusLabs. Built with privacy and compliance at the core.</p>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
      <Icon className="h-8 w-8 text-blue-600 mb-4" />
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}