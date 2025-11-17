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

  async uploadFile(
    file: Express.Multer.File,
    options: { existingFileUrl?: string | null; path?: string } = {},
  ): Promise<{ url: string }> {
    const { existingFileUrl, path } = options;
    const key =
      this.getKeyFromUrl(existingFileUrl) ??
      this.generateNewKey(file.originalname, path);

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
  private getKeyFromUrl(url?: string | null): string | null {
    if (!url) {
      return null;
    }

    try {
      const { pathname } = new URL(url);
      const key = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      return key || null;
    } catch (error) {
      this.logger.warn(
        `Invalid existingFileUrl provided: ${url}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private generateNewKey(originalName: string, path?: string): string {
    const formattedName = originalName.replace(/\s+/g, '-').toLowerCase();
    const randomPart = `${randomBytes(16).toString('hex')}-${formattedName}`;

    if (path) {
      const cleanPath = path.replace(/^\/|\/$/g, '');
      return `${cleanPath}/${randomPart}`;
    }

    return randomPart;
  }
}
