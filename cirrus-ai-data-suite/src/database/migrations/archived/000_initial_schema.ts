import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1750000000000 implements MigrationInterface {
  name = 'InitialSchema1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create migration_tracker table first if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "migration_tracker" (
        "id" SERIAL PRIMARY KEY,
        "migration_name" VARCHAR(255) NOT NULL UNIQUE,
        "run_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create data_source_entity table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "data_source_entity" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "path" varchar,
        "connection_status" varchar NOT NULL DEFAULT 'connected',
        "configuration" text NOT NULL,
        "metadata" text,
        "original_path" text,
        "storage_keys" text,
        "storage_provider" varchar DEFAULT 'database',
        "transformed_data" text,
        "transformed_at" timestamp,
        "record_count" integer DEFAULT 0,
        "transformation_status" varchar DEFAULT 'not_started',
        "last_sync" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create patterns table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patterns" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "category" varchar NOT NULL,
        "regex" varchar,
        "regex_patterns" text DEFAULT '[]',
        "examples" text NOT NULL,
        "description" varchar NOT NULL,
        "color" varchar NOT NULL,
        "is_active" boolean DEFAULT true,
        "accuracy_metrics" text,
        "last_refined_at" timestamp,
        "feedback_count" integer DEFAULT 0,
        "positive_count" integer DEFAULT 0,
        "negative_count" integer DEFAULT 0,
        "excluded_examples" text,
        "confidence_threshold" float DEFAULT 0.7,
        "auto_refine_threshold" integer DEFAULT 3,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create annotation_session table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "annotation_session" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "data_source_id" uuid NOT NULL,
        "pattern_id" uuid NOT NULL,
        "start_time" timestamp NOT NULL DEFAULT now(),
        "end_time" timestamp,
        "annotations_count" integer DEFAULT 0,
        "completed" boolean DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create processed_file table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_file" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "file_name" varchar NOT NULL,
        "original_path" varchar NOT NULL,
        "redacted_path" varchar,
        "status" varchar NOT NULL DEFAULT 'pending',
        "patterns_found" text,
        "redaction_summary" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create synthetic_datasets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "synthetic_datasets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "schema" text NOT NULL,
        "examples" text NOT NULL,
        "parameters" text NOT NULL,
        "datatype" varchar NOT NULL,
        "records_count" integer DEFAULT 0,
        "generation_status" varchar DEFAULT 'draft',
        "content" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create synthetic_data_jobs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "synthetic_data_jobs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "dataset_id" uuid NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "progress" integer NOT NULL DEFAULT 0,
        "records_generated" integer NOT NULL DEFAULT 0,
        "output_file" text,
        "error_message" text,
        "start_time" timestamp NOT NULL DEFAULT now(),
        "end_time" timestamp,
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_synthetic_data_jobs_dataset" FOREIGN KEY ("dataset_id") 
          REFERENCES "synthetic_datasets"("id") ON DELETE CASCADE
      )
    `);

    // Create catalog_field table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "catalog_field" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "catalog_id" varchar NOT NULL,
        "field_name" varchar NOT NULL,
        "field_description" text,
        "field_type" varchar NOT NULL,
        "category_id" varchar,
        "tags" text DEFAULT '[]',
        "data_classification" varchar DEFAULT 'internal',
        "metadata" text,
        "original_field_names" text DEFAULT '[]',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create field_mapping table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "field_mapping" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "source_field_id" uuid NOT NULL,
        "target_field_id" uuid NOT NULL,
        "mapping_type" varchar NOT NULL,
        "confidence" float DEFAULT 1,
        "metadata" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create catalog_category table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "catalog_category" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "display_name" varchar,
        "description" text,
        "color" varchar DEFAULT '#3B82F6',
        "icon" varchar,
        "parent_id" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create pipeline table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pipeline" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "configuration" text NOT NULL,
        "status" varchar DEFAULT 'draft',
        "last_run_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create upload_sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "upload_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "file_name" varchar NOT NULL,
        "total_size" integer NOT NULL,
        "uploaded_size" integer DEFAULT 0,
        "chunks_total" integer DEFAULT 0,
        "chunks_received" integer DEFAULT 0,
        "status" varchar DEFAULT 'active',
        "metadata" text,
        "error_message" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "expires_at" timestamp NOT NULL
      )
    `);

    // Create pattern_feedback table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pattern_feedback" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "pattern_id" uuid NOT NULL,
        "text" varchar NOT NULL,
        "feedback_type" varchar NOT NULL,
        "session_id" varchar,
        "user_id" varchar,
        "metadata" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_pattern_feedback_pattern" FOREIGN KEY ("pattern_id") 
          REFERENCES "patterns"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_data_source_type" ON "data_source_entity"("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_data_source_created" ON "data_source_entity"("created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pattern_type" ON "patterns"("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pattern_category" ON "patterns"("category")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pattern_active" ON "patterns"("is_active")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_catalog_field_catalog" ON "catalog_field"("catalog_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_catalog_field_category" ON "catalog_field"("category_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pattern_feedback_pattern" ON "pattern_feedback"("pattern_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pattern_feedback_type" ON "pattern_feedback"("feedback_type")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "pattern_feedback"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "upload_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pipeline"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "field_mapping"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "catalog_field"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "synthetic_data_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "synthetic_datasets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_file"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "annotation_session"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "patterns"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "data_source_entity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "catalog_category"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "migration_tracker"`);
  }
}