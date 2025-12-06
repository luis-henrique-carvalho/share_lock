import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AbacatePay from 'abacatepay-nodejs-sdk';

export const AbacatePayProvider: FactoryProvider<
  ReturnType<typeof AbacatePay>
> = {
  provide: 'ABACATE_PAY_CLIENT',
  useFactory: (configService: ConfigService) => {
    const apiKey = configService.getOrThrow<string>('ABACATEPAY_API_KEY');

    const abacatePay = AbacatePay(apiKey);

    return abacatePay;
  },
  inject: [ConfigService],
};
