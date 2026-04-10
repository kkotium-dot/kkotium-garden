// POST /api/ai/seo-workflow
// D1 SEO workflow — AI provider priority:
//   1. Google Gemini 2.5 Flash  (GEMINI_API_KEY)   — free tier
//   2. Anthropic Claude Sonnet  (ANTHROPIC_API_KEY) — fallback
//   3. Perplexity sonar-pro     (PERPLEXITY_API_KEY)— last resort

import { NextRequest, NextResponse } from 'next/server';


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

interface HookVariant {
  type: 'price' | 'emotion' | 'feature';
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
  "hooks": [
    { "type": "price",   "text": "benefit hook under 100 chars in Korean" },
    { "type": "emotion", "text": "emotion hook under 100 chars in Korean" },
    { "type": "feature", "text": "feature hook under 100 chars in Korean" }
  ]
}

[Rules - Naver 2026 SEO]
- category.reason: max 15 chars, no quotes, no product name repeat
- keywords: 7-10, high search volume, low competition, no spaces
- productNames: 3 names each 30-50 chars Korean, no duplicate words 3+ times, no discount/event/free-shipping/coupon words in name
- tags: exactly 10, max 10 chars each, no duplicates, product-related only
- hooks: 3 hooks each under 100 chars Korean

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

  // Normalize hooks
  const VALID_HOOK_TYPES: HookVariant['type'][] = ['price', 'emotion', 'feature'];
  const hooks: HookVariant[] = (Array.isArray(parsed.hooks) ? parsed.hooks : [])
    .map((h: unknown) => {
      const item = h as Record<string, unknown>;
      return {
        type: (VALID_HOOK_TYPES.includes(item.type as HookVariant['type'])
          ? item.type
          : 'price') as HookVariant['type'],
        text: String(item.text ?? '').trim().slice(0, 100),
      };
    })
    .filter(h => h.text.length > 0)
    .slice(0, 3);

  return { category, keywords, productNames, tags, hooks };
}

// Gemini 2.5 Flash — free tier
async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: 'You are a Naver Shopping SEO expert. CRITICAL RULE: Output ONLY a raw JSON object. The very first character MUST be { and the very last MUST be }. Zero explanation, zero markdown, zero prefix text before or after the JSON.',
        }],
      },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429) throw new Error('Gemini API 할당량 초과. 잠시 후 다시 시도해주세요.');
    throw new Error(`Gemini API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const parts: { text?: string; thought?: boolean }[] = candidate?.content?.parts ?? [];

  // Filter out thinking parts (thought:true) — gemini-2.5-flash may include them
  const text = parts
    .filter(p => !p.thought)
    .map(p => p.text ?? '')
    .join('');

  if (!text.trim()) {
    const finishReason = candidate?.finishReason ?? 'unknown';
    throw new Error(`Gemini API 빈 응답 (finishReason: ${finishReason})`);
  }
  return text;
}

// Anthropic Claude Sonnet fallback
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

// Perplexity sonar-pro — last resort
async function callPerplexity(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: '네이버 쇼핑 SEO 전문가. 반드시 순수 JSON만 반환. 마크다운 금지.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401 || res.status === 429) {
      throw new Error('Perplexity API 크레딧이 부족합니다. GEMINI_API_KEY를 .env.local에 추가하면 무료로 사용 가능합니다.');
    }
    throw new Error(`Perplexity API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
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

    const geminiKey     = process.env.GEMINI_API_KEY;
    const anthropicKey  = process.env.ANTHROPIC_API_KEY;
    const perplexityKey = process.env.PERPLEXITY_API_KEY;

    if (!geminiKey && !anthropicKey && !perplexityKey) {
      return NextResponse.json(
        { success: false, error: 'AI API 키가 없습니다. GEMINI_API_KEY를 .env.local에 추가하세요 (무료).' },
        { status: 500 }
      );
    }

    const qualityScore = computeQualityScore(body);
    const prompt = buildPrompt(body);

    let content = '';
    let provider = '';

    // Priority: Gemini (free) > Anthropic > Perplexity
    if (geminiKey) {
      content = await callGemini(prompt, geminiKey);
      provider = 'gemini-2.5-flash';
    } else if (anthropicKey) {
      content = await callAnthropic(prompt, anthropicKey);
      provider = 'claude-sonnet';
    } else {
      content = await callPerplexity(prompt, perplexityKey!);
      provider = 'perplexity-sonar';
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
