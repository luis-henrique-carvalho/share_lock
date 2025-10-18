import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CampainsService } from './campains.service';
import { CreateCampainDto } from './dto/create-campain.dto';
import { UpdateCampainDto } from './dto/update-campain.dto';

@Controller('campains')
export class CampainsController {
  constructor(private readonly campainsService: CampainsService) {}

  @Post()
  create(@Body() createCampainDto: CreateCampainDto) {
    return this.campainsService.create(createCampainDto);
  }

  @Get()
  findAll() {
    return this.campainsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campainsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCampainDto: UpdateCampainDto) {
    return this.campainsService.update(+id, updateCampainDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campainsService.remove(+id);
  }
}
