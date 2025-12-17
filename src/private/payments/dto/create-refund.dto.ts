import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty({
    description: 'The ID of the payment intent to refund',
    example: 'pi_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  paymentIntentId!: string;
}
