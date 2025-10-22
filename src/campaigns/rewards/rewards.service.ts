import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { CacheService } from 'src/common/cache/cache.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';

@Injectable()
export class RewardsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,

    @Inject(CacheService)
    private cache: CacheService,
  ) {}

  async create(
    campaignId: string,
    userId: string,
    createRewardDto: CreateRewardDto,
  ) {
    await this.verifyCampaignOwnership(campaignId, userId);

    const [reward] = await this.db
      .insert(schema.reward)
      .values({
        campaignId,
        title: createRewardDto.title,
        description: createRewardDto.description,
        type: createRewardDto.type,
        content: createRewardDto.content,
        goalAmount: createRewardDto.goalAmount,
      })
      .returning();

    await this.cache.del(`campaign:${campaignId}`);
    await this.cache.del(`rewards:campaign:${campaignId}`);

    return reward;
  }

  async findAllByCampaign(campaignId: string, userId: string) {
    await this.verifyCampaignOwnership(campaignId, userId);

    const cacheKey = `rewards:campaign:${campaignId}`;
    const cached = await this.cache.get<(typeof schema.reward)[]>(cacheKey);
    if (cached) return cached;

    const rewards = await this.db
      .select()
      .from(schema.reward)
      .where(eq(schema.reward.campaignId, campaignId));

    await this.cache.set(cacheKey, rewards, 300);

    return rewards;
  }

  async findOne(id: number, campaignId: string, userId: string) {
    await this.verifyCampaignOwnership(campaignId, userId);

    const cacheKey = `reward:${id}`;
    const cached = await this.cache.get<typeof schema.reward>(cacheKey);
    if (cached) return cached;

    const reward = await this.db
      .select()
      .from(schema.reward)
      .where(
        and(eq(schema.reward.id, id), eq(schema.reward.campaignId, campaignId)),
      )
      .limit(1)
      .then((res) => res[0]);

    if (!reward) {
      throw new NotFoundException(`Recompensa com ID ${id} não encontrada.`);
    }

    await this.cache.set(cacheKey, reward, 300);

    return reward;
  }

  async update(
    id: number,
    campaignId: string,
    userId: string,
    updateRewardDto: UpdateRewardDto,
  ) {
    await this.findOne(id, campaignId, userId);

    const [updatedReward] = await this.db
      .update(schema.reward)
      .set(updateRewardDto)
      .where(eq(schema.reward.id, id))
      .returning();

    await this.cache.del(`reward:${id}`);
    await this.cache.del(`rewards:campaign:${campaignId}`);
    await this.cache.del(`campaign:${campaignId}`);

    return updatedReward;
  }

  async remove(id: number, campaignId: string, userId: string) {
    await this.findOne(id, campaignId, userId);

    await this.db.delete(schema.reward).where(eq(schema.reward.id, id));

    await this.cache.del(`reward:${id}`);
    await this.cache.del(`rewards:campaign:${campaignId}`);
    await this.cache.del(`campaign:${campaignId}`);
  }

  /**
   * Método auxiliar para verificar se a campanha existe e pertence ao usuário
   */
  private async verifyCampaignOwnership(campaignId: string, userId: string) {
    const campaign = await this.db
      .select()
      .from(schema.campaign)
      .where(
        and(
          eq(schema.campaign.id, campaignId),
          eq(schema.campaign.userId, userId),
        ),
      )
      .limit(1)
      .then((res) => res[0]);

    if (!campaign) {
      throw new NotFoundException(
        `Campanha com ID ${campaignId} não encontrada.`,
      );
    }

    return campaign;
  }
}
