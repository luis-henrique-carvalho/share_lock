import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres/driver';
import { CacheService } from 'src/common/cache/cache.service';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import * as schema from 'src/common/drizzle/schema';
const { campaign } = schema;

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,

    @Inject(CacheService)
    private cache: CacheService,
  ) {}

  async findBySlug(slug: string) {
    const cacheKey = `campaign:${slug}`;
    const cached = await this.cache.get<typeof schema.campaign>(cacheKey);
    if (cached) return cached;

    const campaignWithRewards = await this.db.query.campaign.findFirst({
      where: eq(campaign.slug, slug),
      columns: {
        userId: false,
      },
      with: {
        rewards: true,
      },
    });

    if (!campaignWithRewards) {
      throw new NotFoundException(`Campanha com slug ${slug} não encontrada.`);
    }

    await this.cache.set(cacheKey, campaignWithRewards, 300); // 300 segundos = 5 minutos

    return campaignWithRewards;
  }
}
