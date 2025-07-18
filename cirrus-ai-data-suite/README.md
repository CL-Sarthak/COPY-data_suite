# Cirrus Data Preparedness Studio

A comprehensive AI data preparation suite built with Next.js. This tool helps organizations prepare sensitive data for AI applications through intelligent discovery, pattern definition, and redaction using Claude AI.

## Features

### Core Capabilities

- **File Upload**: Support for multiple file formats (TXT, CSV, JSON, PDF, DOCX)
- **Data Annotation**: Interactive text selection and tagging system to define sensitive data patterns
- **Pattern Recognition**: Pre-defined patterns for common sensitive data types (SSN, Email, Phone, etc.)
- **Claude AI Integration**: Uses Claude AI to intelligently redact sensitive information
- **Export Options**: Multiple export formats (JSON, CSV, TXT) with optional metadata
- **Step-by-Step Workflow**: Guided 4-step process from upload to export

### Data Connectors (New!)

- **Database Sources**: Connect to PostgreSQL and MySQL databases
  - Schema discovery with foreign key relationships
  - Table preview and data sampling
  - SQL query imports with custom queries
  - Relational imports following foreign keys
  - Automatic refresh scheduling
- **API Sources**: Connect to REST APIs and web services
  - Support for GET/POST requests
  - Multiple authentication methods (API Key, Bearer, Basic)
  - Custom headers and query parameters
  - Pagination support (offset/limit and page-based)
  - JSONPath data extraction
  - Automatic refresh intervals
- **Inbound API**: Create endpoints for data ingestion
  - Generate unique API endpoints
  - Custom URL support (e.g., `/api/inbound/customer-data`)
  - Configurable API key authentication
  - Append or replace data modes
  - Real-time request tracking
  - Webhook reception capabilities

### Advanced Features

- **Data Discovery**: Unified view of all data sources
- **Visual Pipeline Editor**: Drag-and-drop workflow automation
- **Synthetic Data Generation**: Privacy-preserving test data creation
- **Pattern Learning**: ML-powered pattern detection and refinement
- **Data Catalog**: Centralized field mapping and standardization

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop (for local PostgreSQL database)
- An Anthropic API key

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd cirrus-data-suite
```

2. Install dependencies:

```bash
npm install
```

3. Set up the local database:

   **Option 1: Using Docker Compose (Recommended)**

   ```bash
   # Start PostgreSQL database
   docker compose up -d

   # This creates a PostgreSQL container with:
   # - Database: cirrus_dev
   # - Username: postgres
   # - Password: postgres
   # - Port: 5432
   ```

   **Option 2: Manual Docker Setup**

   ```bash
   # Create and run PostgreSQL container
   docker run --name cirrus-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=cirrus_dev \
     -p 5432:5432 \
     -d postgres:15
   ```

4. Set up environment variables:

   - Copy the example file: `cp .env.example .env.local`
   - The default `.env.local` already includes the local database connection:

   ```env
   # Local Database (automatically configured for Docker)
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cirrus_dev

   # Required for redaction functionality
   ANTHROPIC_API_KEY=your_anthropic_api_key_here

   # Optional: Enable ML-powered pattern detection
   ML_DETECTION_ENABLED=true
   ML_PROVIDER=google
   GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here
   ```

5. Initialize the database:

   ```bash
   # Database migrations run automatically when you start the dev server
   # To manually run migrations:
   npm run migrate

   # To reset the database (WARNING: deletes all data):
   npm run db:reset
   ```

6. Run the development server:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Test Database for Database Connectors

A comprehensive medical records test database is included for testing database connector functionality.

### Quick Start

```bash
# Start the medical records test database (PostgreSQL on port 5433)
npm run test:db:start

# View logs
npm run test:db:logs

# Connect to database shell
npm run test:db:shell

# Stop the database
npm run test:db:stop

