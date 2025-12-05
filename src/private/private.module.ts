import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { CampaignsModule } from './campaigns/campaigns.module';
import { LeadsModule } from './leads/leads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    CampaignsModule,
    LeadsModule,
    UsersModule,
    RouterModule.register([
      {
        path: 'private',
        module: PrivateModule,
        children: [
          {
            path: 'campaigns',
            module: CampaignsModule,
          },
          {
            path: 'leads',
            module: LeadsModule,
          },
          {
            path: 'users',
            module: UsersModule,
          },
        ],
      },
    ]),
  ],
})
export class PrivateModule {}
