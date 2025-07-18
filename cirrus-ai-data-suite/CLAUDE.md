# Development Notes for Cirrus Data Suite

## Creating Demo Pages

### Quick Start
To create a demo page with watermark and badge:

```tsx
'use client';

import AppLayout from '@/components/AppLayout';
import { DemoWatermark, DemoBadge, useDemoPage } from '@/components/DemoWatermark';

export default function YourDemoPage() {
  const demoPageProps = useDemoPage();

  return (
    <AppLayout>
      <DemoWatermark />
      
      <div className="p-8" {...demoPageProps}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Your Feature Name</h1>
            <DemoBadge />
          </div>
          {/* Your demo content here */}
        </div>
      </div>
    </AppLayout>
  );
}
```

### Components Available

1. **DemoWatermark** - Adds diagonal "DEMO" text pattern across entire viewport
   - Props: `text`, `opacity`, `patternSize`, `fontSize`
   - Default: Shows "DEMO" at 3% opacity

2. **DemoBadge** - Orange badge to place next to titles
   - Props: `text`, `colorClasses`
   - Default: Orange "DEMO" badge

3. **useDemoPage** - Hook that returns props for your content container
   - Ensures content appears above watermark (z-index management)

### Best Practices
- Always place `<DemoWatermark />` as the first child after `<AppLayout>`
- Use `{...demoPageProps}` on your main content div
- Add `<DemoBadge />` next to your page title
- Keep demo data realistic but clearly marked as demonstration

## Next Development Session Priority

### Visual Data Pipeline Editor
**Goal**: Enable no-code/low-code data transformation workflows
- **Visual Pipeline Builder**
  - Drag-and-drop workflow designer (extend existing ReactFlow implementation)
  - Multi-step transformation chains
  - Conditional logic and branching
  - Real-time preview of transformations
- **Pre-built Transformation Nodes**
  - Data cleaning, filtering, aggregation
  - Format conversions
  - Field mapping and renaming
  - Custom code nodes (Python/JavaScript)
- **Pipeline Features**
  - Save and reuse pipeline templates
  - Version control for pipelines
  - Schedule pipeline execution
  - Export pipelines as code
- **Implementation**: Extend existing pipeline infrastructure with visual editor
- **Effort**: Large (3-4 weeks)

## Recently Completed Features

### Metadata Context & Global Querying - COMPLETED (July 14, 2025)
**Goal**: Enable natural language queries across all datasets with rich contextual understanding
- **Phase 1: Data Source Summaries - COMPLETED (July 9, 2025)**
  - ✅ Add LLM-generated summary field to data_source_entity table
  - ✅ Create UI for viewing/editing summaries in discovery page
  - ✅ Add API endpoint for generating summaries via LLM
  - ✅ Store user edits and track versions
  - ✅ Interactive AI Q&A modal for data exploration
- **Phase 2: Table-Level Summaries - COMPLETED (July 9, 2025)**
  - ✅ Created data_source_tables entity and migration
  - ✅ Auto-detect tables/sheets in multi-table sources
  - ✅ Generate summaries for each table during import
  - ✅ UI for viewing/editing table descriptions
  - ✅ API endpoints for table summary generation
- **Phase 3: Field Annotations - COMPLETED (July 10, 2025)**
  - ✅ Created field_annotations table with migration
  - ✅ UI for adding purpose/notes to any field
  - ✅ Support for all data source types (files, APIs, databases)
  - ✅ PII auto-detection for common patterns
  - ✅ Business glossary integration
- **Phase 4: Global Query Interface - COMPLETED (July 14, 2025)**
  - ✅ Created query page at /query with natural language input
  - ✅ LLM integration generates structured queries from questions
  - ✅ "Explain Methodology" checkbox to show/hide query explanations
  - ✅ Table-level joins within single data sources working
  - ✅ Fixed field resolution for joined queries
  - ✅ Intelligent multi-source query support with relationship analysis
  - ✅ Related data sources can be joined based on keywords, domain, and naming patterns
  - ✅ Unrelated sources are prevented from being joined to maintain data integrity
  - ✅ Comprehensive test coverage for relationship detection logic

### API Data Source Refresh Issue - COMPLETED (July 10, 2025)
**Status**: Fixed - Transformation state is now preserved during API data source refresh
- ✅ Refresh now fetches new data and re-applies existing transformation
- ✅ Field mappings, data types, and transformation settings are preserved
- ✅ Transformation only lost if data structure changes significantly

### Pattern Generation Improvements - COMPLETED (July 10, 2025)
**Status**: Fixed - Pattern generation now creates generalized regex patterns
- ✅ Patterns now match format/structure instead of exact values
- ✅ Implemented smart pattern templates for common data types
- ✅ Improved regex generation for dates, SSNs, phone numbers, etc.

**Implementation Details for Multi-Source Queries**:
- Created SourceRelationshipService to analyze relationships between data sources
- Relationships scored based on: keywords (40%), business domain (30%), naming patterns (20%), data types (10%)
- Joins allowed for moderate to strong relationships or when strong domain evidence exists
- Query execution passes relationship analysis to LLM for context-aware query generation
- DataAnalysisService enhanced with performCrossSourceJoin method for legitimate cross-source operations
- Test coverage includes relationship detection, group analysis, and end-to-end query execution

