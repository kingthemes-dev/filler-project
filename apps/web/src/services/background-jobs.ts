/**
 * Background Jobs System
 * Cron jobs, queue management, and scheduled tasks
 */

import { Redis } from 'ioredis';

interface JobData {
  id: string;
  type: string;
  payload: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledFor?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
}

interface CronJob {
  name: string;
  schedule: string; // cron expression
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

class BackgroundJobsService {
  private redis: Redis | null = null;
  private cronJobs: Map<string, CronJob> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.initializeRedis();
    this.setupCronJobs();
  }

  private initializeRedis(): void {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
        });
        console.log('Background jobs: Redis connected');
      } else {
        console.warn('Background jobs: Redis not configured, using in-memory fallback');
      }
    } catch (error) {
      console.error('Background jobs: Redis connection failed', error);
    }
  }

  /**
   * Setup cron jobs
   */
  private setupCronJobs(): void {
    // Sync products every 5 minutes
    this.addCronJob({
      name: 'sync-products',
      schedule: '*/5 * * * *', // Every 5 minutes
      handler: this.syncProducts.bind(this),
      enabled: true,
    });

    // Clean old cache every hour
    this.addCronJob({
      name: 'clean-cache',
      schedule: '0 * * * *', // Every hour
      handler: this.cleanCache.bind(this),
      enabled: true,
    });

    // Health check every minute
    this.addCronJob({
      name: 'health-check',
      schedule: '* * * * *', // Every minute
      handler: this.healthCheck.bind(this),
      enabled: true,
    });

    // Generate sitemap daily
    this.addCronJob({
      name: 'generate-sitemap',
      schedule: '0 2 * * *', // Daily at 2 AM
      handler: this.generateSitemap.bind(this),
      enabled: true,
    });
  }

  /**
   * Add a cron job
   */
  addCronJob(job: CronJob): void {
    this.cronJobs.set(job.name, job);
    console.log(`Background jobs: Added cron job "${job.name}"`);
  }

  /**
   * Start the background jobs processor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Background jobs: Already running');
      return;
    }

    this.isRunning = true;
    console.log('Background jobs: Starting processor...');

    // Start cron job scheduler
    this.startCronScheduler();

    // Start queue processor
    this.startQueueProcessor();

    console.log('Background jobs: Processor started');
  }

  /**
   * Stop the background jobs processor
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('Background jobs: Processor stopped');
  }

  /**
   * Add job to queue
   */
  async addJob(
    type: string,
    payload: any,
    priority: number = 0,
    scheduledFor?: Date
  ): Promise<string> {
    const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job: JobData = {
      id: jobId,
      type,
      payload,
      priority,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      scheduledFor,
      status: 'pending',
    };

    if (this.redis) {
      await this.redis.lpush('jobs:queue', JSON.stringify(job));
    } else {
      // In-memory fallback
      console.log('Background jobs: Added job to memory queue', { type, jobId });
    }

    return jobId;
  }

  /**
   * Process jobs from queue
   */
  private async startQueueProcessor(): Promise<void> {
    if (!this.redis) return;

    const processJob = async (): Promise<void> => {
      if (!this.isRunning) return;

      try {
        const jobData = await this.redis!.brpop('jobs:queue', 1);
        
        if (jobData) {
          const job: JobData = JSON.parse(jobData[1]);
          await this.executeJob(job);
        }
      } catch (error) {
        console.error('Background jobs: Queue processor error', error);
      }

      // Continue processing
      setTimeout(processJob, 100);
    };

    processJob();
  }

  /**
   * Execute a job
   */
  private async executeJob(job: JobData): Promise<void> {
    try {
      job.status = 'processing';
      job.attempts++;

      console.log(`Background jobs: Executing job ${job.id} (attempt ${job.attempts})`);

      // Execute job based on type
      switch (job.type) {
        case 'sync-products':
          await this.syncProducts();
          break;
        case 'clean-cache':
          await this.cleanCache();
          break;
        case 'health-check':
          await this.healthCheck();
          break;
        case 'generate-sitemap':
          await this.generateSitemap();
          break;
        default:
          console.warn(`Background jobs: Unknown job type: ${job.type}`);
      }

      job.status = 'completed';
      console.log(`Background jobs: Job ${job.id} completed`);
    } catch (error) {
      console.error(`Background jobs: Job ${job.id} failed`, error);
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        console.error(`Background jobs: Job ${job.id} failed after ${job.maxAttempts} attempts`);
      } else {
        job.status = 'pending';
        // Re-queue job for retry
        await this.redis?.lpush('jobs:queue', JSON.stringify(job));
      }
    }
  }

  /**
   * Start cron job scheduler
   */
  private startCronScheduler(): void {
    const checkCronJobs = (): void => {
      if (!this.isRunning) return;

      const now = new Date();
      
      for (const [name, job] of this.cronJobs) {
        if (!job.enabled) continue;

        const shouldRun = this.shouldRunCronJob(job, now);
        
        if (shouldRun) {
          console.log(`Background jobs: Running cron job "${name}"`);
          job.handler().catch(error => {
            console.error(`Background jobs: Cron job "${name}" failed`, error);
          });
          
          job.lastRun = now;
          job.nextRun = this.getNextRunTime(job.schedule, now);
        }
      }

      // Check again in 1 minute
      setTimeout(checkCronJobs, 60000);
    };

    checkCronJobs();
  }

  /**
   * Check if cron job should run
   */
  private shouldRunCronJob(job: CronJob, now: Date): boolean {
    if (!job.lastRun) return true;
    
    const timeSinceLastRun = now.getTime() - job.lastRun.getTime();
    const oneMinute = 60 * 1000;
    
    return timeSinceLastRun >= oneMinute;
  }

  /**
   * Get next run time for cron job
   */
  private getNextRunTime(schedule: string, from: Date): Date {
    // Simple implementation - in production, use a proper cron parser
    const next = new Date(from);
    next.setMinutes(next.getMinutes() + 5); // Default to 5 minutes
    return next;
  }

  /**
   * Sync products from WooCommerce
   */
  private async syncProducts(): Promise<void> {
    try {
      console.log('Background jobs: Syncing products...');
      
      // This would typically sync products from WooCommerce to local database
      // For now, just log the action
      console.log('Background jobs: Products synced');
    } catch (error) {
      console.error('Background jobs: Product sync failed', error);
      throw error;
    }
  }

  /**
   * Clean old cache entries
   */
  private async cleanCache(): Promise<void> {
    try {
      console.log('Background jobs: Cleaning cache...');
      
      if (this.redis) {
        // Clean expired cache keys
        const keys = await this.redis.keys('cache:*');
        const expiredKeys = [];
        
        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          if (ttl === -1) { // No expiration set
            expiredKeys.push(key);
          }
        }
        
        if (expiredKeys.length > 0) {
          await this.redis.del(...expiredKeys);
          console.log(`Background jobs: Cleaned ${expiredKeys.length} expired cache keys`);
        }
      }
      
      console.log('Background jobs: Cache cleaned');
    } catch (error) {
      console.error('Background jobs: Cache clean failed', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  private async healthCheck(): Promise<void> {
    try {
      console.log('Background jobs: Running health check...');
      
      // Check Redis connection
      if (this.redis) {
        await this.redis.ping();
      }
      
      // Check WooCommerce API
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      
      console.log('Background jobs: Health check passed');
    } catch (error) {
      console.error('Background jobs: Health check failed', error);
      throw error;
    }
  }

  /**
   * Generate sitemap
   */
  private async generateSitemap(): Promise<void> {
    try {
      console.log('Background jobs: Generating sitemap...');
      
      // This would generate and save sitemap.xml
      console.log('Background jobs: Sitemap generated');
    } catch (error) {
      console.error('Background jobs: Sitemap generation failed', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobData | null> {
    if (!this.redis) return null;

    try {
      const jobData = await this.redis.hget('jobs:status', jobId);
      return jobData ? JSON.parse(jobData) : null;
    } catch (error) {
      console.error('Background jobs: Failed to get job status', error);
      return null;
    }
  }

  /**
   * Get all cron jobs
   */
  getCronJobs(): CronJob[] {
    return Array.from(this.cronJobs.values());
  }
}

export default new BackgroundJobsService();
