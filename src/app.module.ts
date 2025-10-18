import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { CampainsModule } from './campains/campains.module';

@Module({
  imports: [AuthModule.forRoot(auth), CampainsModule],
  providers: [],
})
export class AppModule {}
