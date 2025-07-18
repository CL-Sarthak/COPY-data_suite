import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test if we can even import the entities
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entityTests: any = {
      reflectMetadata: {
        exists: typeof Reflect !== 'undefined',
        hasGetMetadata: typeof Reflect !== 'undefined' && typeof Reflect.getMetadata === 'function',
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
      }
    };

    // Try to import entities one by one
    try {
      const { RemediationJobEntity } = await import('@/entities/RemediationJobEntity');
      entityTests.remediationJob = {
        loaded: true,
        name: RemediationJobEntity.name,
        hasPrototype: !!RemediationJobEntity.prototype,
      };
    } catch (e) {
      entityTests.remediationJob = {
        loaded: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    try {
      const { RemediationActionEntity } = await import('@/entities/RemediationActionEntity');
      entityTests.remediationAction = {
        loaded: true,
        name: RemediationActionEntity.name,
        hasPrototype: !!RemediationActionEntity.prototype,
      };
    } catch (e) {
      entityTests.remediationAction = {
        loaded: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    try {
      const { RemediationHistoryEntity } = await import('@/entities/RemediationHistoryEntity');
      entityTests.remediationHistory = {
        loaded: true,
        name: RemediationHistoryEntity.name,
        hasPrototype: !!RemediationHistoryEntity.prototype,
      };
    } catch (e) {
      entityTests.remediationHistory = {
        loaded: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // Test TypeORM decorators
    try {
      const typeorm = await import('typeorm');
      entityTests.typeorm = {
        loaded: true,
        hasEntity: typeof typeorm.Entity === 'function',
        hasColumn: typeof typeorm.Column === 'function',
        hasOneToMany: typeof typeorm.OneToMany === 'function',
        hasManyToOne: typeof typeorm.ManyToOne === 'function',
      };
    } catch (e) {
      entityTests.typeorm = {
        loaded: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      success: true,
      tests: entityTests,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}