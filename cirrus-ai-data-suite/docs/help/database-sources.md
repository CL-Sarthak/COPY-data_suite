# Database Sources Help Guide

## Overview

Database Sources allow you to connect Cirrus Data Suite to external databases and import data for analysis, transformation, and processing. This feature supports multiple database types and provides both simple table imports and advanced relational data imports.

## Supported Databases

- **PostgreSQL** - Full support including schemas, foreign keys, and advanced data types
- **MySQL** - Complete support for all MySQL versions including MariaDB
- **SQL Server** (Coming Soon)
- **Oracle** (Coming Soon)
- **MongoDB** (Coming Soon)

## Getting Started

### 1. Navigate to Database Sources

From the main menu:
- Click **Data Sources** → **Databases**
- Or use the quick navigation: **Data & Discovery** → **File Sources** → **Databases**

### 2. Create a New Connection

1. Click the **New Connection** button
2. Fill in the connection details:
   - **Name**: A descriptive name for your connection
   - **Database Type**: Select PostgreSQL or MySQL
   - **Connection Details**:
     - **Host**: Database server address (e.g., localhost, db.example.com)
     - **Port**: Database port (PostgreSQL: 5432, MySQL: 3306)
     - **Database**: Name of the database to connect to
     - **Username**: Database user with read permissions
     - **Password**: Database password
   - **SSL**: Enable for secure connections (recommended for production)

3. Click **Test Connection** to verify your settings
4. Click **Create Connection** to save

### 3. Browse Database Schema

Once connected:
1. Click on your database connection to view available tables
2. Use the search box to filter tables by name
3. Click on any table to view:
   - Column names and data types
   - Primary keys and indexes
   - Foreign key relationships
   - Row count

### 4. Import Data

#### Simple Table Import
1. Navigate to a table
2. Click **Import This Table**
3. Configure import options:
   - **Import Name**: Custom name for the data source
   - **Sample Size**: Number of rows to import (empty = all rows)
4. Click **Import** to create a data source

#### SQL Query Import
1. From the database view, click **Query Import**
2. Write your SQL query in the editor
3. Configure options:
   - **Import Name**: Name for the resulting data source
   - **Row Limit**: Maximum rows to import
4. Click **Execute & Import**

#### Relational Import (Advanced)
1. Select a primary table to import
2. Click **Relational Import**
3. Configure traversal options:
   - **Maximum Depth**: How many relationships to follow (default: 2)
   - **Include Reverse Relations**: Import child records (one-to-many)
   - **Records per Relation**: Limit for related records
4. Preview the relational structure
5. Click **Import** to create nested JSON documents

## Features

### Automatic Refresh
- Set up scheduled data refreshes to keep your data current
- Configure refresh intervals from hourly to monthly
- View last refresh timestamp and status

### Schema Discovery
- Automatic detection of table structures
- Foreign key relationship mapping
- Data type identification
- Index and constraint information

### Security
- Encrypted password storage
- SSL/TLS connection support
- Read-only access recommended
- Connection pooling with timeouts

### Performance
- Streaming imports for large datasets
- Pagination support
- Query optimization
- Connection reuse

## Best Practices

### Connection Setup
1. **Use Read-Only Users**: Create dedicated database users with only SELECT permissions
2. **Enable SSL**: Always use SSL for production databases
3. **Test First**: Use the test connection feature before saving
4. **Name Clearly**: Use descriptive names that indicate the database purpose

### Data Import
1. **Start Small**: Test with limited rows before full imports
2. **Use Queries**: Write specific SQL queries to import only needed data
3. **Monitor Performance**: Large imports may take time - check progress
4. **Schedule Wisely**: Set refresh intervals based on data change frequency

### Relational Imports
1. **Limit Depth**: Keep max depth at 2-3 to avoid exponential data growth
2. **Preview First**: Always preview the relational structure before importing
3. **Watch Circular References**: The system handles these automatically
4. **Consider Size**: Relational imports can create large JSON documents

## Troubleshooting

### Connection Issues

**"Connection refused" error**
- Verify the host and port are correct
- Ensure the database server is running
- Check firewall settings allow connections

**"Authentication failed" error**
- Double-check username and password
- Ensure user has proper permissions
- Verify the database name is correct

**"SSL connection required" error**
- Enable SSL in the connection settings
- Ensure your database supports SSL connections

### Import Issues

**"Import taking too long"**
- Consider using a row limit
- Write more specific SQL queries
- Check database performance

**"Out of memory" error**
- Reduce the sample size
- Use pagination for large tables
- Consider streaming imports

**"Foreign key not found"**
- Refresh the schema
- Check database permissions include schema access
- Verify foreign keys are properly defined

### Data Issues

**"Data looks different after import"**
- Check character encoding settings
- Verify timezone handling for timestamps
- Review data type mappings

## Advanced Features

### Custom SQL Queries
```sql
-- Example: Import with joins
SELECT 
  c.id,
  c.name,
  c.email,
  o.order_date,
  o.total
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.order_date > '2024-01-01'
LIMIT 1000
```

### JSONPath Extraction
For databases storing JSON data:
- PostgreSQL: Automatically extracts JSONB columns
- MySQL: JSON columns are preserved
- Use JSONPath in transformations for nested data

### Relationship Traversal
When using relational import:
- One-to-One: Embeds related record
- One-to-Many: Creates array of related records
- Many-to-Many: Follows through junction tables
- Circular References: Adds `_ref` field with ID only

## Security Considerations

1. **Network Security**
   - Use private networks when possible
   - Configure database firewalls
   - Use VPN for remote connections

2. **Access Control**
   - Create specific users for Cirrus Data Suite
   - Grant minimum required permissions
   - Regularly rotate passwords
   - Audit connection usage

3. **Data Privacy**
   - Be aware of sensitive data during imports
   - Use SQL queries to exclude sensitive columns
   - Apply patterns and redaction after import
   - Consider data masking at the database level

## FAQ

**Q: Can I connect to multiple databases?**
A: Yes, you can create unlimited database connections and switch between them.

**Q: Is real-time sync supported?**
A: Currently, we support scheduled refreshes. Real-time CDC (Change Data Capture) is on the roadmap.

**Q: Can I modify the imported data?**
A: Imported data becomes a Data Source that you can transform, but changes don't write back to the database.

**Q: What's the maximum import size?**
A: There's no hard limit, but we recommend keeping individual imports under 1GB for optimal performance.

**Q: Can I use read replicas?**
A: Yes, connecting to read replicas is recommended for production workloads.

## Next Steps

After importing your database data:
1. Go to **Data Discovery** to explore your imported data
2. Set up **Patterns** to identify sensitive information
3. Create **Transformations** to clean and structure data
4. Build **Pipelines** to automate processing
5. Generate **Synthetic Data** based on your schema

## Need Help?

- Check the [API Documentation](/api-docs) for programmatic access
- Review [Common Workflows](/docs/common-workflows) for typical use cases
- Contact support if you encounter any issues