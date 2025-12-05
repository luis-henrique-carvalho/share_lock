import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CacheService } from 'src/common/cache/cache.service';
import { S3Service } from 'src/common/s3/s3.service';

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
describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        { provide: 'DrizzleAsyncProvider', useValue: {} },
        {
          provide: CacheService,
          useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
        },
        {
          provide: S3Service,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({ url: 'mock-url' }),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
