import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const apiDir = path.join(rootDir, 'apps', 'api');
const webDir = path.join(rootDir, 'apps', 'web');

const apiEnvExamplePath = path.join(apiDir, '.env.example');
const apiEnvPath = path.join(apiDir, '.env');
const webEnvExamplePath = path.join(webDir, '.env.example');
const webEnvLocalPath = path.join(webDir, '.env.local');

const apiEnvExample = [
  'DATABASE_URL="postgresql://mundo:mundo@localhost:5432/mundo"',
  'REDIS_URL="redis://localhost:6379"',
  'API_PORT=4000',
  'CORS_ORIGIN="http://localhost:3000"',
  '',
].join('\n');

const webEnvExample = 'NEXT_PUBLIC_API_URL=http://localhost:4000/v1\n';

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Arquivo criado: ${path.relative(rootDir, filePath)}`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0) {
    const joined = [command, ...args].join(' ');
    throw new Error(`${joined} falhou com código ${result.status ?? 1}`);
  }
}

function runCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: process.env,
  });

  const stdout = result.stdout ? String(result.stdout) : '';
  const stderr = result.stderr ? String(result.stderr) : '';

  return {
    status: result.status ?? 1,
    stdout,
    stderr,
  };
}

async function waitForPostgres(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const probe = runCapture(
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

    if (probe.status === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(
    'Timeout ao aguardar Postgres saudável em 60s. Verifique Docker Desktop e compose de dependências.',
  );
}

function verifyDocker() {
  const result = runCapture('docker', ['info']);
  if (result.status !== 0) {
    throw new Error(
      'Docker não está disponível ou não está rodando. Inicie o Docker Desktop e tente novamente.',
    );
  }
}

async function main() {
  writeIfMissing(apiEnvExamplePath, apiEnvExample);
  writeIfMissing(apiEnvPath, apiEnvExample);
  writeIfMissing(webEnvExamplePath, webEnvExample);
  writeIfMissing(webEnvLocalPath, webEnvExample);

  verifyDocker();
  console.log('Docker OK. Subindo serviços de dependência...');
  run('pnpm', ['deps:up'], { cwd: rootDir });

  await waitForPostgres();

  console.log('Postgres saudável. Gerando Prisma e aplicando migrações...');
  run('pnpm', ['--dir', 'apps/api', 'run', 'db:generate'], { cwd: rootDir });
  run('pnpm', ['--dir', 'apps/api', 'run', 'db:migrate'], { cwd: rootDir });
  run('pnpm', ['--dir', 'apps/api', 'run', 'db:seed'], { cwd: rootDir });
  run('pnpm', ['content:sync'], { cwd: rootDir });

  console.log('Setup local concluído com sucesso.');
}

main().catch((error) => {
  console.error('FALHA no setup:dev');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
