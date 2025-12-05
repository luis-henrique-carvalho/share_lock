import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';

import { DrizzleModule } from 'src/common/drizzle/drizzle.module';
import { CacheModule } from 'src/common/cache/cache.module';

@Module({
  imports: [DrizzleModule, CacheModule],
  controllers: [RewardsController],
  providers: [RewardsService],
})
export class RewardsModule {}
