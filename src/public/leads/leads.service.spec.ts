import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { DrizzleAsyncProvider } from '../../common/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../common/drizzle/schema';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { PublicLeadsQueueService } from './queue/public-leads-queue.service';

describe('LeadsService', () => {
  let service: LeadsService;
  let mockDb: {
    insert: jest.Mock;
    select: jest.Mock;
    update: jest.Mock;
    query: {
      campaign: { findFirst: jest.Mock };
      lead: { findFirst: jest.Mock };
      reward: { findMany: jest.Mock };
    };
  };
  let mockPublicLeadsQueue: {
    sendWelcomeLeadEmail: jest.Mock;
  };

  const mockCampaign = {
    id: 'campaign-id-123',
    slug: 'test-campaign',
    title: 'Test Campaign',
    description: 'Test Description',
    userId: 'user-123',
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLead = {
    id: 'lead-id-123',
    campaignId: 'campaign-id-123',
    email: 'test@example.com',
    name: 'Test User',
    referralCode: 'ABC123',
    emailVerified: false,
    verificationToken: 'token-123',
    verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
    status: 'new' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockReturning = jest.fn().mockResolvedValue([mockLead]);
    const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
    const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

    const mockSet = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: mockReturning,
      }),
    });
    const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });

    const mockFrom = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ count: 5 }]),
    });
    const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

    mockDb = {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      query: {
        campaign: {
          findFirst: jest.fn().mockResolvedValue(mockCampaign),
        },
        lead: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        reward: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1,
              title: 'Bronze',
              description: 'First reward',
              type: 'coupon_code',
              content: 'CODE123',
              goalAmount: 3,
            },
            {
              id: 2,
              title: 'Silver',
              description: 'Second reward',
              type: 'link',
              content: 'https://example.com',
              goalAmount: 5,
            },
          ]),
        },
      },
    };

    mockPublicLeadsQueue = {
      sendWelcomeLeadEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: DrizzleAsyncProvider,
          useValue: mockDb as unknown as NodePgDatabase<typeof schema>,
        },
        {
          provide: PublicLeadsQueueService,
          useValue: mockPublicLeadsQueue,
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createLeadDto: CreateLeadDto = {
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should create a lead successfully', async () => {
      const result = await service.create('test-campaign', createLeadDto);

      expect(result.success).toBe(true);
      expect(result.lead).toMatchObject({
        email: createLeadDto.email,
        name: createLeadDto.name,
      });
      expect(result.referralCode).toBeDefined();
      expect(mockDb.query.campaign.findFirst).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockPublicLeadsQueue.sendWelcomeLeadEmail).toHaveBeenCalledWith({
        email: mockLead.email,
        name: mockLead.name || '',
        campaignTitle: mockCampaign.title,
        referralCode: mockLead.referralCode,
        verificationToken: mockLead.verificationToken,
        campaignSlug: 'test-campaign',
      });
    });

    it('should throw NotFoundException if campaign not found', async () => {
      mockDb.query.campaign.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create('invalid-slug', createLeadDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if lead already exists', async () => {
      mockDb.query.lead.findFirst.mockResolvedValueOnce(mockLead);

      await expect(
        service.create('test-campaign', createLeadDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should create indication if referral code is provided and valid', async () => {
      const referrer = { ...mockLead, id: 'referrer-id' };
      mockDb.query.lead.findFirst
        .mockResolvedValueOnce(null) // No existing lead
        .mockResolvedValueOnce(referrer); // Referrer found

      await service.create('test-campaign', createLeadDto, 'REF123');

      expect(mockDb.insert).toHaveBeenCalledTimes(2); // Lead + Indication
    });

    it('should not create indication if referral code is invalid', async () => {
      mockDb.query.lead.findFirst
        .mockResolvedValueOnce(null) // No existing lead
        .mockResolvedValueOnce(null); // Referrer not found

      await service.create('test-campaign', createLeadDto, 'INVALID');

      expect(mockDb.insert).toHaveBeenCalledTimes(1); // Only lead, no indication
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      mockDb.query.lead.findFirst.mockResolvedValueOnce(mockLead);

      const result = await service.verifyEmail('token-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email verified successfully.');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if token is invalid', async () => {
      mockDb.query.lead.findFirst.mockResolvedValueOnce(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        'Invalid verification token.',
      );
    });

    it('should throw BadRequestException if email already verified', async () => {
      const verifiedLead = { ...mockLead, emailVerified: true };
      mockDb.query.lead.findFirst.mockResolvedValueOnce(verifiedLead);

      await expect(service.verifyEmail('token-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token is expired', async () => {
      const expiredLead = {
        ...mockLead,
        verificationTokenExpiresAt: new Date(Date.now() - 1000), // Expired
      };
      mockDb.query.lead.findFirst.mockResolvedValueOnce(expiredLead);

      await expect(service.verifyEmail('token-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should confirm lead indication after verification', async () => {
      mockDb.query.lead.findFirst.mockResolvedValueOnce(mockLead);

      await service.verifyEmail('token-123');

      expect(mockDb.update).toHaveBeenCalledTimes(2); // Update lead + Update indication
    });
  });

  describe('getLeadRewards', () => {
    const verifiedLead = { ...mockLead, emailVerified: true };

    it('should return lead rewards successfully', async () => {
      mockDb.query.lead.findFirst.mockResolvedValueOnce(verifiedLead);

      const result = await service.getLeadRewards('test-campaign', 'ABC123');

      expect(result.lead.email).toBe(verifiedLead.email);
      expect(result.campaign.title).toBe(mockCampaign.title);
      expect(result.totalIndications).toBe(5);
      expect(result.earnedRewards).toHaveLength(2); // Both rewards earned (5 >= 3 and 5 >= 5)
      expect(result.allRewards).toHaveLength(2);
    });

    it('should throw NotFoundException if campaign not found', async () => {
      mockDb.query.campaign.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getLeadRewards('invalid-slug', 'ABC123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if lead not found', async () => {
      mockDb.query.lead.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getLeadRewards('test-campaign', 'INVALID'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getLeadRewards('test-campaign', 'INVALID'),
      ).rejects.toThrow('Lead not found.');
    });

    it('should throw BadRequestException if email not verified', async () => {
      mockDb.query.lead.findFirst.mockResolvedValueOnce(mockLead); // emailVerified = false

      await expect(
        service.getLeadRewards('test-campaign', 'ABC123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter earned rewards correctly', async () => {
      mockDb.query.lead.findFirst.mockResolvedValueOnce(verifiedLead);

      const mockWhere = jest.fn().mockResolvedValueOnce([{ count: 4 }]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValueOnce({ from: mockFrom });

      const result = await service.getLeadRewards('test-campaign', 'ABC123');

      expect(result.totalIndications).toBe(4);
      expect(result.earnedRewards).toHaveLength(1); // Only Bronze (goalAmount: 3)
      expect(result.earnedRewards[0].title).toBe('Bronze');
      expect(result.allRewards[0].isEarned).toBe(true);
      expect(result.allRewards[1].isEarned).toBe(false); // Silver requires 5
    });

    it('should not expose content for unearned rewards', async () => {
      mockDb.query.lead.findFirst.mockResolvedValueOnce(verifiedLead);

      const mockWhere = jest.fn().mockResolvedValueOnce([{ count: 4 }]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValueOnce({ from: mockFrom });

      const result = await service.getLeadRewards('test-campaign', 'ABC123');

      // earnedRewards shows content
      expect(result.earnedRewards[0].content).toBeDefined();

      // allRewards doesn't have content field
      expect(result.allRewards[0]).not.toHaveProperty('content');
      expect(result.allRewards[1]).not.toHaveProperty('content');
    });
  });
});
