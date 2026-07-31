# 현재 인계 (CURRENT)

> 이 파일 1개만 활성 인계. 매 세션 종료 시 덮어쓴다(누적 아님).
> **작업 우선순위·의존성은 `docs/plan/WORK_SCHEDULE_BOARD.md`가 단일 권위.**
> **P1 상세 스펙은 이 파일 §3** — Code는 여기부터 읽고 착수.

- **status**: 설계 전량 확정. **P1 구현 착수 대기**(코드 0줄).
- **branch**: `feature/preview-copy-then-redesign` (HEAD `18f7c2b`, 13커밋 push·배포검증 완료, merge는 운영자 저녁 검토)
- **next-action**: **Code가 §3의 P1을 구현**. 운영자 GO 완료(2026-07-30).

---

## 1. 지금까지 확정된 것 (요약)

| 항목 | 상태 |
|---|---|
| 발행전검수 화면 개선(문구·레이아웃) | ✅ 완료·브라우저 실측 |
| 꼬띠 페르소나 표면축 #318 | ✅ 완료 |
| 문서 갱신 시스템 #319 / 머지 리듬 #320 | ✅ 완료 |
| 에이전트 3계층 #321 / write-set 병렬 #322 | ✅ 완료 |
| 꼬띠 소싱 에이전트 PRD | ✅ 설계 확정 (`docs/design/KKOTTI_AGENT_SYSTEM_PRD.md`) |
| 취급 제외 정책(식품·화장품·브랜드) | ✅ 운영자 확정 (PRD §5-2) |
| **P1~P6 구현** | ❌ **코드 0줄 — 지금부터** |

---

## 2. ★ 실측으로 확정된 근본 원인 (Code는 재조사 불필요)

**현재 발송 흐름**(2026-07-30 Desktop 실측):
```
vercel.json cron "0 23 * * *"(UTC) = 08:00 KST
  └─▶ /api/cron/daily
        ├─ line 312: computeRecommendation(products, season)   ← products = 자사 DB 상품뿐 ★문제
        └─ line 326: sendDiscord('KKOTTI_RECOMMEND', buildRecommendEmbed(...))
```

**미연결 엔진**:
```
/api/sourcing-recommend (POST/GET)
  └─▶ generateSourcingRecommendations()   ← DataLab 트렌드+검색량+경쟁분석
        ├─ matchWholesaleProducts()        ← 도매꾹 OpenAPI 실시간 검색
        └─ buildSourcingRecommendEmbed()   ← 디스코드 embed 빌더 (이미 존재)
  ※ vercel.json crons에 없음 → 수동 호출 아니면 영원히 안 돎 ★핵심 격차
```

