import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './common/lib/auth';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PublicModule } from './public/public.module';
import { LeadsModule } from './leads/leads.module';
import { QueueModule } from './common/queue/queue.module';
import { BullModule } from '@nestjs/bull';
import { MailerModule } from '@nestjs-modules/mailer';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      },
    }),
    AuthModule.forRoot({ auth }),
    CampaignsModule,
    PublicModule,
    LeadsModule,
    QueueModule,
    UsersModule,
  ],
})
export class AppModule {}
