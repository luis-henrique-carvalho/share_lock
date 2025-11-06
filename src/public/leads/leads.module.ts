import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { DrizzleModule } from 'src/common/drizzle/drizzle.module';
import { CacheModule } from 'src/common/cache/cache.module';
import { BullModule } from '@nestjs/bull';
import { PublicLeadsQueueProcessor } from './queue/public-leads-queue.processor';
import { PublicLeadsQueueService } from './queue/public-leads-queue.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'public-leads',
    }),
    DrizzleModule,
    CacheModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService, PublicLeadsQueueProcessor, PublicLeadsQueueService],
})
export class LeadsModule {}
