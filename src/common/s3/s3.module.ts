import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { S3Provider } from './s3.provider';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [S3Service, S3Provider],
  exports: [S3Service],
})
export class S3Module {}
