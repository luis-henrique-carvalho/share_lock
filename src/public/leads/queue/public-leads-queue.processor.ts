import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { WelcomeLeadEmailJobData } from './public-leads-queue.service';

@Processor('public-leads')
export class PublicLeadsQueueProcessor {
  private readonly logger = new Logger(PublicLeadsQueueProcessor.name);

  constructor(private mailService: MailerService) {}

  @Process('send-welcome-lead-email')
  async sendWelcomeLeadEmail(job: Job<WelcomeLeadEmailJobData>) {
    this.logger.log(`Sending welcome lead email to: ${job.data.email}`);

    try {
      await this.mailService.sendMail({
        to: job.data.email,
        from: 'Equipe ShareLock <noreply@sharelock.com>',
        subject: `Bem-vindo à ShareLock, ${job.data.name}!`,
        template: 'welcome-lead',
        context: {
          name: job.data.name,
          campaignTitle: job.data.campaignTitle,
          referralLink: `${process.env.FRONTEND_URL}/public/campaigns/${job.data.campaignSlug}?ref=${job.data.referralCode}`,
          verifyTokenURL: `${process.env.FRONTEND_URL}/public/campaigns/${job.data.campaignSlug}/verify-email?token=${job.data.verificationToken}`,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send welcome lead email: ${error}`);
      throw error;
    }
  }
}
