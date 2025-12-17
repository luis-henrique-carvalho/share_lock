import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { CampaignsModule } from './campaigns/campaigns.module';
import { LeadsModule } from './leads/leads.module';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    CampaignsModule,
    LeadsModule,
    UsersModule,
    PaymentsModule,
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
          {
            path: 'payments',
            module: PaymentsModule,
          },
        ],
      },
    ]),
  ],
})
export class PrivateModule {}
