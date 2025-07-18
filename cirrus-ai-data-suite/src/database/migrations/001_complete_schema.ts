import { QueryRunner } from 'typeorm';

export class CompleteSchema1750000001000 {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Create migration tracker table first
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS migration_tracker (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create data_source_entity table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_source_entity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        path VARCHAR(255),
        configuration TEXT NOT NULL,
        metadata TEXT,
        record_count INTEGER,
        tags TEXT,
        transformed_data TEXT,
        transformed_at TIMESTAMP,
        original_path VARCHAR(255),
        storage_keys TEXT,
        storage_provider VARCHAR(255),
        transformation_status VARCHAR(255) DEFAULT 'not_started',
        transformation_applied_at TIMESTAMP,
        transformation_errors TEXT,
        original_field_names TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to data_source_entity if they don't exist
    const dataSourceColumns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'data_source_entity'
    `);
    
    const existingColumns = dataSourceColumns.map((col: { column_name: string }) => col.column_name);
    
    // Add type column if missing
    if (!existingColumns.includes('type')) {
      await queryRunner.query(`
        ALTER TABLE data_source_entity 
        ADD COLUMN type VARCHAR(255) DEFAULT 'filesystem'
      `);
    }
    
    // Add other potentially missing columns
    if (!existingColumns.includes('path')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN path VARCHAR(255)`);
    }
    if (!existingColumns.includes('configuration')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN configuration TEXT`);
    }
    if (!existingColumns.includes('metadata')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN metadata TEXT`);
    }
    if (!existingColumns.includes('record_count')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN record_count INTEGER`);
    }
    if (!existingColumns.includes('tags')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN tags TEXT`);
    }
    if (!existingColumns.includes('transformed_data')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN transformed_data TEXT`);
    }
    if (!existingColumns.includes('transformed_at')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN transformed_at TIMESTAMP`);
    }
    if (!existingColumns.includes('original_path')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN original_path VARCHAR(255)`);
    }
    if (!existingColumns.includes('storage_keys')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN storage_keys TEXT`);
    }
    if (!existingColumns.includes('storage_provider')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN storage_provider VARCHAR(255)`);
    }
    if (!existingColumns.includes('transformation_status')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN transformation_status VARCHAR(255) DEFAULT 'not_started'`);
    }
    if (!existingColumns.includes('transformation_applied_at')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN transformation_applied_at TIMESTAMP`);
    }
    if (!existingColumns.includes('transformation_errors')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN transformation_errors TEXT`);
    }
    if (!existingColumns.includes('original_field_names')) {
      await queryRunner.query(`ALTER TABLE data_source_entity ADD COLUMN original_field_names TEXT`);
    }

    // Create patterns table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL DEFAULT 'CUSTOM',
        category VARCHAR(255),
        regex VARCHAR(255),
        regex_patterns TEXT DEFAULT '[]',
        examples TEXT NOT NULL,
        description TEXT NOT NULL,
        color VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        accuracy_metrics TEXT,
        last_refined_at TIMESTAMP,
        feedback_count INTEGER DEFAULT 0,
        positive_count INTEGER DEFAULT 0,
        negative_count INTEGER DEFAULT 0,
        excluded_examples TEXT,
        confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
        auto_refine_threshold INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create annotation_sessions table (renamed from annotation_session)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS annotation_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        data_source_id UUID NOT NULL,
        user_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        total_items INTEGER DEFAULT 0,
        annotated_items INTEGER DEFAULT 0,
        annotations JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (data_source_id) REFERENCES data_source_entity(id) ON DELETE CASCADE
      )
    `);

    // Create processed_files table (renamed from processed_file)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS processed_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_file_name VARCHAR(255) NOT NULL,
        processed_file_path TEXT,
        redaction_summary JSON,
        processing_status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create synthetic_datasets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS synthetic_datasets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        data_type VARCHAR(100) NOT NULL,
        schema JSON,
        records_count INTEGER DEFAULT 0,
        examples TEXT,
        parameters TEXT,
        generation_status VARCHAR(50) DEFAULT 'draft',
        content TEXT,
        generated_content TEXT,
        generated_content_size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create synthetic_data_jobs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS synthetic_data_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dataset_id UUID NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        records_generated INTEGER DEFAULT 0,
        output_file TEXT,
        error_message TEXT,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dataset_id) REFERENCES synthetic_datasets(id) ON DELETE CASCADE
      )
    `);

    // Create catalog_category table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS catalog_category (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(255),
        description TEXT,
        color VARCHAR(50) DEFAULT '#6b7280',
        icon VARCHAR(100),
        sort_order INTEGER DEFAULT 999,
        is_standard BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create catalog_field table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS catalog_field (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        data_type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        is_required BOOLEAN DEFAULT false,
        is_standard BOOLEAN DEFAULT false,
        validation_rules TEXT,
        tags TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add catalog_field_id column to patterns table if it doesn't exist
    const columnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patterns' 
      AND column_name = 'catalog_field_id'
    `);
    
    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN catalog_field_id UUID
      `);
      
      await queryRunner.query(`
        ALTER TABLE patterns
        ADD CONSTRAINT fk_patterns_catalog_field 
        FOREIGN KEY (catalog_field_id) REFERENCES catalog_field(id) ON DELETE SET NULL
      `);
    }

    // Create field_mapping table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS field_mapping (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id UUID NOT NULL,
        source_field_name VARCHAR(255) NOT NULL,
        catalog_field_id UUID NOT NULL,
        transformation_rule TEXT,
        confidence DECIMAL(3,2) DEFAULT 0.00,
        is_manual BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_id) REFERENCES data_source_entity(id) ON DELETE CASCADE,
        FOREIGN KEY (catalog_field_id) REFERENCES catalog_field(id) ON DELETE CASCADE,
        UNIQUE(source_id, source_field_name)
      )
    `);

    // Create pipeline table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pipeline (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        nodes TEXT,
        edges TEXT,
        triggers TEXT,
        schedule TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        created_by VARCHAR(255),
        tags TEXT,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create database_connections table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS database_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL,
        database VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255),
        ssl BOOLEAN DEFAULT false,
        ssl_cert TEXT,
        additional_options TEXT,
        status VARCHAR(50) DEFAULT 'inactive',
        error_message TEXT,
        last_tested_at TIMESTAMP,
        created_by VARCHAR(255),
        tags TEXT,
        description TEXT,
        refresh_enabled BOOLEAN DEFAULT false,
        refresh_interval INTEGER,
        last_refresh_at TIMESTAMP,
        next_refresh_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create upload_sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS upload_sessions (
        upload_id VARCHAR(255) PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(255) NOT NULL,
        chunk_size INTEGER NOT NULL,
        total_chunks INTEGER NOT NULL,
        uploaded_chunks TEXT,
        status VARCHAR(50) DEFAULT 'active',
        storage_key VARCHAR(255),
        metadata TEXT,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create pattern_feedback table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pattern_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pattern_id UUID NOT NULL,
        matched_text TEXT NOT NULL,
        feedback_type VARCHAR(50) NOT NULL,
        is_correct BOOLEAN NOT NULL,
        context TEXT,
        user_id VARCHAR(255),
        session_id VARCHAR(255),
        reason VARCHAR(255),
        suggested_pattern TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance (run each separately to avoid errors)
    // Only create indexes if the columns exist
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_data_source_type ON data_source_entity(type)`);
    } catch (e) {
      console.log('Index idx_data_source_type skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(pattern_type)`);
    } catch (e) {
      console.log('Index idx_patterns_type skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patterns_active ON patterns(is_active)`);
    } catch (e) {
      console.log('Index idx_patterns_active skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_field_mapping_source ON field_mapping(source_id)`);
    } catch (e) {
      console.log('Index idx_field_mapping_source skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_field_mapping_catalog ON field_mapping(catalog_field_id)`);
    } catch (e) {
      console.log('Index idx_field_mapping_catalog skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_catalog_field_category ON catalog_field(category)`);
    } catch (e) {
      console.log('Index idx_catalog_field_category skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_catalog_field_is_standard ON catalog_field(is_standard)`);
    } catch (e) {
      console.log('Index idx_catalog_field_is_standard skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pattern_feedback_pattern ON pattern_feedback(pattern_id)`);
    } catch (e) {
      console.log('Index idx_pattern_feedback_pattern skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pattern_feedback_type ON pattern_feedback(feedback_type)`);
    } catch (e) {
      console.log('Index idx_pattern_feedback_type skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status)`);
    } catch (e) {
      console.log('Index idx_upload_sessions_status skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_database_connections_type ON database_connections(type)`);
    } catch (e) {
      console.log('Index idx_database_connections_type skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_database_connections_status ON database_connections(status)`);
    } catch (e) {
      console.log('Index idx_database_connections_status skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    try {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_database_connections_refresh ON database_connections(refresh_enabled, next_refresh_at) WHERE refresh_enabled = true`);
    } catch (e) {
      console.log('Index idx_database_connections_refresh skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async down(_queryRunner: QueryRunner): Promise<void> {
    // We don't implement down for the complete schema
    // If needed, use the reset script
  }
}