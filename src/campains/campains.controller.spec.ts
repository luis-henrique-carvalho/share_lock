import { Test, TestingModule } from '@nestjs/testing';
import { CampainsController } from './campains.controller';
import { CampainsService } from './campains.service';

describe('CampainsController', () => {
  let controller: CampainsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampainsController],
      providers: [CampainsService],
    }).compile();

    controller = module.get<CampainsController>(CampainsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
