import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  constructor(@InjectQueue('my-queue') private myQueue: Queue) {}

  async addJob(data: any) {
    await this.myQueue.add('my-job', data);
  }
}
