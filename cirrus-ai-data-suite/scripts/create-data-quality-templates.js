const { Client } = require('pg');

async function createDataQualityTemplatesTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create the table
    const createTableQuery = `
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
    `;

    await client.query(createTableQuery);
    console.log('✅ Created data_quality_templates table');

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_data_quality_templates_type_category ON data_quality_templates(template_type, category);',
      'CREATE INDEX IF NOT EXISTS idx_data_quality_templates_active_system ON data_quality_templates(is_active, is_system_template);',
      'CREATE INDEX IF NOT EXISTS idx_data_quality_templates_active ON data_quality_templates(is_active);',
      'CREATE INDEX IF NOT EXISTS idx_data_quality_templates_system ON data_quality_templates(is_system_template);'
    ];

    for (const indexQuery of indexes) {
      await client.query(indexQuery);
    }
    console.log('✅ Created indexes');

    // Check if templates already exist
    const countResult = await client.query('SELECT COUNT(*) FROM data_quality_templates WHERE is_system_template = true');
    const count = parseInt(countResult.rows[0].count);

    if (count > 0) {
      console.log(`ℹ️  ${count} system templates already exist, skipping initialization`);
      return;
    }

    // Insert system templates
    const systemTemplates = [
      {
        name: 'Email Format Standardization',
        description: 'Normalizes emails to lowercase, removes spaces, validates format',
        template_type: 'remediation',
        category: 'format_standardization',
        method_name: 'standardize_email',
        parameters: { toLowerCase: true, removeSpaces: true, validateFormat: true },
        confidence_threshold: 0.95,
        risk_level: 'low',
        usage_recommendations: 'Use for email fields that need consistent formatting. Safe for all email data.',
        example_before: '"John.DOE@EXAMPLE.COM "',
        example_after: '"john.doe@example.com"',
        usage_count: 156,
        success_rate: 0.98,
        avg_processing_time_ms: 125,
        is_system_template: true,
        is_custom: false,
        tags: ['email', 'validation', 'format'],
        created_by: 'system'
      },
      {
        name: 'Z-Score Normalization',
        description: 'Standardizes data to have mean=0 and std=1. Best for normally distributed data.',
        template_type: 'normalization',
        category: 'statistical_normalization',
        method_name: 'z_score_normalize',
        configuration: { normalizationType: 'z-score', handleOutliers: true, outlierMethod: 'z-score', outlierThreshold: 3 },
        applicable_data_types: ['numeric', 'integer', 'float', 'double'],
        confidence_threshold: 0.9,
        risk_level: 'low',
        usage_recommendations: 'Use when: 1) Data is normally distributed, 2) You need to compare features with different units, 3) Outliers are not extreme.',
        example_before: '[100, 200, 300, 400, 500]',
        example_after: '[-1.41, -0.71, 0, 0.71, 1.41]',
        usage_count: 89,
        success_rate: 0.94,
        avg_processing_time_ms: 450,
        is_system_template: true,
        is_custom: false,
        tags: ['statistics', 'normalization', 'z-score', 'scaling'],
        created_by: 'system'
      },
      {
        name: 'Remove Extra Whitespace',
        description: 'Removes leading, trailing, and extra spaces',
        template_type: 'global',
        category: 'data_cleaning',
        method_name: 'trim_whitespace',
        parameters: { trimStart: true, trimEnd: true, collapseSpaces: true },
        applicable_data_types: ['string', 'text'],
        confidence_threshold: 0.99,
        risk_level: 'low',
        example_before: '"  Hello   World  "',
        example_after: '"Hello World"',
        usage_count: 324,
        success_rate: 0.99,
        avg_processing_time_ms: 50,
        is_system_template: true,
        is_custom: false,
        tags: ['cleaning', 'whitespace', 'text'],
        created_by: 'system'
      }
    ];

    for (const template of systemTemplates) {
      const insertQuery = `
        INSERT INTO data_quality_templates (
          name, description, template_type, category, method_name,
          parameters, configuration, applicable_data_types, applicable_field_patterns,
          confidence_threshold, risk_level, usage_recommendations,
          example_before, example_after, usage_count, success_rate,
          avg_processing_time_ms, is_system_template, is_custom, is_active,
          tags, version, created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19, $20,
          $21, $22, $23
        )
      `;

      await client.query(insertQuery, [
        template.name,
        template.description,
        template.template_type,
        template.category,
        template.method_name,
        JSON.stringify(template.parameters || {}),
        JSON.stringify(template.configuration || {}),
        template.applicable_data_types || null,
        template.applicable_field_patterns || null,
        template.confidence_threshold,
        template.risk_level,
        template.usage_recommendations,
        template.example_before,
        template.example_after,
        template.usage_count,
        template.success_rate,
        template.avg_processing_time_ms,
        template.is_system_template,
        template.is_custom,
        true, // is_active
        template.tags,
        1, // version
        template.created_by
      ]);
    }

    console.log(`✅ Inserted ${systemTemplates.length} system templates`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  createDataQualityTemplatesTable()
    .then(() => {
      console.log('✅ Data quality templates table setup complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to setup data quality templates table:', error);
      process.exit(1);
    });
}

module.exports = { createDataQualityTemplatesTable };