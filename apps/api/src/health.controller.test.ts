import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('retorna status ok no healthcheck básico', () => {
    const result = new HealthController().check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('api');
    expect(result.timestamp).toBeTypeOf('string');
  });

  it('retorna status da readiness com verificações de dependências', async () => {
    const controller = new HealthController();
    const result = await controller.ready();

    expect(result.status).toMatch(/ok|degraded/);
    expect(result.checks).toHaveProperty('database');
    expect(result.checks).toHaveProperty('cache');
  });
});
