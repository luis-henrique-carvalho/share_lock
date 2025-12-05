import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { RouterModule } from '@nestjs/core';
import { DrizzleModule } from 'src/common/drizzle/drizzle.module';
import { CacheModule } from 'src/common/cache/cache.module';

@Module({
  imports: [
    DrizzleModule,
    CacheModule,
    RouterModule.register([
      {
        path: 'leads',
        module: LeadsModule,
      },
    ]),
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
