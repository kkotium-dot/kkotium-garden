// E-13C: Insert card color helpers
// Converts a base HEX into the full color set needed to render the card
// (background, accent, text, border, etc.) using HSL manipulation.

export interface CardColorScheme {
  base: string;           // user-selected HEX
  background: string;     // light tint for card body (95% lightness)
  accentLight: string;    // mid tint for inner blocks (90%)
  accentMid: string;      // mid stronger (75%)
  accentBorder: string;   // border line color (45%)
  textOnLight: string;    // dark text on light background (15-25%)
  textOnDark: string;     // light text on accent header (95%)
  headerBg: string;       // header band — base color
  shadow: string;         // soft shadow rgba
}

// HEX → HSL conversion (returns h: 0-360, s: 0-100, l: 0-100)
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// HSL → HEX conversion
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Validate HEX input — accepts #RGB or #RRGGBB
export function isValidHex(hex: string): boolean {
  return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(hex);
}

// Expand 3-char to 6-char hex
export function expandHex(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`.toUpperCase();
  }
  return `#${clean}`.toUpperCase();
}

// Convert any base color to HSL with capped saturation (for soft pastel tones)
export function getCardColorScheme(baseHex: string): CardColorScheme {
  const expanded = isValidHex(baseHex) ? expandHex(baseHex) : '#FF6B8A';
  const { h, s } = hexToHsl(expanded);
  // Cap saturation so very vivid inputs still produce readable cards
  const sCapped = Math.min(s, 75);
  // Floor saturation so very gray inputs still have warmth
  const sFloor = Math.max(sCapped, 30);

  return {
    base: expanded,
    background: hslToHex(h, Math.max(15, sFloor - 50), 96),  // very light tint
    accentLight: hslToHex(h, Math.max(20, sFloor - 40), 92), // light tint
    accentMid: hslToHex(h, sFloor - 20, 78),                 // medium tint
    accentBorder: hslToHex(h, sFloor, 55),                   // border
    textOnLight: hslToHex(h, sFloor, 25),                    // dark for body text
    textOnDark: '#FFFFFF',                                    // white on header
    headerBg: hslToHex(h, sFloor, 45),                       // header band
    shadow: `hsla(${h}, ${sFloor}%, 30%, 0.08)`,
  };
}
