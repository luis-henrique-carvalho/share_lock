import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SignUpHook } from './hooks/sign-up.hook';
import { UsersQueueModule } from './queue/users-queue.module';

@Module({
  imports: [UsersQueueModule],
  controllers: [UsersController],
  providers: [UsersService, SignUpHook],
})
export class UsersModule {}
