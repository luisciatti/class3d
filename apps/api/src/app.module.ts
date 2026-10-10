import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { z } from 'zod';
import { HealthController } from './health.controller';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z.string().url().default('postgresql://mundo:mundo@localhost:5432/mundo'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
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
  controllers: [HealthController],
})
export class AppModule {}
