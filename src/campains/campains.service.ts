import { Injectable } from '@nestjs/common';
import { CreateCampainDto } from './dto/create-campain.dto';
import { UpdateCampainDto } from './dto/update-campain.dto';

@Injectable()
export class CampainsService {
  create(createCampainDto: CreateCampainDto) {
    return 'This action adds a new campain';
  }

  findAll() {
    return `This action returns all campains`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campain`;
  }

  update(id: number, updateCampainDto: UpdateCampainDto) {
    return `This action updates a #${id} campain`;
  }

  remove(id: number) {
    return `This action removes a #${id} campain`;
  }
}
