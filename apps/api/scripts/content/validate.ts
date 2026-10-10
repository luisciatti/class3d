import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { ContentDocumentSchema } from '@mundo/shared';

const contentRoot = path.resolve(__dirname, '../../../../content');

function listYamlFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return listYamlFiles(fullPath);
    }

    return entry.isFile() && fullPath.endsWith('.yml') ? [fullPath] : [];
  });
}

function parseYaml<T>(filePath: string): T {
  const content = readFileSync(filePath, 'utf8');
  const parsed = parse(content);

  if (!parsed) {
    throw new Error(`No YAML content found in ${filePath}.`);
  }

  return parsed as T;
}

const floorFiles = listYamlFiles(path.join(contentRoot, 'devops')).filter((file) =>
  file.endsWith('floor.yml'),
);
if (floorFiles.length === 0) {
  throw new Error(`No floor.yml file found under ${contentRoot}.`);
}

const floor = parseYaml<{
  slug: string;
  title: string;
  order: number;
  theme: string;
  unlockRequirement?: string | null;
}>(floorFiles[0]);
const roomFiles = listYamlFiles(path.join(contentRoot, 'devops', 'rooms'));
const rooms = roomFiles.map((file) => parseYaml<any>(file));
const document = { floor, rooms };

try {
  const validated = ContentDocumentSchema.parse(document);
  const roomCount = validated.rooms.length;
  console.log(
    `Content validation passed for ${validated.floor.slug}. ${roomCount} room(s) verified.`,
  );
} catch (error) {
  if (error instanceof Error) {
    console.error('Content validation failed.');
    console.error(error.message);
  }
  process.exitCode = 1;
}
