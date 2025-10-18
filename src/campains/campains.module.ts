import { Module } from '@nestjs/common';
import { CampainsService } from './campains.service';
import { CampainsController } from './campains.controller';

@Module({
  controllers: [CampainsController],
  providers: [CampainsService],
})
export class CampainsModule {}
