import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCampainDto } from './dto/create-campain.dto';
import { UpdateCampainDto } from './dto/update-campain.dto';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/drizzle/schema';
import { Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { CacheService } from 'src/common/cache/cache.service';
import { S3Service } from 'src/common/s3/s3.service';

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,

    @Inject(CacheService)
    private cache: CacheService,

    @Inject(S3Service)
    private s3: S3Service,
  ) {}

  async create(createCampainDto: CreateCampainDto, userId: string) {
    const [campaign] = await this.db
      .insert(schema.campaign)
      .values({
        title: createCampainDto.title,
        description: createCampainDto.description,
        status: 'draft',
        userId: userId,
      })
      .returning();

    await this.cache.set(`campaign:${campaign.id}`, campaign, 300);
    await this.cache.del(`campaigns:user:${userId}`);

    return campaign;
  }

  async activate(id: string, userId: string) {
    const campaign = await this.findOne(id, userId);

    if (campaign.status === 'active') {
      return campaign;
    }

    const [updatedCampaign] = await this.db
      .update(schema.campaign)
      .set({ status: 'active' })
      .where(eq(schema.campaign.id, id))
      .returning();

    await this.cache.set(`campaign:${id}`, updatedCampaign, 300);
    await this.cache.del(`campaigns:user:${userId}`);

    return updatedCampaign;
  }

  async findAll(userId: string) {
    const cacheKey = `campaigns:user:${userId}`;
    const cached = await this.cache.get<(typeof schema.campaign)[]>(cacheKey);
    if (cached) return cached;

    const campaigns = await this.db
      .select()
      .from(schema.campaign)
      .where(eq(schema.campaign.userId, userId));

    await this.cache.set(cacheKey, campaigns, 300);

    return campaigns;
  }

  async findOne(id: string, userId: string) {
    const cacheKey = `campaign:${id}`;
    const cached = await this.cache.get<typeof schema.campaign>(cacheKey);

    if (cached) return cached;

    const campaign = await this.db
      .select()
      .from(schema.campaign)
      .where(
        and(eq(schema.campaign.id, id), eq(schema.campaign.userId, userId)),
      )
      .limit(1)
      .then((res) => res[0]);

    if (!campaign) {
      throw new NotFoundException(`Campanha com ID ${id} não encontrada.`);
    }

    await this.cache.set(cacheKey, campaign, 300);

    return campaign;
  }

  async update(
    id: string,
    updateCampainDto: UpdateCampainDto,
    userId: string,
    image?: Express.Multer.File,
  ) {
    const campaign = await this.findOne(id, userId);

    let imageUrl: string | undefined;

    if (image) {
      const { url } = await this.s3.uploadFile(image, {
        existingFileUrl: campaign.imageUrl as string | null,
        path: 'campaign-images',
      });
      imageUrl = url;
    }

    const [updatedCampaign] = await this.db
      .update(schema.campaign)
      .set({
        ...updateCampainDto,
        ...(imageUrl && { imageUrl }),
      })
      .where(eq(schema.campaign.id, id))
      .returning();

    await this.cache.set(`campaign:${id}`, updatedCampaign, 300);
    await this.cache.del(`campaigns:user:${userId}`);

    return updatedCampaign;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.db.delete(schema.campaign).where(eq(schema.campaign.id, id));

    await this.cache.del(`campaign:${id}`);
    await this.cache.del(`campaigns:user:${userId}`);
  }
}
