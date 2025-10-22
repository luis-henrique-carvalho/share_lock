import { Test, TestingModule } from '@nestjs/testing';
import { RewardsService } from './rewards.service';
import { CacheService } from '../../common/cache/cache.service';
import { DrizzleAsyncProvider } from '../../common/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../common/drizzle/schema';

import { CreateRewardDto, RewardType } from './dto/create-reward.dto';
import { Campaign } from '../entities/campain.entity';

describe('RewardsService', () => {
  let service: RewardsService;
  let mockDb: {
    insert: jest.Mock;
    select: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockCache: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    const mockReturning = jest.fn().mockResolvedValue([
      {
        id: 'reward-id-123',
        title: 'Test Reward',
        description: 'A test reward',
        type: RewardType.text,
        content: 'Test content',
        goalAmount: 100,
        userId: 'user-123',
        campaignId: 'campaign-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const mockValues = jest.fn().mockReturnValue({
      returning: mockReturning,
    });

    const mockInsert = jest.fn().mockReturnValue({
      values: mockValues,
    });

    const mockSelectChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn((cb: (val: Campaign[]) => unknown) =>
        cb([
          {
            id: 'campaign-123',
            title: 'Test Campaign',
            description: 'A test campaign',
            imageUrl: 'http://example.com/image.png',
            status: 'draft',
            userId: 'user-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      ),
    };

    const mockSelect = jest.fn().mockImplementation(() => mockSelectChain);

    mockDb = {
      insert: mockInsert,
      select: mockSelect,
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockCache = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        {
          provide: DrizzleAsyncProvider,
          useValue: mockDb as unknown as NodePgDatabase<typeof schema>,
        },
        {
          provide: CacheService,
          useValue: mockCache as unknown as CacheService,
        },
      ],
    }).compile();

    service = module.get<RewardsService>(RewardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a reward', async () => {
      const createDto: CreateRewardDto = {
        title: 'Test Reward',
        description: 'A test reward',
        type: RewardType.text,
        content: 'Test content',
        goalAmount: 100,
      };
      const result = await service.create(
        'campaign-123',
        'user-123',
        createDto,
      );
      expect(result).toMatchObject(createDto);
      expect(typeof result.id).toBe('string');
    });

    it('should invalidate campaign caches after creating reward', async () => {
      const createDto: CreateRewardDto = {
        title: 'Test Reward',
        description: 'A test reward',
        type: RewardType.text,
        content: 'Test content',
        goalAmount: 100,
      };
      const userId = 'user-123';
      const campaignId = 'campaign-123';
      await service.create(campaignId, userId, createDto);

      expect(mockCache.del).toHaveBeenCalledWith(`campaign:${campaignId}`);
      expect(mockCache.del).toHaveBeenCalledWith(
        `rewards:campaign:${campaignId}`,
      );
    });
  });
});
