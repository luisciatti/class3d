import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { ContentController } from './content/content.controller';
import { ContentService } from './content/content.service';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';
import { ProgressController } from './progress/progress.controller';
import { ProgressService } from './progress/progress.service';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z
    .string()
    .trim()
    .min(
      1,
      'DATABASE_URL is required. Create apps/api/.env with DATABASE_URL="postgresql://mundo:mundo@localhost:5432/mundo".',
    )
    .url(
      'DATABASE_URL must be a valid PostgreSQL URL, for example: postgresql://mundo:mundo@localhost:5432/mundo',
    ),
  REDIS_URL: z
    .string()
    .trim()
    .min(1, 'REDIS_URL is required. Create apps/api/.env with REDIS_URL="redis://localhost:6379".')
    .url('REDIS_URL must be a valid Redis URL, for example: redis://localhost:6379'),
  JWT_SECRET: z.string().default('dev-secret-change-me'),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TTL: z.coerce.number().default(604800),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const parsed = envSchema.safeParse(config);

        if (!parsed.success) {
          const message = parsed.error.issues
            .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
            .join('; ');

          throw new Error(`Invalid environment configuration: ${message}`);
        }

        return parsed.data;
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60,
        limit: 60,
      },
    ]),
  ],
  controllers: [HealthController, ContentController, AuthController, ProgressController],
  providers: [PrismaService, ContentService, AuthService, ProgressService],
  exports: [PrismaService, ContentService, AuthService, ProgressService],
})
export class AppModule {}
