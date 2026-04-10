const fs = require('fs');
const content = [
  'interface NormalizeCodeOptions {',
  '  maxLen?: number;',
  '  fallbackPrefix?: string;',
  '}',
  '',
  'export function normalizeCode(input: string, opts: NormalizeCodeOptions = {}): string {',
  "  const { maxLen = 20, fallbackPrefix = 'code' } = opts;",
  '  const raw = String(input ?? \'\').trim();',
  '  if (!raw) return fallbackPrefix;',
  '  const mapped = raw',
  '    .toLowerCase()',
  '    .replace(/\\s+/g, \'-\')',
  '    .replace(/_/g, \'-\')',
  '    .replace(/[^\\x00-\\x7F]/g, \'\')',
  '    .replace(/[^a-z0-9-]/g, \'\')',
  '    .replace(/-+/g, \'-\')',
  '    .replace(/^-+|-+$/g, \'\')',
  '    .slice(0, maxLen);',
  '  return mapped || fallbackPrefix;',
  '}',
  '',
  'export function makeUniqueCode(base: string, existingCodes: string[]): string {',
  '  const existing = new Set(existingCodes);',
  '  if (!existing.has(base)) return base;',
  '  for (let i = 2; i <= 999; i++) {',
  '    const candidate = `${base}-${i}`;',
  '    if (!existing.has(candidate)) return candidate;',
  '  }',
  '  return `${base}-${Date.now()}`;',
  '}',
  ''
].join('\n');

fs.writeFileSync('/Users/jyekkot/Desktop/kkotium-garden/src/lib/sku-generator.ts', content, 'utf8');
console.log('OK', fs.statSync('/Users/jyekkot/Desktop/kkotium-garden/src/lib/sku-generator.ts').size, 'bytes');
