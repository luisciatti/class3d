import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './health.js';

describe('HealthResponseSchema', () => {
  it('aceita uma resposta válida', () => {
    const parsed = HealthResponseSchema.parse({
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    });
    expect(parsed.status).toBe('ok');
  });

  it('rejeita status inválido', () => {
    expect(() =>
      HealthResponseSchema.parse({ status: 'down', service: 'api', timestamp: 'x' }),
    ).toThrow();
  });
});
