import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixColumnCaseSensitivity1736627400022 implements MigrationInterface {
  name = 'FixColumnCaseSensitivity1736627400022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get database type
    const dbType = queryRunner.connection.options.type;
    
    // Only run for PostgreSQL - SQLite is case-insensitive
    if (dbType === 'postgres') {
      // First, check which columns exist with wrong case
      try {
        // Fix patterns table columns if they exist with wrong case
        const patternColumns = await queryRunner.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'patterns' 
          AND lower(column_name) IN ('isactive', 'regexpatterns', 'accuracymetrics', 'lastrefinedat', 
                                     'feedbackcount', 'positivecount', 'negativecount', 
                                     'excludedexamples', 'confidencethreshold', 'autorefinethreshold',
                                     'createdat', 'updatedat')
        `);

        for (const col of patternColumns) {
          const columnName = col.column_name;
          let correctName = columnName;
          
          // Map to correct camelCase
          const caseMap: Record<string, string> = {
            'isactive': 'isActive',
            'regexpatterns': 'regexPatterns',
            'accuracymetrics': 'accuracyMetrics',
            'lastrefinedat': 'lastRefinedAt',
            'feedbackcount': 'feedbackCount',
            'positivecount': 'positiveCount',
            'negativecount': 'negativeCount',
            'excludedexamples': 'excludedExamples',
            'confidencethreshold': 'confidenceThreshold',
            'autorefinethreshold': 'autoRefineThreshold',
            'createdat': 'createdAt',
            'updatedat': 'updatedAt'
          };
          
          correctName = caseMap[columnName.toLowerCase()] || columnName;
          
          if (columnName !== correctName) {
            console.log(`Renaming column ${columnName} to ${correctName} in patterns table`);
            await queryRunner.query(`
              ALTER TABLE patterns 
              RENAME COLUMN "${columnName}" TO "${correctName}"
            `);
          }
        }
        
        // Fix pattern_feedback table columns if they exist with wrong case
        const feedbackColumns = await queryRunner.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'pattern_feedback' 
          AND lower(column_name) IN ('patternid', 'feedbacktype', 'matchedtext', 
                                     'surroundingcontext', 'originalconfidence', 'usercomment',
                                     'datasourceid', 'sessionid', 'userid', 'createdat', 'updatedat')
        `);

        for (const col of feedbackColumns) {
          const columnName = col.column_name;
          let correctName = columnName;
          
          // Map to correct camelCase
          const caseMap: Record<string, string> = {
            'patternid': 'patternId',
            'feedbacktype': 'feedbackType',
            'matchedtext': 'matchedText',
            'surroundingcontext': 'surroundingContext',
            'originalconfidence': 'originalConfidence',
            'usercomment': 'userComment',
            'datasourceid': 'dataSourceId',
            'sessionid': 'sessionId',
            'userid': 'userId',
            'createdat': 'createdAt',
            'updatedat': 'updatedAt'
          };
          
          correctName = caseMap[columnName.toLowerCase()] || columnName;
          
          if (columnName !== correctName) {
            console.log(`Renaming column ${columnName} to ${correctName} in pattern_feedback table`);
            await queryRunner.query(`
              ALTER TABLE pattern_feedback 
              RENAME COLUMN "${columnName}" TO "${correctName}"
            `);
          }
        }
        
      } catch (error) {
        console.error('Error fixing column case sensitivity:', error);
        // Continue anyway - columns might already be correct
      }
    }
  }

  public async down(): Promise<void> {
    // Don't reverse case changes
    console.log('Column case sensitivity fix cannot be rolled back');
  }
}