import * as schema from 'src/common/drizzle/schema';

type Reward = typeof schema.reward.$inferSelect;

type RewardInsert = typeof schema.reward.$inferInsert;

export { Reward, RewardInsert };
