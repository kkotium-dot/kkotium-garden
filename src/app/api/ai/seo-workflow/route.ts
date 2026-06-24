// POST /api/ai/seo-workflow
// D1 SEO workflow — AI provider priority (2026-05-19, Sprint 7-PC-C):
//   1. Groq llama-3.1-8b-instant  (3 keys round-robin, free 43,200/day)
//   2. Anthropic Claude Sonnet   (ANTHROPIC_API_KEY) — last resort, cost-capped
//
// DEPRECATED chain (removed in this commit):
//   - Perplexity sonar-pro (Pro plan expired 2026-05)
//   - Google Gemini 2.0 Flash (revoked due to backup file exposure 2026-05-19)

import { NextRequest, NextResponse } from 'next/server';
import { callGroq, GROQ_MODEL } from '@/lib/ai/groq';
import bannedData from '@/lib/seo/banned-words.ko.json';

// HOOK-2 (#151/#62): reuse the shared product-name banned list as the hook
// 과장/홍보어 filter — but KEEP benefit words, which are legitimate on the
// event field / detail page (they are only banned in the product NAME).
const HOOK_BENEFIT_WHITELIST = new Set(['무료배송', '사은품', '적립', '할인쿠폰']);
const HOOK_EXAGGERATION: string[] = ((bannedData as { banned?: string[] }).banned ?? [])
  .filter((w) => !HOOK_BENEFIT_WHITELIST.has(w))
  .sort((a, b) => b.length - a.length); // strip longer phrases first (초특가 before 특가)

const DECORATIVE_CHARS = /[★☆●○◇◆■□▶◀▲▼※♥♡♠♣✓✔➤➜»«§¶]/g;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

