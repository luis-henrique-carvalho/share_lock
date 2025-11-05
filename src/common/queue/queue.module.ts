import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'my-queue',
    }),
  ],
  providers: [QueueService, QueueProcessor],
})
export class QueueModule {}
