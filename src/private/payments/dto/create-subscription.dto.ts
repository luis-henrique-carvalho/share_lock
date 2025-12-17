import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'The ID of the customer to subscribe',
    example: 'cus_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({
    description: 'The ID of the price to subscribe to',
    example: 'price_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  priceId!: string;
}
