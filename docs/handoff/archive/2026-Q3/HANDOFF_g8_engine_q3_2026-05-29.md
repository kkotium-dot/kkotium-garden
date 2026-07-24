# HANDOFF — G8-ENGINE-Q3 시스템 확장 (리서치 정합 + 카테고리 톤 매핑 + 법적 게이트)

> **상태**: OPEN (Code Phase G8-ENGINE-Q3 착수 대기)
> **작성**: 2026-05-29 Desktop turn (대표 지시: "한국 시장 정합 아트디렉션 시스템 + Real Win Firefly")
> **베이스라인**: b33b286 (G8-ENGINE-Q2 [코드 완료], Pretendard 두부 해소, deriveCategoryBadge 결정론화)
> **선행 리서치 (1차 권위 출처)**: docs/research/KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29.md
> **선행 인계**: CLAUDE_MCP_DESIGN_WORKFLOW_2026-05-29.md, KKOTIUM_ASSET_ENGINE_2026-05-28.md, THUMBNAIL_ART_DIRECTION_SYSTEM_2026-05-28.md
> **성격**: G8-ENGINE-Q2 엔진 + Q3 시스템 확장(카테고리 톤 매핑 + 법적 게이트 + 시니어 규칙). Desktop이 P0 자산 4종 생성 완료, Code가 시스템 일괄 적용.

---

## 0. TL;DR (Code가 먼저 읽을 요약)

리서치(KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29.md)가 시스템 설계 1차 원리를 바꿨음:

- **톤 결정 1차 변수 = "카테고리 신뢰 시그널" (위생/공간연출/향의무드/격/기능 등)**, 2차 = 페르소나 × pricePosition
- **법적 3중 게이트** = AI 기본법(2026.1.22) + 표시광고법(2026.4.8 행정예고) + 퍼블리시티권(부정경쟁방지법 (타)목)
- **하드 룰**: 사람 얼굴 생성 금지(인체 일부 OK), 명화 = 사후 70년 경과 퍼블릭도메인만
- **시니어 페르소나**: Pretendard 18pt+, 고대비 7:1+

Code SCOPE = 3개 신규 모듈 + 1개 기존 고도화 + 1개 데이터 적재 가이드.

---

## 1. Desktop 완료 사항 (P0)

### 1-A. Firefly 백드롭 자산 4종 생성 완료 (대표님 PC 다운로드 폴더)

| 파일 (Firefly 기본명 패턴) | 톤 | 용도 매핑 |
|---|---|---|
| Firefly_A (우드 키친) | 킨포크 자연광 주방 | S2 lifestyle |
| Firefly_B (베이지 마이크로시멘트) | 모던 미니멀 럭셔리 | S5 price |
| Firefly_C (우드 도마 + 레몬/민트) | 감성 푸드 SNS | S6 social |
| **Firefly_D (화이트 마블 + 화이트 타일)** | **한국형 모던미니멀 — 리서치 §11-A 처방 정합** | **S1 clean / S4 main (아이스트레이 1순위)** |

- 모델: Adobe Firefly **Gemini 3.1 (w/ Nano Banana 2)** — 리서치 §6-B 라이선스 주의(파트너 모델, 상업 적합성 크리에이터 판단)
- 사양: 1:1 정사각 1K (1024×1024) JPG
- 공통 룰: 중앙 비움 / 사람 0 / 텍스트 0 / 소품 가장자리만

### 1-B. 적재 메커니즘 (Code가 만들 스크립트)

기존 `scripts/upload-cutout.js` 패턴으로 `scripts/upload-backdrop.js` 생성:
- 호출: `node scripts/upload-backdrop.js <productId> <skeletonId> <localPath>`
- 적재 경로: `product-assets/{productId}/backdrop-{skeletonId}.png` (resolver 캐시키 정합)
- service role 키 사용 (.env.local)
- 예: `node scripts/upload-backdrop.js cmpp62yje00015xup5h8pgwx0 S1 ~/Downloads/Firefly_D.jpg`

---

## 2. Code SCOPE — G8-ENGINE-Q3 신규/고도화 모듈

### 2-A. 신규: src/lib/automation/category-tone-mapper.ts

