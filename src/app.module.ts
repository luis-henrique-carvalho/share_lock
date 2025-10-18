import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { CampainsModule } from './campains/campains.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule.forRoot(auth),
    CampainsModule,
  ],
  providers: [],
})
export class AppModule {}
