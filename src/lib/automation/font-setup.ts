// src/lib/automation/font-setup.ts
//
// Register the bundled Pretendard OTF with fontconfig so Sharp/librsvg can
// rasterize Korean glyphs in SVG text overlays.
//
// On Vercel's serverless Linux runtime there is no Korean-capable font, so
// Korean text in thumbnail/detail SVG overlays renders as tofu (□) — verified
// on production 2026-05-28 (lifestyle caption + badge text both dropped to
// missing-glyph boxes). We ship Pretendard in /fonts and point fontconfig at it
// via a config written to /tmp (the only writable dir in the lambda).
//
// Must run before the first Sharp SVG-with-text composite, because fontconfig
// reads FONTCONFIG_FILE / FONTCONFIG_PATH at FcInit (first glyph match). The
// sharp-composite module invokes this at import side-effect time so the env is
// set before any renderer runs. Idempotent + best-effort: any FS/env failure
// leaves the previous fallback behavior rather than crashing the render.

import fs from 'fs';
import path from 'path';

let configured = false;

export function ensureFontsRegistered(): void {
  if (configured) return;
  configured = true;
  try {
    const fontDir = path.join(process.cwd(), 'fonts');
    if (!fs.existsSync(fontDir)) return;
    const cacheDir = path.join('/tmp', 'fontconfig-cache');
    fs.mkdirSync(cacheDir, { recursive: true });
    // Minimal self-contained config: only our font dir is scanned, and any
    // generic "sans-serif" request is rebound to Pretendard so overlays that
    // fall through to the generic family still get Korean coverage.
    const conf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontDir}</dir>
  <cachedir>${cacheDir}</cachedir>
  <match target="pattern">
    <test qual="any" name="family"><string>sans-serif</string></test>
    <edit name="family" mode="prepend" binding="strong"><string>Pretendard</string></edit>
  </match>
</fontconfig>`;
    const confPath = path.join(cacheDir, 'fonts.conf');
    fs.writeFileSync(confPath, conf);
    process.env.FONTCONFIG_FILE = confPath;
    process.env.FONTCONFIG_PATH = cacheDir;
  } catch {
    // best-effort
  }
}