리서치 §8 카테고리 × 톤 매핑 결정 테이블을 시스템에 새김.

```typescript
// 입력: Diagnosis.conceptTone + Product.naverCategoryCode (또는 category leaf)
// 출력: ToneDirective {trustSignal, baseTone, palette, modelPolicy}

type TrustSignal = 'hygiene' | 'spatial' | 'fragrance' | 'grace' | 'function' | 
                   'safety' | 'freshness' | 'spec' | 'story';

type BaseTone = 'modern-minimal' | 'kinfolk' | 'korean-traditional' | 
                'foreign-cinematic' | 'pastel-friendly';

type ModelPolicy = 'no-human' | 'hand-only' | 'silhouette' | 'face-prohibited';
// face는 hard 금지, 시스템적으로 'allowed' 옵션 자체 미존재

interface ToneDirective {
  categoryGroup: string;        // "kitchen" | "homeliving" | "automotive" | ...
  trustSignal: TrustSignal;
  baseTone: BaseTone;
  palette: PaletteSpec;         // 기존 ArtDirection.palette 확장
  modelPolicy: ModelPolicy;     // 항상 'no-human' 또는 'hand-only'
  typeScale: number;            // senior 페르소나 시 1.3+ (현재 1.15)
  contrastMin: number;          // senior 시 7.0 (WCAG AAA)
}

function mapCategoryToTone(
  conceptTone: ConceptTone,
  naverCategoryCode?: string,
  productName?: string
): ToneDirective;
```

매핑 테이블 (리서치 §8 그대로):
- 주방/생활 → hygiene + modern-minimal-white (warm/calm)
- 홈리빙/인테리어 → spatial + kinfolk OR korean-traditional (calm/mono)
- 차량/디퓨저 → fragrance + foreign-cinematic-dark (vivid/mono)
- 뷰티 → quality + kinfolk-clean-white (calm/warm)
- 패션 → style + kinfolk-editorial (vivid/warm)
- 유아동 → safety + pastel-friendly (warm)
- 식품 → freshness + warm-saturated (warm/vivid)
- 디지털 → spec + modern-minimal-dark-or-white (mono/cool)
- 전통/선물 → grace + korean-traditional (calm/mono)

pricePosition 변주는 기존 ArtDirection 모듈 로직 유지.

### 2-B. 신규: src/lib/automation/asset-legal-gate.ts

리서치 §3, §9의 4-Point 법적 게이트. 발행 전 필수 통과.

```typescript
interface LegalGateResult {
  passed: boolean;
  blocks: LegalBlock[];   // 차단 사유 (시정 명령)
  warnings: LegalWarning[]; // 검토 권고
}

type LegalBlock = 
  | { type: 'face-detected', confidence: number }
  | { type: 'masterpiece-copyright', keyword: string }
  | { type: 'realistic-person', confidence: number };

type LegalWarning =
  | { type: 'excessive-retouching', diff: number }  // 네이버 과보정 룰
  | { type: 'ai-disclosure-needed', reason: string }; // 사업자성 분기 시

async function runLegalGate(
  imageBuffer: Buffer,
  product: Product,
  variant: ThumbnailVariant
): Promise<LegalGateResult>;
```

구현 휴리스틱:
- **얼굴 검출**: Adobe MCP `image_select_subject` 결과 + Sharp metadata 기반 1차 (cloud face detection 옵션 검토)
- **명화 저작권**: productName에 `/명화|그림|그래픽아트|masterpiece/i` 매치 → 경고 (대표 확인 필요)
- **과보정**: backdrop 적용 전후 평균 색차 ΔE > 임계값 시 경고

변형별 게이트 강도:
- clean (대표이미지): 최강 — 텍스트 0, 사람 0, 워터마크 0 (네이버 2024.10 강화 룰 정합)
- 기타 변형: 표준

### 2-C. 신규: scripts/upload-backdrop.js

위 1-B 참조. `scripts/upload-cutout.js`의 100% 동일 패턴.

### 2-D. 고도화: src/lib/automation/thumbnail-art-direction.ts

기존 pickArtDirection을 2-스텝 구조로 리팩터:

