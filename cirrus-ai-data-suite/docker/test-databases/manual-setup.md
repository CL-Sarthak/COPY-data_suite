# Manual Setup Instructions for Test Medical Database

If Docker is not available in your environment, you can manually set up the test database on any PostgreSQL server.

## Prerequisites

- PostgreSQL 13 or higher
- psql command-line tool
- Database creation privileges

## Setup Steps

1. **Create the database and user:**

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create user and database
CREATE USER medical_admin WITH PASSWORD 'medical_test_2024';
CREATE DATABASE medical_records OWNER medical_admin;
GRANT ALL PRIVILEGES ON DATABASE medical_records TO medical_admin;
\q
```

2. **Run the schema script:**

```bash
psql -U medical_admin -d medical_records -f init-scripts/medical/01-schema.sql
```

3. **Load the seed data:**

```bash
psql -U medical_admin -d medical_records -f init-scripts/medical/02-seed-data.sql
```

## Alternative: Use Existing PostgreSQL Instance

If you already have a PostgreSQL database running (e.g., your development database), you can:

1. Create a new database in your existing instance:
```sql
CREATE DATABASE medical_records;
```

2. Run the scripts against that database:
```bash
psql -h localhost -p 5432 -U your_user -d medical_records -f init-scripts/medical/01-schema.sql
psql -h localhost -p 5432 -U your_user -d medical_records -f init-scripts/medical/02-seed-data.sql
```

3. Test the connector using environment variables:
```bash
TEST_DB_HOST=localhost \
TEST_DB_PORT=5432 \
TEST_DB_NAME=medical_records \
TEST_DB_USER=your_user \
TEST_DB_PASSWORD=your_password \
npm run test:db:connector
```

## Cloud Database Setup

For cloud databases (AWS RDS, Google Cloud SQL, Azure Database):

1. Create a new PostgreSQL instance
2. Create the `medical_records` database
3. Run the schema and seed scripts using cloud-specific tools or psql with connection parameters
4. Update your database connector configuration with the cloud database credentials

## Verify Setup

After setup, verify the database is working:

```sql
-- Connect to the database
psql -U medical_admin -d medical_records

-- Check tables exist
\dt

-- Verify patient data
SELECT COUNT(*) FROM patients;
-- Should return: 5

-- Check a sample patient
SELECT patient_id, first_name, last_name, date_of_birth 
FROM patients 
LIMIT 1;
```

## Clean Up

To remove the test database when done:

```sql
-- Connect as superuser
psql -U postgres

-- Drop database and user
DROP DATABASE IF EXISTS medical_records;
DROP USER IF EXISTS medical_admin;
```