import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

@Controller()
@UseGuards(AuthGuard)
@ApiTags('Private - Rewards')
@ApiBearerAuth()
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Post()
  create(
    @Param('campaign_id', ParseUUIDPipe) campaignId: string,
    @Body() createRewardDto: CreateRewardDto,
    @Session() session: UserSession,
  ) {
    return this.rewardsService.create(
      campaignId,
      session.user.id,
      createRewardDto,
    );
  }

  @Get()
  findAll(
    @Param('campaign_id', ParseUUIDPipe) campaignId: string,
    @Session() session: UserSession,
  ) {
    return this.rewardsService.findAllByCampaign(campaignId, session.user.id);
  }

  @Get(':id')
  findOne(
    @Param('campaign_id', ParseUUIDPipe) campaignId: string,
    @Param('id', ParseIntPipe) id: number,
    @Session() session: UserSession,
  ) {
    return this.rewardsService.findOne(id, campaignId, session.user.id);
  }

  @Patch(':id')
  update(
    @Param('campaign_id', ParseUUIDPipe) campaignId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRewardDto: UpdateRewardDto,
    @Session() session: UserSession,
  ) {
    return this.rewardsService.update(
      id,
      campaignId,
      session.user.id,
      updateRewardDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('campaign_id', ParseUUIDPipe) campaignId: string,
    @Param('id', ParseIntPipe) id: number,
    @Session() session: UserSession,
  ) {
    return this.rewardsService.remove(id, campaignId, session.user.id);
  }
}
