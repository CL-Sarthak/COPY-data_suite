import { NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { KeywordGenerationService } from '@/services/keywordGenerationService';
import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    // Find the patients database
    const allDataSources = await DataSourceService.getAllDataSources();
    const patientsDb = allDataSources.find(ds => ds.name.toLowerCase().includes('patients'));
    
    if (!patientsDb) {
      return NextResponse.json({ error: 'Patients database not found' }, { status: 404 });
    }
    
    logger.info(`Found patients database: ${patientsDb.name} (${patientsDb.id})`);
    
    // First, let's add a summary that mentions PII
    const db = await getDatabase();
    const repository = db.getRepository(DataSourceEntity);
    
    const piiSummary = `This database contains comprehensive patient medical records with extensive personally identifiable information (PII) including patient names, social security numbers, medical record numbers, dates of birth, addresses, phone numbers, email addresses, insurance information, and detailed medical history. The data includes sensitive health information such as diagnoses, medications, allergies, lab results, vital signs, and appointment history. This is a HIPAA-protected dataset containing highly sensitive PII and PHI (Protected Health Information) that requires strict access controls and data protection measures.`;
    
    // Update the summary
    await repository.update(patientsDb.id, {
      aiSummary: piiSummary,
      userSummary: undefined // Clear user summary to use AI summary
    });
    
    logger.info('Updated summary for patients database');
    
    // Now regenerate keywords with the new summary
    const keywords = await KeywordGenerationService.generateKeywords(patientsDb.id);
    
    // Also manually add PII-related keywords if they're not included
    if (keywords && !keywords.keywords.some(kw => kw.toLowerCase().includes('pii'))) {
      const enhancedKeywords = [
        ...keywords.keywords,
        'PII',
        'personally identifiable information',
        'PHI',
        'protected health information',
        'HIPAA',
        'sensitive data',
        'personal data',
        'confidential',
        'privacy'
      ];
      
      await repository.update(patientsDb.id, {
        aiKeywords: JSON.stringify(enhancedKeywords),
        keywordsGeneratedAt: new Date()
      });
      
      logger.info('Enhanced keywords with PII terms');
      
      return NextResponse.json({
        success: true,
        dataSource: patientsDb.name,
        updatedSummary: piiSummary,
        keywords: enhancedKeywords,
        message: 'Successfully updated summary and keywords for patients database'
      });
    }
    
    return NextResponse.json({
      success: true,
      dataSource: patientsDb.name,
      updatedSummary: piiSummary,
      keywords: keywords?.keywords || [],
      message: 'Successfully updated summary and regenerated keywords'
    });
    
  } catch (error) {
    logger.error('Failed to regenerate patient keywords:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate keywords' },
      { status: 500 }
    );
  }
}