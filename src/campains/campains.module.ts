import { Module } from '@nestjs/common';
import { CampainsService } from './campains.service';
import { CampainsController } from './campains.controller';
import { DrizzleModule } from '../drizzle/drizzle.module';

@Module({
  imports: [DrizzleModule],
  controllers: [CampainsController],
  providers: [CampainsService],
})
export class CampainsModule {}