**추가 발견(중요)**: `buildSourcingRecommendEmbed()`(`src/lib/sourcing-recommender.ts:437~`)는 **전부 영어 하드코딩**이다 — "sourcing recommendation", "trending categories", "est.margin", "No clear opportunities today. Check again tomorrow." 등. 반면 일간 추천 `buildRecommendEmbed()`(`src/lib/notifications/discord-builder.ts:241`)는 `STRINGS.recommend` i18n + 꼬띠 페르소나(`kkotti_intro`/`kkotti_top`/`seasonalGreeting`)가 제대로 적용돼 있다.
→ **소싱 embed를 그대로 크론에 붙이면 영어 알림이 나간다. P1 범위에 한글화·페르소나 적용 필수**(#262 개발자 은어 금지 · #318 판단표면/친밀표면).

**카테고리 데이터 실측**(제외 정책 구현 근거):
- `src/lib/naver/naver-categories-full.ts` 총 5,021건, `d1` 대분류 11종
- **식품 630건 / 화장품·미용 165건** → 카테고리 코드로 확실 판정 가능
- 도매꾹 응답(`DomeggookListItem`)에 **brand 필드 없음, title만 존재** → 브랜드는 상품명 휴리스틱 불가피

---

## 3. ★★ P1 구현 스펙 (Code 착수 지점)

**목표**: 신규 소싱 발굴을 매일 자동 실행 + 취급제외 필터 + dry-run 안전장치.

### 3-1. 작업 항목

| # | 작업 | 파일(write set) |
|---|---|---|
| A | **취급 제외 정책 엔진 신설** | `src/lib/policy/exclusion-rules.ts` (신규) |
| B | 소싱 추천을 일간 크론에 연결 | `src/app/api/cron/daily/route.ts` |
| C | **dry-run 모드** (디스코드 미발송) | `src/app/api/sourcing-recommend/route.ts` + 크론 |
| D | 소싱 embed **한글화 + 꼬띠 페르소나** | `src/lib/sourcing-recommender.ts`(embed 부분) 또는 i18n 이관 |

### 3-2. A — 취급 제외 정책 엔진 (전 상품 공통, #55·#62)

```ts
// src/lib/policy/exclusion-rules.ts
export type ExclusionKind = 'FOOD' | 'COSMETIC' | 'BRAND';
export interface ExclusionVerdict {
  excluded: boolean;
  kind: ExclusionKind | null;
  reason: string | null;        // 화면 노출용 한글 사유
  confidence: 'certain' | 'heuristic';
}
export function judgeExclusion(input: {
  categoryCode?: string | null;
  categoryD1?: string | null;
  productName?: string | null;
}): ExclusionVerdict;
```

**판정 규칙**:
1. **FOOD** — `d1 === '식품'` (또는 categoryCode로 조회한 d1) → `certain`
2. **COSMETIC** — `d1 === '화장품/미용'` → `certain`
3. **BRAND** — 상품명 휴리스틱 → `heuristic`
   - `BRAND_DENYLIST` 상수 배열(운영자가 계속 추가 가능하도록 파일 상단에 배치 + 주석으로 추가 방법 명시)
   - 신호어: `정품`, `공식`, `authentic`, `[브랜드]` 대괄호 표기 등
   - **보수적으로**: 확실하지 않으면 배제하지 않는다(오탐으로 정상 상품을 막는 손실이 더 크다)

**중요**: 이 함수 하나를 소싱·수집·발행이 공유한다. **각자 판정 로직을 새로 만들지 않는다.** P1에서는 소싱만 연결하고, 수집·발행 확장은 P6.

### 3-3. B — 크론 연결

`src/app/api/cron/daily/route.ts`의 기존 추천 발송(line ~312~330) **뒤에** 소싱 추천 블록을 추가한다. 기존 일간 추천은 **건드리지 않는다**(자사 DB 상품 추천도 여전히 유효 — 둘은 목적이 다름).

```
[기존] 일간 추천(자사 DB 상품 재정렬)   → 유지
[신규] 소싱 추천(신규 발굴)             → 추가
```

**필수 방어**:
- 소싱 추천 실패가 크론 전체를 죽이면 안 된다 → `try/catch`로 격리, 실패해도 나머지 알림은 발송
- 외부 API 다수 호출 → Vercel 함수 타임아웃 주의. 실패 시 부분 결과라도 발송
- 결과 0건이어도 **명시적으로 발송**("오늘은 조건에 맞는 후보가 없어요") — 침묵 금지(#257 선례)

### 3-4. C — dry-run 모드 (★ 절대 금지 원칙 준수)

**디스코드 실발송은 운영자 승인 없이 금지.** 따라서:
- `/api/sourcing-recommend`에 `?dryRun=true` (또는 body `{ dryRun: true }`) 지원
- dry-run이면 **`sendDiscord` 호출 없이** 생성된 embed JSON과 제외 통계만 반환
- 크론 코드에도 환경변수 또는 상수로 dry-run 스위치를 두어, **운영자 승인 전까지는 발송하지 않게** 한다
- 검증 순서: dry-run으로 결과 확인 → 운영자에게 결과 보고 → **운영자 승인 후** 실발송 활성화

### 3-5. D — 한글화 + 꼬띠 페르소나

`buildSourcingRecommendEmbed()`의 영어 문구를 전부 한글 셀러 실무 용어로 교체. 가능하면 기존 i18n 구조(`STRINGS`)로 이관해 일간 추천과 일관되게 한다.

**톤 기준**(#318): 소싱 추천은 **친밀 표면**(정보 제공·격려) → 꼬띠 톤 유지 가능. 단 **경고·차단 문구는 판단 표면** → 담백하게.

교체 예시:
- `sourcing recommendation` → `꼬띠의 오늘 소싱 추천`
- `trending categories` → `요즘 뜨는 카테고리`
- `est.margin` → `예상 순마진`
- `No clear opportunities today. Check again tomorrow.` → `오늘은 조건에 맞는 후보가 없어요. 내일 다시 찾아볼게요`
- `blue-ocean found. Supply search recommended!` → `블루오션 N건을 찾았어요`

### 3-6. 검증 (필수, 순서 준수)

1. `npx tsc --noEmit` 0 errors
2. `npm run build` 0 errors
3. **dry-run 호출로 JSON 결과 확인** — 실발송 금지
4. 제외 엔진 단위 검증: 식품/화장품 카테고리 샘플 → 배제되는지, 일반 상품 → 통과하는지
5. 결과를 운영자에게 보고 → **승인 후에만** 실발송 활성화

### 3-7. 하지 말 것 (비범위)

- ❌ 디스코드 실발송 (운영자 승인 전까지)
- ❌ 기존 일간 추천 로직 변경 (둘은 목적이 다름, 공존)
- ❌ 네이버 PUT/POST
- ❌ 자동 발행
- ❌ P3~P6 범위 선취 (검수관·앱화면·피드백·전구간 확장은 별도)
- ❌ 담당 write set 밖 파일 수정 (#322 — 다른 레인이 동시 작업 중일 수 있음)

---

## 4. 병렬 가능 트랙 (P1과 동시 진행 안전)

**P2 시즌 캘린더 확장** — write set이 P1과 겹치지 않아 **동시 진행 안전**(#322).
- 현행 `getSeasonContext()` 6개(발렌타인/화이트/어린이/어버이/빼빼로/크리스마스)뿐
- **설·추석·신학기·장마·김장·블프·이사철·여름가전·겨울가전 등 전부 누락** → 시즌 전략상품이 안 나오는 직접 원인
- write set: `src/lib/season/season-calendar.ts`(신규) + `src/lib/discord.ts`의 `getSeasonContext` 교체
- 이벤트별 **리드타임** 개념 필수(예: 크리스마스 D-45부터 소싱)
- Desktop이 MCP 리서치로 시드 데이터 구축 후 Code가 구현하는 것이 효율적(#321 — MCP의 올바른 활용)

---

## 5. 절대 금지 (매 세션 확인)

- 네이버 스토어 PUT/POST → 운영자 "GO" 없이 금지
- **디스코드 실발송 → 운영자 승인 없이 금지** (P1 작업 시 특히 주의, dry-run 먼저)
- 자동 발행 → 영구 금지, 항상 운영자 검수 후(#307)
- `KKOTTI_PERSONA_VOICE_GUIDE.md` §1~5 수정 금지(추가만)
- 과거 archive 문서는 실태와 달라도 손대지 않음(역사 보존)
- 테스트 데이터 방치 → 같은 세션에 원복
- 허위 완료 보고 → 미실측은 "미검증" 명시(#310)
- 문서 3종 점검 없이 "완료" 보고 금지(#319)
- 착수 전 실측 우선 — 문서의 "미완료" 표기 맹신 금지(#318)
- 병렬 작업 시 담당 write set 밖 파일 되돌리기 금지(#322)
