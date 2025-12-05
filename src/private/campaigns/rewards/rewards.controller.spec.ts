import { Test, TestingModule } from '@nestjs/testing';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { CacheService } from 'src/common/cache/cache.service';

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
describe('RewardsController', () => {
  let controller: RewardsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RewardsController],
      providers: [
        RewardsService,
        { provide: 'DrizzleAsyncProvider', useValue: {} },
        {
          provide: CacheService,
          useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<RewardsController>(RewardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
