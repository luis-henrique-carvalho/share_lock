import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { DrizzleModule } from 'src/common/drizzle/drizzle.module';
import { CacheModule } from 'src/common/cache/cache.module';

@Module({
  imports: [DrizzleModule, CacheModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