## Recently Completed Features

### Database Connectors - COMPLETED (June 28, 2025)
**Feature**: Connect to external databases and import data
- ✅ Support for PostgreSQL and MySQL databases
- ✅ Connection testing and validation
- ✅ Schema discovery with table and column information
- ✅ Foreign key relationship detection
- ✅ Table preview functionality
- ✅ Import individual tables or use SQL queries
- ✅ Automatic refresh capability for keeping data in sync
- ✅ Relational import with foreign key traversal

### API Connectors - COMPLETED (July 7, 2025)
**Feature**: Connect to external REST APIs and import data
- ✅ Support for GET/POST requests with authentication
- ✅ API key, Bearer token, and Basic auth support
- ✅ Custom headers and query parameters
- ✅ Request/response preview for testing
- ✅ Automatic and manual refresh capabilities
- ✅ JSON path extraction for nested data
- ✅ Rate limiting and timeout configuration
- ✅ Pagination support (offset/limit and page-based)

### Inbound API - COMPLETED (July 8, 2025)
**Feature**: Create API endpoints for external systems to push data
- ✅ Generate unique API endpoints for data ingestion
- ✅ Custom URL support (e.g., /api/inbound/customer-data)
- ✅ Configurable API key authentication
- ✅ Flexible header configuration (X-API-Key, Authorization, etc.)
- ✅ Bearer token support
- ✅ Append or replace data modes
- ✅ Automatic JSON transformation
- ✅ Real-time request tracking with SSE
- ✅ Data source recreation on deletion
- ✅ Edit capability for endpoint configuration

### Cluster Detection for Relational Imports - COMPLETED (July 9, 2025)
**Feature**: Automatic cluster pattern detection during relational database imports
- ✅ Added `enableClusterDetection` checkbox to RelationalImportDialog
- ✅ Implemented cluster detection in import API route
- ✅ Created methods in ClusterPatternService to flatten relational data
- ✅ Pattern entities automatically created for detected clusters
- ✅ Discovery page shows notification when clusters are detected
- ✅ Comprehensive test coverage for the feature

**Implementation Details**:
- Flattens nested JSON structure to analyze all fields across related tables
- Detects common cluster patterns (Personal Identity, Address, Payment Card, etc.)
- Creates pattern entities that can be used for redaction
- Preserves table relationship information in pattern metadata

### AI-Powered Metadata System - Phases 1 & 2 COMPLETED (July 9, 2025)
**Feature**: Add AI-generated summaries and interactive Q&A for data sources and tables

**Phase 1 - Data Source Level**:
- ✅ Database schema updated with summary fields (migration 053)
- ✅ AI summary generation endpoint (`POST /api/data-sources/{id}/summary`)
- ✅ User-editable summaries with version tracking
- ✅ Interactive AI Q&A modal for asking questions about data
- ✅ Intelligent data fetching for accurate calculations
- ✅ Server-side statistics for large datasets
- ✅ Session persistence for conversations
- ✅ "Explain methodology" option for detailed answers
- ✅ Comprehensive API documentation created

**Phase 2 - Table Level**:
- ✅ Created data_source_tables entity (migration 054)
- ✅ Automatic table detection for multi-table sources (sheets, nested data)
- ✅ Table summary generation endpoint (`POST /api/data-sources/{id}/tables/{tableId}/summary`)
- ✅ Hierarchical UI showing tables within data sources
- ✅ Per-table AI summaries with edit capability
- ✅ Table detection integrated with transformation process

**Implementation Details**:
- AI summaries analyze data structure and content to provide business context
- Q&A system detects when more data is needed for accurate answers
- Server-side statistics prevent memory issues with large datasets
- Conversation context maintained across questions
- Modal UI with chat-style interface and auto-scroll
- Table detection supports Excel sheets, database tables, and nested JSON structures

### Relational Database Import - COMPLETED (July 3, 2025)
**Feature**: Full schema JSON generation by following foreign key relationships
- ✅ Created RelationalDataService to traverse foreign key relationships
- ✅ Updated import API to support relational imports with primary table selection
- ✅ Added RelationalImportDialog UI component for configuring relational imports
- ✅ Implemented nested JSON generation from related tables
- ✅ Added relationship analysis endpoint to preview connections
- ✅ Fixed circular reference handling to prevent 9000+ line JSON files
- ✅ Added formatted preview for nested objects and arrays
- ✅ Fixed redirect after import to go to discovery page
- ✅ Enhanced foreign key detection for PostgreSQL
- Users can now select a primary table and import related data as nested JSON documents

**Implementation Details**:
- Default max depth reduced to 2 to prevent exponential data growth
- Circular references return only ID and `_ref` field
- One-to-many relationships limited to 10 records at nested levels
- Reverse relationships (one-to-many) enabled by default
- Formatted preview shows expandable sections for nested data

## Important Development Guidelines

