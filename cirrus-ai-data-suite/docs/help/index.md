# Cirrus Data Suite Help Center

Welcome to the Cirrus Data Suite help documentation. This guide will help you get the most out of the platform's features.

## Getting Started

- [Quick Start Guide](/docs/quickstart) - Get up and running in minutes
- [Installation Guide](/README.md) - Detailed setup instructions
- [Common Workflows](/docs/common-workflows) - Step-by-step tutorials

## Data Sources

Learn how to connect and import data from various sources:

### 📊 [Database Sources](./database-sources.md)
Connect to PostgreSQL, MySQL, and other databases to import structured data.
- Connection setup and testing
- Schema browsing and table preview
- SQL query imports
- Relational data imports
- Automatic refresh scheduling

### 🌐 [API Sources](./api-sources.md)
Connect to REST APIs and web services to import data from external systems.
- Authentication methods (API Key, Bearer, Basic)
- Custom headers and parameters
- Pagination handling
- JSONPath data extraction
- Scheduled data refreshes

### 📥 [Inbound API](./inbound-api.md)
Create API endpoints to receive data pushed from external systems.
- Endpoint generation
- Custom URL configuration
- API key authentication
- Webhook reception
- Real-time data updates

### 📁 File Upload
Upload files directly to the platform.
- Supported formats: CSV, JSON, TXT, PDF, DOCX
- Drag-and-drop interface
- Bulk file uploads
- Streaming for large files

## Core Features

### 🔍 Data Discovery
- Unified view of all data sources
- Search and filter capabilities
- Data profiling and statistics
- Schema exploration
- Transformation tools

### 💬 [Global Query](./global-query.md)
Ask natural language questions about your data and get instant answers.
- Natural language processing
- Cross-source querying
- Complex calculations
- JavaScript code execution
- Explain methodology option

### 🎯 Pattern Detection
- Pre-built patterns for PII/PHI
- Custom pattern creation
- ML-powered detection
- Pattern learning and refinement
- Confidence scoring

### 🔄 Data Transformation
- Visual transformation editor
- Field mapping
- Data type conversion
- JSON/CSV formatting
- Export options

### 🚀 Pipeline Automation
- Visual pipeline builder
- Scheduled execution
- Multi-step workflows
- Error handling
- Execution monitoring

### 🧪 Synthetic Data
- Generate test data
- Preserve data relationships
- Privacy-safe datasets
- Custom templates
- Format-preserving generation

## Advanced Topics

### 🔐 Security & Authentication
- API key management
- SSL/TLS connections
- Access control
- Data encryption
- Audit logging

### 🎨 UI Customization
- Theme settings
- Dashboard configuration
- Custom views
- Export templates

### 🔧 API Reference
- [REST API Documentation](/api-docs)
- Authentication methods
- Endpoint reference
- Code examples
- Rate limits

### 📊 Performance
- Optimization tips
- Handling large datasets
- Caching strategies
- Query optimization
- Resource management

## Troubleshooting

### Common Issues
- [Connection Problems](#connection-issues)
- [Import Failures](#import-failures)
- [Performance Issues](#performance-issues)
- [Authentication Errors](#auth-errors)

### Error Messages
- Understanding error codes
- Common solutions
- Debug mode
- Log analysis

## Best Practices

### Data Management
- Naming conventions
- Organization strategies
- Version control
- Backup procedures
- Data governance

### Security
- Credential management
- Network security
- Data privacy
- Compliance considerations
- Access controls

### Performance
- Query optimization
- Batch processing
- Caching strategies
- Resource allocation
- Monitoring

## Resources

### Documentation
- [Developer Notes](/CLAUDE.md) - Technical implementation details
- [API Documentation](/api-docs) - Complete API reference
- [Feature Backlog](/FEATURE_BACKLOG.md) - Upcoming features

### Support
- Community forums
- Support tickets
- Feature requests
- Bug reports

### Training
- Video tutorials
- Webinars
- Best practices guides
- Use case examples

## FAQ

**Q: How do I get started with database connections?**
A: See the [Database Sources Guide](./database-sources.md) for step-by-step instructions.

**Q: Can I receive webhooks from external services?**
A: Yes! Check the [Inbound API Guide](./inbound-api.md) to create webhook endpoints.

**Q: How do I schedule automatic data refreshes?**
A: Both [Database Sources](./database-sources.md) and [API Sources](./api-sources.md) support scheduled refreshes.

**Q: What file formats are supported?**
A: CSV, JSON, TXT, PDF, and DOCX files are supported for direct upload. Database and API sources can import any structured data.

**Q: Is there a size limit for data imports?**
A: File uploads are limited to 10MB. Database and API imports can handle larger datasets through pagination and streaming.

**Q: Can I transform data during import?**
A: Yes, use JSONPath for API sources or SQL queries for databases. For complex transformations, use the transformation features after import.

## Need More Help?

If you can't find what you're looking for:
1. Search the documentation
2. Check the FAQ section
3. Review common workflows
4. Contact support

---

*Last updated: July 16, 2025*