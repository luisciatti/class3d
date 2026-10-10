import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // gera servidor mínimo para o Docker
  outputFileTracingRoot: root, // necessário em monorepo
  poweredByHeader: false,
};

export default nextConfig;