### ⚠️ HIGH PRIORITY: NEVER USE LIGHT GREY TEXT ON BUTTONS ⚠️
**CRITICAL**: ALL active buttons (clickable elements) MUST have high contrast text. STOP USING LIGHT GREY TEXT AT ALL TIMES!
- **Active buttons** MUST use `text-gray-900` (black text) on light backgrounds
- **Active buttons** MUST use `text-white` on colored backgrounds  
- **NEVER** use `text-gray-400`, `text-gray-500`, `text-gray-600` on active buttons
- **ONLY** use gray text for disabled states (`disabled:text-gray-400`)
- This is a RECURRING ISSUE that MUST be fixed every time it's found
- When creating ANY button, ALWAYS add `text-gray-900` or `text-white` explicitly

### UI Color Scheme Requirements
**CRITICAL**: All new UI components must follow the established color scheme:
- **Primary Blue**: `bg-blue-600` / `hover:bg-blue-700` for primary buttons and actions
- **Green**: `bg-green-600` / `hover:bg-green-700` for success/positive actions (like imports)
- **Red**: `bg-red-600` / `hover:bg-red-700` for destructive actions
- **Gray**: `border-gray-300`, `text-gray-600`, `bg-gray-50` for neutral elements
- **Info/Alert Colors**: 
  - Info: `bg-blue-50` with `text-blue-800`
  - Error: `bg-red-50` with `text-red-800`
  - Success: `bg-green-50` with `text-green-800`
- **Form Inputs**: Always use `border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500`
- **Shadows**: Use `shadow` for cards, `shadow-xl` for modals

**Modal Design Requirements**:
- **NEVER** use black backdrops (`bg-black bg-opacity-50`)
- **ALWAYS** use blur backdrop: `backdrop-blur-sm bg-gray-900/50`
- Modals should blur the background app, not hide it with black

**Button Text Contrast Requirements** ⚠️ HIGH PRIORITY ⚠️:
- **Active buttons** (clickable) must have high contrast text:
  - White background → Black text (`text-gray-900`)
  - NEVER use default/implicit text color - ALWAYS specify `text-gray-900`
  - Colored background → White text (`text-white`)
- **NEVER** use light gray text (`text-gray-400/500/600`) on active buttons
- Only use gray text for disabled states

**Code/Text Display Requirements**:
- **CRITICAL**: All displayed text content (URLs, API keys, code blocks) must use `text-gray-900` for maximum readability
- **NEVER** use default gray text for important information that users need to read/copy
- Code blocks and input fields must have black text: `text-gray-900`
- This is a recurring issue - always add `text-gray-900` to code/text displays

**DO NOT** use non-standard colors like purple, pink, or custom color values. Stick to the established palette.

## Known Development Issues

### TypeORM Metadata Loss in Next.js Development Mode
**Issue**: When running in development mode, Next.js hot module reloading can cause TypeORM to lose entity metadata, resulting in "No metadata for [Entity] was found" errors.

**Symptoms**:
- API calls return 500 errors with metadata errors
- Database operations fail even though tables exist
- Error persists until server restart

**Solution**: Restart the development server
```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

**Note**: This is a known limitation of using TypeORM with Next.js in development mode. Production deployments are not affected.

## Smoke Tests

Comprehensive smoke tests are available to verify all API operations:

```bash
# Run all smoke tests
npm run test:smoke

