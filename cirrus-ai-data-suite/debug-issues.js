#!/usr/bin/env node

// Debug script to check dataset enhancement and synthetic data job issues

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function checkDataSource(dataSourceId) {
  console.log('\n=== Checking Data Source ===');
  
  // Get data source details
  const dsResponse = await fetch(`${API_BASE}/data-sources/${dataSourceId}`);
  const dataSource = await dsResponse.json();
  
  console.log('Data Source:', {
    id: dataSource.id,
    name: dataSource.name,
    type: dataSource.type,
    recordCount: dataSource.recordCount,
    hasTransformedData: !!dataSource.transformedData
  });
  
  // Check transform API
  console.log('\n=== Checking Transform API ===');
  const transformResponse = await fetch(`${API_BASE}/data-sources/${dataSourceId}/transform`);
  const transformData = await transformResponse.json();
  
  console.log('Transform Response:', {
    totalRecords: transformData.totalRecords,
    returnedRecords: transformData.records?.length,
    truncated: transformData.meta?.truncated,
    downloadUrl: transformData.meta?.downloadUrl
  });
  
  // Check download API if truncated
  if (transformData.meta?.truncated && transformData.meta?.downloadUrl) {
    console.log('\n=== Checking Download API ===');
    const downloadResponse = await fetch(`${API_BASE}${transformData.meta.downloadUrl}`);
    const fullData = await downloadResponse.json();
    
    console.log('Download Response:', {
      totalRecords: fullData.totalRecords,
      returnedRecords: fullData.records?.length,
      matches: fullData.totalRecords === fullData.records?.length
    });
  }
}

async function checkSyntheticJobs() {
  console.log('\n=== Checking Synthetic Data Jobs ===');
  
  // Get all jobs
  const jobsResponse = await fetch(`${API_BASE}/synthetic/jobs`);
  const jobs = await jobsResponse.json();
  
  console.log(`Found ${jobs.length} jobs\n`);
  
  jobs.slice(0, 5).forEach(job => {
    console.log('Job:', {
      id: job.id,
      status: job.status,
      progress: job.progress,
      recordsGenerated: job.recordsGenerated,
      datasetId: job.datasetId,
      hasOutputFile: !!job.outputFile
    });
  });
  
  // Check database directly
  console.log('\n=== Checking Database Schema ===');
  const dbResponse = await fetch(`${API_BASE}/debug/database`);
  const dbInfo = await dbResponse.json();
  
  const jobsTable = dbInfo.tables?.find(t => t.name === 'synthetic_data_jobs');
  if (jobsTable) {
    console.log('synthetic_data_jobs columns:', jobsTable.columns.map(c => c.name));
  } else {
    console.log('synthetic_data_jobs table not found!');
  }
}

// Run checks
(async () => {
  try {
    // Replace with your actual data source ID
    const dataSourceId = process.argv[2];
    
    if (dataSourceId) {
      await checkDataSource(dataSourceId);
    } else {
      console.log('Usage: node debug-issues.js <dataSourceId>');
      console.log('Checking synthetic jobs only...');
    }
    
    await checkSyntheticJobs();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();