# Clean up (remove all data)
npm run test:db:clean
```

### Connection Details

- **Host**: localhost
- **Port**: 5433
- **Database**: medical_records
- **Username**: medical_admin
- **Password**: medical_test_2024

### What's Included

The test database contains realistic medical data with:

- 5 patients with complete demographics (names, DOB, SSN, addresses, phone numbers)
- Medical appointments, diagnoses, prescriptions
- Lab results with normal and abnormal values
- Allergies, immunizations, medical history
- Insurance information
- Clinical notes in SOAP format
- 16 tables total with proper foreign key relationships

### Testing Database Connectors

1. Start the test database: `npm run test:db:start`
2. Navigate to Discovery → File Sources → Database Connections
3. Click "New Connection" and enter:
   - Connection Type: PostgreSQL
   - Host: localhost
   - Port: 5433
   - Database: medical_records
   - Username: medical_admin
   - Password: medical_test_2024
4. Test the connection
5. Browse tables and import data to create test data sources

### Manual Setup (Without Docker)

If Docker is not available, see [docker/test-databases/manual-setup.md](docker/test-databases/manual-setup.md) for instructions on:

- Setting up the database manually on PostgreSQL
- Using an existing PostgreSQL instance
- Cloud database setup

## How to Use

### Step 1: Upload Training Data

- Upload sample files that contain examples of sensitive data
- Supported formats: TXT, CSV, JSON, PDF, DOCX
- These files help define what data should be considered sensitive

### Step 2: Annotate Sensitive Data

- Select text in your uploaded documents
- Tag selected text with predefined or custom sensitivity labels
- Build a library of examples for each type of sensitive data
- Available predefined patterns:
  - Social Security Numbers
  - Email Addresses
  - Phone Numbers
  - Credit Card Numbers
  - Bank Account Numbers
  - Medical Record Numbers

### Step 3: Process Data for Redaction

- Upload the actual data files you want to redact
- The system uses Claude AI to identify and replace sensitive information
- Real-time processing status with preview of redacted content
- Shows redaction count and side-by-side comparison

### Step 4: Export Results

- Choose export format (JSON, CSV, or TXT)
- Option to include metadata (redaction counts, timestamps)
- Download redacted data ready for AI applications
- Processing summary and usage instructions

## Technical Architecture

### Frontend Components

- **FileUpload**: Drag-and-drop file upload with support for multiple formats
- **DataAnnotation**: Interactive text selection and pattern definition
- **RedactionProcess**: File processing with Claude AI integration
- **ExportData**: Data export with multiple format options

### API Integration

- **Claude AI**: Uses Anthropic's Claude AI for intelligent text redaction
- **REST API**: Simple `/api/redact` endpoint for processing requests
- **Error Handling**: Robust error handling for API failures

### Data Flow

1. User uploads data files → File content extracted
2. User annotates sensitive patterns → Patterns stored in state
3. User uploads files to redact → Files sent to Claude AI via API
4. Claude processes and redacts → Redacted content returned
5. User exports results → Data formatted and downloaded

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude AI integration

### Supported File Types

- **Text**: .txt, .csv, .json
- **Documents**: .pdf, .docx
- **Processing**: .txt, .csv, .json (for redaction)

## Security Considerations

- API keys are stored securely in environment variables
- No data is stored permanently on the server
- All processing happens in-memory
- Users should validate redactions before production use

## Deployment

### Vercel Deployment (Recommended)

Choose one of these database options:

#### Option 1: Neon (PostgreSQL)

1. **Set up Neon Database**:

   - Go to your Vercel dashboard
   - Navigate to Storage → Create Database → **Neon**
   - Copy the `DATABASE_URL` from the connection details

2. **Configure Environment Variables**:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   DATABASE_URL=postgresql://...  # From Neon
   ML_DETECTION_ENABLED=true
   ML_PROVIDER=simulated  # or google with GOOGLE_CLOUD_API_KEY
   ```

#### Option 2: Supabase (PostgreSQL)

1. **Set up Supabase Database**:
   - Go to your Vercel dashboard
   - Navigate to Storage → Create Database → **Supabase**
   - Copy the connection string as `DATABASE_URL`

#### Option 3: Upstash (Redis/Edge)

1. **Set up Upstash**:

   - Go to your Vercel dashboard
   - Navigate to Storage → Create Database → **Upstash**
   - Note: You'll need to modify the database config for Redis

2. **Deploy**:
   - Connect your GitHub repository to Vercel
   - Environment variables will be automatically applied
   - Database migrations run automatically on first deployment

### Alternative Cloud Databases

The application uses PostgreSQL exclusively:

