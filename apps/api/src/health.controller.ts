import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { Client } from 'pg';
import { HealthResponseSchema, ReadyResponseSchema } from '@mundo/shared';

type DependencyHealth = 'up' | 'down';
type ResponseLike = { status: (code: number) => void };

@Controller()
export class HealthController {
  constructor(private readonly configService: ConfigService = new ConfigService()) {}

  @Get('health')
  check() {
    const response = {
      status: 'ok' as const,
      service: 'api',
      timestamp: new Date().toISOString(),
    };

    return HealthResponseSchema.parse(response);
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) res?: ResponseLike) {
    const checks = {
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
    };

    const isReady = Object.values(checks).every((value) => value === 'up');

    if (res) {
      res.status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    }

    const response = {
      status: isReady ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };

    return ReadyResponseSchema.parse(response);
  }

  private async checkDatabase(): Promise<DependencyHealth> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      return 'down';
    }

    const client = new Client({ connectionString: databaseUrl });

    try {
      await client.connect();
      await client.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private async checkCache(): Promise<DependencyHealth> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      return 'down';
    }

    const client = createClient({ url: redisUrl });

    try {
      await client.connect();
      await client.ping();
      return 'up';
    } catch {
      return 'down';
    } finally {
      await client.disconnect().catch(() => undefined);
    }
  }
}
