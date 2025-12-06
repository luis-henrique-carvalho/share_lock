import { ConfigModule } from '@nestjs/config';
import { AbacatePayProvider } from './abacate-pay.privider';
import { Module } from '@nestjs/common';

@Module({
  imports: [ConfigModule],
  providers: [AbacatePayProvider],
  exports: [AbacatePayProvider],
})
export class AbacatePayModule {}
