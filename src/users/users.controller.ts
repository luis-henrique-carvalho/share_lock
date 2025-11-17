import {
  Body,
  Controller,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import { UserSession } from '@thallesp/nestjs-better-auth';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller()
@ApiTags('Private - Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch()
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Body() updateUserDto: UpdateUserDto,
    @Session() session: UserSession,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return this.usersService.update(session.user.id, updateUserDto, image);
  }
}
