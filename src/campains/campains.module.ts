import { Module } from '@nestjs/common';
import { CampainsService } from './campains.service';
import { CampainsController } from './campains.controller';
import { DrizzleModule } from '../common/drizzle/drizzle.module';
import { CacheModule } from '../common/cache/cache.module';

@Module({
  imports: [DrizzleModule, CacheModule],
  controllers: [CampainsController],
  providers: [CampainsService],
})
export class CampainsModule {}
