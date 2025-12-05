import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { DrizzleModule } from 'src/common/drizzle/drizzle.module';
import { CacheModule } from 'src/common/cache/cache.module';
import { RewardsModule } from './rewards/rewards.module';
import { RouterModule } from '@nestjs/core';
import { S3Module } from 'src/common/s3/s3.module';

@Module({
  imports: [
    DrizzleModule,
    CacheModule,
    RewardsModule,
    S3Module,
    RouterModule.register([
      {
        path: ':campaign_id/rewards',
        module: RewardsModule,
      },
    ]),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
