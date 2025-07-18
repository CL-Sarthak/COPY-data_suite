# Vercel Database Reset Guide

## Option 1: Reset via Vercel Dashboard (Recommended)

### Step 1: Connect to Production Database
1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click on your PostgreSQL database
4. Click "Query" or "Data Browser"
5. Run these SQL commands:

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

### Step 2: Redeploy Application
1. Push the new code to your production branch
2. Vercel will automatically redeploy
3. The new migration will run during build and create all tables

## Option 2: Create a Reset API Endpoint (Temporary)

### Step 1: Create Reset Endpoint
Create `src/app/api/admin/reset-database/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';

export async function POST(request: NextRequest) {
  // Security check
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.ADMIN_RESET_TOKEN;
  
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    
    // Drop all tables
    const tablesToDrop = [
      'pattern_feedback',
      'upload_sessions', 
      'processed_files',
      'annotation_sessions',
      'field_mapping',
      'catalog_field',
      'catalog_category',
      'pipeline',
      'synthetic_data_jobs',
      'synthetic_datasets',
      'patterns',
      'data_source_entity',
      'migration_tracker'
    ];

    for (const table of tablesToDrop) {
      await db.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    return NextResponse.json({ 
      message: 'Database reset complete. Redeploy to run migrations.' 
    });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json({ 
      error: 'Reset failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
```

### Step 2: Set Environment Variable
In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add: `ADMIN_RESET_TOKEN` with a secure random value

### Step 3: Deploy and Reset
1. Deploy the code with the reset endpoint
2. Call the endpoint:
```bash
curl -X POST https://your-app.vercel.app/api/admin/reset-database \
  -H "Authorization: Bearer YOUR_ADMIN_RESET_TOKEN"
```
3. Redeploy to run migrations
4. **IMPORTANT**: Remove the reset endpoint after use

## Option 3: Use Database Provider's Tools

### For Vercel Postgres (Neon)
1. Go to your Neon dashboard
2. Open the SQL editor
3. Run the DROP commands from Option 1
4. Redeploy your Vercel app

### For Supabase
1. Go to Supabase dashboard
2. SQL Editor → New Query
3. Run the DROP commands from Option 1
4. Redeploy your Vercel app

### For Other Providers
Use their respective SQL interfaces to run the DROP commands.

## Deployment Process After Reset

### 1. Ensure Clean Code is Ready
Your repository should have:
- New `connection.ts` using single migration
- `001_complete_schema.ts` migration file
- Updated entity files

### 2. Deploy to Vercel
```bash
git push origin production
```

Or use Vercel CLI:
```bash
vercel --prod
```

### 3. Monitor Build Logs
In Vercel dashboard:
- Check build logs for migration success
- Look for: "✅ Migrations completed successfully!"

### 4. Verify
After deployment:
1. Check that all pages load
2. Test file upload functionality
3. Verify synthetic data pages work

## Important Notes

1. **Data Loss**: This will DELETE ALL DATA. Make backups if needed.

2. **Build-Time Migrations**: Vercel runs migrations during build via the `prebuild` script. If migrations fail, the deployment will fail (this is good - prevents broken deployments).

3. **Environment Variables**: Ensure these are set in Vercel:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `DATABASE_SSL=true` - Required for most cloud databases

4. **No Runtime Migrations**: Vercel automatically sets `SKIP_RUNTIME_MIGRATIONS=true` to avoid running migrations on every request.

## Troubleshooting

### Build Fails with Migration Error
1. Check the build logs for specific error
2. Ensure database is accessible from Vercel
3. Verify DATABASE_URL is correct

### Tables Not Created
1. Check if old migration tracker exists
2. Manually drop migration_tracker table
3. Redeploy

### Connection Issues
1. Ensure DATABASE_SSL=true is set
2. Check if database allows connections from Vercel IPs
3. Verify connection string format