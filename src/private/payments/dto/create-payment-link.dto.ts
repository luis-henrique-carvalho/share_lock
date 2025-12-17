import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentLinkDto {
  @ApiProperty({
    description: 'The ID of the price to create a payment link for',
    example: 'price_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  priceId!: string;
}