# Run specific smoke test file
npx jest --config jest.smoke.config.js src/__tests__/smoke/api-crud-operations.test.ts
```

Smoke tests cover:
- All CRUD operations for data sources, patterns, and other entities
- File upload functionality
- Data transformation
- API health checks
- Error handling

## Database Migrations

Migrations run at **build time** in production environments to ensure deployment fails if migrations fail.

### How It Works:
1. **All Environments**: 
   - PostgreSQL database with automatic migration system
   - Migrations run automatically on server startup
   - Run `npm run migrate:check` to test migration script
   
2. **Production Build**: 
   - `npm run build` runs migrations via `prebuild` script
   - If `DATABASE_URL` is not set, migrations are skipped
   - If migrations fail, the build fails (deployment is prevented)
   - Migration output visible in build logs
   
3. **Migration Tracking**:
   - Each migration is tracked in the database
   - Prevents duplicate runs across deployments
   - Runtime migrations are skipped when `SKIP_RUNTIME_MIGRATIONS=true`

### Important Notes:
- **Build fails if migrations fail** - This is intentional to prevent bad deployments
- Migration errors are visible in Vercel build logs
- All database columns use snake_case naming for PostgreSQL compatibility
- Migrations are automatically applied when developers start their development server

### Commands:
- `npm run migrate` - Run migrations manually
- `npm run migrate:check` - Test migration script without database
- `npm run build` - Automatically runs migrations before building

### Environment Variables:
- `DATABASE_URL` - PostgreSQL connection string (triggers build-time migrations)
- `DATABASE_SSL` - Set to `true` for SSL connections (default in Vercel)
- `SKIP_RUNTIME_MIGRATIONS` - Set to `true` to skip runtime migrations (auto-set by Vercel)
- `NODE_ENV` - Set to `production` for production deployments

## Test Documentation

For comprehensive testing information, see [TEST_DOCUMENTATION.md](./docs/TEST_DOCUMENTATION.md) which covers:
- Unit tests, integration tests, and smoke tests
- All test commands and configurations
- Best practices and troubleshooting
- CI/CD integration examples

## Backlog Items

**Note**: The main backlog has been moved to `/documentation/development/backlog.md` for better organization.

See the [Development Backlog](/documentation/development/backlog.md) for the complete feature roadmap and priorities.

### Recently Completed Features (Chronological Order)

#### June 2025 Completions (Early June)
1. **Fix TypeORM in Production** ✅ COMPLETED (June 13, 2025)
2. **File Upload Reliability** ✅ COMPLETED (June 13, 2025)
3. **Database Schema Management** ✅ IMPLEMENTED (June 13, 2025)
4. **Create Smoke Tests** ✅ COMPLETED (June 14, 2025)
5. **Test Coverage** ✅ COMPLETED (June 14, 2025)
   - Fixed all unit test failures (618 tests passing)
   - Separated unit tests from integration/smoke tests
   - npm test now only runs unit tests

#### June 2025 Completions
6. **Codebase Modularization** ✅ COMPLETED (June 18, 2025)
   - Implemented feature-based architecture in `/src/features/`
   - Created shared component library
   - Modularized all major features
   - Updated navigation to use new modular pages
7. **Environment Banner Branch Detection** ✅ COMPLETED (June 27, 2025)
   - Fixed branch detection in CI/CD environments
   - Improved git branch fallback logic
   - Deployed to main and production
8. **Database Connectors** ✅ COMPLETED (June 28, 2025)
   - PostgreSQL and MySQL support
   - Connection testing and validation
   - Schema discovery and table import
   - Relational imports with foreign key traversal

#### July 2025 Completions
9. **JSON Parsing Fix for Pattern Services** ✅ COMPLETED (July 2, 2025)
10. **Relational Database Import** ✅ COMPLETED (July 3, 2025)
11. **API Connectors** ✅ COMPLETED (July 7, 2025)
    - REST API integration with auth support
    - Automatic and manual refresh
    - Pagination and rate limiting
12. **Inbound API** ✅ COMPLETED (July 8, 2025)
    - Create endpoints for external data ingestion
    - Configurable authentication
    - Append/replace modes
13. **Cluster Detection for Relational Imports** ✅ COMPLETED (July 9, 2025)
    - Automatic cluster pattern detection
    - UI option to enable during import
    - Pattern entities created for detected clusters
14. **AI-Powered Metadata System - Phases 1 & 2** ✅ COMPLETED (July 9, 2025)
15. **API Data Source Refresh Issue** ✅ COMPLETED (July 10, 2025)
16. **Pattern Generation Improvements** ✅ COMPLETED (July 10, 2025)
17. **Data Quality Feature - Phase 1** ✅ COMPLETED (July 12, 2025)
    - Enhanced data profiling with statistical analysis
    - Quality rules engine with violation tracking
    - Data remediation system with automated fixes
    - Data normalization framework
    - Complete UI integration with navigation updates
    - Full database schema and migration support
18. **Global Query Interface - Phase 4** ✅ COMPLETED (July 14-15, 2025)
    - Natural language queries across all data sources
    - LLM-powered query generation (structured and code-based)
    - Multi-source join support with relationship analysis
    - Explain Methodology toggle for transparent calculations
    - Query history and saved queries
    - Export results as data sources
    - Comprehensive help documentation
    - Collapsible generated query display for transparency

## Data Quality Feature - TODO and Roadmap

### Phase 1 - COMPLETED ✅ (July 12, 2025)
**Status**: Core implementation complete, merged to `feature/data-quality` branch
**Reference**: See `documentation/features/DATAQUALITY_FEATURE_SUMMARY.md` for complete details

### Phase 2 - Immediate Priorities (Next 2-4 weeks)

#### 1. **Build and TypeScript Error Resolution** 🔄 IN PROGRESS
- Fix remaining TypeScript compilation errors in normalization routes
- Resolve global property type declarations
- Complete error response parameter standardization
- Ensure clean production build

#### 2. **Testing and Quality Assurance** 📋 PENDING
- Create comprehensive unit tests for all new services
- Add integration tests for complete workflows
- Implement smoke tests for API endpoints
- Test data quality workflows end-to-end
- Validate error handling and edge cases

#### 3. **Performance Optimization** ⚡ PENDING
- Optimize enhanced profiling for large datasets (50k+ records)
- Implement streaming for normalization jobs
- Add caching layer for quality rules execution
- Memory usage optimization for statistical calculations

#### 4. **UI/UX Enhancements** 🎨 PENDING
- Add loading states and progress indicators
- Implement real-time updates for long-running jobs
- Add data visualization improvements
- Enhance error messaging and user feedback
- Mobile responsiveness for data quality pages

### Phase 3 - Advanced Features (1-2 months)

#### 1. **Machine Learning Integration** 🤖 PLANNED
- Replace mock ML service with real ML models
- Implement pattern detection algorithms
- Add anomaly detection capabilities
- Smart remediation suggestion engine
- Predictive quality scoring

#### 2. **Advanced Analytics** 📊 PLANNED
- Quality trends and historical analysis
- Data quality scorecards and dashboards
- Export capabilities (PDF, Excel, CSV reports)
- Quality metrics API for external systems
- Automated quality monitoring alerts

#### 3. **Enterprise Features** 🏢 PLANNED
- Role-based access control for quality management
- Audit trails and compliance reporting
- Integration with external data governance tools
- Webhook notifications for quality events
- Multi-tenant support for quality rules

### Phase 4 - Advanced Capabilities (2-3 months)

#### 1. **Advanced Remediation** 🛠️ PLANNED
- Machine learning-powered fix suggestions
- Complex transformation chains
- Data lineage tracking for remediation
- A/B testing for remediation strategies
- Automated remediation approval workflows

#### 2. **Data Governance Integration** 📋 PLANNED
- Data catalog integration
- Metadata management
- Data lineage visualization
- Policy enforcement automation
- Compliance reporting automation

#### 3. **Collaboration Features** 👥 PLANNED
- Multi-user collaboration on quality rules
- Comment and annotation system
- Review and approval workflows
- Team-based quality management
- Knowledge sharing and documentation

### Technical Debt and Maintenance

#### 1. **Code Quality** 🧹 ONGOING
- Refactor large components into smaller modules
- Improve type safety across all components
- Add comprehensive JSDoc documentation
- Implement consistent error handling patterns
- Code review and optimization

#### 2. **Database Optimization** 🗄️ PLANNED
- Index optimization for quality tables
- Query performance monitoring
- Data archival strategy for historical data
- Backup and recovery procedures
- Database migration testing

#### 3. **Monitoring and Observability** 📈 PLANNED
- Performance monitoring for quality operations
- Error tracking and alerting
- Usage analytics and metrics
- Health checks for quality services
- Log aggregation and analysis

### Known Issues and Limitations

#### Current Limitations
1. **Mock Services**: ML service and some advanced features use mock data
2. **Performance**: Large dataset processing needs optimization
3. **Visualizations**: Basic charts, could be enhanced
4. **Real-time Updates**: Limited SSE implementation
5. **Mobile Support**: Desktop-focused UI

#### Bug Fixes Needed
1. **TypeScript Errors**: Several compilation errors in normalization routes
2. **Global Types**: Need proper typing for global mock variables
3. **Error Handling**: Inconsistent error response patterns
4. **Memory Leaks**: Potential issues with large dataset processing
5. **Navigation**: Minor UI inconsistencies in navigation

### Configuration and Environment

#### Environment Variables Required
```bash
# Data Quality Feature Configuration
ENABLE_ENHANCED_PROFILING=true
ENABLE_ML_INSIGHTS=true
MAX_NORMALIZATION_BATCH_SIZE=10000
DEFAULT_CONFIDENCE_THRESHOLD=0.8
QUALITY_RULES_CACHE_TTL=300
```

#### Database Requirements
- PostgreSQL 12+ with JSONB support
- Minimum 4GB RAM for quality operations
- SSD storage recommended for performance
- Connection pooling configured

### Success Metrics

#### Phase 2 Success Criteria
- [ ] Zero TypeScript compilation errors
- [ ] All unit tests passing (>90% coverage)
- [ ] Performance: Enhanced profiling <2s for 10k records
- [ ] UI: All loading states and error handling complete

#### Phase 3 Success Criteria
- [ ] ML integration with real models
- [ ] Advanced analytics dashboard functional
- [ ] Export capabilities implemented
- [ ] Performance: Processing 100k+ records efficiently

#### Phase 4 Success Criteria
- [ ] Full enterprise feature set
- [ ] Multi-tenant support
- [ ] Complete data governance integration
- [ ] Advanced collaboration features

### Documentation Requirements

#### Technical Documentation
- [ ] API documentation for all endpoints
- [ ] Database schema documentation
- [ ] Service architecture diagrams
- [ ] Deployment and configuration guides

#### User Documentation
- [ ] User guide for quality assessment
- [ ] Tutorial for quality rules creation
- [ ] Best practices guide for remediation
- [ ] Video tutorials for complex workflows

---

**Note**: This TODO list is specifically for the Data Quality feature. For general application todos, see the main backlog sections above. All items are tagged with priority levels: 🔄 (In Progress), 📋 (Pending), ⚡ (High Priority), 🎨 (UI/UX), 🤖 (ML/AI), 📊 (Analytics), 🏢 (Enterprise), 🛠️ (Technical), 👥 (Collaboration), 🧹 (Maintenance).

## Recent Updates (July 2025)

### Metadata Context & Global Querying - IN PROGRESS (July 11, 2025)
See details at the top of this document under "Next Development Session Priority".

### Data Quality Feature - Phase 1 COMPLETED (July 12, 2025)
Complete implementation of enhanced data profiling, quality rules engine, data remediation system, and data normalization framework. See Data Quality Feature TODO section above for Phase 2-4 roadmap.

### AI-Powered Metadata System - Phases 1 & 2 COMPLETED (July 9, 2025)
AI-generated summaries and interactive Q&A for data sources and tables, with automatic table detection for multi-table sources.

### Cluster Detection for Relational Imports - COMPLETED (July 9, 2025)
Automatic cluster pattern detection during relational database imports with UI option to enable during import.

### Inbound API - COMPLETED (July 8, 2025)
Create API endpoints for external systems to push data with configurable authentication and data modes.

### API Connectors - COMPLETED (July 7, 2025)
Connect to external REST APIs with authentication, pagination, and rate limiting support.

### Relational Database Import - COMPLETED (July 3, 2025)
Full schema JSON generation by following foreign key relationships with circular reference handling.

### JSON Parsing Fix for Pattern Services - COMPLETED (July 2, 2025)
Fixed PostgreSQL JSON/JSONB handling in pattern services.

### Database Connectors Implementation - COMPLETED (June 28, 2025)
PostgreSQL and MySQL support with full schema discovery and import capabilities.

### Environment Banner Branch Detection Fix - COMPLETED (June 27, 2025)
Fixed branch detection in CI/CD environments with improved fallback logic.

### Codebase Modularization - COMPLETED (June 18, 2025)
**Session**: June 18, 2025

#### What Was Done
1. **Created Modular Architecture**
   - Implemented feature-based architecture in `/src/features/`
   - Created shared component library with Modal, Button, Panel, LoadingState, ErrorState, EmptyState
   - Created shared hooks: useAPI, useLoading, useModal
   - Established consistent patterns across all features

2. **Modularized All Major Features**
   - **Synthetic Data** (`/synthetic-modular`) - Full dataset generation workflow
   - **Discovery** (`/discovery-modular`) - Data source exploration and transformation
   - **Redaction** (`/redaction-modular`) - Pattern definition and management
   - **Data Sources** (`/data-sources-modular`) - Connection and file management
   - **Annotation** (`/annotation-modular`) - Data annotation with ML detection

3. **Fixed Critical Issues**
   - Fixed infinite loop in Discovery page (useDataSources hook dependencies)
   - Fixed missing testConnection API method
   - Fixed data source visibility inconsistency between pages
   - Fixed import paths for API services
   - Fixed useLoading hook usage

4. **Navigation Updates**
   - Updated main menu to use new modular pages
   - Added legacy page links in development mode for comparison
   - Reorganized menu structure with better categorization

5. **Backlog Management**
   - Moved backlog items from CLAUDE.md to `/documentation/development/backlog.md`
   - Updated all dates to June 2025
   - Analyzed codebase and marked completed features:
     - ✅ Pattern Feedback System (fully implemented)
     - ✅ TypeORM Production Fix (completed in cleanup)
     - ⏳ File Upload Reliability (60% complete)
   - Added new item: Test Connection Functionality for databases

#### Key Technical Decisions
- Used feature-based architecture over page-based
- Created centralized API service layer
- Implemented container/presenter pattern
- Used TypeScript interfaces for all API responses
- Simplified components to avoid webpack issues in production

#### Current State
- All modular pages are functional
- Legacy pages still accessible in development
- Consistent UI/UX across all features
- Ready for production deployment

## Recent Updates (June 2025 - Early June)

### PostgreSQL Migration System (June 13, 2025)
- **Automatic migration execution** - All schema changes applied automatically on startup
- **Migration tracking** - Prevents duplicate runs across team members
- **Safe column additions** - Uses IF NOT EXISTS for non-destructive changes
- **Build-time validation** - Migrations tested during deployment builds
- **Zero developer setup** - Pull and run, migrations handle everything

### File Upload Retry Logic Implementation (June 13, 2025)
**Branch**: `feature/modularize-codebase`

#### What Was Added
1. **Retry Utilities** (`src/utils/retryUtils.ts`)
   - Generic retry wrapper with exponential backoff
   - Specialized fetch retry with timeout handling
   - Dynamic chunk retry configuration
   - Jitter to prevent thundering herd

2. **File Upload Service** (`src/services/fileUploadService.ts`)
   - Automatic retry for regular file uploads
   - Progress tracking with XMLHttpRequest
   - Batch upload with concurrency control
   - Detailed error reporting per file

3. **Enhanced Streaming Upload** (`src/components/EnhancedStreamingFileUpload.tsx`)
   - Automatic chunk retry on failure
   - Real-time upload speed calculation
   - ETA estimation based on current speed
   - Pause/resume functionality
   - Visual retry status indicators
   - Resume from partial uploads

4. **Configuration**
   - Added `NEXT_PUBLIC_USE_ENHANCED_UPLOAD` environment variable
   - Conditional loading in UnifiedFileUpload component
   - Updated .env.example with new configuration

5. **Testing**
   - Comprehensive test suite for retry utilities
   - Tests for exponential backoff behavior
   - Network error simulation tests
   - Custom retry condition tests

6. **Documentation**
   - Created FILE_UPLOAD_RETRY_FEATURE.md
   - Usage examples and best practices
   - Migration guide for enabling feature

#### Key Features
- **Automatic retry**: Network errors and server errors are automatically retried
- **Smart backoff**: Delays increase exponentially with jitter
- **Progress tracking**: Real-time speed and ETA calculation
- **User control**: Pause, resume, and retry failed uploads
- **Resilience**: Resume partial uploads after connection loss

## Recent Updates (June 13, 2025)

### Production Bug Fixes - File Upload Issues
**Branch**: `feature/codebase-consistency-cleanup`

#### Fixed Issues
1. **413 Payload Too Large Error**
   - Files uploaded via streaming were still including content in data source creation
   - Fixed by excluding content and only sending storageKey for streaming uploads
   - Added better error messages for users

2. **"Upload session not found" Error**
   - Streaming upload routes were using deprecated `StreamingUploadServiceDirect`
   - Updated all routes to use `StreamingUploadService` instead
   - Added comprehensive debug logging for session tracking

3. **Debug Improvements**
   - Added payload size logging for data source creation
   - Added environment detection in upload routes
   - Added session verification after initialization

## Recent Updates (June 13, 2025)

### Major Codebase Cleanup - COMPLETED
**Branch**: `feature/codebase-consistency-cleanup` (ready to merge, NOT pushed to remote)

#### What Was Done
1. **Database Column Standardization**
   - All columns now use snake_case (was mix of camelCase, snake_case, lowercase)
   - Updated ALL entity files to use snake_case with explicit column names
   - Created migration 028_standardize_all_column_names for PostgreSQL
   - Automatic migration system handles all schema updates
   - Fixed column references in all services and migrations

2. **Service Consolidation**
   - Removed PatternServiceDirect and StreamingUploadServiceDirect
   - All services now use TypeORM (no more direct SQL)
   - Fixed all import references throughout codebase
   - Standardized error handling in services

3. **API Standardization**
   - Created `api-response.ts` for consistent success/error responses
   - Created `api-handler.ts` for request validation and error handling
   - Updated ALL API routes to use new standards
   - Added proper logging and error messages

4. **Documentation Created**
   - ARCHITECTURE.md - Comprehensive architecture guide
   - CLEANUP_SUMMARY.md - Detailed list of all changes
   - CLEANUP_CHANGES.md - Technical change summary
   - FINAL_CLEANUP_STATUS.md - Deployment strategy and testing results

#### Important Configuration Changes
- **All Environments**: PostgreSQL with migration-based schema management
- **Automatic migrations** run on server startup
- **CatalogCategoryEntity**: display_name is now nullable (line 12)
- **Migration 008**: Updated to use snake_case column names

#### Migration System
- PostgreSQL migrations handle all schema changes automatically
- No manual database operations required for developers
- Schema changes are tracked and applied incrementally
- Data preservation built into migration system

#### Testing Results
- ✅ Linting: No ESLint errors
- ✅ Build: Production build successful
- ✅ APIs: All endpoints functional (tested /api/data-sources and /api/patterns)
- ✅ Database: Fresh schema creates correctly with snake_case columns

#### Deployment Notes
- All environments use PostgreSQL with migration system
- Migrations run automatically on server startup
- Stage deployment recommended before production
- All code must be deployed atomically (column names changed everywhere)

## Recent Updates (June 12, 2025)

### Pattern Feedback and Auto-Refinement System
- **Implemented pattern feedback system** - Users can click highlighted text to provide thumbs up/down feedback
- **Added auto-refinement capability** - After 3 negative feedbacks, text is automatically excluded from future matches
- **Created refined pattern service** - Manages pattern exclusions and confidence thresholds
- **Fixed client-side TypeORM errors** - Created client-safe services and API endpoints for browser components
- **Added real-time pattern updates** - Exclusions apply immediately after threshold is reached
- **Database migrations** - Added pattern_feedback table and auto-refinement fields to patterns table
- **Generic pattern learning system** - Implemented intelligent pattern refinement that works for all pattern types
- **Smart pattern analysis** - Analyzes feedback to detect format mismatches, missing context, and over-matching
- **Automated refinement suggestions** - Generates improved regex patterns, context requirements, and validation rules

### Technical Implementation Details
- **Merged to main**: June 12, 2025 - Pattern feedback system successfully deployed
- **New entities**: PatternFeedback entity for storing user feedback
- **New services**: 
  - `patternFeedbackService.ts` - Server-side feedback processing
  - `refinedPatternService.ts` - Server-side pattern refinement logic
  - `refinedPatternClient.ts` - Client-safe service for browser components
  - `patternLearningService.ts` - Generic pattern learning and refinement engine
  - `improvedPatternService.ts` - Pattern-specific validation and regex improvements
- **API endpoints**: 
  - `/api/patterns/feedback` - Submit pattern feedback
  - `/api/patterns/refined` - Get refined patterns with exclusions
  - `/api/patterns/feedback/refinements` - Get and apply pattern refinement suggestions
- **UI components**: 
  - `PatternFeedbackUI.tsx` - Feedback buttons and accuracy badges
  - Updated `DataAnnotation.tsx` - Integrated feedback collection
  - `EnhancedPatternFeedback.tsx` - Advanced feedback UI with reason selection
  - `PatternRefinementSuggestions.tsx` - UI for reviewing and applying refinement suggestions

### Testing
- Created test endpoint `/api/test/auto-refinement` to verify functionality
- Auto-refinement confirmed working: false positives excluded after threshold
- Pattern matching respects exclusions in real-time

## Recent Updates (June 10, 2025)

### Annotation Interface Enhancements
- **Fixed pagination for large datasets** - Annotation now properly handles 100k+ records without browser hanging
- **Added ML pattern detection button** - Users can optionally run advanced ML detection with visual feedback
- **Improved highlighting performance** - Simple pattern matching runs instantly, ML detection on-demand
- **Added regex pattern support** - Patterns defined with regex now highlight automatically without examples
- **Fixed JSON data display** - JSON files now show properly formatted data in annotation

### Performance Optimizations
- **Pagination implementation** - Transform API now supports page/pageSize parameters
- **Memory optimization** - Large datasets stored without records in database to prevent memory issues
- **Instant highlighting** - Removed ML API calls from real-time highlighting for better performance
- **Smart data loading** - Only loads current page of records instead of entire dataset

## Git Workflow Policy

### Feature Branch Development
**CRITICAL: ALL new features must be developed on feature branches, never directly on main.**

#### Required Workflow:
1. **Create feature branch**: `git checkout -b feature/descriptive-name`
2. **Implement changes**: All development work on the feature branch
3. **Test thoroughly**: Ensure linting, type checking, and build pass
4. **Commit with descriptive messages**: Include proper commit messages
5. **Push feature branch**: `git push origin feature/descriptive-name`
6. **Create pull request**: For review before merging to main
7. **Merge to main**: Only after review and testing

#### Branch Naming Convention:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

#### Main Branch Protection:
- Main branch must remain stable at all times
- No direct commits to main branch
- All changes go through feature branch workflow
- Main branch is for active development integration

### Production Branch Policy
**The production branch is a stable snapshot used for demos and presentations.**

#### Workflow Overview:
```
feature branches → main (active development) → production (stable demos)
```

#### Production Branch Rules:
1. **Never commit directly to production** - Only rebase from main
2. **Update periodically** - When main is stable and tested
3. **Used for demos** - Always demo-ready state
4. **Force push protection** - Use `--force-with-lease` when rebasing

#### When to Update Production:
- After major features are proven stable in main
- Before important demos or presentations
- At regular intervals (e.g., bi-weekly)
- After critical bug fixes are verified

#### How to Update Production:
```bash
# Ensure main is stable and tested first
git checkout main
git pull origin main

