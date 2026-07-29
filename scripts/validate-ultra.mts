import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors: string[] = [];

function mustExist(rel: string) {
  if (!existsSync(resolve(root, rel))) {
    errors.push(`Missing required file: ${rel}`);
  }
}

function mustNotExist(rel: string) {
  if (existsSync(resolve(root, rel))) {
    errors.push(`Dead code must be removed: ${rel}`);
  }
}

function fileIncludes(rel: string, needle: string, label: string) {
  const text = readFileSync(resolve(root, rel), 'utf-8');
  if (!text.includes(needle)) {
    errors.push(`${label}: ${rel} must include "${needle}"`);
  }
}

mustNotExist('src/data/buildCurriculum.ts');
mustExist('ACCEPTANCE_ULTRA.md');
mustExist('ACCEPTANCE.md');
mustExist('src/components/ErrorBoundary.tsx');
mustExist('src/lib/security.ts');
mustExist('.github/workflows/accept.yml');
mustExist('public/examples/sample-custom-pack.json');

fileIncludes('ACCEPTANCE.md', 'v3', 'ACCEPTANCE version');
fileIncludes('PRODUCT.md', 'Local-only', 'PRODUCT local-only disclosure');
fileIncludes('README.md', 'accept:ultra', 'README ultra command');
fileIncludes('src/main.tsx', 'ErrorBoundary', 'Root wraps ErrorBoundary');
fileIncludes('src/lib/storage.ts', 'guardianPinHash', 'PIN hash persistence');
fileIncludes('src/lib/storage.ts', 'backupReminderPending', 'Backup reminder flag');
fileIncludes('src/App.tsx', 'aria-label', 'Nav accessibility');

const testFiles = [
  'src/core/acceptance.test.ts',
  'src/core/packImport.test.ts',
  'src/lib/security.test.ts',
  'src/core/guardian.test.ts',
];
for (const f of testFiles) mustExist(f);

if (errors.length) {
  console.error('Ultra validation failed:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('Ultra structural checks passed.');
