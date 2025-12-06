import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './common/lib/auth';
import { PublicModule } from './public/public.module';
import { PrivateModule } from './private/private.module';
import { BullModule } from '@nestjs/bull';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { S3Module } from './common/s3/s3.module';
import { AbacatePayModule } from './common/abacate-pay/abacate-pay.module';
import * as path from 'path';
import './common/helpers/handlebars.helpers';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
      defaults: {
        from: '"ShareLock" <noreply@sharelock.com>',
      },
      template: {
        dir: path.join(process.cwd(), 'src', 'common', 'templates', 'emails'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
      options: {
        partials: {
          dir: path.join(
            process.cwd(),
            'src',
            'common',
            'templates',
            'partials',
          ),
          options: {
            strict: true,
          },
        },
      },
    }),
    AuthModule.forRoot({ auth }),
    PrivateModule,
    PublicModule,
    S3Module,
    AbacatePayModule,
  ],
})
export class AppModule {}
