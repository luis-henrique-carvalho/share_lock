import { Controller, Get, Param } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.campaignsService.findBySlug(slug);
  }
}
