import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsService } from './campaigns.service';
import { CacheService } from '../common/cache/cache.service';
import { DrizzleAsyncProvider } from '../common/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../common/drizzle/schema';

import { CreateCampainDto } from './dto/create-campain.dto';

describe('CampaignsService', () => {
  let service: CampaignsService;
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
    // Mock the Drizzle query builder chain
    const mockReturning = jest.fn().mockResolvedValue([
      {
        id: 'test-id-123',
        title: 'Test Campaign',
        description: 'A test campaign',
        status: 'draft',
        userId: 'user-123',
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

    mockDb = {
      insert: mockInsert,
      select: jest.fn(),
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
        CampaignsService,
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

    service = module.get<CampaignsService>(CampaignsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a campaign', async () => {
      const createDto: CreateCampainDto = {
        title: 'Test Campaign',
        description: 'A test campaign',
      };
      const result = await service.create(createDto, 'user-123');
      expect(result).toMatchObject(createDto);
      expect(typeof result.id).toBe('string');
    });

    it('should cache the created campaign and invalidate user campaigns cache', async () => {
      const createDto: CreateCampainDto = {
        title: 'Test Campaign',
        description: 'A test campaign',
      };
      const userId = 'user-123';
      const result = await service.create(createDto, userId);

      expect(mockCache.set).toHaveBeenCalledWith(
        `campaign:${result.id}`,
        expect.objectContaining({
          id: result.id,
          title: createDto.title,
          description: createDto.description,
        }),
        300,
      );

      expect(mockCache.del).toHaveBeenCalledWith(`campaigns:user:${userId}`);
    });
  });
});
