import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';
import { RemediationJobService } from '@/services/remediationJobService';
import { RemediationJobStatus } from '@/types/remediation';

/**
 * GET /api/remediation/jobs
 * Get all remediation jobs
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      dataSourceId: searchParams.get('dataSourceId') || undefined,
      status: (searchParams.get('status') as RemediationJobStatus) || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    const jobService = new RemediationJobService();
    const result = await jobService.getJobs(filters);
    
    return successResponse({
      jobs: result.jobs,
      total: result.total
    });
  } catch (error) {
    console.error('Failed to fetch remediation jobs:', error);
    return errorResponse(error, 'Failed to fetch remediation jobs');
  }
}, 'Failed to fetch remediation jobs');

/**
 * POST /api/remediation/jobs
 * Create a new remediation job
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    if (!body.dataSourceId || !body.ruleExecutionId || !body.violations) {
      return errorResponse('Missing required fields', 'Invalid request', 400);
    }

    const jobService = new RemediationJobService();
    const job = await jobService.createJob(body);
    
    return successResponse(job, 'Remediation job created successfully');
  } catch (error) {
    console.error('Failed to create remediation job:', error);
    return errorResponse(error, 'Failed to create remediation job');
  }
}, 'Failed to create remediation job');