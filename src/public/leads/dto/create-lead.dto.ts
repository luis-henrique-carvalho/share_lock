import { IsEmail, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;
}
