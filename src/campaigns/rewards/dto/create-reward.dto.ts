import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export enum RewardType {
  file = 'file',
  link = 'link',
  coupon_code = 'coupon_code',
  text = 'text',
}

export class CreateRewardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(RewardType)
  type!: RewardType;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsInt()
  @Min(1)
  goalAmount!: number;
}
