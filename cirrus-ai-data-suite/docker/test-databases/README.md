# Test Databases for Cirrus Data Suite

This directory contains Docker configurations for test databases used to verify database connector functionality.

## Medical Records Database

A comprehensive PostgreSQL database containing realistic medical records with various types of sensitive information including:

- **PII (Personally Identifiable Information)**: Names, SSNs, addresses, phone numbers, emails
- **PHI (Protected Health Information)**: Medical conditions, diagnoses, prescriptions, lab results
- **Financial Data**: Insurance information, policy numbers
- **Medical Provider Information**: Doctor names, NPI numbers, license numbers

### Database Details

- **Container Name**: cirrus-test-postgres-medical
- **Port**: 5433 (mapped to avoid conflicts with main dev database)
- **Database**: medical_records
- **Username**: medical_admin
- **Password**: medical_test_2024

### Quick Start

```bash
# Start the medical test database
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

### Schema Overview

The medical records database includes the following tables:

1. **patients** - Patient demographics and contact information
2. **patient_addresses** - Patient addresses (home, work, billing)
3. **patient_insurance** - Insurance coverage details
4. **providers** - Healthcare provider information
5. **departments** - Hospital departments/clinics
6. **appointments** - Scheduled and completed appointments
7. **vital_signs** - Patient vital sign recordings
8. **diagnoses** - Medical diagnoses with ICD-10 codes
9. **medications** - Medication catalog
10. **prescriptions** - Patient prescriptions
11. **lab_tests** - Laboratory test catalog
12. **lab_results** - Patient lab results
13. **allergies** - Patient allergies
14. **immunizations** - Vaccination records
15. **medical_history** - Past medical conditions
16. **clinical_notes** - SOAP notes and clinical documentation

### Sample Data

The database is pre-populated with:
- 5 patients with diverse medical histories
- Multiple providers across different specialties
- Recent appointments and clinical encounters
- Lab results with normal and abnormal values
- Active prescriptions and medication history
- Comprehensive clinical notes

### Testing Database Connectors

To test the database connector with this medical database:

1. Start the test database: `npm run test:db:start`
2. Go to the database connections page in the app
3. Create a new PostgreSQL connection with:
   - Host: localhost
   - Port: 5433
   - Database: medical_records
   - Username: medical_admin
   - Password: medical_test_2024
4. Test the connection and browse the schema
5. Import tables to create data sources with realistic medical data

### Testing Without Docker

If Docker is not available in your environment, see [manual-setup.md](manual-setup.md) for instructions on:
- Setting up the database manually on PostgreSQL
- Using an existing PostgreSQL instance
- Setting up on cloud databases
- Running the connector test script

### Testing the Connector

Run the database connector test script:

```bash
# Test with default configuration (expects database on port 5433)
npm run test:db:connector

# Test with custom database connection
TEST_DB_HOST=your-host \
TEST_DB_PORT=5432 \
TEST_DB_NAME=your-db \
TEST_DB_USER=your-user \
TEST_DB_PASSWORD=your-password \
npm run test:db:connector
```

### Security Note

This is test data only. All patient information is fictional and generated for testing purposes. Do not use real patient data in test environments.