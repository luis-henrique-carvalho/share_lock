import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { CacheService } from 'src/common/cache/cache.service';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/drizzle/schema';
import { S3Service } from 'src/common/s3/s3.service';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { Readable } from 'stream';

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: {
    query: {
      user: {
        findFirst: jest.Mock;
      };
    };
    update: jest.Mock;
  };
  let mockCache: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let mockS3Service: {
    uploadFile: jest.Mock;
  };

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    image: null,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

  beforeEach(async () => {
    // Mock Drizzle query builder chain for update
    const mockUpdateReturning = jest.fn().mockResolvedValue([mockUser]);
    const mockUpdateWhere = jest.fn().mockReturnValue({
      returning: mockUpdateReturning,
    });
    const mockUpdateSet = jest.fn().mockReturnValue({
      where: mockUpdateWhere,
    });
    const mockUpdate = jest.fn().mockReturnValue({
      set: mockUpdateSet,
    });

    mockDb = {
      query: {
        user: {
          findFirst: jest.fn().mockResolvedValue(mockUser),
        },
      },
      update: mockUpdate,
    };

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    mockS3Service = {
      uploadFile: jest
        .fn()
        .mockResolvedValue({ url: 'https://mock-s3-url.com/new-image.png' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
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

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached user if available', async () => {
      mockCache.get.mockResolvedValue(mockUser);
      const result = await service.findOne('user-123');

      expect(mockCache.get).toHaveBeenCalledWith('user:user-123');
      expect(result).toEqual(mockUser);
      expect(mockDb.query.user.findFirst).not.toHaveBeenCalled();
    });

    it('should fetch user from database and cache it when cache is empty', async () => {
      const result = await service.findOne('user-123');

      expect(mockCache.get).toHaveBeenCalledWith('user:user-123');
      expect(mockDb.query.user.findFirst).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        'user:user-123',
        mockUser,
        300,
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockDb.query.user.findFirst.mockResolvedValue(undefined);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'User with ID non-existent-id not found.',
      );
    });
  });

  describe('update', () => {
    it("should update a user's name and image", async () => {
      const userId = 'user-123';
      const updateUserDto: Partial<UpdateUserDto> = { name: 'Updated Name' };
      const updatedUserMock = {
        ...mockUser,
        name: 'Updated Name',
        image: 'https://mock-s3-url.com/new-image.png',
      };

      // Mock the findOne call inside update
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockUser);

      // Mock the update return value
      const mockUpdateReturning = jest
        .fn()
        .mockResolvedValue([updatedUserMock]);
      const mockUpdateWhere = jest
        .fn()
        .mockReturnValue({ returning: mockUpdateReturning });
      const mockUpdateSet = jest
        .fn()
        .mockReturnValue({ where: mockUpdateWhere });
      mockDb.update.mockReturnValue({ set: mockUpdateSet });

      const result = await service.update(
        userId,
        updateUserDto as UpdateUserDto,
        mockFile,
      );

      expect(findOneSpy).toHaveBeenCalledWith(userId);
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(mockFile, {
        existingFileUrl: mockUser.image,
        path: 'user-images',
      });
      expect(mockDb.update).toHaveBeenCalledWith(schema.user);
      expect(mockUpdateSet).toHaveBeenCalledWith({
        name: 'Updated Name',
        image: 'https://mock-s3-url.com/new-image.png',
      });
      expect(mockCache.set).toHaveBeenCalledWith(
        `user:${userId}`,
        updatedUserMock,
        300,
      );
      expect(result).toEqual(updatedUserMock);
    });

    it('should not call S3 service if no image is provided', async () => {
      const userId = 'user-123';
      const updateUserDto: Partial<UpdateUserDto> = { name: 'Updated Name' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockUser);

      await service.update(userId, updateUserDto as UpdateUserDto);

      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should return the original user if update payload is empty', async () => {
      const userId = 'user-123';
      jest.spyOn(service, 'findOne').mockResolvedValue(mockUser);

      const result = await service.update(userId, {} as UpdateUserDto);

      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should update user cache on update', async () => {
      const userId = 'user-123';
      const updateUserDto: Partial<UpdateUserDto> = { name: 'Updated Name' };
      const updatedUserMock = { ...mockUser, name: 'Updated Name' };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockUser);
      const mockUpdateReturning = jest
        .fn()
        .mockResolvedValue([updatedUserMock]);
      const mockUpdateWhere = jest
        .fn()
        .mockReturnValue({ returning: mockUpdateReturning });
      const mockUpdateSet = jest
        .fn()
        .mockReturnValue({ where: mockUpdateWhere });
      mockDb.update.mockReturnValue({ set: mockUpdateSet });

      await service.update(userId, updateUserDto as UpdateUserDto);

      expect(mockCache.set).toHaveBeenCalledWith(
        `user:${userId}`,
        updatedUserMock,
        300,
      );
    });
  });
});
