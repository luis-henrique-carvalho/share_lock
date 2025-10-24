import { Body, Controller, Param, Post, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Controller()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(
    @Body() createLeadDto: CreateLeadDto,
    @Param('campaign_slug') campaignSlug: string,
    @Query('ref') referralCode?: string,
  ) {
    return this.leadsService.create(campaignSlug, createLeadDto, referralCode);
  }
}
