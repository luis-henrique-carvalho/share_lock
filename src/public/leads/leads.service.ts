import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/drizzle/schema';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
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

    // envio de email
    // await this.mailerService.sendMail({
    //   to: lead.email,
    //   subject: `Welcome to the campaign ${campaign.title}`,
    //   template: 'welcome-lead', // nome do template de email
    //   context: {
    //     name: lead.name,
    //     campaignTitle: campaign.title,
    //     referralCode: lead.referralCode,
    //   },
    // });

    return {
      success: true,
      message: 'Lead created successfully, verify your email for more details.',
      lead,
      referralCode: lead.referralCode,
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
    const [lead] = await this.db
      .insert(schema.lead)
      .values({ campaignId, ...payload })
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
}
