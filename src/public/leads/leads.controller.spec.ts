import { Test, TestingModule } from '@nestjs/testing';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { PublicLeadsQueueService } from './queue/public-leads-queue.service';

describe('LeadsController', () => {
  let controller: LeadsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        LeadsService,
        {
          provide: DrizzleAsyncProvider,
          useValue: {},
        },
        {
          provide: PublicLeadsQueueService,
          useValue: {
            sendWelcomeLeadEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<LeadsController>(LeadsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