- **PostgreSQL**: Neon, Supabase, Railway, PlanetScale, etc.
- **All Environments**: Consistent PostgreSQL setup

### Database Configuration

The application uses PostgreSQL for all environments:

- **Development**: PostgreSQL database via `DATABASE_URL`
- **Production**: PostgreSQL with SSL (Neon, Supabase, etc.)
- **Automatic Migrations**: Schema updates handled automatically
- Consider audit trails for sensitive data processing

## Testing

### Running Tests

The project includes comprehensive unit tests and smoke tests:

#### Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

#### Smoke Tests

```bash
# Run against local development server
npm run test:smoke

# Run against specific URL
npm run test:smoke -- https://staging.example.com

# Quick smoke test commands
npm run smoke:local  # Tests http://localhost:3000
npm run smoke:prod   # Tests production at https://cirrus-ai-data-suite.vercel.app
```

See [Smoke Tests Guide](./docs/SMOKE_TESTS_GUIDE.md) for detailed information.

## Development

### Creating Demo Pages

See [Demo Pages Guide](./docs/DEMO_PAGES_GUIDE.md) for instructions on creating demonstration pages with watermarks and badges.

### Scripts

#### Development

- `npm run dev`: Start development server
- `npm run build`: Build production bundle
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run type-check`: Run TypeScript type checking

#### Database Management

- `npm run migrate`: Run database migrations manually
- `npm run migrate:check`: Test migration script without database
- `npm run db:reset`: Reset database to empty state (deletes all data!)
- `npm run dev:clean`: Reset database and start development server
- `docker compose up -d`: Start PostgreSQL database container
- `docker compose down`: Stop PostgreSQL database container
- `docker compose logs postgres`: View database logs

#### Testing

- `npm run test`: Run unit tests only (no server required)
- `npm run test:watch`: Run unit tests in watch mode
- `npm run test:coverage`: Run unit tests with coverage report
- `npm run test:all`: Run ALL tests including integration and smoke tests
- `npm run test:unit`: Same as `npm run test` (unit tests only)
- `npm run test:integration`: Run integration tests (requires database)
- `npm run test:smoke`: Run smoke tests against local or deployed instance
- `npm run smoke:local`: Quick smoke tests against http://localhost:3000
- `npm run smoke:prod`: Run smoke tests against production

### Key Dependencies

- **Next.js 15**: React framework
- **@anthropic-ai/sdk**: Claude AI integration
- **react-dropzone**: File upload component
- **lucide-react**: Icons
- **Tailwind CSS**: Styling

## Example Use Cases

1. **Healthcare Data**: Redact patient information from medical records
2. **Financial Data**: Remove account numbers and personal identifiers
3. **Customer Data**: Sanitize support tickets and feedback
4. **Legal Documents**: Redact confidential information from contracts
5. **HR Records**: Remove PII from employee data

## Troubleshooting

### Common Issues

1. **API Key Error**: Ensure `ANTHROPIC_API_KEY` is set correctly in `.env.local`
2. **File Upload Issues**: Check file format and size limits
3. **Processing Errors**: Verify network connection and API usage limits
4. **Export Problems**: Ensure browser allows file downloads

### Database Issues

1. **Docker Not Running**:

   - Ensure Docker Desktop is running before starting the database
   - Check Docker status: `docker ps`
   - If container stopped: `docker compose up -d`

2. **Port Already in Use**:

   - PostgreSQL default port 5432 might be occupied
   - Stop existing PostgreSQL: `sudo service postgresql stop` (Linux/Mac)
   - Or change port in docker-compose.yml and DATABASE_URL

3. **Connection Refused**:

   - Check if container is running: `docker ps`
   - Verify DATABASE_URL matches your Docker setup
   - Try connecting with: `docker exec -it cirrus-postgres psql -U postgres -d cirrus_dev`

4. **Migration Errors**:

   - Reset database: `npm run db:reset`
   - Check migration logs in console output
   - Manually run migrations: `npm run migrate`

5. **TypeORM Metadata Errors in Development**:
   - Common with Next.js hot reload
   - Simply restart the dev server: `npm run dev`
   - This is a known limitation only in development mode

### Debug Tips

- Check browser console for error messages
- Verify API responses in Network tab
- Test with smaller files if processing fails
- Ensure all required patterns have examples

## Original Next.js Template

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
