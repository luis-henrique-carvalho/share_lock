import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './common/lib/auth';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule.forRoot(auth),
    CampaignsModule,
    PublicModule,
  ],
  providers: [],
})
export class AppModule {}
