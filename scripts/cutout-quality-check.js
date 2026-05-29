#!/usr/bin/env node
// cutout-quality-check.js
// Validate a cutout PNG before upload to Supabase Storage.
// Authority: docs/handoff/HANDOFF_g8_engine_q4_2026-05-29.md §2-H.
// Checks: dimensions >= 1000x1000, filesize <= 4MB, alpha transparency, png/webp format.
// Usage: node scripts/cutout-quality-check.js <localPath>
// CommonJS Node CLI (reads filesystem; pure-module rule does not apply to the CLI entry).

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const USAGE = 'USAGE: node scripts/cutout-quality-check.js <localPath>';

// Expand a leading '~' to the user home directory.
function resolvePath(input) {
  if (input === '~' || input.startsWith('~/')) {
    return path.join(process.env.HOME || '', input.slice(1));
  }
  return input;
}

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.log(USAGE);
    process.exit(1);
  }

  const target = resolvePath(raw);

  if (!fs.existsSync(target)) {
    console.log('FILE_NOT_FOUND');
    process.exit(1);
  }

  const sizeMB = fs.statSync(target).size / (1024 * 1024);
  const meta = await sharp(target).metadata();
  const width = meta.width;
  const height = meta.height;
  const hasAlpha = meta.hasAlpha;
  const channels = meta.channels;
  const format = meta.format;

  const checks = [
    {
      name: 'dimensions',
      ok: width >= 1000 && height >= 1000,
      value: width + 'x' + height,
    },
    {
      name: 'filesize',
      ok: sizeMB <= 4,
      value: sizeMB.toFixed(2) + 'MB',
    },
    {
      name: 'transparency',
      ok: hasAlpha === true || channels === 4,
      value: 'hasAlpha=' + hasAlpha + ' channels=' + channels,
    },
    {
      name: 'format',
      ok: format === 'png' || format === 'webp',
      value: String(format),
    },
  ];

  const failed = [];
  for (const check of checks) {
    const status = check.ok ? 'PASS' : 'FAIL';
    console.log(status + ' ' + check.name + ': ' + check.value);
    if (!check.ok) {
      failed.push(check.name);
    }
  }

  if (failed.length === 0) {
    console.log('RESULT: PASS');
  } else {
    console.log('RESULT: FAIL ' + failed.join(', '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.log('ERROR=' + err.message);
  process.exit(1);
});
