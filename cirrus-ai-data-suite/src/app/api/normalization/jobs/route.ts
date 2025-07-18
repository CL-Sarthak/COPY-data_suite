import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

/**
 * GET /api/normalization/jobs
 * Get normalization jobs with optional filtering
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      dataSourceId: searchParams.get('dataSourceId') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    console.log('Normalization Jobs API: Getting jobs with filters:', filters);

    // Get jobs from memory or initialize with default mock jobs
    let allJobs = global.mockNormalizationJobs || [];
    
    if (allJobs.length === 0) {
      // Initialize with some default mock jobs if none exist
      allJobs = [
        {
          id: 'norm-job-1',
          name: 'Email Format Standardization',
          dataSourceId: 'ds-1',
          dataSourceName: 'Customer Database',
          status: 'completed',
          totalRecords: 1000,
          normalizedRecords: 950,
          skippedRecords: 50,
          confidence: 0.95,
          operationType: 'normalization',
          templatesApplied: ['email-normalize', 'phone-normalize'],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'norm-job-2',
          name: 'Address Standardization',
          dataSourceId: 'ds-2',
          dataSourceName: 'Contact List',
          status: 'running',
          totalRecords: 500,
          normalizedRecords: 200,
          skippedRecords: 15,
          confidence: 0.88,
          operationType: 'normalization',
          templatesApplied: ['address-normalize', 'postal-code-normalize'],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          startedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString()
        }
      ];
      global.mockNormalizationJobs = allJobs;
    }
    
    // Apply filters
    let filteredJobs = allJobs;
    if (filters.status) {
      filteredJobs = filteredJobs.filter(j => j.status === filters.status);
    }
    if (filters.dataSourceId) {
      filteredJobs = filteredJobs.filter(j => j.dataSourceId === filters.dataSourceId);
    }
    
    // Apply pagination
    // const _total = filteredJobs.length;
    if (filters.offset) {
      filteredJobs = filteredJobs.slice(filters.offset);
    }
    if (filters.limit && filteredJobs.length > filters.limit) {
      filteredJobs = filteredJobs.slice(0, filters.limit);
    }

    console.log('Normalization Jobs API: Returning', filteredJobs.length, 'jobs');
    
    return successResponse(filteredJobs);
  } catch (error) {
    console.error('Normalization Jobs API Error:', error);
    return errorResponse(error, 'Failed to retrieve normalization jobs', 500);
  }
}, 'Failed to retrieve normalization jobs');

/**
 * POST /api/normalization/jobs
 * Create a new normalization job
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    const body = await request.json();
    console.log('Normalization Jobs API: Creating job with data:', body);
    
    // Basic validation
    if (!body.name || !body.dataSourceId) {
      return errorResponse(new Error('Missing required fields'), 'Missing required fields: name and dataSourceId are required', 400);
    }

    // Find data source name (mock lookup)
    const mockDataSources = [
      { id: 'ds-1', name: 'Customer Data', type: 'CSV' },
      { id: 'ds-2', name: 'Product Catalog', type: 'JSON' },
      { id: 'ds-3', name: 'Order History', type: 'Excel' }
    ];
    const dataSource = mockDataSources.find(ds => ds.id === body.dataSourceId);
    const dataSourceName = dataSource ? dataSource.name : `Data Source ${body.dataSourceId}`;

    // Create mock job
    const mockJob = {
      id: `norm-job-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      dataSourceId: body.dataSourceId,
      dataSourceName: dataSourceName,
      status: 'pending' as const,
      totalRecords: Math.floor(Math.random() * 1000) + 100,
      normalizedRecords: 0,
      skippedRecords: 0,
      confidence: 0.0,
      operationType: 'normalization' as const,
      templatesApplied: body.selectedTemplates || [],
      createdAt: new Date().toISOString(),
      createdBy: body.createdBy || 'user'
    };
    
    console.log('Normalization Jobs API: Created mock job:', mockJob.id);
    
    // Store in memory for this session
    if (!global.mockNormalizationJobs) {
      global.mockNormalizationJobs = [];
    }
    global.mockNormalizationJobs.push(mockJob);
    
    return successResponse(mockJob, 'Normalization job created successfully', 201);
  } catch (error) {
    console.error('Normalization Jobs API Create Error:', error);
    return errorResponse(error, 'Failed to create normalization job', 500);
  }
}, 'Failed to create normalization job');