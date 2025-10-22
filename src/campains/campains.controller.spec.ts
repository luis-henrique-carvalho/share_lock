import { Test, TestingModule } from '@nestjs/testing';
import { CampainsController } from './campains.controller';
import { CampainsService } from './campains.service';
import { CacheService } from '../common/cache/cache.service';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  AuthGuard: jest.fn(),
  Session:
    () =>
    (
      target: any,
      key: string | symbol,
      descriptor: TypedPropertyDescriptor<any>,
    ): TypedPropertyDescriptor<any> | void =>
      descriptor,
}));

describe('CampainsController', () => {
  let controller: CampainsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampainsController],
      providers: [
        CampainsService,
        { provide: 'DrizzleAsyncProvider', useValue: {} },
        {
          provide: CacheService,
          useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<CampainsController>(CampainsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
