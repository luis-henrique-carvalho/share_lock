import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller()
@AllowAnonymous()
@ApiTags('Public - Campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.campaignsService.findBySlug(slug);
  }
}
