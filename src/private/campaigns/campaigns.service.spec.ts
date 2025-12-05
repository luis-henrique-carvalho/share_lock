import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from 'src/common/s3/s3.service';
import { CampaignsService } from './campaigns.service';
import { CacheService } from 'src/common/cache/cache.service';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/drizzle/schema';
import { CreateCampainDto } from './dto/create-campain.dto';
import { UpdateCampainDto } from './dto/update-campain.dto';
import { NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';

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

  const mockCampaign = {
    id: 'test-id-123',
    title: 'Test Campaign',
    description: 'A test campaign',
    slug: 'test-campaign',
    imageUrl: null,
    status: 'draft' as const,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock S3Service
  const mockS3Service = {
    uploadFile: jest
      .fn()
      .mockResolvedValue({ url: 'https://mock-s3-url.com/image.png' }),
    deleteFileByUrl: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    // Mock insert chain
    const mockInsertReturning = jest.fn().mockResolvedValue([mockCampaign]);
    const mockInsertValues = jest.fn().mockReturnValue({
      returning: mockInsertReturning,
    });
    const mockInsert = jest.fn().mockReturnValue({
      values: mockInsertValues,
    });

    // Mock select chain
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
          callback([mockCampaign]),
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
      .mockResolvedValue([{ ...mockCampaign, status: 'active' as const }]);
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
        CampaignsService,
        {
          provide: DrizzleAsyncProvider,
          useValue: mockDb as unknown as NodePgDatabase<typeof schema>,
        },
        {
          provide: CacheService,
          useValue: mockCache as unknown as CacheService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
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

  describe('create', () => {
    it('should create a campaign', async () => {
      const createDto: CreateCampainDto = {
        title: 'Test Campaign',
        description: 'A test campaign',
      };
      const result = await service.create(createDto, 'user-123');
      expect(result).toMatchObject({
        title: createDto.title,
        description: createDto.description,
      });
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

    it('should set campaign status to draft by default', async () => {
      const createDto: CreateCampainDto = {
        title: 'Test Campaign',
        description: 'A test campaign',
      };
      const result = await service.create(createDto, 'user-123');
      expect(result.status).toBe('draft');
    });
  });

  describe('activate', () => {
    it('should activate a campaign', async () => {
      mockCache.get.mockResolvedValue(null);
      const userId = 'user-123';
      const campaignId = 'test-id-123';

      const result = await service.activate(campaignId, userId);

      expect(result.status).toBe('active');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should return campaign if already active', async () => {
      const activeCampaign = { ...mockCampaign, status: 'active' as const };
      mockCache.get.mockResolvedValue(activeCampaign);

      const result = await service.activate('test-id-123', 'user-123');

      expect(result.status).toBe('active');
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should cache the activated campaign and invalidate user campaigns cache', async () => {
      mockCache.get.mockResolvedValue(null);
      const userId = 'user-123';
      const campaignId = 'test-id-123';

      await service.activate(campaignId, userId);

      expect(mockCache.set).toHaveBeenCalledWith(
        `campaign:${campaignId}`,
        expect.objectContaining({ status: 'active' }),
        300,
      );
      expect(mockCache.del).toHaveBeenCalledWith(`campaigns:user:${userId}`);
    });
  });

  describe('findAll', () => {
    it('should return cached campaigns if available', async () => {
      const userId = 'user-123';
      const cachedCampaigns = [mockCampaign];
      mockCache.get.mockResolvedValue(cachedCampaigns);

      const result = await service.findAll(userId);

      expect(mockCache.get).toHaveBeenCalledWith(`campaigns:user:${userId}`);
      expect(result).toEqual(cachedCampaigns);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should fetch campaigns from database and cache them when cache is empty', async () => {
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      const result = await service.findAll(userId);

      expect(mockCache.get).toHaveBeenCalledWith(`campaigns:user:${userId}`);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        `campaigns:user:${userId}`,
        [mockCampaign],
        300,
      );
      expect(result).toEqual([mockCampaign]);
    });

    it('should filter campaigns by userId', async () => {
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      await service.findAll(userId);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return cached campaign if available', async () => {
      const campaignId = 'test-id-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(mockCampaign);

      const result = await service.findOne(campaignId, userId);

      expect(mockCache.get).toHaveBeenCalledWith(`campaign:${campaignId}`);
      expect(result).toEqual(mockCampaign);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should fetch campaign from database and cache it when cache is empty', async () => {
      const campaignId = 'test-id-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      const result = await service.findOne(campaignId, userId);

      expect(mockCache.get).toHaveBeenCalledWith(`campaign:${campaignId}`);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        `campaign:${campaignId}`,
        mockCampaign,
        300,
      );
      expect(result).toEqual(mockCampaign);
    });

    it('should throw NotFoundException when campaign is not found', async () => {
      const campaignId = 'non-existent-id';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

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

      await expect(service.findOne(campaignId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(campaignId, userId)).rejects.toThrow(
        `Campanha com ID ${campaignId} não encontrada.`,
      );
    });

    it('should filter by campaign id and userId', async () => {
      const campaignId = 'test-id-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      await service.findOne(campaignId, userId);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a campaign', async () => {
      const campaignId = 'test-id-123';
      const userId = 'user-123';
      const updateDto: UpdateCampainDto = {
        title: 'Updated Campaign',
      };
      mockCache.get.mockResolvedValue(null);

      const mockUpdateReturning = jest
        .fn()
        .mockResolvedValue([{ ...mockCampaign, title: 'Updated Campaign' }]);
      const mockUpdateWhere = jest.fn().mockReturnValue({
        returning: mockUpdateReturning,
      });
      const mockUpdateSet = jest.fn().mockReturnValue({
        where: mockUpdateWhere,
      });
      mockDb.update = jest.fn().mockReturnValue({
        set: mockUpdateSet,
      });

      // Provide a valid mock file object
      const mockFile: Express.Multer.File = {
        fieldname: 'image',
        originalname: 'test.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 1234,
        buffer: Buffer.from('mock'),
        stream: new Readable(),
        destination: '',
        filename: '',
        path: '',
      };

      const result = await service.update(
        campaignId,
        updateDto,
        userId,
        mockFile,
      );

      expect(result.title).toBe('Updated Campaign');
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(mockFile, {
        existingFileUrl: mockCampaign.imageUrl,
        path: 'campaign-images',
      });
    });

    it('should call findOne to verify campaign exists before update', async () => {
      const campaignId = 'test-id-123';
      const userId = 'user-123';
      const updateDto: UpdateCampainDto = { title: 'Updated' };
      const findOneSpy = jest.spyOn(service, 'findOne');
      mockCache.get.mockResolvedValue(null);

      await service.update(campaignId, updateDto, userId);

      expect(findOneSpy).toHaveBeenCalledWith(campaignId, userId);
    });

    it('should invalidate both individual campaign cache and user campaigns list cache', async () => {
      const campaignId = 'test-id-123';
      const userId = 'user-123';
      const updateDto: UpdateCampainDto = { title: 'Updated' };
      mockCache.get.mockResolvedValue(mockCampaign);

      await service.update(campaignId, updateDto, userId);

      expect(mockCache.set).toHaveBeenCalledWith(
        `campaign:${campaignId}`,
        expect.any(Object),
        300,
      );
      expect(mockCache.del).toHaveBeenCalledWith(`campaigns:user:${userId}`);
    });
  });

  describe('remove', () => {
    it('should delete a campaign and invalidate caches', async () => {
      const campaignId = 'test-id-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(null);

      await service.remove(campaignId, userId);

      expect(mockDb.delete).toHaveBeenCalledWith(schema.campaign);
      expect(mockCache.del).toHaveBeenCalledWith(`campaign:${campaignId}`);
      expect(mockCache.del).toHaveBeenCalledWith(`campaigns:user:${userId}`);
    });

    it('should call findOne to verify campaign exists before deletion', async () => {
      const campaignId = 'test-id-123';
      const userId = 'user-123';
      const findOneSpy = jest.spyOn(service, 'findOne');
      mockCache.get.mockResolvedValue(null);

      await service.remove(campaignId, userId);

      expect(findOneSpy).toHaveBeenCalledWith(campaignId, userId);
    });

    it('should invalidate both individual campaign cache and user campaigns list cache', async () => {
      const campaignId = 'test-id-123';
      const userId = 'user-123';
      mockCache.get.mockResolvedValue(mockCampaign);

      await service.remove(campaignId, userId);

      expect(mockCache.del).toHaveBeenCalledTimes(2);
      expect(mockCache.del).toHaveBeenCalledWith(`campaign:${campaignId}`);
      expect(mockCache.del).toHaveBeenCalledWith(`campaigns:user:${userId}`);
    });
  });
});
