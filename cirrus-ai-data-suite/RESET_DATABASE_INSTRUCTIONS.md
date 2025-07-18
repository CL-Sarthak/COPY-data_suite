# Database Reset Instructions

## Why Reset?

We've accumulated many migrations that have been causing issues. Starting fresh with a single comprehensive migration is cleaner and more maintainable.

## Steps to Reset Production Database

### 1. Warning - Data Loss

**⚠️ WARNING: This will DELETE ALL DATA in the production database!**

Make sure you:
- Have backed up any important data
- Are okay with losing all existing data
- Have coordinated with your team

### 2. Reset the Database

#### Option A: From Local Machine (Recommended)

```bash
# Set your production database URL
export DATABASE_URL="your-production-database-url"
export FORCE_RESET=true

# Run the reset script
npm run db:reset

# The script will drop all tables
```

#### Option B: Manual SQL Commands

Connect to your production database and run:

```sql
-- Drop all tables (in order to respect foreign keys)
DROP TABLE IF EXISTS pattern_feedback CASCADE;
DROP TABLE IF EXISTS upload_sessions CASCADE; 
DROP TABLE IF EXISTS processed_files CASCADE;
DROP TABLE IF EXISTS annotation_sessions CASCADE;
DROP TABLE IF EXISTS field_mapping CASCADE;
DROP TABLE IF EXISTS catalog_field CASCADE;
DROP TABLE IF EXISTS catalog_category CASCADE;
DROP TABLE IF EXISTS pipeline CASCADE;
DROP TABLE IF EXISTS synthetic_data_jobs CASCADE;
DROP TABLE IF EXISTS synthetic_datasets CASCADE;
DROP TABLE IF EXISTS patterns CASCADE;
DROP TABLE IF EXISTS data_source_entity CASCADE;
DROP TABLE IF EXISTS migration_tracker CASCADE;
```

### 3. Deploy the Updated Code

Deploy the application with the new connection.ts file. The application will:
1. Detect no tables exist
2. Run the single comprehensive migration (001_complete_schema)
3. Create all tables with the correct schema

### 4. Verify

After deployment, check that:
- All tables are created
- Upload functionality works
- Synthetic data pages load without errors

## What Changed?

1. **Single Migration**: Instead of 37+ migrations, we now have one comprehensive migration that creates all tables correctly
2. **Table Names**: All tables use consistent snake_case naming
3. **Column Names**: All columns use snake_case (e.g., `records_count` not `record_count`)
4. **Clean Schema**: No legacy columns or conflicting names

## Benefits

- Faster deployment (one migration vs 37+)
- No migration conflicts
- Clean, consistent schema
- Easier to maintain going forward

## Going Forward

When adding new features:
1. Create new migrations starting from 002
2. Keep migrations small and focused
3. Test in development before production

## Rollback

If you need to go back to the old system:
1. Restore `src/database/connection.old.ts` to `src/database/connection.ts`
2. Redeploy
3. The old migrations will run (may still have issues)