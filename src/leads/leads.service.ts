import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/drizzle/schema';
import { Inject } from '@nestjs/common';
import { and, eq, getTableColumns } from 'drizzle-orm';
import { CacheService } from 'src/common/cache/cache.service';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';

@Injectable()
export class LeadsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,

    @Inject(CacheService)
    private cache: CacheService,
  ) {}

  async findAll(userId: string) {
    const cacheKey = `leads:user:${userId}`;
    const cached = await this.cache.get<(typeof schema.lead)[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const leads = await this.db
      .select(getTableColumns(schema.lead))
      .from(schema.lead)
      .innerJoin(
        schema.campaign,
        eq(schema.lead.campaignId, schema.campaign.id),
      )
      .where(eq(schema.campaign.userId, userId));

    await this.cache.set(cacheKey, leads, 300);

    return leads;
  }

  async findOne(id: string, userId: string) {
    const cacheKey = `leed:${id}`;
    const cached = await this.cache.get<typeof schema.lead>(cacheKey);

    if (cached) {
      return cached;
    }

    const lead = await this.db
      .select(getTableColumns(schema.lead))
      .from(schema.lead)
      .innerJoin(
        schema.campaign,
        eq(schema.lead.campaignId, schema.campaign.id),
      )
      .where(and(eq(schema.lead.id, id), eq(schema.campaign.userId, userId)))
      .limit(1)
      .then((results) => results[0]);

    await this.cache.set(cacheKey, lead, 300);

    return lead;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.db.delete(schema.lead).where(eq(schema.lead.id, id));

    await this.cache.del(`leed:${id}`);
    await this.cache.del(`leads:user:${userId}`);
  }
}
