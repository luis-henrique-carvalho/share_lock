import { relations } from 'drizzle-orm';
import {
  pgTable,
  index,
  uniqueIndex,
  timestamp,
  text,
  uuid,
  boolean,
  serial,
  pgEnum,
  integer,
} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable('verification', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'active',
  'paused',
  'archived',
]);

export const campaign = pgTable(
  'campaign',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    imageUrl: text('image_url').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: campaignStatusEnum('status').default('draft').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_title').on(table.title),
    index('idx_status').on(table.status),
  ],
);

export const campaignRelations = relations(campaign, ({ one, many }) => ({
  user: one(user, {
    fields: [campaign.userId],
    references: [user.id],
  }),
  rewards: many(reward),
}));

export const rewardTypeEnum = pgEnum('reward_type', [
  'file',
  'link',
  'coupon_code',
  'text',
]);

export const reward = pgTable(
  'reward',
  {
    id: serial('id').primaryKey(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaign.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    type: rewardTypeEnum('type').notNull(),
    content: text('content').notNull(),
    goalAmount: integer('trigger_goal').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_reward_campaign_id').on(table.campaignId),
    index('idx_type').on(table.type),
  ],
);

export const rewardRelations = relations(reward, ({ one }) => ({
  campaign: one(campaign, {
    fields: [reward.campaignId],
    references: [campaign.id],
  }),
}));

export const lead = pgTable(
  'lead',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaign.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_campaign_email').on(table.campaignId, table.email),
    index('idx_campaign_id').on(table.campaignId),
  ],
);

export const leadRelations = relations(lead, ({ one, many }) => ({
  campaign: one(campaign, {
    fields: [lead.campaignId],
    references: [campaign.id],
  }),

  indicationsMade: many(indication, { relationName: 'referrer' }),

  indicationReceived: one(indication, {
    fields: [lead.id],
    references: [indication.referredLeadId],
    relationName: 'referred',
  }),
}));

export const indicationStatusEnum = pgEnum('indication_status', [
  'pending',
  'confirmed',
  'invalid',
]);

export const indication = pgTable(
  'indication',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaign.id, { onDelete: 'cascade' }),
    referrerLeadId: uuid('referrer_lead_id')
      .notNull()
      .references(() => lead.id, { onDelete: 'set null' }),
    referredLeadId: uuid('referred_lead_id')
      .notNull()
      .references(() => lead.id, { onDelete: 'cascade' }),
    status: indicationStatusEnum('status').default('pending').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('idx_referred_campaign_unique').on(
      table.referredLeadId,
      table.campaignId,
    ),
    index('idx_indication_referrer').on(table.referrerLeadId),
    index('idx_indication_campaign').on(table.campaignId),
    index('idx_indication_status').on(table.status),
  ],
);

export const indicationRelations = relations(indication, ({ one }) => ({
  campaign: one(campaign, {
    fields: [indication.campaignId],
    references: [campaign.id],
  }),

  referrer: one(lead, {
    fields: [indication.referrerLeadId],
    references: [lead.id],
    relationName: 'referrer',
  }),

  referred: one(lead, {
    fields: [indication.referredLeadId],
    references: [lead.id],
    relationName: 'referred',
  }),
}));
