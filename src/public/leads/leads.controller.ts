import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
@Controller()
@AllowAnonymous()
@ApiTags('Public - Leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiQuery({
    name: 'ref',
    required: false,
    type: 'string',
  })
  create(
    @Body() createLeadDto: CreateLeadDto,
    @Param('campaign_slug') campaignSlug: string,
    @Query('ref') referralCode?: string,
  ) {
    return this.leadsService.create(campaignSlug, createLeadDto, referralCode);
  }

  @Post('verify-email')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.leadsService.verifyEmail(verifyEmailDto.token);
  }

  @Get('rewards/:referral_code')
  getRewards(
    @Param('campaign_slug') campaignSlug: string,
    @Param('referral_code') referralCode: string,
  ) {
    return this.leadsService.getLeadRewards(campaignSlug, referralCode);
  }
}
