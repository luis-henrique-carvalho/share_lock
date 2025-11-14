import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsService } from './campaigns.service';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { CacheService } from 'src/common/cache/cache.service';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/drizzle/schema';
import { NotFoundException } from '@nestjs/common';

type CampaignWithRewards = typeof schema.campaign.$inferSelect & {
  rewards: Array<typeof schema.reward.$inferSelect>;
};

describe('Public CampaignsService', () => {
  let service: CampaignsService;
  let mockDb: {
    query: {
      campaign: {
        findFirst: jest.Mock;
      };
    };
  };
  let mockCache: {
    set: jest.Mock;
    get: jest.Mock;
  };

  const mockCampaignWithRewards = {
    id: 'campaign-id-123',
    title: 'Test Campaign',
    description: 'Test Description',
    slug: 'test-campaign',
    imageUrl: 'http://example.com/image.png',
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    rewards: [
      {
        id: 1,
        title: 'Bronze Reward',
        description: 'First reward',
        type: 'coupon_code' as const,
        content: 'CODE123',
        goalAmount: 3,
        campaignId: 'campaign-id-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        title: 'Silver Reward',
        description: 'Second reward',
        type: 'link' as const,
        content: 'https://example.com',
        goalAmount: 5,
        campaignId: 'campaign-id-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        campaign: {
          findFirst: jest.fn().mockResolvedValue(mockCampaignWithRewards),
        },
      },
    };

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        {
          provide: DrizzleAsyncProvider,
          useValue: mockDb as unknown as NodePgDatabase<typeof schema>,
        },
        {
          provide: CacheService,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBySlug', () => {
    it('should return cached campaign if available', async () => {
      const slug = 'test-campaign';
      mockCache.get.mockResolvedValue(mockCampaignWithRewards);

      const result = await service.findBySlug(slug);

      expect(mockCache.get).toHaveBeenCalledWith(`campaign:${slug}`);
      expect(result).toEqual(mockCampaignWithRewards);
      expect(mockDb.query.campaign.findFirst).not.toHaveBeenCalled();
    });

    it('should fetch campaign from database and cache it when cache is empty', async () => {
      const slug = 'test-campaign';
      mockCache.get.mockResolvedValue(null);

      const result = await service.findBySlug(slug);

      expect(mockCache.get).toHaveBeenCalledWith(`campaign:${slug}`);
      expect(mockDb.query.campaign.findFirst).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        `campaign:${slug}`,
        mockCampaignWithRewards,
        300,
      );
      expect(result).toEqual(mockCampaignWithRewards);
    });

    it('should include rewards in the response', async () => {
      const slug = 'test-campaign';
      mockCache.get.mockResolvedValue(null);

      const result = (await service.findBySlug(slug)) as CampaignWithRewards;

      expect(result.rewards).toBeDefined();
      expect(result.rewards).toHaveLength(2);
      expect(result.rewards[0].title).toBe('Bronze Reward');
      expect(result.rewards[1].title).toBe('Silver Reward');
    });

    it('should throw NotFoundException when campaign is not found', async () => {
      const slug = 'non-existent-slug';
      mockCache.get.mockResolvedValue(null);
      mockDb.query.campaign.findFirst.mockResolvedValue(null);

      await expect(service.findBySlug(slug)).rejects.toThrow(NotFoundException);
      await expect(service.findBySlug(slug)).rejects.toThrow(
        `Campanha com slug ${slug} não encontrada.`,
      );
    });

    it('should not expose userId in the response', async () => {
      const slug = 'test-campaign';
      mockCache.get.mockResolvedValue(null);

      const result = await service.findBySlug(slug);

      expect(result).not.toHaveProperty('userId');
    });

    it('should cache the campaign with TTL of 300 seconds', async () => {
      const slug = 'test-campaign';
      mockCache.get.mockResolvedValue(null);

      await service.findBySlug(slug);

      expect(mockCache.set).toHaveBeenCalledWith(
        `campaign:${slug}`,
        expect.any(Object),
        300,
      );
    });
  });
});
