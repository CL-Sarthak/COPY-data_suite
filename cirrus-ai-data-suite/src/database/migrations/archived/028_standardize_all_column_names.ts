import { MigrationInterface, QueryRunner } from 'typeorm';

export class StandardizeAllColumnNames1750000000000 implements MigrationInterface {
  name = 'StandardizeAllColumnNames1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL-only migration for column standardization
    console.log('Running PostgreSQL column standardization migration...');
    
    // Standardize data_source_entity table to snake_case
    const dataSourceRenames = [
      { from: 'recordcount', to: 'record_count' },
      { from: 'transformeddata', to: 'transformed_data' },
      { from: 'transformedat', to: 'transformed_at' },
      { from: 'originalpath', to: 'original_path' },
      { from: 'storagekeys', to: 'storage_keys' },
      { from: 'storageprovider', to: 'storage_provider' },
      { from: 'transformationstatus', to: 'transformation_status' },
      { from: 'transformationappliedat', to: 'transformation_applied_at' },
      { from: 'transformationerrors', to: 'transformation_errors' },
      { from: 'originalfieldnames', to: 'original_field_names' },
      { from: 'createdat', to: 'created_at' },
      { from: 'updatedat', to: 'updated_at' }
    ];

    // Standardize synthetic_datasets table to snake_case
    const syntheticDatasetRenames = [
      { from: 'datatype', to: 'data_type' },
      { from: 'recordcount', to: 'record_count' },
      { from: 'filepath', to: 'file_path' },
      { from: 'outputformat', to: 'output_format' },
      { from: 'errormessage', to: 'error_message' },
      { from: 'generatedcontent', to: 'generated_content' },
      { from: 'generatedcontentsize', to: 'generated_content_size' },
      { from: 'createdat', to: 'created_at' },
      { from: 'updatedat', to: 'updated_at' }
    ];

    // Standardize synthetic_data_jobs table to snake_case
    const syntheticJobRenames = [
      { from: 'datasetid', to: 'dataset_id' },
      { from: 'recordsgenerated', to: 'records_generated' },
      { from: 'outputfile', to: 'output_file' },
      { from: 'errormessage', to: 'error_message' },
      { from: 'starttime', to: 'start_time' },
      { from: 'endtime', to: 'end_time' },
      { from: 'updatedat', to: 'updated_at' }
    ];

    // Standardize upload_sessions table to snake_case
    const uploadSessionRenames = [
      { from: 'uploadid', to: 'upload_id' },
      { from: 'filename', to: 'file_name' },
      { from: 'filesize', to: 'file_size' },
      { from: 'mimetype', to: 'mime_type' },
      { from: 'chunksize', to: 'chunk_size' },
      { from: 'totalchunks', to: 'total_chunks' },
      { from: 'uploadedchunks', to: 'uploaded_chunks' },
      { from: 'storagekey', to: 'storage_key' },
      { from: 'starttime', to: 'start_time' },
      { from: 'lastactivity', to: 'last_activity' }
    ];

    // Apply renames for data_source_entity
    for (const rename of dataSourceRenames) {
      try {
        await queryRunner.query(
          `ALTER TABLE data_source_entity RENAME COLUMN "${rename.from}" TO "${rename.to}"`
        );
      } catch {
        console.log(`Column ${rename.from} might already be renamed or not exist`);
      }
    }

    // Apply renames for synthetic_datasets
    for (const rename of syntheticDatasetRenames) {
      try {
        await queryRunner.query(
          `ALTER TABLE synthetic_datasets RENAME COLUMN "${rename.from}" TO "${rename.to}"`
        );
      } catch {
        console.log(`Column ${rename.from} might already be renamed or not exist`);
      }
    }

    // Apply renames for synthetic_data_jobs
    for (const rename of syntheticJobRenames) {
      try {
        await queryRunner.query(
          `ALTER TABLE synthetic_data_jobs RENAME COLUMN "${rename.from}" TO "${rename.to}"`
        );
      } catch {
        console.log(`Column ${rename.from} might already be renamed or not exist`);
      }
    }

