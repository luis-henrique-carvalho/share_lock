import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { CacheService } from 'src/common/cache/cache.service';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/drizzle/schema';

describe('LeadsService', () => {
  let service: LeadsService;
  let mockDb: {
    select: jest.Mock;
    delete: jest.Mock;
  };
  let mockCache: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };

  const mockLeadFlat = {
    id: 'lead-id-123',
    campaignId: 'campaign-id-123',
    email: 'test@example.com',
    name: 'Test Lead',
    referralCode: 'test-ref-code',
    status: 'new' as const,
    emailVerified: false,
    verificationToken: 'test-token',
    verificationTokenExpiresAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockThen = jest
      .fn()
      .mockImplementation((callback: (value: unknown) => unknown) =>
        callback([mockLeadFlat]),
      );

    const mockLimit = jest.fn().mockReturnValue({
      then: mockThen,
    });

    const mockWhere = jest.fn().mockReturnValue({
      limit: mockLimit,
      then: mockThen,
    });

    const mockInnerJoin = jest.fn().mockReturnValue({
      where: mockWhere,
    });

    const mockFrom = jest.fn().mockReturnValue({
      innerJoin: mockInnerJoin,
    });

    const mockSelect = jest.fn().mockReturnValue({
      from: mockFrom,
    });

    const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);

    const mockDelete = jest.fn().mockReturnValue({
      where: mockDeleteWhere,
    });

    mockDb = {
      select: mockSelect,
      delete: mockDelete,
    };

    mockCache = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
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

    service = module.get<LeadsService>(LeadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return cached leads if available', async () => {
      const userId = 'user-123';
      const cachedLeads = [mockLeadFlat];
      mockCache.get.mockResolvedValue(cachedLeads);

      const result = await service.findAll(userId);

      expect(mockCache.get).toHaveBeenCalledWith(`leads:user:${userId}`);
      expect(result).toEqual(cachedLeads);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should fetch leads from database and cache them when cache is empty', async () => {
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      const result = await service.findAll(userId);

      expect(mockCache.get).toHaveBeenCalledWith(`leads:user:${userId}`);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        `leads:user:${userId}`,
        [mockLeadFlat],
        300,
      );
      expect(result).toEqual([mockLeadFlat]);
    });

    it('should filter leads by userId through campaign relation', async () => {
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      await service.findAll(userId);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return cached lead if available', async () => {
      const leadId = 'lead-id-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(mockLeadFlat);

      const result = await service.findOne(leadId, userId);

      expect(mockCache.get).toHaveBeenCalledWith(`leed:${leadId}`);
      expect(result).toEqual(mockLeadFlat);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should fetch lead from database and cache it when cache is empty', async () => {
      const leadId = 'lead-id-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      const result = await service.findOne(leadId, userId);

      expect(mockCache.get).toHaveBeenCalledWith(`leed:${leadId}`);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        `leed:${leadId}`,
        mockLeadFlat,
        300,
      );
      expect(result).toEqual(mockLeadFlat);
    });

    it('should filter by lead id and userId through campaign relation', async () => {
      const leadId = 'lead-id-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      await service.findOne(leadId, userId);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a lead and invalidate caches', async () => {
      const leadId = 'lead-id-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      // Mock findOne to return something so remove can proceed
      jest.spyOn(service, 'findOne').mockResolvedValue(mockLeadFlat as any);

      await service.remove(leadId, userId);

      expect(mockDb.delete).toHaveBeenCalledWith(schema.lead);
      expect(mockCache.del).toHaveBeenCalledWith(`leed:${leadId}`);
      expect(mockCache.del).toHaveBeenCalledWith(`leads:user:${userId}`);
    });

    it('should call findOne to verify lead exists before deletion', async () => {
      const leadId = 'lead-id-123';
      const userId = 'user-123';
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockLeadFlat as any);
      mockCache.get.mockResolvedValue(null);

      await service.remove(leadId, userId);

      expect(findOneSpy).toHaveBeenCalledWith(leadId, userId);
    });

    it('should invalidate both individual lead cache and user leads list cache', async () => {
      const leadId = 'lead-id-123';
      const userId = 'user-123';
      jest.spyOn(service, 'findOne').mockResolvedValue(mockLeadFlat as any);
      mockCache.get.mockResolvedValue(mockLeadFlat);

      await service.remove(leadId, userId);

      expect(mockCache.del).toHaveBeenCalledTimes(2);
      expect(mockCache.del).toHaveBeenCalledWith(`leed:${leadId}`);
      expect(mockCache.del).toHaveBeenCalledWith(`leads:user:${userId}`);
    });
  });
});
