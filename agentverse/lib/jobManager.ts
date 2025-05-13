interface Job {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

class JobManager {
  private jobs: Map<string, Job> = new Map();

  createJob(): string {
    const jobId = Math.random().toString(36).substring(2, 15);
    console.log('Creating new job with ID:', jobId);
    this.jobs.set(jobId, {
      id: jobId,
      status: 'pending'
    });
    console.log('Current jobs:', Array.from(this.jobs.keys()));
    return jobId;
  }

  getJob(jobId: string): Job | undefined {
    console.log('Getting job:', jobId);
    console.log('Available jobs:', Array.from(this.jobs.keys()));
    return this.jobs.get(jobId);
  }

  completeJob(jobId: string, result: any) {
    console.log('Completing job:', jobId);
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.result = result;
      console.log('Job completed successfully');
    } else {
      console.log('Job not found for completion');
    }
  }

  failJob(jobId: string, error: string) {
    console.log('Failing job:', jobId);
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      console.log('Job failed with error:', error);
    } else {
      console.log('Job not found for failure');
    }
  }
}

// Create a singleton instance
export const jobManager = new JobManager(); 