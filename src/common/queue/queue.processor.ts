import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('my-queue')
export class QueueProcessor {
  @Process('my-job')
  async handleJob(job: Job) {
    console.log('Processing job:', job.data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
