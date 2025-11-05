import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AuthHookContext } from '@thallesp/nestjs-better-auth';

interface SignUpEmailBody {
  email: string;
  name: string;
}

@Injectable()
export class UsersQueueService {
  constructor(@InjectQueue('users') private usersQueue: Queue) {}

  async sendWelcomeEmail(ctx: AuthHookContext) {
    const { email, name } = ctx.body as SignUpEmailBody;

    await this.usersQueue.add(
      'send-welcome-email',
      {
        email,
        name,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );
  }
}
