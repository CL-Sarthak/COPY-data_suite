import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

// Import the mock storage from the parent route
if (!global.mockNormalizationJobs) {
  global.mockNormalizationJobs = [];
}
const mockJobs = global.mockNormalizationJobs;

export const GET = withErrorHandler(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  try {
    const jobId = params.id;
    const job = mockJobs.find(j => j.id === jobId);

    if (!job) {
      return errorResponse(new Error('Job not found'), 'Normalization job not found', 404);
    }

    return successResponse(job);
  } catch (error) {
    console.error('Error fetching normalization job:', error);
    return errorResponse(error, 'Failed to fetch normalization job', 500);
  }
});

export const PUT = withErrorHandler(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  try {
    const jobId = params.id;
    const job = mockJobs.find(j => j.id === jobId);

    if (!job) {
      return errorResponse(new Error('Job not found'), 'Normalization job not found', 404);
    }

    const updates = await request.json();
    
    // Update job properties
    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const jobIndex = mockJobs.findIndex(j => j.id === jobId);
    if (jobIndex !== -1) {
      mockJobs[jobIndex] = updatedJob;
    }

    return successResponse(updatedJob);
  } catch (error) {
    console.error('Error updating normalization job:', error);
    return errorResponse(error, 'Failed to update normalization job', 500);
  }
});

export const DELETE = withErrorHandler(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  try {
    const jobId = params.id;
    const job = mockJobs.find(j => j.id === jobId);

    if (!job) {
      return errorResponse(new Error('Job not found'), 'Normalization job not found', 404);
    }

    // Only allow deletion of completed or failed jobs
    if (!['completed', 'failed', 'cancelled'].includes(job.status)) {
      return errorResponse(new Error('Invalid operation'), 'Cannot delete active job', 400);
    }

    const jobIndex = mockJobs.findIndex(j => j.id === jobId);
    if (jobIndex !== -1) {
      mockJobs.splice(jobIndex, 1);
    }

    return successResponse({ message: 'Normalization job deleted successfully' });
  } catch (error) {
    console.error('Error deleting normalization job:', error);
    return errorResponse(error, 'Failed to delete normalization job', 500);
  }
});