import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SignUpHook } from './hooks/sign-up.hook';
import { UsersQueueService } from './queue/users-queue.service';
import { UsersQueueProcessor } from './queue/users-queue.processor';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'users',
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, SignUpHook, UsersQueueService, UsersQueueProcessor],
})
export class UsersModule {}
