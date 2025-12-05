import { PartialType } from '@nestjs/swagger';
import { CreateCampainDto } from './create-campain.dto';

export class UpdateCampainDto extends PartialType(CreateCampainDto) {}
