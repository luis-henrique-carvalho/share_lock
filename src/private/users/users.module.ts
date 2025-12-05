import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SignUpHook } from './hooks/sign-up.hook';
import { UsersQueueService } from './queue/users-queue.service';
import { UsersQueueProcessor } from './queue/users-queue.processor';
import { BullModule } from '@nestjs/bull';
import { S3Module } from 'src/common/s3/s3.module';
import { CacheModule } from 'src/common/cache/cache.module';
import { DrizzleModule } from 'src/common/drizzle/drizzle.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'users',
    }),
    DrizzleModule,
    S3Module,
    CacheModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, SignUpHook, UsersQueueService, UsersQueueProcessor],
})
export class UsersModule {}
