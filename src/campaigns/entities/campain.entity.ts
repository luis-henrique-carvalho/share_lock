import * as schema from 'src/common/drizzle/schema';

type Campaign = typeof schema.campaign.$inferSelect;

type CampaignInsert = typeof schema.campaign.$inferInsert;

export { Campaign, CampaignInsert };
