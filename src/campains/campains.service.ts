import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCampainDto } from './dto/create-campain.dto';
import { UpdateCampainDto } from './dto/update-campain.dto';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/drizzle/schema';
import { Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class CampainsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
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

    return campaign;
  }

  async findAll(userId: string) {
    return this.db
      .select()
      .from(schema.campaign)
      .where(eq(schema.campaign.userId, userId));
  }

  async findOne(id: string, userId: string) {
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

    return campaign;
  }

  async update(id: string, updateCampainDto: UpdateCampainDto, userId: string) {
    await this.findOne(id, userId);

    const [updatedCampaign] = await this.db
      .update(schema.campaign)
      .set(updateCampainDto)
      .where(eq(schema.campaign.id, id))
      .returning();

    return updatedCampaign;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.db.delete(schema.campaign).where(eq(schema.campaign.id, id));
  }
}
