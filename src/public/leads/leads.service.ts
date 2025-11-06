import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, count } from 'drizzle-orm';
import * as schema from 'src/common/drizzle/schema';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { CreateLeadDto } from './dto/create-lead.dto';
import { PublicLeadsQueueService } from './queue/public-leads-queue.service';

@Injectable()
export class LeadsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,

    private publicLeadsQueue: PublicLeadsQueueService,
  ) {}

  async create(
    campaignSlug: string,
    createLeadDto: CreateLeadDto,
    referralCode?: string,
  ) {
    const campaign = await this.findCampaignBySlug(campaignSlug);

    const { email, name } = createLeadDto;

    const existingLead = await this.findLeadByEmail(campaign.id, email);

    if (existingLead) {
      throw new ConflictException(`Lead with email ${email} already exists.`);
    }

    const lead = await this.createLeadRecord(campaign.id, { name, email });

    if (referralCode) {
      const referrer = await this.findReferrerByCode(campaign.id, referralCode);

      if (referrer) {
        await this.createIndication(campaign.id, referrer.id, lead.id);
      }
    }

    await this.publicLeadsQueue.sendWelcomeLeadEmail({
      email: lead.email,
      name: lead.name || '',
      campaignTitle: campaign.title,
      referralCode: lead.referralCode,
    });

    return {
      success: true,
      message: 'Lead created successfully, verify your email for more details.',
      lead,
      referralCode: lead.referralCode,
    };
  }

  async verifyEmail(token: string) {
    const lead = await this.db.query.lead.findFirst({
      where: (lead, { eq }) => eq(lead.verificationToken, token),
    });

    if (!lead) {
      throw new NotFoundException('Invalid verification token.');
    }

    if (lead.emailVerified) {
      throw new BadRequestException('Email already verified.');
    }

    if (
      lead.verificationTokenExpiresAt &&
      lead.verificationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Verification token expired.');
    }

    const [updatedLead] = await this.db
      .update(schema.lead)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      })
      .where(eq(schema.lead.id, lead.id))
      .returning();

    await this.confirmLeadIndication(lead.id);

    return {
      success: true,
      message: 'Email verified successfully.',
      lead: updatedLead,
    };
  }

  async getLeadRewards(campaignSlug: string, referralCode: string) {
    const campaign = await this.findCampaignBySlug(campaignSlug);

    const lead = await this.db.query.lead.findFirst({
      where: (lead, { and, eq }) =>
        and(
          eq(lead.referralCode, referralCode),
          eq(lead.campaignId, campaign.id),
        ),
    });

    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }

    if (!lead.emailVerified) {
      throw new BadRequestException(
        'Please verify your email first to access rewards.',
      );
    }

    const [indicationsCount] = await this.db
      .select({ count: count() })
      .from(schema.indication)
      .where(
        and(
          eq(schema.indication.referrerLeadId, lead.id),
          eq(schema.indication.status, 'confirmed'),
        ),
      );

    const totalIndications = indicationsCount.count;

    const rewards = await this.db.query.reward.findMany({
      where: (reward, { eq }) => eq(reward.campaignId, campaign.id),
      orderBy: (reward, { asc }) => [asc(reward.goalAmount)],
    });

    const earnedRewards = rewards.filter(
      (reward) => totalIndications >= reward.goalAmount,
    );

    return {
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        referralCode: lead.referralCode,
      },
      campaign: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
      },
      totalIndications,
      earnedRewards: earnedRewards.map((reward) => ({
        id: reward.id,
        title: reward.title,
        description: reward.description,
        type: reward.type,
        content: reward.content,
        goalAmount: reward.goalAmount,
      })),
      allRewards: rewards.map((reward) => ({
        id: reward.id,
        title: reward.title,
        description: reward.description,
        type: reward.type,
        goalAmount: reward.goalAmount,
        isEarned: totalIndications >= reward.goalAmount,
      })),
    };
  }

  private async findCampaignBySlug(campaignSlug: string) {
    const campaign = await this.db.query.campaign.findFirst({
      where: (campaign, { eq }) => eq(campaign.slug, campaignSlug),
    });

    if (!campaign) {
      throw new NotFoundException(
        `Campaign with slug ${campaignSlug} not found.`,
      );
    }

    return campaign;
  }

  private async findLeadByEmail(campaignId: string, email: string) {
    return this.db.query.lead.findFirst({
      where: (lead, { and, eq }) =>
        and(eq(lead.email, email), eq(lead.campaignId, campaignId)),
    });
  }

  private async createLeadRecord(
    campaignId: string,
    payload: { name?: string; email: string },
  ) {
    const verificationTokenExpiresAt = new Date();
    verificationTokenExpiresAt.setHours(
      verificationTokenExpiresAt.getHours() + 24,
    );

    const [lead] = await this.db
      .insert(schema.lead)
      .values({
        campaignId,
        email: payload.email,
        name: payload.name,
        verificationTokenExpiresAt,
      })
      .returning();
    return lead;
  }

  private async findReferrerByCode(campaignId: string, referralCode: string) {
    return this.db.query.lead.findFirst({
      where: (lead, { and, eq }) =>
        and(
          eq(lead.referralCode, referralCode),
          eq(lead.campaignId, campaignId),
        ),
    });
  }

  private async createIndication(
    campaignId: string,
    referrerLeadId: string,
    referredLeadId: string,
  ) {
    await this.db.insert(schema.indication).values({
      campaignId,
      referrerLeadId,
      referredLeadId,
    });
  }

  private async confirmLeadIndication(referredLeadId: string) {
    await this.db
      .update(schema.indication)
      .set({ status: 'confirmed' })
      .where(eq(schema.indication.referredLeadId, referredLeadId));
  }
}
