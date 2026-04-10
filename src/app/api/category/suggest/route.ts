// src/app/api/category/suggest/route.ts
// Category suggestion: Gemini AI (no category context in prompt) -> DB validation -> fallback rules
// Strategy: Ask AI to reason from product name alone, then validate against actual DB

import { NextRequest, NextResponse } from 'next/server';
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';

// ── AI: Gemini without full category list in prompt ───────────────────────────
// Keeping prompt small (< 500 tokens) so Gemini has room to respond

export const dynamic = 'force-dynamic';
async function suggestWithGemini(
  productName: string
): Promise<Array<{ d1: string; d2: string; d3: string }>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  // Compact prompt — no giant category list, just key correction rules
  const prompt = `You are a Naver SmartStore SEO expert. Given a Korean product name, output the top 3 Naver shopping category paths (d1 > d2 > d3).

Product: "${productName}"

CRITICAL RULES (verified against actual Naver DB):
- 잠옷/홈웨어/파자마 → 패션의류 > 여성언더웨어/잠옷 > 잠옷/홈웨어 (NOT 여성의류)
- 레깅스 → 패션의류 > 여성의류 > 레깅스
- 요가복/필라테스 → 스포츠/레저 > 요가/필라테스 > 요가복
- 이불/차렵이불 → 가구/인테리어 > 침구단품 > 차렵이불
- 소파 → 가구/인테리어 > 거실가구 > 소파
- 두꺼비집가리개/분전함커버 → 가구/인테리어 > 인테리어소품 > 인터폰박스
- 인테리어소품/장식 → 가구/인테리어 > 인테리어소품 > 기타장식용품
- For unknown items: use 가구/인테리어 > DIY자재/용품 > 기타DIY자재/용품

Respond ONLY with raw JSON array (no markdown):
[{"d1":"...","d2":"...","d3":"..."},{"d1":"...","d2":"...","d3":"..."},{"d1":"...","d2":"...","d3":"..."}]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: 'Output ONLY a raw JSON array. First character must be [. Last must be ].' }],
      },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text().then(t => t.slice(0, 100))}`);
  const data = await res.json();

  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    throw new Error('Gemini response truncated (MAX_TOKENS) — falling back');
  }

  const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter(p => !p.thought).map(p => p.text ?? '').join('').trim();
  if (!text) throw new Error(`Gemini empty response (finishReason: ${finishReason})`);

  // Strip markdown fences if present
  const clean = text.replace(/^```(?:json)?\s*/,'').replace(/\s*```\s*$/,'').trim();
  const startIdx = clean.indexOf('[');
  const endIdx   = clean.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1) throw new Error(`No JSON array in: ${clean.slice(0,80)}`);

  const parsed: Array<{ d1: string; d2: string; d3: string }> = JSON.parse(clean.slice(startIdx, endIdx + 1));
  return parsed.slice(0, 3);
}

