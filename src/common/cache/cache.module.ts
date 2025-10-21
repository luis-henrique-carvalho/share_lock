import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisProvider } from './cache.provider';

@Module({
  providers: [CacheService, RedisProvider],
  exports: [CacheService],
})
export class CacheModule {}
