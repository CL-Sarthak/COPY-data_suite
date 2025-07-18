import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

/**
 * POST /api/normalization/jobs/[id]/cancel
 * Cancel a normalization job
 */
export const POST = withErrorHandler(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id: jobId } = await params;
    console.log('Normalization Jobs Cancel API: Cancelling job', jobId);

    // Get jobs from memory
    if (!global.mockNormalizationJobs) {
      global.mockNormalizationJobs = [];
    }

    // Find the job
    const jobIndex = global.mockNormalizationJobs.findIndex(job => job.id === jobId);
    if (jobIndex === -1) {
      return errorResponse(new Error('Job not found'), 'Normalization job not found', 404);
    }

    const job = global.mockNormalizationJobs[jobIndex];
    
    // Check if job can be cancelled
    if (job.status === 'completed' || job.status === 'cancelled') {
      return errorResponse(new Error('Invalid status'), `Cannot cancel job with status: ${job.status}`, 400);
    }

    // Update job status
    global.mockNormalizationJobs[jobIndex] = {
      ...job,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      // Keep current progress when cancelled
      normalizedRecords: job.normalizedRecords
    };

    console.log('Normalization Jobs Cancel API: Job cancelled successfully');
    
    return successResponse(global.mockNormalizationJobs[jobIndex], 'Normalization job cancelled successfully');
  } catch (error) {
    console.error('Normalization Jobs Cancel API Error:', error);
    return errorResponse(error, 'Failed to cancel normalization job', 500);
  }
}, 'Failed to cancel normalization job');