// ── Fallback: keyword rules (DB-verified paths) ───────────────────────────────
const FALLBACK_RULES: Array<{ keywords: string[]; d1: string; d2: string; d3: string }> = [
  // ── 패션의류 - 여성 ──
  { keywords: ['레깅스'],                                         d1: '패션의류',     d2: '여성의류',          d3: '레깅스' },
  { keywords: ['원피스', '드레스'],                               d1: '패션의류',     d2: '여성의류',          d3: '원피스' },
  { keywords: ['블라우스'],                                       d1: '패션의류',     d2: '여성의류',          d3: '블라우스/셔츠' },
  { keywords: ['스커트', '치마'],                                 d1: '패션의류',     d2: '여성의류',          d3: '스커트' },
  { keywords: ['잠옷', '파자마', '홈웨어', '수면잠옷'],           d1: '패션의류',     d2: '여성언더웨어/잠옷', d3: '잠옷/홈웨어' },
  { keywords: ['브라', '팬티세트'],                               d1: '패션의류',     d2: '여성언더웨어/잠옷', d3: '브라팬티세트' },
  // ── 패션의류 - 남성 ──
  { keywords: ['남성잠옷', '남성홈웨어'],                         d1: '패션의류',     d2: '남성언더웨어/잠옷', d3: '잠옷/홈웨어' },
  { keywords: ['청바지', '데님바지'],                             d1: '패션의류',     d2: '남성의류',          d3: '바지' },
  { keywords: ['후드티', '맨투맨'],                               d1: '패션의류',     d2: '남성의류',          d3: '점퍼/재킷' },
  // ── 스포츠 ──
  { keywords: ['요가복', '필라테스복'],                           d1: '스포츠/레저',  d2: '요가/필라테스',     d3: '요가복' },
  { keywords: ['등산복', '트레킹복'],                             d1: '스포츠/레저',  d2: '등산',              d3: '등산의류' },
  // ── 가구/인테리어 ──
  { keywords: ['차렵이불', '홑이불'],                             d1: '가구/인테리어',d2: '침구단품',          d3: '차렵이불' },
  { keywords: ['이불', '베개'],                                   d1: '가구/인테리어',d2: '침구단품',          d3: '차렵이불' },
  { keywords: ['침구세트'],                                       d1: '가구/인테리어',d2: '침구세트',          d3: '이불베개세트' },
  { keywords: ['소파', '리클라이너'],                             d1: '가구/인테리어',d2: '거실가구',          d3: '소파' },
  { keywords: ['책상'],                                           d1: '가구/인테리어',d2: '서재/사무용가구',   d3: '책상' },
  { keywords: ['두꺼비집', '분전함', '차단기커버'],               d1: '가구/인테리어',d2: '인테리어소품',      d3: '인터폰박스' },
  { keywords: ['시트지', '인테리어필름'],                         d1: '가구/인테리어',d2: 'DIY자재/용품',      d3: '시트지' },
  { keywords: ['LED조명', '전구', '조명'],                        d1: '가구/인테리어',d2: '인테리어소품',      d3: '조명' },
  // ── 생활/건강 - 주방 ──
  { keywords: ['젖병솔', '젖병세척'],                             d1: '생활/건강',    d2: '유아동/출산',       d3: '수유/이유용품' },
  { keywords: ['젖병'],                                           d1: '생활/건강',    d2: '유아동/출산',       d3: '수유/이유용품' },
  { keywords: ['텀블러솔', '텀블러세척', '물병솔', '병솔'],       d1: '생활/건강',    d2: '주방용품',          d3: '주방청소용품' },
  { keywords: ['텀블러'],                                         d1: '생활/건강',    d2: '주방용품',          d3: '텀블러/보온병' },
  { keywords: ['보온병', '물병'],                                 d1: '생활/건강',    d2: '주방용품',          d3: '텀블러/보온병' },
  { keywords: ['브러쉬', '브러시', '세척솔', '청소솔'],           d1: '생활/건강',    d2: '주방용품',          d3: '주방청소용품' },
  { keywords: ['수세미'],                                         d1: '생활/건강',    d2: '주방용품',          d3: '수세미/행주' },
  { keywords: ['행주', '키친타월'],                               d1: '생활/건강',    d2: '주방용품',          d3: '수세미/행주' },
  { keywords: ['도마'],                                           d1: '생활/건강',    d2: '주방용품',          d3: '도마' },
  { keywords: ['냄비', '프라이팬', '웍'],                         d1: '생활/건강',    d2: '주방용품',          d3: '냄비/프라이팬/웍' },
  { keywords: ['전기포트', '커피포트'],                           d1: '생활/건강',    d2: '가전제품',          d3: '전기포트' },
  { keywords: ['방향제', '디퓨저', '아로마'],                     d1: '생활/건강',    d2: '홈인테리어소품',    d3: '방향제/디퓨저' },
  { keywords: ['청소기'],                                         d1: '생활/건강',    d2: '가전제품',          d3: '청소기' },
  { keywords: ['가습기', '미니가습기', '주가습기', '탁상가습기', '인테리어가습기'],   d1: '생활/건강',    d2: '가전제품',          d3: '가습기' },
  { keywords: ['WIFI가습기', '무선가습기'],                         d1: '생활/건강',    d2: '가전제품',          d3: '가습기' },
  { keywords: ['선풍기', '포터블팬'],                             d1: '생활/건강',    d2: '가전제품',          d3: '전기선풍기' },
  { keywords: ['공기청정기'],                                     d1: '생활/건강',    d2: '가전제품',          d3: '공기청정기' },
  { keywords: ['우산'],                                           d1: '생활/건강',    d2: '여행/레저용품',     d3: '우산/레인코트' },
  { keywords: ['용돈봉투', '봉투'],                               d1: '문구/오피스',  d2: '봉투',              d3: '봉투' },
  // ── 화장품 ──
  { keywords: ['마스크팩', '팩'],                                 d1: '화장품/미용',  d2: '기초화장품',        d3: '마스크팩/팩' },
  { keywords: ['보습크림', '수분크림'],                           d1: '화장품/미용',  d2: '기초화장품',        d3: '크림' },
  { keywords: ['로션', '에멀전'],                                 d1: '화장품/미용',  d2: '기초화장품',        d3: '로션/에멀전' },
  { keywords: ['에센스', '세럼', '앰플'],                         d1: '화장품/미용',  d2: '기초화장품',        d3: '에센스/세럼/앰플' },
  { keywords: ['선크림', '자외선차단'],                           d1: '화장품/미용',  d2: '기초화장품',        d3: '선케어' },
  { keywords: ['립스틱', '립글로스', '립틴트'],                   d1: '화장품/미용',  d2: '색조화장품',        d3: '립메이크업' },
  { keywords: ['샴푸'],                                           d1: '화장품/미용',  d2: '헤어케어',          d3: '샴푸' },
  { keywords: ['헤어오일', '헤어에센스'],                         d1: '화장품/미용',  d2: '헤어케어',          d3: '헤어에센스/오일' },
  // ── 식품 ──
  { keywords: ['원두', '커피원두'],                               d1: '식품',         d2: '커피',              d3: '원두커피' },
  { keywords: ['비타민', '영양제', '건강기능'],                   d1: '식품',         d2: '건강식품',          d3: '비타민/미네랄' },
  // ── 디지털/가전 ──
  { keywords: ['충전케이블', 'USB케이블'],                        d1: '디지털/가전',  d2: '휴대폰액세서리',    d3: '케이블/젠더' },
  { keywords: ['무선이어폰', '이어버즈'],                         d1: '디지털/가전',  d2: '이어폰/헤드폰',     d3: '블루투스이어폰' },
  { keywords: ['보조배터리'],                                     d1: '디지털/가전',  d2: '휴대폰액세서리',    d3: '보조배터리' },
  // ── 반려동물 ──
  { keywords: ['강아지', '반려견'],                               d1: '반려동물',     d2: '강아지',            d3: '사료' },
  { keywords: ['고양이', '반려묘'],                               d1: '반려동물',     d2: '고양이',            d3: '사료' },
  // ── 문구/오피스 ──
  { keywords: ['노트', '다이어리'],                               d1: '문구/오피스',  d2: '노트/메모/다이어리',d3: '다이어리/플래너' },
  { keywords: ['볼펜', '펜'],                                     d1: '문구/오피스',  d2: '필기구',            d3: '볼펜' },
];

