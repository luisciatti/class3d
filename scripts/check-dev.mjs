import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

function runCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: process.env,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ? String(result.stdout) : '',
    stderr: result.stderr ? String(result.stderr) : '',
  };
}

async function checkHttp(url) {
  try {
    const response = await fetch(url, { method: 'GET' });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const checks = [];

  const docker = runCapture('docker', ['info']);
  checks.push({
    name: 'Docker',
    ok: docker.status === 0,
    detail:
      docker.status === 0
        ? 'OK'
        : `FALHA: ${docker.stderr || docker.stdout || 'Docker Desktop não está em execução.'}`,
  });

  const pg = runCapture(
    'docker',
    [
      'compose',
      '-f',
      'infra/compose/docker-compose.deps.yml',
      'exec',
      '-T',
      'postgres',
      'pg_isready',
      '-U',
      'mundo',
      '-d',
      'mundo',
    ],
    { cwd: rootDir },
  );
  checks.push({
    name: 'Postgres',
    ok: pg.status === 0,
    detail:
      pg.status === 0
        ? 'OK'
        : `FALHA: ${pg.stderr || pg.stdout || 'Postgres ainda não está saudável.'}`,
  });

  const redis = runCapture(
    'docker',
    [
      'compose',
      '-f',
      'infra/compose/docker-compose.deps.yml',
      'exec',
      '-T',
      'redis',
      'redis-cli',
      'ping',
    ],
    { cwd: rootDir },
  );
  checks.push({
    name: 'Redis',
    ok: redis.status === 0,
    detail:
      redis.status === 0
        ? 'OK'
        : `FALHA: ${redis.stderr || redis.stdout || 'Redis ainda não está saudável.'}`,
  });

  const apiHealth = await checkHttp('http://localhost:4000/v1/health');
  checks.push({
    name: 'API health',
    ok: apiHealth.ok,
    detail: apiHealth.ok
      ? `OK: ${apiHealth.body}`
      : `FALHA: ${apiHealth.body || 'A API não respondeu em http://localhost:4000/v1/health.'}`,
  });

  const webHome = await checkHttp('http://localhost:3000');
  checks.push({
    name: 'Web',
    ok: webHome.ok,
    detail: webHome.ok
      ? `OK: ${webHome.status}`
      : `FALHA: ${webHome.body || 'O front não respondeu em http://localhost:3000.'}`,
  });

  for (const check of checks) {
    const label = check.ok ? 'OK' : 'FALHA';
    console.log(`${label} - ${check.name}: ${check.detail}`);
  }

  const failures = checks.filter((check) => !check.ok).length;
  if (failures > 0) {
    process.exitCode = 1;
    console.log(`Resumo: ${failures} item(ns) com falha.`);
  } else {
    console.log('Resumo: todos os itens estão OK.');
  }
}

main().catch((error) => {
  console.error('FALHA no check:dev');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
