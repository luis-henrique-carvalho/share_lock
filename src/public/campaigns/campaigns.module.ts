import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { DrizzleModule } from 'src/common/drizzle/drizzle.module';
import { CacheModule } from 'src/common/cache/cache.module';

@Module({
  imports: [DrizzleModule, CacheModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
