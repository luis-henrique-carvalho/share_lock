import { PartialType } from '@nestjs/mapped-types';
import { CreateCampainDto } from './create-campain.dto';

export class UpdateCampainDto extends PartialType(CreateCampainDto) {}
