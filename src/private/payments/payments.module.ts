import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: 'STRIPE_API_KEY',
      useFactory: (configService: ConfigService) => {
        return configService.get<string>('STRIPE_API_KEY');
      },
      inject: [ConfigService],
    },
  ],
})
export class PaymentsModule {}