```typescript
// AS-IS: conceptTone → palette (1-step)
// TO-BE: conceptTone + category → ToneDirective → ArtDirection (2-step)

function pickArtDirection(
  conceptTone: ConceptTone,
  naverCategoryCode?: string,  // ★ 신규 입력
  productName?: string         // ★ 신규 입력 (명화 게이트용)
): ArtDirection {
  const toneDirective = mapCategoryToTone(conceptTone, naverCategoryCode, productName);
  return applyPersonaModulation(toneDirective, conceptTone);
}
```

시니어 페르소나 강화 (리서치 §5-C):
- persona === 'senior' → typeScale 1.15 → **1.30** (Pretendard 18pt 환산)
- persona === 'senior' → contrastMin 4.5 → **7.0** (WCAG AAA)
- persona === 'senior' → 텍스트 색은 INK(#111) 강제, gray 사용 금지

### 2-E. 데이터 적재: art_director_prompts 테이블

리서치 §10의 Firefly 프롬프트 12종을 Supabase `art_director_prompts` 테이블에 적재 (메모리에 이미 존재하는 테이블).

- 컬럼 권장: `id, category_group, tone_key, prompt_body, seed_hint, ctr_score, cvr_score, created_at, updated_at`
- 12종 INSERT (리서치 §10 그대로)
- ctr_score/cvr_score는 30일 후 자동 업데이트 (메모리 메커니즘 정합)

Code 작업: Supabase 마이그레이션 → 12종 seed INSERT.

---

## 3. 실행 순서 (의존성)

1. **category-tone-mapper.ts 신규** (TSC 0 / build 0)
2. **asset-legal-gate.ts 신규** (TSC 0 / build 0) — 얼굴 검출은 1차 휴리스틱(MVP), 2차 정밀화는 별도 sprint
3. **thumbnail-art-direction.ts 고도화** (2-step + senior 강화)
4. **scripts/upload-backdrop.js 신규**
5. **art_director_prompts 12종 seed**
6. **production 검증** — 표본 3종 진단 → 4변형 응답에 `toneDirective`, `legalGate.passed` 노출 확인

각 단계 TSC 0 / build 0 / verify-vercel-deploy.sh --wait exit 0 후 보고.

---

## 4. 절대 준수 (한 줄로)

한글 literal / 이모지 금지(Lucide) / 영어 주석 / 한글 리터럴 타입 금지 / heredoc 금지(#26) / 거짓 라벨 금지(#46) / new PrismaClient 금지(prisma 싱글톤) / 외부 이미지 API 런타임 0(#38, Storage 캐시만) / Production=Vercel only / SD-01 아랍어 footer 보존 / 비가역 0(네이버 미발행).

### 4-A. 신규 하드 룰 (리서치 §3, §9 정합)

- **얼굴 생성 금지**: Firefly 프롬프트에 `no human face`, `no people` 항상 포함. Code 측 게이트도 이중 검증.
- **명화 저작권 게이트**: productName "명화/그림" 키워드 → 대표 승인 필수 단계
- **AI 기본법 사업자성**: 현재 자체 사용 only. 외부 SaaS 제공 결정 전까지는 표시 의무 모듈 미구현(이중 작업 회피)

---

## 5. Code 붙여넣기 메시지 (새 Claude Code 세션)

```
꽃틔움 가든 Code. Phase G8-ENGINE-Q3 한국 시장 정합 아트디렉션 시스템 확장.
[STEP 0] CLAUDE.md + PROGRESS 헤더 + TASK_BRIDGE §3 +
  docs/research/KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29.md ★1차 권위 출처 정독
  + docs/handoff/HANDOFF_g8_engine_q3_2026-05-29.md
  + docs/handoff/CLAUDE_MCP_DESIGN_WORKFLOW_2026-05-29.md 정독.
[베이스라인] b33b286 (G8-ENGINE-Q2 [코드 완료]).
[근거] 리서치가 톤 결정 1차 원리를 "카테고리 신뢰 시그널 × 페르소나"로 재정의.
  법적 3중 게이트(AI 기본법 + 표시광고법 + 퍼블리시티권) 도입.
  Desktop이 Firefly 백드롭 4종(특히 D=화이트 마블 한국형 모던미니멀) 생성 완료.
[SCOPE] (의존성 순서):
  1. src/lib/automation/category-tone-mapper.ts 신규 — conceptTone + naverCategoryCode
     -> ToneDirective(trustSignal/baseTone/palette/modelPolicy). 리서치 §8 매핑 테이블 9종.
  2. src/lib/automation/asset-legal-gate.ts 신규 — 4-Point 게이트(얼굴/명화/실존인물/과보정).
     얼굴 검출은 휴리스틱 MVP, 정밀화 별도 sprint.
  3. src/lib/automation/thumbnail-art-direction.ts 고도화 — pickArtDirection을 2-step으로
     리팩터, senior 페르소나 강화(typeScale 1.3, contrastMin 7.0, INK 강제).
  4. scripts/upload-backdrop.js 신규 — upload-cutout.js 동일 패턴.
     호출: node scripts/upload-backdrop.js <productId> <skeletonId> <localPath>
     적재: product-assets/{id}/backdrop-{skeletonId}.png
  5. art_director_prompts Supabase seed — 리서치 §10 프롬프트 12종 INSERT.
  6. production 검증 — 표본 3종 응답에 toneDirective, legalGate.passed 노출 확인.
  각 단계 TSC0/build0/verify-vercel exit0.
[하드 룰] 얼굴 생성 금지(Firefly 프롬프트 + Code 게이트 이중 검증).
  명화 키워드 매치 시 대표 승인 필수. AI 사업자성은 현재 자체 사용 only로 유지.
[절대준수] 한글literal / 이모지금지(Lucide) / 영어주석 / heredoc금지(#26) /
  거짓라벨금지(#46) / new PrismaClient금지 / 외부이미지API런타임0(#38) /
  Production=Vercel / SD-01 보존 / 비가역0.
[통과 후] Desktop 새 채팅에서:
  (a) Firefly_D를 upload-backdrop.js로 아이스트레이 S1 적재
  (b) 명화송풍구·달항아리 Firefly 생성 + 적재
  (c) 3종 종합 4변형 before/after 육안 검증 -> 통과 시 G8-ENGINE-Q3 [CLOSED]
```

---

## 6. 작업 유의사항 (이번 turn 추가분)

- **#46 자기교정**: 이전 핸드오프의 "4-point 게이트"가 막연했음 → 리서치가 AI 기본법·표시광고법·퍼블리시티권으로 정밀화. 본 인계서가 정정본.
- **리서치 권위 우선**: 본 인계서와 리서치(KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29.md) 충돌 시 **리서치가 1차 출처**. Code는 리서치 인용 명시 후 구현.
- **얼굴 금지의 시스템적 강제**: 옵션이 아니라 타입 시스템에서 'face-allowed' 자체 제거. 미래에 SaaS 제공 결정 시 별도 모듈로 추가.
- **시니어 페르소나 = 새싹 셀러의 1순위 타깃**: 액티브 시니어(5060) 이커머스 큰손, 50대 여성 전자상거래 1위. 시각 규칙 강화가 비즈니스 매출에 직결.
- **계도기간 활용**: AI 기본법 1년 계도기간 동안 시스템 정비. 2027.1.22 본격 단속 전까지 안정화.
- **SD-01 / 비가역 0**: 아랍어 footer 보존, 네이버 미발행.

---

## 7. P2 진입 조건 (Desktop 다음 세션)

Code Phase G8-ENGINE-Q3 [코드 완료] 통보 후 Desktop은:

1. **아이스트레이 S1 적재**: `node scripts/upload-backdrop.js cmpp62yje00015xup5h8pgwx0 S1 ~/Downloads/Firefly_D.jpg`
2. **명화송풍구 저작권 검증**: 도매꾹 상세 페이지에서 실제 사용된 명화 확인 → 작가 사후 70년 경과 여부 → 통과 시 Firefly 생성
3. **달항아리 Firefly 생성**: 리서치 §10-3 한국형 미니멀 프롬프트 사용
4. **3종 종합 4변형 검증**: assetSource.backdrop=auto-cache 전환 + before/after 육안 → 통과 시 G8-ENGINE-Q3 [CLOSED]
