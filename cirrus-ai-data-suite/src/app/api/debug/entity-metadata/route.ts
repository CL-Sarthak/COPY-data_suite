import { NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    // First, let's see what's happening before we even get the database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const debugInfo: any = {
      nodeVersion: process.version,
      env: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV,
      reflectMetadataExists: typeof Reflect !== 'undefined' && typeof Reflect.getMetadata === 'function',
    };

    try {
      const db = await getDatabase();
      
      // Get all entity metadata
      const metadata = db.entityMetadatas.map(meta => {
        const relationsDebug = meta.relations.map(rel => {
          // Log the raw relation data
          const rawData = {
            propertyName: rel.propertyName,
            type: typeof rel.type,
            typeString: typeof rel.type === 'string' ? rel.type : (typeof rel.type === 'function' ? rel.type.name : 'unknown'),
            inverseSidePropertyPath: rel.inverseSidePropertyPath,
            inverseSidePropertyPathType: typeof rel.inverseSidePropertyPath,
            // Check if it contains the corrupted pattern
            hasCorruption: rel.inverseSidePropertyPath && typeof rel.inverseSidePropertyPath === 'string' && rel.inverseSidePropertyPath.includes('#'),
            relationType: rel.relationType,
          };
          
          // Log any corruption immediately
          if (rawData.hasCorruption) {
            logger.error(`CORRUPTION DETECTED in ${meta.name}.${rel.propertyName}: inversePath = ${rel.inverseSidePropertyPath}`);
          }
          
          return rawData;
        });
        
        return {
          name: meta.name,
          tableName: meta.tableName,
          targetName: meta.target.constructor.name,
          relations: relationsDebug
        };
      });
      
      // Look for any issues with RemediationActionEntity
      const remediationActionMeta = metadata.find(m => m.name === 'RemediationActionEntity');
      const remediationJobMeta = metadata.find(m => m.name === 'RemediationJobEntity');
      const remediationHistoryMeta = metadata.find(m => m.name === 'RemediationHistoryEntity');
      
      // Check for the specific d#actions corruption
      const corruptedRelations = metadata.flatMap(m => 
        m.relations
          .filter(r => r.hasCorruption)
          .map(r => ({ entity: m.name, relation: r }))
      );
      
      return NextResponse.json({
        success: true,
        debugInfo,
        totalEntities: metadata.length,
        entities: metadata,
        remediationEntities: {
          action: remediationActionMeta,
          job: remediationJobMeta,
          history: remediationHistoryMeta
        },
        corruptedRelations,
        // Raw TypeORM version info
        typeormInfo: {
          hasDataSource: !!db,
          isInitialized: db.isInitialized,
          driver: db.driver.options.type,
        }
      });
    } catch (dbError) {
      // If we can't even get the database, return what we know
      return NextResponse.json({
        success: false,
        debugInfo,
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined,
        phase: 'database_initialization'
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Entity metadata debug error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      phase: 'route_handler'
    }, { status: 500 });
  }
}