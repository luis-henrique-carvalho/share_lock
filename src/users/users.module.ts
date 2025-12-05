import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SignUpHook } from './hooks/sign-up.hook';
import { UsersQueueService } from './queue/users-queue.service';
import { UsersQueueProcessor } from './queue/users-queue.processor';
import { BullModule } from '@nestjs/bull';
import { S3Module } from 'src/common/s3/s3.module';
import { CacheModule } from '../common/cache/cache.module';
import { DrizzleModule } from '../common/drizzle/drizzle.module';
import { RouterModule } from '@nestjs/core';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'users',
    }),
    DrizzleModule,
    S3Module,
    CacheModule,
    RouterModule.register([
      {
        path: 'users',
        module: UsersModule,
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, SignUpHook, UsersQueueService, UsersQueueProcessor],
})
export class UsersModule {}
