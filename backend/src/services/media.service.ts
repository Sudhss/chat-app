import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../utils/response';

const s3 = new S3Client({
  region:   env.AWS_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: env.AWS_ACCESS_KEY_ID ? {
    accessKeyId:     env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  } : undefined,
  forcePathStyle: !!env.S3_ENDPOINT, // required for MinIO
});

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg':      'images',
  'image/png':       'images',
  'image/gif':       'images',
  'image/webp':      'images',
  'video/mp4':       'videos',
  'video/webm':      'videos',
  'audio/mpeg':      'audio',
  'audio/ogg':       'audio',
  'application/pdf': 'documents',
};

export class MediaService {
  async getPresignedUploadUrl(uploaderId: string, filename: string, mimeType: string, size: number) {
    const category = ALLOWED_TYPES[mimeType];
    if (!category) throw new AppError('File type not allowed', 415);
    if (size > env.MAX_FILE_SIZE_MB * 1024 * 1024) throw new AppError(`File too large (max ${env.MAX_FILE_SIZE_MB}MB)`, 413);

    const ext      = filename.split('.').pop() ?? 'bin';
    const key      = `${category}/${uploaderId}/${uuidv4()}.${ext}`;
    const command  = new PutObjectCommand({
      Bucket:      env.S3_BUCKET_NAME,
      Key:         key,
      ContentType: mimeType,
      ContentLength: size,
      Metadata:    { uploaderId, originalName: filename },
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    const media = await prisma.media.create({
      data: {
        uploaderId,
        filename:     key,
        originalName: filename,
        mimeType,
        size,
        url: `${env.S3_ENDPOINT ?? `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com`}/${key}`,
      },
    });

    return { uploadUrl, mediaId: media.id, key };
  }

  async getDownloadUrl(mediaId: string, requesterId: string) {
    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new AppError('Media not found', 404);

    const command = new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: media.filename });
    const url     = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return { url, media };
  }

  async attachToMessage(mediaId: string, messageId: string, uploaderId: string) {
    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new AppError('Media not found', 404);
    if (media.uploaderId !== uploaderId) throw new AppError('Forbidden', 403);

    return prisma.media.update({ where: { id: mediaId }, data: { messageId } });
  }
}

export const mediaService = new MediaService();