function suggestFallback(productName: string): Array<{ d1: string; d2: string; d3: string }> {
  const scores = new Map<string, { d1: string; d2: string; d3: string; score: number }>();
  for (const rule of FALLBACK_RULES) {
    let matchCount = 0;
    for (const kw of rule.keywords) {
      if (productName.includes(kw)) matchCount++;
    }
    if (matchCount > 0) {
      const key = `${rule.d1}|${rule.d2}|${rule.d3}`;
      const existing = scores.get(key);
      if (!existing || existing.score < matchCount) {
        scores.set(key, { d1: rule.d1, d2: rule.d2, d3: rule.d3, score: matchCount });
      }
    }
  }
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ d1, d2, d3 }) => ({ d1, d2, d3 }));
}

// ── DB validation ─────────────────────────────────────────────────────────────
function validateSuggestion(
  d1: string, d2: string, d3: string
): { d1: string; d2: string; d3: string; d4?: string } | null {
  // 1. Exact match
  const exact = NAVER_CATEGORIES_FULL.find(c => c.d1 === d1 && c.d2 === d2 && c.d3 === d3);
  if (exact) return { d1: exact.d1, d2: exact.d2, d3: exact.d3, d4: exact.d4 };

  // 2. d1+d2 exact, d3 fuzzy
  const d1d2 = NAVER_CATEGORIES_FULL.filter(c => c.d1 === d1 && c.d2 === d2);
  if (d1d2.length > 0) {
    const fuzzy = d1d2.find(c => c.d3 && d3 && (c.d3.includes(d3) || d3.includes(c.d3)));
    if (fuzzy) return { d1: fuzzy.d1, d2: fuzzy.d2, d3: fuzzy.d3, d4: fuzzy.d4 };
    return { d1: d1d2[0].d1, d2: d1d2[0].d2, d3: d1d2[0].d3, d4: d1d2[0].d4 };
  }

  // 3. d1 exact, d2 char-overlap fuzzy (min 50%)
  const d1only = NAVER_CATEGORIES_FULL.filter(c => c.d1 === d1);
  if (d1only.length > 0 && d2) {
    let best: typeof d1only[0] | null = null;
    let bestScore = 0;
    for (const c of d1only) {
      if (!c.d2) continue;
      const overlap = [...c.d2].filter(ch => d2.includes(ch)).length;
      const score = overlap / Math.max(c.d2.length, d2.length);
      if (score > bestScore && score >= 0.5) { bestScore = score; best = c; }
    }
    if (best) return { d1: best.d1, d2: best.d2, d3: best.d3, d4: best.d4 };
  }

  return null;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { productName } = await request.json();
    if (!productName?.trim()) {
      return NextResponse.json({ success: false, error: '상품명을 입력해주세요' }, { status: 400 });
    }

    let rawSuggestions: Array<{ d1: string; d2: string; d3: string; d4?: string }> = [];
    let usedAI = false;

    try {
      const aiResults = await suggestWithGemini(productName.trim());
      usedAI = true;
      for (const s of aiResults) {
        const validated = validateSuggestion(s.d1, s.d2, s.d3);
        if (validated) rawSuggestions.push(validated);
      }
    } catch (aiError) {
      console.warn('[category/suggest] AI failed, using fallback:', String(aiError).slice(0, 120));
    }

    if (rawSuggestions.length === 0) {
      rawSuggestions = suggestFallback(productName.trim());
    }

    // Deduplicate
    const seen = new Set<string>();
    const suggestions = rawSuggestions.filter(s => {
      const key = `${s.d1}|${s.d2}|${s.d3}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ success: true, suggestions, usedAI });
  } catch (e: unknown) {
    console.error('[category/suggest] error:', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
