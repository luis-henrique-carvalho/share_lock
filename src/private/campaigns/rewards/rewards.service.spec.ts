import { Test, TestingModule } from '@nestjs/testing';
import { RewardsService } from './rewards.service';
import { CacheService } from 'src/common/cache/cache.service';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/drizzle/schema';
import { CreateRewardDto, RewardType } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { NotFoundException } from '@nestjs/common';

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

  const mockCampaign = {
    id: 'campaign-123',
    title: 'Test Campaign',
    description: 'A test campaign',
    slug: 'test-campaign',
    imageUrl: 'http://example.com/image.png',
    status: 'draft' as const,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReward = {
    id: 1,
    title: 'Test Reward',
    description: 'A test reward',
    type: RewardType.text,
    content: 'Test content',
    goalAmount: 100,
    campaignId: 'campaign-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Mock insert chain
    const mockInsertReturning = jest.fn().mockResolvedValue([mockReward]);
    const mockInsertValues = jest.fn().mockReturnValue({
      returning: mockInsertReturning,
    });
    const mockInsert = jest.fn().mockReturnValue({
      values: mockInsertValues,
    });

    // Mock select chain for campaigns (verifyCampaignOwnership)
    const mockSelectLimit = jest.fn().mockReturnValue({
      then: jest
        .fn()
        .mockImplementation((callback: (value: unknown) => unknown) =>
          callback([mockCampaign]),
        ),
    });

    const mockSelectWhere = jest.fn().mockReturnValue({
      limit: mockSelectLimit,
      then: jest
        .fn()
        .mockImplementation((callback: (value: unknown) => unknown) =>
          callback([mockReward]),
        ),
    });

    const mockSelectFrom = jest.fn().mockReturnValue({
      where: mockSelectWhere,
    });

    const mockSelect = jest.fn().mockReturnValue({
      from: mockSelectFrom,
    });

    // Mock update chain
    const mockUpdateReturning = jest
      .fn()
      .mockResolvedValue([{ ...mockReward, title: 'Updated Reward' }]);
    const mockUpdateWhere = jest.fn().mockReturnValue({
      returning: mockUpdateReturning,
    });
    const mockUpdateSet = jest.fn().mockReturnValue({
      where: mockUpdateWhere,
    });
    const mockUpdate = jest.fn().mockReturnValue({
      set: mockUpdateSet,
    });

    // Mock delete chain
    const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
    const mockDelete = jest.fn().mockReturnValue({
      where: mockDeleteWhere,
    });

    mockDb = {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
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

  afterEach(() => {
    jest.clearAllMocks();
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
      expect(result).toMatchObject({
        title: createDto.title,
        description: createDto.description,
        type: createDto.type,
      });
      expect(typeof result.id).toBe('number');
    });

    it('should verify campaign ownership before creating reward', async () => {
      const createDto: CreateRewardDto = {
        title: 'Test Reward',
        description: 'A test reward',
        type: RewardType.text,
        content: 'Test content',
        goalAmount: 100,
      };

      await service.create('campaign-123', 'user-123', createDto);

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should invalidate campaign caches after creating reward', async () => {
      const createDto: CreateRewardDto = {
        title: 'Test Reward',
        description: 'A test reward',
        type: RewardType.text,
        content: 'Test content',
        goalAmount: 100,
      };
      const campaignId = 'campaign-123';
      await service.create(campaignId, 'user-123', createDto);

      expect(mockCache.del).toHaveBeenCalledWith(`campaign:${campaignId}`);
      expect(mockCache.del).toHaveBeenCalledWith(
        `rewards:campaign:${campaignId}`,
      );
    });

    it('should throw NotFoundException if campaign does not exist or does not belong to user', async () => {
      const mockSelectLimit = jest.fn().mockReturnValue({
        then: jest
          .fn()
          .mockImplementation((callback: (value: unknown) => unknown) =>
            callback([]),
          ),
      });

      const mockSelectWhere = jest.fn().mockReturnValue({
        limit: mockSelectLimit,
      });

      const mockSelectFrom = jest.fn().mockReturnValue({
        where: mockSelectWhere,
      });

      mockDb.select = jest.fn().mockReturnValue({
        from: mockSelectFrom,
      });

      const createDto: CreateRewardDto = {
        title: 'Test Reward',
        description: 'A test reward',
        type: RewardType.text,
        content: 'Test content',
        goalAmount: 100,
      };

      await expect(
        service.create('non-existent-campaign', 'user-123', createDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByCampaign', () => {
    it('should return cached rewards if available', async () => {
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      const cachedRewards = [mockReward];
      mockCache.get.mockResolvedValue(cachedRewards);

      const result = await service.findAllByCampaign(campaignId, userId);

      expect(mockCache.get).toHaveBeenCalledWith(
        `rewards:campaign:${campaignId}`,
      );
      expect(result).toEqual(cachedRewards);
    });

    it('should fetch rewards from database and cache them when cache is empty', async () => {
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      const result = await service.findAllByCampaign(campaignId, userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        `rewards:campaign:${campaignId}`,
        expect.any(Array),
        300,
      );
      expect(result).toBeDefined();
    });

    it('should verify campaign ownership before fetching rewards', async () => {
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      await service.findAllByCampaign(campaignId, userId);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return cached reward if available', async () => {
      const rewardId = 1;
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(mockReward);

      const result = await service.findOne(rewardId, campaignId, userId);

      expect(mockCache.get).toHaveBeenCalledWith(`reward:${rewardId}`);
      expect(result).toEqual(mockReward);
    });

    it('should fetch reward from database and cache it when cache is empty', async () => {
      const rewardId = 1;
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      const result = await service.findOne(rewardId, campaignId, userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        `reward:${rewardId}`,
        expect.any(Object),
        300,
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when reward is not found', async () => {
      const rewardId = 999;
      const campaignId = 'campaign-123';
      const userId = 'user-123';

      // Reset mocks for this specific test
      jest.clearAllMocks();

      mockCache.get.mockResolvedValue(null);

      // Create a counter to track select calls
      let selectCallCount = 0;

      // Mock for campaign ownership check (first select call)
      const mockCampaignLimit = jest.fn().mockReturnValue({
        then: jest
          .fn()
          .mockImplementation((callback: (value: unknown) => unknown) =>
            callback([mockCampaign]),
          ),
      });

      const mockCampaignWhere = jest.fn().mockReturnValue({
        limit: mockCampaignLimit,
      });

      const mockCampaignFrom = jest.fn().mockReturnValue({
        where: mockCampaignWhere,
      });

      // Mock for reward query (second select call) - returns empty
      const mockRewardLimit = jest.fn().mockReturnValue({
        then: jest
          .fn()
          .mockImplementation((callback: (value: unknown) => unknown) =>
            callback([]),
          ),
      });

      const mockRewardWhere = jest.fn().mockReturnValue({
        limit: mockRewardLimit,
      });

      const mockRewardFrom = jest.fn().mockReturnValue({
        where: mockRewardWhere,
      });

      mockDb.select = jest.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return { from: mockCampaignFrom };
        }
        return { from: mockRewardFrom };
      });

      await expect(
        service.findOne(rewardId, campaignId, userId),
      ).rejects.toThrow(NotFoundException);

      // Reset for second assertion
      selectCallCount = 0;

      await expect(
        service.findOne(rewardId, campaignId, userId),
      ).rejects.toThrow(`Recompensa com ID ${rewardId} não encontrada.`);
    });

    it('should verify campaign ownership before fetching reward', async () => {
      const rewardId = 1;
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      await service.findOne(rewardId, campaignId, userId);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a reward', async () => {
      const rewardId = 1;
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      const updateDto: UpdateRewardDto = {
        title: 'Updated Reward',
      };
      mockCache.get.mockResolvedValue(null);

      const result = await service.update(
        rewardId,
        campaignId,
        userId,
        updateDto,
      );

      expect(result.title).toBe('Updated Reward');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should call findOne to verify reward exists before update', async () => {
      const rewardId = 1;
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      const updateDto: UpdateRewardDto = { title: 'Updated' };
      const findOneSpy = jest.spyOn(service, 'findOne');
      mockCache.get.mockResolvedValue(null);

      await service.update(rewardId, campaignId, userId, updateDto);

      expect(findOneSpy).toHaveBeenCalledWith(rewardId, campaignId, userId);
    });

    it('should invalidate all related caches after update', async () => {
      const rewardId = 1;
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      const updateDto: UpdateRewardDto = { title: 'Updated' };
      mockCache.get.mockResolvedValue(mockReward);

      await service.update(rewardId, campaignId, userId, updateDto);

      expect(mockCache.del).toHaveBeenCalledWith(`reward:${rewardId}`);
      expect(mockCache.del).toHaveBeenCalledWith(
        `rewards:campaign:${campaignId}`,
      );
      expect(mockCache.del).toHaveBeenCalledWith(`campaign:${campaignId}`);
    });
  });

  describe('remove', () => {
    it('should delete a reward and invalidate caches', async () => {
      const rewardId = 1;
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      await service.remove(rewardId, campaignId, userId);

      expect(mockDb.delete).toHaveBeenCalledWith(schema.reward);
      expect(mockCache.del).toHaveBeenCalledWith(`reward:${rewardId}`);
      expect(mockCache.del).toHaveBeenCalledWith(
        `rewards:campaign:${campaignId}`,
      );
      expect(mockCache.del).toHaveBeenCalledWith(`campaign:${campaignId}`);
    });

    it('should call findOne to verify reward exists before deletion', async () => {
      const rewardId = 1;
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      const findOneSpy = jest.spyOn(service, 'findOne');
      mockCache.get.mockResolvedValue(null);

      await service.remove(rewardId, campaignId, userId);

      expect(findOneSpy).toHaveBeenCalledWith(rewardId, campaignId, userId);
    });

    it('should invalidate all related caches', async () => {
      const rewardId = 1;
      const campaignId = 'campaign-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(mockReward);

      await service.remove(rewardId, campaignId, userId);

      expect(mockCache.del).toHaveBeenCalledTimes(3);
      expect(mockCache.del).toHaveBeenCalledWith(`reward:${rewardId}`);
      expect(mockCache.del).toHaveBeenCalledWith(
        `rewards:campaign:${campaignId}`,
      );
      expect(mockCache.del).toHaveBeenCalledWith(`campaign:${campaignId}`);
    });
  });
});
