import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export const RedisClientProvider = 'REDIS_CLIENT';

export const RedisProvider = {
  provide: 'REDIS_CLIENT',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const redisUrl = configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined');
    }

    const client = new Redis(redisUrl);

    client.on('connect', () => console.log('✅ Redis connected!'));
    client.on('error', (err) => console.error('❌ Redis error:', err));

    return client;
  },
};
