import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'The name of the product',
    example: 'Premium Plan',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'The description of the product',
    example: 'Premium plan with advanced features',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    description:
      'The price of the product in the smallest currency unit (e.g., cents)',
    example: 2999,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  price!: number;
}
