import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'The email address of the customer',
    example: 'customer@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'The name of the customer',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
