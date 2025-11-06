import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

export interface WelcomeLeadEmailJobData {
  email: string;
  name: string;
  campaignTitle: string;
  referralCode: string;
}

@Injectable()
export class PublicLeadsQueueService {
  constructor(@InjectQueue('public-leads') private publicLeadsQueue: Queue) {}

  async sendWelcomeLeadEmail(data: WelcomeLeadEmailJobData) {
    await this.publicLeadsQueue.add('send-welcome-lead-email', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });
  }
}
