import { Module } from '@nestjs/common';

import { RouterModule } from '@nestjs/core';
import { CampaignsModule } from './campaigns/campaigns.module';

@Module({
  imports: [
    CampaignsModule,
    RouterModule.register([
      {
        path: 'public',
        module: PublicModule,
        children: [
          {
            path: 'campaigns',
            module: CampaignsModule,
          },
        ],
      },
    ]),
    CampaignsModule,
  ],
})
export class PublicModule {}
