require('dotenv').config();
const { getDatabase } = require('../dist/database/connection');

async function fixTemplatesTable() {
  try {
    console.log('🔧 Fixing data quality templates table...');
    
    const db = await getDatabase();
    console.log('✅ Database connection established');
    
    // Create table using raw SQL
    console.log('📋 Creating data_quality_templates table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS data_quality_templates (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('remediation', 'normalization', 'global')),
        category VARCHAR(50) NOT NULL CHECK (category IN ('data_cleaning', 'format_standardization', 'statistical_normalization', 'validation', 'enrichment', 'custom')),
        method_name VARCHAR(100) NOT NULL,
        parameters JSONB DEFAULT '{}',
        configuration JSONB DEFAULT '{}',
        applicable_data_types TEXT[],
        applicable_field_patterns TEXT[],
        confidence_threshold DECIMAL(4,3) DEFAULT 0.8,
        risk_level VARCHAR(10) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
        usage_recommendations TEXT,
        example_before JSONB,
        example_after JSONB,
        usage_count INTEGER DEFAULT 0,
        success_rate DECIMAL(4,3),
        avg_processing_time_ms INTEGER,
        last_used_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        is_system_template BOOLEAN DEFAULT false,
        is_custom BOOLEAN DEFAULT false,
        tags TEXT[],
        version INTEGER DEFAULT 1,
        parent_template_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255) NOT NULL,
        updated_by VARCHAR(255)
      );
    `);
    console.log('✅ Table created or already exists');
    
    // Create indexes
    console.log('📋 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_dqt_type_category ON data_quality_templates(template_type, category);',
      'CREATE INDEX IF NOT EXISTS idx_dqt_active_system ON data_quality_templates(is_active, is_system_template);',
      'CREATE INDEX IF NOT EXISTS idx_dqt_active ON data_quality_templates(is_active);',
      'CREATE INDEX IF NOT EXISTS idx_dqt_system ON data_quality_templates(is_system_template);'
    ];
    
    for (const indexQuery of indexes) {
      await db.query(indexQuery);
    }
    console.log('✅ Indexes created');
    
    // Check current count
    const countResult = await db.query('SELECT COUNT(*) as count FROM data_quality_templates');
    console.log(`📊 Current template count: ${countResult[0].count}`);
    
    // Insert a test template
    if (countResult[0].count === '0' || countResult[0].count === 0) {
      console.log('📋 Inserting test template...');
      await db.query(`
        INSERT INTO data_quality_templates (
          name, description, template_type, category, method_name,
          parameters, configuration, confidence_threshold, risk_level,
          is_system_template, is_custom, is_active, created_by
        ) VALUES (
          'Test Email Template',
          'Test template for email standardization',
          'remediation',
          'format_standardization',
          'standardize_email',
          '{"toLowerCase": true}',
          '{}',
          0.95,
          'low',
          true,
          false,
          true,
          'system'
        ) ON CONFLICT (name) DO NOTHING;
      `);
      console.log('✅ Test template inserted');
    }
    
    // Verify
    const templates = await db.query('SELECT id, name, template_type FROM data_quality_templates LIMIT 5');
    console.log('📋 Templates in database:');
    templates.forEach(t => {
      console.log(`  - ${t.name} (${t.template_type})`);
    });
    
    console.log('✅ Data quality templates table fixed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTemplatesTable();