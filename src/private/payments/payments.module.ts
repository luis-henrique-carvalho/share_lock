import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeGateway } from './gateways/stripe.gateway';
import { PAYMENT_GATEWAY } from './payments.constants';
import { DrizzleModule } from 'src/common/drizzle/drizzle.module';
import { CacheModule } from 'src/common/cache/cache.module';

@Module({
  imports: [ConfigModule, DrizzleModule, CacheModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeGateway,
    {
      provide: PAYMENT_GATEWAY,
      useExisting: StripeGateway, // Troque aqui para outro gateway no futuro
    },
  ],
  exports: [PaymentsService, PAYMENT_GATEWAY],
})
export class PaymentsModule {}
