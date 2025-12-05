import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RewardType {
  file = 'file',
  link = 'link',
  coupon_code = 'coupon_code',
  text = 'text',
}

export class CreateRewardDto {
  @ApiProperty({
    description: 'The title of the reward',
    example: 'Free eBook',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'The description of the reward',
    example: 'Get our exclusive guide on marketing strategies',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    description: 'The type of reward content',
    enum: RewardType,
    example: RewardType.link,
  })
  @IsEnum(RewardType)
  type!: RewardType;

  @ApiProperty({
    description: 'The content of the reward (URL, file path, code, or text)',
    example: 'https://example.com/ebook.pdf',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({
    description: 'The number of referrals required to unlock this reward',
    example: 5,
    minimum: 1,
    type: 'integer',
  })
  @IsInt()
  @Min(1)
  goalAmount!: number;
}
