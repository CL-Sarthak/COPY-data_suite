# Client-Server Code Separation

## Problem

When refactoring the Dashboard component, we encountered a critical error:

```
TypeError: Cannot read properties of undefined (reading 'type')
    at EntityManagerFactory.create
```

This occurred because:
1. The `dashboardService.ts` contained both client and server code
2. The service was importing TypeORM entities and database connections
3. These imports were being bundled into the browser code
4. TypeORM cannot run in the browser environment

## Solution

We separated the service into two parts:

### 1. Server-Side Service (`dashboardService.ts`)
- Contains database logic
- Imports TypeORM entities
- Used only in API routes
- Handles data fetching from database

### 2. Client-Side Service (`dashboardClientService.ts`)
- Browser-safe operations only
- No database imports
- Data parsing and formatting
- Utility functions

## Implementation

```typescript
// Before: Mixed concerns in dashboardService.ts
import { getDatabase } from '@/database/connection'; // ❌ Browser unsafe
import { DataSourceEntity } from '@/entities/DataSourceEntity'; // ❌ Browser unsafe

export class DashboardService {
  static async getDashboardMetrics() { /* DB logic */ }
  static formatRelativeTime() { /* Utility */ }
  static parseDashboardData() { /* Parser */ }
}

// After: Separated services
// dashboardService.ts (server only)
export class DashboardService {
  static async getDashboardMetrics() { /* DB logic */ }
}

// dashboardClientService.ts (browser safe)
export class DashboardClientService {
  static formatRelativeTime() { /* Utility */ }
  static parseDashboardData() { /* Parser */ }
}
```

## Key Principles

1. **Server-Only Imports**: Database connections, TypeORM entities, and server utilities should never be imported in client components

2. **Client Components**: Components marked with `'use client'` can only import browser-safe code

3. **API Boundaries**: Data fetching happens through API routes, which act as the boundary between client and server

4. **Shared Types**: Type definitions can be shared between client and server

## Checklist for Client-Safe Code

✅ No database imports
✅ No TypeORM entity imports
✅ No file system operations
✅ No server-only dependencies
✅ Uses fetch() for data retrieval
✅ All async operations are browser-compatible

## Common Patterns

### Pattern 1: Data Fetching
```typescript
// Client component
const response = await fetch('/api/dashboard');
const data = await response.json();

// API route (server)
import { DashboardService } from '@/services/dashboardService';
const metrics = await DashboardService.getDashboardMetrics();
return Response.json(metrics);
```

### Pattern 2: Shared Utilities
```typescript
// Shared utility (can be used anywhere)
export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

// Client-only utility
export function updateDOM(element: HTMLElement): void {
  element.classList.add('active');
}

// Server-only utility
export async function queryDatabase(): Promise<void> {
  const db = await getDatabase();
  // ...
}
```

## Benefits

1. **No Runtime Errors**: Server code won't accidentally run in browser
2. **Smaller Bundle Size**: Server dependencies aren't bundled
3. **Clear Boundaries**: Obvious what runs where
4. **Better Security**: Database logic stays on server
5. **Improved Performance**: Less JavaScript sent to browser