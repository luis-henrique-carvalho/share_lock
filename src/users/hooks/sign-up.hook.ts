import { UsersQueueService } from './../queue/users-queue.service';
import { Injectable, Logger } from '@nestjs/common';
import { AfterHook, Hook, AuthHookContext } from '@thallesp/nestjs-better-auth';

interface SignUpEmailBody {
  email: string;
  name: string;
  password: string;
}

@Hook()
@Injectable()
export class SignUpHook {
  private readonly logger = new Logger(SignUpHook.name);

  constructor(private readonly usersQueueService: UsersQueueService) {}

  @AfterHook('/sign-up/email')
  async handle(ctx: AuthHookContext) {
    const { email, name } = ctx.body as SignUpEmailBody;

    this.logger.log(`Processing signup for: ${email}`);

    if (!ctx.context.newSession?.user) {
      this.logger.warn(
        `Signup failed or user already exists: ${email}. No welcome email will be sent.`,
      );

      return;
    }

    this.logger.log(
      `✅ Signup successful for ${name} (${email}). Sending welcome email.`,
    );

    await this.usersQueueService.sendWelcomeEmail(ctx);
  }
}
