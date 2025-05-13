import fs from 'fs';
import path from 'path';

interface AgentMetadata {
  type: string;
  name: string;
  description: string;
  accountId: string;
  topicId: string;
  profilePictureUrl?: string;
  tools?: unknown[];
}

interface Job {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  result?: { agentMetadata: AgentMetadata };
  error?: string;
}

class JobManager {
  private readonly jobsDir: string;

  constructor() {
    // Use /tmp directory which is writable in Vercel
    this.jobsDir = path.join('/tmp', 'jobs');
    if (!fs.existsSync(this.jobsDir)) {
      fs.mkdirSync(this.jobsDir, { recursive: true });
    }
  }

  private getJobPath(jobId: string): string {
    return path.join(this.jobsDir, `${jobId}.json`);
  }

  createJob(): string {
    const jobId = Math.random().toString(36).substring(2, 15);
    console.log('Creating new job with ID:', jobId);
    
    const job: Job = {
      id: jobId,
      status: 'pending'
    };

    fs.writeFileSync(this.getJobPath(jobId), JSON.stringify(job, null, 2));
    console.log('Current jobs:', this.getAllJobIds());
    return jobId;
  }

  getJob(jobId: string): Job | undefined {
    console.log('Getting job:', jobId);
    console.log('Available jobs:', this.getAllJobIds());
    
    try {
      const jobPath = this.getJobPath(jobId);
      if (fs.existsSync(jobPath)) {
        const data = fs.readFileSync(jobPath, 'utf-8');
        return JSON.parse(data) as Job;
      }
    } catch (error) {
      console.error('Error reading job:', error);
    }
    return undefined;
  }

  completeJob(jobId: string, result: { agentMetadata: AgentMetadata }): void {
    console.log('Completing job:', jobId);
    try {
      const job = this.getJob(jobId);
      if (job) {
        job.status = 'completed';
        job.result = result;
        fs.writeFileSync(this.getJobPath(jobId), JSON.stringify(job, null, 2));
        console.log('Job completed successfully');
      } else {
        console.log('Job not found for completion');
      }
    } catch (error) {
      console.error('Error completing job:', error);
    }
  }

  failJob(jobId: string, error: string): void {
    console.log('Failing job:', jobId);
    try {
      const job = this.getJob(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error;
        fs.writeFileSync(this.getJobPath(jobId), JSON.stringify(job, null, 2));
        console.log('Job failed with error:', error);
      } else {
        console.log('Job not found for failure');
      }
    } catch (error) {
      console.error('Error failing job:', error);
    }
  }

  private getAllJobIds(): string[] {
    try {
      return fs.readdirSync(this.jobsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('Error reading jobs directory:', error);
      return [];
    }
  }
}

// Create a singleton instance
export const jobManager = new JobManager(); 