# Update production branch
git checkout production
git pull origin production
git rebase main
git push --force-with-lease origin production
```

#### Rollback Procedure:
If issues are found after updating production:
```bash
# Find the last known good commit
git log --oneline -10

# Reset to that commit
git reset --hard <commit-hash>
git push --force-with-lease origin production
```

## Code Quality & Linting

This project has automatic linting and type checking set up via git pre-commit hooks.

### Available Scripts
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run dev` - Start development server
- `npm run build` - Build production version

### Pre-commit Hook
The project automatically runs linting and type checking before every commit:
- ESLint checks for code style and potential issues
- TypeScript checks for type errors
- Commits are blocked if either check fails

### Pre-Push Requirements
**CRITICAL: ALWAYS run these commands before pushing any branch:**
```bash
npm run lint        # Fix all linting errors
npm run type-check  # Fix all TypeScript errors  
npm run build       # Ensure production build succeeds
```

**Never push without a successful build. Build failures in production are unacceptable.**

### Automated Git Hooks
The project has automated git hooks to prevent common issues:

#### Pre-commit Hook (Automatic)
- Runs ESLint to check code style
- Runs TypeScript type checking (if available)
- Blocks commits if either check fails

#### Pre-push Hook (Automatic)
- Runs ESLint to check code style
- Runs TypeScript type checking (if available)
- **Runs full production build to ensure deployment will succeed**
- Blocks push if any check fails
- Provides helpful error messages for debugging

