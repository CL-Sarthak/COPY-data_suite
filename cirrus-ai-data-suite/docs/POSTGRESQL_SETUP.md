# PostgreSQL Setup for Local Development

This guide helps you set up PostgreSQL for local development. The application requires PostgreSQL and no longer supports SQLite.

## Quick Start

1. **Install Docker Desktop** (if not already installed)
   - Download from: https://www.docker.com/products/docker-desktop/

2. **Set up PostgreSQL**
   ```bash
   # Start PostgreSQL
   npm run db:start
   
   # Or start PostgreSQL and dev server together
   npm run dev:db
   ```

3. **Configure Environment**
   Create a `.env.local` file:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/data_redaction_dev
   DATABASE_SSL=false
   ```

## Available Commands

- `npm run db:start` - Start PostgreSQL container
- `npm run db:stop` - Stop PostgreSQL container
- `npm run db:reset` - Reset database (deletes all data!)
- `npm run db:logs` - View PostgreSQL logs
- `npm run db:shell` - Open PostgreSQL shell
- `npm run dev:db` - Start database and dev server
- `npm run dev:clean` - Reset database and start dev server

## PostgreSQL Features

1. **Full TypeORM Compatibility** - Complete feature support
2. **Production Parity** - Same database as production
3. **Native Type Support** - Boolean, JSON, arrays, etc.
4. **Hot Reload Works** - Stable connections
5. **Better Performance** - Optimized for large datasets
6. **Concurrent Access** - Multiple connections supported

## Troubleshooting

### Port 5432 Already in Use
```bash
# Check what's using the port
lsof -i :5432

# Stop local PostgreSQL if running
brew services stop postgresql  # macOS
sudo systemctl stop postgresql # Linux
```

### Connection Refused
```bash
# Check if container is running
docker ps

# Check logs
npm run db:logs
```

### Migration Errors
```bash
# Reset database and re-run migrations
npm run db:reset
npm run migrate
```

## Data Persistence

- Data persists in Docker volume `data-redaction-postgres-data`
- Survives container restarts
- Use `npm run db:reset` to completely reset

## Database Requirements

The application requires PostgreSQL. If `DATABASE_URL` is not set, the application will display an error and request PostgreSQL configuration.