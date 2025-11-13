import { MailerService } from '@nestjs-modules/mailer';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('users')
export class UsersQueueProcessor {
  private readonly logger = new Logger(UsersQueueProcessor.name);

  constructor(private mailService: MailerService) {}

  @Process('send-welcome-email')
  async sendWelcomeEmail(job: Job<{ email: string; name: string }>) {
    this.logger.log(`Sending welcome email to: ${job.data.email}`);

    try {
      await this.mailService.sendMail({
        to: job.data.email,
        from: 'Equipe ShareLock <noreply@sharelock.com>',
        subject: 'Bem-vindo ao ShareLock! 🎉',
        template: 'welcome',
        context: {
          name: job.data.name,
          year: new Date().getFullYear(),
          ctaUrl: process.env.APP_URL || 'https://sharelock.com',
          unsubscribeUrl: `${process.env.APP_URL}/unsubscribe`,
        },
      });

      this.logger.log(`Welcome email sent successfully to: ${job.data.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${job.data.email}:`,
        error,
      );
      throw error;
    }
  }
}
