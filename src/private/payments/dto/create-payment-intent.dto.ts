import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description:
      'The amount to charge in the smallest currency unit (e.g., cents for USD)',
    example: 2000,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amount!: number;

  @ApiProperty({
    description: 'Three-letter ISO currency code',
    example: 'usd',
  })
  @IsString()
  @IsNotEmpty()
  currency!: string;
}
