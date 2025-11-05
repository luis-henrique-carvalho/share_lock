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
        html: `
          <h1>Olá ${job.data.name}! 👋</h1>
          <p>Bem-vindo ao <strong>ShareLock</strong>!</p>
          <p>Estamos felizes em tê-lo conosco.</p>
        `,
        text: `Olá ${job.data.name}, bem-vindo ao ShareLock!`,
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
