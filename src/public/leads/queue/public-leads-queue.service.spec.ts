import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  PublicLeadsQueueService,
  WelcomeLeadEmailJobData,
} from './public-leads-queue.service';

describe('PublicLeadsQueueService', () => {
  let service: PublicLeadsQueueService;
  let queue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const queueMock: Partial<jest.Mocked<Queue>> = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicLeadsQueueService,
        {
          provide: getQueueToken('public-leads'),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get(PublicLeadsQueueService);
    queue = module.get(getQueueToken('public-leads'));
  });

  it('should enqueue welcome lead email job with correct name and options', async (): Promise<void> => {
    const data: WelcomeLeadEmailJobData = {
      email: 'test@example.com',
      name: 'John Doe',
      campaignTitle: 'Campaign X',
      referralCode: 'ABC123',
      verificationToken: 'token123',
      campaignSlug: 'campaign-x',
    };

    await service.sendWelcomeLeadEmail(data);

    expect(queue.add.bind(queue)).toHaveBeenCalledTimes(1);
    expect(queue.add.bind(queue)).toHaveBeenCalledWith(
      'send-welcome-lead-email',
      data,
      expect.objectContaining({
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      }),
    );
  });
});
