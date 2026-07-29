import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors: string[] = [];

function mustExist(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`Missing: ${rel}`);
}

function includes(rel: string, needle: string, label: string) {
  const text = readFileSync(resolve(root, rel), 'utf-8');
  if (!text.includes(needle)) errors.push(`${label}: ${rel} missing "${needle}"`);
}

mustExist('ACCEPTANCE_ULTRA_PLUS.md');
mustExist('src/lib/evidence.ts');
mustExist('e2e/app.smoke.test.tsx');
mustExist('vitest.e2e.config.ts');
mustExist('src/components/ErrorBoundary.tsx');

includes('src/lib/storage.ts', 'daygate-v3-mirror', 'mirror key');
includes('src/lib/storage.ts', 'restoreFromMirror', 'restore API');
includes('src/core/acceptance.ts', 'isGate', 'gate evidence bar');
includes('src/App.tsx', 'skip-link', 'skip link');
includes('src/App.tsx', 'main-content', 'main landmark');
includes('src/index.css', ':focus-visible', 'focus style');
includes('README.md', 'accept:ultra-plus', 'README plus command');
includes('PRODUCT.md', 'Ultra+', 'PRODUCT plus mention');
includes('.github/workflows/accept.yml', 'accept:ultra-plus', 'CI plus');
includes('package.json', 'test:e2e', 'e2e script');

if (errors.length) {
  console.error('Ultra+ validation failed:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('Ultra+ structural checks passed.');
