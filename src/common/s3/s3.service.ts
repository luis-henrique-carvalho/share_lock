import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Logger } from '@nestjs/common';

@Injectable()
export class S3Service {
  private readonly region: string;
  private readonly bucket: string;

  private readonly logger = new Logger(S3Service.name);

  constructor(
    @Inject('S3_CLIENT') private readonly s3: S3Client,
    private readonly configService: ConfigService,
  ) {
    this.region = this.configService.getOrThrow<string>('AWS_S3_REGION');
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME');
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string }> {
    const formattedName = file.originalname.replace(/\s+/g, '-').toLowerCase();
    const key = `${randomBytes(16).toString('hex')}-${formattedName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3.send(command);

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return { url };
  }

  async deleteFileByUrl(url: string): Promise<void> {
    try {
      const { pathname } = new URL(url);
      const key = pathname.startsWith('/') ? pathname.slice(1) : pathname;

      if (!key) return;

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3.send(command);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${url}`, error);
      return;
    }
  }
}
