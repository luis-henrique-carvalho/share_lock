import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisClientProvider } from './cache.provider';

@Injectable()
export class CacheService {
  constructor(@Inject(RedisClientProvider) private redis: Redis) {}

  async set(key: string, value: any, ttl = 60) {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async get<T = any>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  async del(key: string) {
    await this.redis.del(key);
  }
}
