import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LeadStatus {
  new = 'new',
  contacted = 'contacted',
  converted = 'converted',
}

export class CreateLeadDto {
  @ApiProperty({
    description: 'The UUID of the campaign this lead belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  campaignId!: string;

  @ApiProperty({
    description: 'The email address of the lead',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({
    description: 'The name of the lead',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'The status of the lead',
    enum: LeadStatus,
    default: LeadStatus.new,
    example: LeadStatus.new,
  })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}