These hooks ensure code quality and prevent production deployment failures.

### Manual Testing
Always run linting before pushing to git:
```bash
npm run lint
npm run type-check
```

## Database Configuration

### All Environments
- Uses PostgreSQL database exclusively
- Full persistence and CRUD operations
- Automatic migration system
- Schema changes tracked and applied incrementally

### Required Setup
`DATABASE_URL` environment variable must be configured:
- PostgreSQL connection string required
- SSL configuration via `DATABASE_SSL` environment variable
- Migrations run automatically on server startup

## Data Source Management

### File Size Limits

#### All Environments
- Maximum file size: 10MB per file
- Text content truncation: Files with >1MB content are truncated for database storage
- Full content available via external storage (automatic retrieval)
- Configuration size limit: 10MB total per data source
- API payload limit: 4MB for responses (large files streamed from storage)

### User Experience
- Environment-specific warning banners in production
- Automatic file size validation before upload
- Content truncation warnings with original size metadata
- Clear error messages for oversized payloads

### Cleanup Utilities
Run `npm run cleanup-datasources` to:
- Reduce oversized data source configurations
- Truncate large file contents in existing data sources  
- Prevent API payload errors (413/500 status codes)
- Works with PostgreSQL database

## Known Issues

### Data Source Storage
- Large files (>5MB) cannot be uploaded directly
- Text content over 1MB is automatically truncated for database efficiency
- Full content remains available via external storage with automatic retrieval
- Dataset enhancement automatically fetches complete content when needed