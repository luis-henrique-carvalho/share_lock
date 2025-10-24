import { Module } from '@nestjs/common';

import { RouterModule } from '@nestjs/core';
import { CampaignsModule } from './campaigns/campaigns.module';
import { LeadsModule } from './leads/leads.module';

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
          {
            path: ':campaign_slug/leads',
            module: LeadsModule,
          },
        ],
      },
    ]),
    CampaignsModule,
    LeadsModule,
  ],
})
export class PublicModule {}
