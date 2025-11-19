import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/drizzle/schema';
import { eq } from 'drizzle-orm';
import { UpdateUserDto } from './dto/update-user.dto'
import { S3Service } from 'src/common/s3/s3.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,

    @Inject(CacheService)
    private cache: CacheService,

    @Inject(S3Service)
    private s3: S3Service,
  ) {}

  async findOne(id: string) {
    const cacheKey = `user:${id}`;
    const cached = await this.cache.get<typeof schema.user>(cacheKey);

    if (cached) return cached;

    const user = await this.db.query.user.findFirst({
      where: eq(schema.user.id, id),
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    await this.cache.set(cacheKey, user, 300);

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    image?: Express.Multer.File,
  ) {
    const user = await this.findOne(id);

    let imageUrl: string | undefined;

    if (image) {
      const { url } = await this.s3.uploadFile(image, {
        existingFileUrl: user.image as string | null,
        path: 'user-images',
      });
      imageUrl = url;
    }

    const updatePayload: Partial<typeof schema.user.$inferInsert> = {};

    Object.assign(updatePayload, updateUserDto);

    if (imageUrl) {
      updatePayload.image = imageUrl;
    }

    if (Object.keys(updatePayload).length === 0) {
      return user;
    }

    const [updatedUser] = await this.db
      .update(schema.user)
      .set(updatePayload)
      .where(eq(schema.user.id, id))
      .returning();

    const cacheKey = `user:${id}`;
    await this.cache.set(cacheKey, updatedUser, 300);

    return updatedUser;
  }
}
