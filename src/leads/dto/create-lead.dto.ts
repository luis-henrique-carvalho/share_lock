import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum LeadStatus {
  new = 'new',
  contacted = 'contacted',
  converted = 'converted',
}

export class CreateLeadDto {
  @IsUUID()
  @IsNotEmpty()
  campaignId!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}