    // Apply renames for upload_sessions
    for (const rename of uploadSessionRenames) {
      try {
        await queryRunner.query(
          `ALTER TABLE upload_sessions RENAME COLUMN "${rename.from}" TO "${rename.to}"`
        );
      } catch {
        console.log(`Column ${rename.from} might already be renamed or not exist`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the changes (PostgreSQL only)
    
    // Reverse data_source_entity
    const dataSourceRenames = [
      { from: 'record_count', to: 'recordcount' },
      { from: 'transformed_data', to: 'transformeddata' },
      { from: 'transformed_at', to: 'transformedat' },
      { from: 'original_path', to: 'originalpath' },
      { from: 'storage_keys', to: 'storagekeys' },
      { from: 'storage_provider', to: 'storageprovider' },
      { from: 'transformation_status', to: 'transformationstatus' },
      { from: 'transformation_applied_at', to: 'transformationappliedat' },
      { from: 'transformation_errors', to: 'transformationerrors' },
      { from: 'original_field_names', to: 'originalfieldnames' },
      { from: 'created_at', to: 'createdat' },
      { from: 'updated_at', to: 'updatedat' }
    ];

    // Reverse synthetic_datasets
    const syntheticDatasetRenames = [
      { from: 'data_type', to: 'datatype' },
      { from: 'record_count', to: 'recordcount' },
      { from: 'file_path', to: 'filepath' },
      { from: 'output_format', to: 'outputformat' },
      { from: 'error_message', to: 'errormessage' },
      { from: 'generated_content', to: 'generatedcontent' },
      { from: 'generated_content_size', to: 'generatedcontentsize' },
      { from: 'created_at', to: 'createdat' },
      { from: 'updated_at', to: 'updatedat' }
    ];

    // Reverse synthetic_data_jobs
    const syntheticJobRenames = [
      { from: 'dataset_id', to: 'datasetid' },
      { from: 'records_generated', to: 'recordsgenerated' },
      { from: 'output_file', to: 'outputfile' },
      { from: 'error_message', to: 'errormessage' },
      { from: 'start_time', to: 'starttime' },
      { from: 'end_time', to: 'endtime' },
      { from: 'updated_at', to: 'updatedat' }
    ];

    // Reverse upload_sessions
    const uploadSessionRenames = [
      { from: 'upload_id', to: 'uploadid' },
      { from: 'file_name', to: 'filename' },
      { from: 'file_size', to: 'filesize' },
      { from: 'mime_type', to: 'mimetype' },
      { from: 'chunk_size', to: 'chunksize' },
      { from: 'total_chunks', to: 'totalchunks' },
      { from: 'uploaded_chunks', to: 'uploadedchunks' },
      { from: 'storage_key', to: 'storagekey' },
      { from: 'start_time', to: 'starttime' },
      { from: 'last_activity', to: 'lastactivity' }
    ];

    // Apply all reverses
    for (const rename of dataSourceRenames) {
      try {
        await queryRunner.query(
          `ALTER TABLE data_source_entity RENAME COLUMN "${rename.from}" TO "${rename.to}"`
        );
      } catch {
        console.log(`Column ${rename.from} might not exist`);
      }
    }

    for (const rename of syntheticDatasetRenames) {
      try {
        await queryRunner.query(
          `ALTER TABLE synthetic_datasets RENAME COLUMN "${rename.from}" TO "${rename.to}"`
        );
      } catch {
        console.log(`Column ${rename.from} might not exist`);
      }
    }

    for (const rename of syntheticJobRenames) {
      try {
        await queryRunner.query(
          `ALTER TABLE synthetic_data_jobs RENAME COLUMN "${rename.from}" TO "${rename.to}"`
        );
      } catch {
        console.log(`Column ${rename.from} might not exist`);
      }
    }

    for (const rename of uploadSessionRenames) {
      try {
        await queryRunner.query(
          `ALTER TABLE upload_sessions RENAME COLUMN "${rename.from}" TO "${rename.to}"`
        );
      } catch {
        console.log(`Column ${rename.from} might not exist`);
      }
    }
  }
}