// event_field (혜택형): drop decorative symbols + control chars, collapse space.
function cleanEventField(s: string): string {
  return s.replace(DECORATIVE_CHARS, '').replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

// detail copy: strip 과장/홍보어 (banned minus benefit whitelist) deterministically.
function stripExaggeration(s: string): string {
  let out = s.replace(CONTROL_CHARS, ' ');
  for (const w of HOOK_EXAGGERATION) {
    if (!w) continue;
    out = out.split(w).join(' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

// Parse the new 2-slot hooks shape ({event_field, detail[]}) with filters, and
// gracefully fall back to the legacy array shape if the model drifts.
function normalizeHooks(parsedHooks: unknown): HookVariant[] {
  const out: HookVariant[] = [];
  const VALID_TONES = ['benefit', 'emotion', 'trust'];

  if (parsedHooks && typeof parsedHooks === 'object' && !Array.isArray(parsedHooks)) {
    const ph = parsedHooks as Record<string, unknown>;
    if (typeof ph.event_field === 'string') {
      const ev = cleanEventField(ph.event_field);
      if (ev) out.push({ slot: 'event_field', text: ev });
    }
    const details = Array.isArray(ph.detail) ? ph.detail : [];
    for (const d of details) {
      const item = (d ?? {}) as Record<string, unknown>;
      const tone = (VALID_TONES.includes(item.tone as string) ? item.tone : 'benefit') as HookVariant['tone'];
      const headline = stripExaggeration(String(item.headline ?? '')).slice(0, 15);
      const sub = stripExaggeration(String(item.sub ?? '')).slice(0, 80);
      if (!headline && !sub) continue;
      out.push({ slot: 'detail', tone, headline, sub, text: [headline, sub].filter(Boolean).join(' — ') });
      if (out.filter(h => h.slot === 'detail').length >= 3) break;
    }
    return out;
  }

  // Legacy fallback: a flat array of { text } — treat each as a detail/benefit.
  if (Array.isArray(parsedHooks)) {
    for (const h of parsedHooks.slice(0, 3)) {
      const item = (h ?? {}) as Record<string, unknown>;
      const text = stripExaggeration(String(item.text ?? '')).slice(0, 100);
      if (text) out.push({ slot: 'detail', tone: 'benefit', text });
    }
  }
  return out;
}


export const dynamic = 'force-dynamic';
interface SEOWorkflowRequest {
  productName: string;
  categoryPath?: string;
  categoryCode?: string;
  description?: string;
  price?: number;
  supplierPrice?: number;
  keywords?: string[];
}

interface CategorySuggestion {
  code: string;
  path: string;
  reason: string;
}

interface ProductNameVariant {
  type: 'keyword' | 'benefit' | 'emotion';
  name: string;
  strategy: string;
}

// HOOK-2: hooks are split by exposure slot. event_field = the Naver event-field
// benefit line (applied to the hook field); detail = detail-page headline+sub by
// tone (copied into 온실 아틀리에). text = combined form (keeps onApplyHook compat).
interface HookVariant {
  slot: 'event_field' | 'detail';
  tone?: 'benefit' | 'emotion' | 'trust';
  headline?: string;
  sub?: string;
  text: string;
}

interface SEOWorkflowResponse {
  success: boolean;
  category: CategorySuggestion;
  keywords: string[];
  productNames: ProductNameVariant[];
  tags: string[];
  hooks: HookVariant[];
  qualityScore: number;
  provider?: string;
  error?: string;
}

function computeQualityScore(req: SEOWorkflowRequest): number {
  let score = 0;
  if (req.productName?.trim().length >= 3) score += 60;
  if (req.categoryPath?.trim()) score += 15;
  if (req.price && req.price > 0) score += 10;
  if (req.supplierPrice && req.supplierPrice > 0) score += 5;
  if (req.description?.trim().length >= 20) score += 10;
  return score;
}

// Naver D1/D2 category reference for AI to use correct structure
const NAVER_CATEGORY_HINT = `
[Naver Category Reference — ALL paths verified from actual Naver DB]

패션의류 > 여성의류 > {레깅스|원피스|블라우스/셔츠|바지|스커트|티셔츠|니트/스웨터|점퍼/재킷|코트|코디세트|점프수트|청바지|한복|트레이닝복}
패션의류 > 여성언더웨어/잠옷 > {잠옷/홈웨어|브라|팬티|브라팬티세트|슬립|속치마/속바지|보정속옷|언더웨어소품|시즌성내의|러닝|러닝팬티세트}
패션의류 > 남성의류 > {티셔츠|바지|점퍼/재킷|니트/스웨터|청바지|정장/슈트|트레이닝복|코트|아우터|한복}
패션의류 > 남성언더웨어/잠옷 > {잠옷/홈웨어|러닝|팬티|브리프|트렁크|보정속옷|시즌성내의}
패션의류 > 스포츠웨어 > {상의|하의|세트|아우터}
패션잡화 > 여성가방 > {토트백|숄더백|백팩|크로스백|클러치/파우치|에코백}
패션잡화 > 남성가방 > {백팩|숄더백|크로스백|서류/노트북가방}
패션잡화 > 운동화 > {스니커즈|런닝화|트레킹화|슬립온}
패션잡화 > 구두/로퍼 > {펌프스|로퍼|플랫슈즈|옥스퍼드}
패션잡화 > 부츠 > {앵클부츠|롱부츠|첼시부츠|레인부츠}
패션잡화 > 양말/스타킹 > {양말|스타킹|레깅스타이츠|무릎양말}
패션잡화 > 모자 > {야구모자|비니/버킷햇|밀짚/파나마모자|헤어밴드/볼캡}
패션잡화 > 벨트/지갑/기타 > {벨트|지갑|머플러/스카프|장갑|양산/우산}
화장품/미용 > 기초화장품 > {스킨/토너|로션/에멀전|크림|에센스/세럼/앰플|마스크팩/팩|선케어|클렌징|미스트/에어로졸|아이크림}
화장품/미용 > 색조화장품 > {베이스메이크업|립메이크업|아이메이크업|치크/쉐딩/하이라이터|네일}
화장품/미용 > 헤어케어 > {샴푸|트리트먼트/헤어팩|린스/컨디셔너|헤어에센스/오일|두피케어|헤어스타일링}
화장품/미용 > 바디케어 > {바디로션/크림|바디워시/클렌저|입욕제|제모|핸드케어}
화장품/미용 > 향수 > {여성향수|남성향수|유니섹스향수|미스트/오드코롱}
화장품/미용 > 미용도구/소품 > {뷰러/속눈썹|헤어드라이어|고데기/컬링기|면도기}
스포츠/레저 > 요가/필라테스 > {요가복|요가매트|요가용품|요가블록}
스포츠/레저 > 수영 > {남성수영복|여성수영복|아동수영복|수영용품|수경}
스포츠/레저 > 등산 > {등산의류|등산화|등산배낭|등산용품|등산폴}
스포츠/레저 > 자전거 > {자전거의류|자전거헬멧|자전거용품|자전거장갑}
스포츠/레저 > 골프 > {골프의류|골프화|골프클럽|골프가방|골프공|골프장갑}
스포츠/레저 > 테니스/배드민턴 > {테니스의류|테니스라켓|배드민턴라켓|테니스화}
스포츠/레저 > 헬스/피트니스 > {헬스의류|덤벨/바벨|헬스기구|운동매트}
스포츠/레저 > 캠핑 > {텐트|침낭|캠핑의자|캠핑테이블|랜턴/조명|캠핑쿡웨어}
스포츠/레저 > 낚시 > {낚싯대|릴|루어/미끼|낚시복}
가구/인테리어 > 침구단품 > {차렵이불|홑이불|이불커버|베개|베개커버}
가구/인테리어 > 침구세트 > {이불베개세트|요이불세트|극세사침구세트}
가구/인테리어 > 거실가구 > {소파|거실장|TV장/TV스탠드|선반/협탁}
가구/인테리어 > 침실가구 > {침대프레임|매트리스|화장대|드레스룸}
가구/인테리어 > 서재/사무용가구 > {책상|의자|책장|파일/서류함}
가구/인테리어 > 수납가구 > {서랍장|신발장|수납장|옷장}
가구/인테리어 > 조명 > {천장조명|스탠드/탁상조명|벽조명|LED조명|무드등}
가구/인테리어 > 주방가구 > {식탁/테이블|주방의자|주방수납}
가구/인테리어 > 홈데코 > {캔들/홈향수|액자/포스터|시계|러그/카펫|쿠션/방석}
가구/인테리어 > 커튼/블라인드 > {커튼|롤스크린/블라인드|버티컬블라인드}
생활/건강 > 주방용품 > {냄비/프라이팬|그릇/컵|도마/칼|청소/세정용품|주방소품}
생활/건강 > 욕실용품 > {칫솔/치약|수건|욕실수납|목욕용품}
생활/건강 > 수납/정리 > {수납박스|정리함|옷걸이|행거}
생활/건강 > 의약외품 > {마스크|손소독제|밴드/붕대}
생활/건강 > 건강용품 > {혈압계/체온계|마사지기|보호대}
식품 > 커피 > {원두커피|인스턴트커피|캡슐커피|드립백커피}
식품 > 차 > {녹차|홍차|허브티|보이차}
식품 > 음료 > {주스/착즙|탄산음료|에너지음료|유음료}
식품 > 과자/스낵 > {과자|초콜릿/캔디|젤리/구미|쿠키/비스킷}
식품 > 건강식품 > {비타민/미네랄|홍삼/인삼|다이어트식품|프로바이오틱스|오메가3}
식품 > 쌀/잡곡 > {쌀|잡곡|현미|찹쌀}
디지털/가전 > 휴대폰액세서리 > {케이블/젠더|케이스/범퍼|보호필름|보조배터리|충전기}
디지털/가전 > 이어폰/헤드폰 > {블루투스이어폰|유선이어폰|헤드폰|헤드셋|에어팟케이스}
디지털/가전 > 스피커 > {블루투스스피커|유선스피커|포터블스피커}
디지털/가전 > 생활가전 > {공기청정기|선풍기|가습기/제습기|청소기|전기요/전기매트}
디지털/가전 > 노트북/PC > {노트북|노트북가방|마우스|키보드|모니터}
출산/육아 > 유아동의류 > {상의|하의|점프수트|아우터|잠옷/내의|수영복}
출산/육아 > 유아동언더웨어/잠옷 > {잠옷/홈웨어|내의/내복|러닝|팬티}
출산/육아 > 완구/교구 > {블록/퍼즐|봉제완구|RC/전동완구|교육완구}
출산/육아 > 유아동용품 > {수유/이유용품|목욕용품|기저귀|유모차/카시트}
반려동물 > 강아지 > {사료|간식|의류/액세서리|장난감|하네스/목줄|위생/미용}
반려동물 > 고양이 > {사료|간식|장난감|화장실/모래|스크래처|캣타워}
반려동물 > 소동물 > {사료|케이지|용품}
문구/오피스 > 필기구 > {볼펜|샤프/연필|형광펜|만년필}
문구/오피스 > 노트/다이어리 > {노트|다이어리|메모지|포스트잇}
완구/취미 > 완구 > {장난감|블록|인형|피규어|보드게임}
완구/취미 > 취미/컬렉션 > {프라모델|DIY키트|퍼즐|카드/스티커}
`;

function buildPrompt(body: SEOWorkflowRequest): string {
  const { productName, categoryPath, categoryCode, description, price, supplierPrice, keywords } = body;

  const lines: string[] = [`상품명: ${productName}`];
  if (categoryPath?.trim()) lines.push(`현재카테고리: ${categoryPath}`);
  if (categoryCode) lines.push(`카테고리코드: ${categoryCode}`);
  if (price && price > 0) lines.push(`판매가: ${price.toLocaleString()}원`);
  if (supplierPrice && supplierPrice > 0) {
    const margin = price && price > 0 ? Math.round(((price - supplierPrice) / price) * 100) : null;
    lines.push(`공급가: ${supplierPrice.toLocaleString()}원${margin !== null ? ` (마진율 약 ${margin}%)` : ''}`);
  }
  if (description?.trim()) lines.push(`상품설명: ${description.slice(0, 300)}`);
  if (keywords?.length) lines.push(`기존키워드힌트: ${keywords.slice(0, 10).join(', ')}`);

  return `You are a Naver Smart Store SEO expert. Analyze the product info below and respond with ONLY a raw JSON object. No explanation, no markdown, no text before or after JSON.

[Product Info]
${lines.join('\n')}

${NAVER_CATEGORY_HINT}

[CRITICAL CATEGORY RULES — paths verified from actual Naver DB]
- 잠옷/홈웨어(여) → MUST be "패션의류 > 여성언더웨어/잠옷 > 잠옷/홈웨어" code:50000826
- 잠옷/홈웨어(남) → MUST be "패션의류 > 남성언더웨어/잠옷 > 잠옷/홈웨어" code:50000848
- 레깅스 → MUST be "패션의류 > 여성의류 > 레깅스" code:50000812 (NEVER 스포츠)
- 요가복/필라테스 → MUST be "스포츠/레저 > 요가/필라테스 > 요가복" (NOT 스포츠의류)
- 운동복/헬스복 → "스포츠/레저 > 요가/필라테스 > 요가복" or "스포츠/레저 > 헬스/피트니스 > 헬스의류"
- 차렵이불/홑이불 → "가구/인테리어 > 침구단품 > 차렵이불" (NOT 침구 > 이불 — that path doesn't exist)
- 침구세트 → "가구/인테리어 > 침구세트 > 이불베개세트"
- 소파 → "가구/인테리어 > 거실가구 > 소파" (NOT 가구 > 소파)
- 마스크팩 → "화장품/미용 > 기초화장품 > 마스크팩/팩"
- ALWAYS use exact D1>D2>D3 path from the reference list above
- code: provide the actual Naver 8-digit code (50000xxx format)

[Response JSON - follow this structure EXACTLY]
{
  "category": {
    "code": "naver category code (50000xxx format)",
    "path": "depth1 > depth2 > depth3",
    "reason": "brief reason under 15 chars"
  },
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7"],
  "productNames": [
    { "type": "keyword", "name": "keyword-focused name 30-50 chars in Korean", "strategy": "keywords front" },
    { "type": "benefit", "name": "benefit-focused name 30-50 chars - NO discount/free-shipping words", "strategy": "material/use benefit" },
    { "type": "emotion", "name": "emotion-focused name 30-50 chars in Korean", "strategy": "quality/lifestyle" }
  ],
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
  "hooks": {
    "event_field": "ONE concrete numeric-benefit line for the Naver event field (e.g. 2만원 이상 무료배송 / 2개 구매 시 리필 1개 증정 / 신한카드 6개월 무이자). Korean, <= 40 chars. NO decorative symbols, NO abstract promo, NO 과장/최상급.",
    "detail": [
      { "tone": "benefit", "headline": "benefit headline <= 15 chars Korean", "sub": "benefit subcopy — a FULL 40-60 char Korean sentence with a concrete, specific benefit (e.g. 은은한 향이 2개월간 지속되고 흘림 없는 차량 전용 설계로 편리해요)" },
      { "tone": "emotion", "headline": "emotion headline <= 15 chars Korean", "sub": "emotion subcopy — a FULL 40-60 char Korean sentence painting a scene/feeling" },
      { "tone": "trust",   "headline": "trust headline <= 15 chars Korean",   "sub": "trust subcopy — a FULL 40-60 char Korean sentence about quality/verification/material" }
    ]
  }
}

[Rules - Naver 2026 SEO]
- category.reason: max 15 chars, no quotes, no product name repeat
- keywords: 7-10, high search volume, low competition, no spaces
- productNames: 3 names each 30-50 chars Korean, no duplicate words 3+ times, no discount/event/free-shipping/coupon words in name
- tags: exactly 10, max 10 chars each, no duplicates, product-related only
- hooks.event_field: ONE line, MUST contain a concrete numeric benefit (free-shipping threshold / gift / installment / points). NO abstract promo, NO decorative symbols, NO 과장/최상급. <= 40 chars.
- hooks.detail: EXACTLY 3 items (tone benefit|emotion|trust). headline <= 15 chars. sub MUST be a complete Korean sentence of 40-60 chars (NOT shorter — add specific concrete detail to reach 40-60). Tone by price tier: 저가/실용 → 가성비·대용량·실용 / 고가/프리미엄 → 향·디자인·선물·품질. NO 과장/최상급/저품질 promo words (최고/최저가/1위/정품 등).

JSON only:`;
}

// Depth-tracking JSON extractor.
// Correctly handles nested objects and string contents,
// unlike simple indexOf/lastIndexOf which breaks when string values contain braces.
function extractOutermostJson(text: string): string | null {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function normalize(raw: string, fallbackPath: string): Omit<SEOWorkflowResponse, 'success' | 'qualityScore' | 'provider'> {
  let text = raw.trim();
  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }

  let parsed: Record<string, unknown>;

  // First attempt: direct parse
  try {
    parsed = JSON.parse(text);
  } catch {
    // Second attempt: depth-tracking extraction (handles prefix text and nested braces in strings)
    const jsonText = extractOutermostJson(text);
    if (!jsonText) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다. 다시 시도해주세요.');
    }
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      const preview = jsonText.slice(0, 100);
      throw new Error(`AI 응답 JSON 파싱 실패 (${preview}). 다시 시도해주세요.`);
    }
  }

  // Normalize category
  const cr = parsed.category as Record<string, unknown> | undefined;
  const category: CategorySuggestion = cr
    ? {
        code: String(cr.code ?? '').trim(),
        path: String(cr.path ?? '').trim(),
        reason: String(cr.reason ?? '').trim().slice(0, 50),
      }
    : { code: '', path: fallbackPath, reason: '카테고리 분석 결과' };

  // Normalize keywords
  const keywords = (Array.isArray(parsed.keywords) ? parsed.keywords : [])
    .map((k: unknown) => String(k).trim())
    .filter(Boolean)
    .slice(0, 10);

  // Normalize product names
  const VALID_NAME_TYPES: ProductNameVariant['type'][] = ['keyword', 'benefit', 'emotion'];
  const productNames: ProductNameVariant[] = (Array.isArray(parsed.productNames) ? parsed.productNames : [])
    .map((n: unknown) => {
      const item = n as Record<string, unknown>;
      return {
        type: (VALID_NAME_TYPES.includes(item.type as ProductNameVariant['type'])
          ? item.type
          : 'keyword') as ProductNameVariant['type'],
        name: String(item.name ?? '').trim().slice(0, 100),
        strategy: String(item.strategy ?? '').trim().slice(0, 60),
      };
    })
    .filter(n => n.name.length > 0)
    .slice(0, 3);

  // Normalize tags — strip spaces, enforce 1-10 chars
  const tags = (Array.isArray(parsed.tags) ? parsed.tags : [])
    .map((t: unknown) => String(t).trim().replace(/\s+/g, ''))
    .filter((t) => t.length >= 1 && t.length <= 10)
    .slice(0, 10);

  // Normalize hooks (HOOK-2: event_field + detail[3 tones])
  const hooks = normalizeHooks(parsed.hooks);

  return { category, keywords, productNames, tags, hooks };
}

// Anthropic Claude Sonnet — last-resort fallback when Groq fails
async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: '네이버 쇼핑 SEO 전문가. 반드시 순수 JSON만 반환. 마크다운 금지.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

export async function POST(request: NextRequest) {
  try {
    const body: SEOWorkflowRequest = await request.json();
    const { productName, categoryPath } = body;

    if (!productName?.trim()) {
      return NextResponse.json({ success: false, error: '상품명을 입력해주세요.' }, { status: 400 });
    }
    // Category is optional — without it, AI infers from product name only (lower quality)
    // qualityScore will be lower (60 vs 75+), prompting user to add category later

    // Check at least one AI key exists (Groq primary, Anthropic last-resort)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const hasGroqKey = !!(
      process.env.GROQ_API_KEY ||
      process.env.GROQ_API_KEY_2 ||
      process.env.GROQ_API_KEY_3
    );

    if (!hasGroqKey && !anthropicKey) {
      return NextResponse.json(
        { success: false, error: 'AI API 키 미설정. GROQ_API_KEY를 .env.local에 추가해주세요 (무료, 14,400회/일).' },
        { status: 500 }
      );
    }

    const qualityScore = computeQualityScore(body);
    const prompt = buildPrompt(body);

    let content = '';
    let provider = '';

    // Priority: Groq (free, 3 keys round-robin) > Anthropic (last-resort)
    if (hasGroqKey) {
      try {
        content = await callGroq(
          prompt,
          'You are a Naver Shopping SEO expert. CRITICAL RULE: Output ONLY a raw JSON object. The very first character MUST be { and the very last MUST be }. Zero explanation, zero markdown, zero prefix text before or after the JSON.',
        );
        // provider string references GROQ_MODEL constant — 작업원칙 #44 정합 (메타-단정)
        provider = `groq-${GROQ_MODEL}`;
      } catch (groqErr: unknown) {
        const msg = groqErr instanceof Error ? groqErr.message : String(groqErr);
        console.warn('[seo-workflow] Groq failed, trying Anthropic fallback:', msg.slice(0, 80));
        // Fall through to Anthropic
      }
    }

    if (!content && anthropicKey) {
      content = await callAnthropic(prompt, anthropicKey);
      provider = 'claude-sonnet';
    } else if (!content) {
      throw new Error('AI 서비스 일시 응답 없음 (Groq + Anthropic 모두 실패). 잠시 후 다시 시도해주세요.');
    }

    const normalized = normalize(content, categoryPath ?? '카테고리 AI 자동 추론');

    return NextResponse.json({
      success: true,
      ...normalized,
      qualityScore,
      provider,
    } satisfies SEOWorkflowResponse);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'SEO 분석 중 오류가 발생했습니다.';
    console.error('[api/ai/seo-workflow]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
