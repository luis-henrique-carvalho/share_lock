import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CampaignStatus {
  draft = 'draft',
  active = 'active',
  paused = 'paused',
  archived = 'archived',
}

export class CreateCampainDto {
  @ApiProperty({
    description: 'The title of the campaign',
    example: 'Summer Sale 2025',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'The description of the campaign',
    example: 'Get amazing discounts this summer',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    description: 'URL for the campaign image',
    example: 'https://example.com/image.jpg',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'The status of the campaign',
    enum: CampaignStatus,
    default: CampaignStatus.draft,
    example: CampaignStatus.draft,
  })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
