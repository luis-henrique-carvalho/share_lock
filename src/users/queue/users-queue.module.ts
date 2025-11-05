import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { UsersQueueProcessor } from './users-queue.processor';
import { UsersQueueService } from './users-queue.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'users',
    }),
  ],
  providers: [UsersQueueProcessor, UsersQueueService],
  exports: [UsersQueueService],
})
export class UsersQueueModule {}
