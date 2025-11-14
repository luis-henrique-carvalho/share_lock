import { S3Client } from '@aws-sdk/client-s3';
import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const S3Provider: FactoryProvider<S3Client> = {
  provide: 'S3_CLIENT',
  useFactory: (configService: ConfigService) => {
    return new S3Client({
      region: configService.getOrThrow<string>('AWS_S3_REGION'),
      credentials: {
        accessKeyId: configService.getOrThrow<string>('AWS_S3_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow<string>(
          'AWS_S3_SECRET_ACCESS_KEY',
        ),
      },
    });
  },
  inject: [ConfigService],
};
