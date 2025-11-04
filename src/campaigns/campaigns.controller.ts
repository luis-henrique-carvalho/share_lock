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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateCampainDto } from './dto/create-campain.dto';
import { UpdateCampainDto } from './dto/update-campain.dto';

import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

@Controller()
@UseGuards(AuthGuard)
@ApiTags('Private - Campaigns')
@ApiBearerAuth()
export class CampaignsController {
  constructor(private readonly campainsService: CampaignsService) {}

  @Post()
  create(
    @Body() createCampainDto: CreateCampainDto,
    @Session() session: UserSession,
  ) {
    return this.campainsService.create(createCampainDto, session.user.id);
  }

  @Post(':id/activate')
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: UserSession,
  ) {
    return this.campainsService.activate(id, session.user.id);
  }

  @Get()
  findAll(@Session() session: UserSession) {
    return this.campainsService.findAll(session.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: UserSession,
  ) {
    return this.campainsService.findOne(id, session.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCampainDto: UpdateCampainDto,
    @Session() session: UserSession,
  ) {
    return this.campainsService.update(id, updateCampainDto, session.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: UserSession,
  ) {
    return this.campainsService.remove(id, session.user.id);
  }
}
