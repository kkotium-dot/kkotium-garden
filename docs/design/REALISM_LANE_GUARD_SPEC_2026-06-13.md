# realism_lane 가드 스펙 (사실성 레인 · 전상품 · #71)

- date: 2026-06-13 / 세션7-g-Code
- 권위 parent: `docs/playbook/SCENT_MOOD_4SCENE_GRADE_2026-06-13.md` §0·§7, `docs/design/SCENT_MOOD_BACKGROUND_SYSTEM.md`
- 원칙: 작업원칙 #71 "진짜 예술은 진짜로 (Authenticity Realism Lane)"
- 상태: 스펙 확정용. 코드 구현은 별도 턴(본 문서 승인 후).
- scope: product-agnostic (#55) — 명화는 검증 케이스, 전상품 범용. additive · 비가역 0 · 네이버 무접촉.

---

## 1. 목적

PHOTOREAL 슬롯에 AI 유화/회화/페인터리 마감이 섞이면 "프리미엄 신뢰"가 깎인다(#71). 자산 슬롯마다 **사실성 레인**을 부여하고, PHOTOREAL 슬롯에 회화 마감이 감지되면 운영자에게 경고한다. 기존 `main_image_white_bg` / `fidelity_check` 가드와 **동형**(강제 차단 아님 · 강제모달 0 · #56).

## 2. 데이터 모델 — realism_lane (파생, 신규 컬럼 0 우선)

두 값만 갖는다.

| lane | 의미 | 허용 소스 |
|---|---|---|
| `authentic_art` | 제품 라벨 · 브랜드 스토리(S5) | 퍼블릭도메인 실제 작품(실제 명화 reproduction · 진짜 모네)만. 저작권 게이트 연동. |
| `photoreal` | 히어로 · 라이프스타일 · 향 씬 · 합성 · 썸네일 · 추가이미지 | 실사 카메라 촬영 품질. AI 유화/회화/페인터리 마감 0. |

### 2.1 파생 규칙 (slot → lane)

- 1차 파생은 **슬롯/스테이지 기반**(신규 컬럼 없이 기존 stage taxonomy + slot 토큰에서 파생):
  - stage `composite` / `thumbnail` / `detail`(히어로·향 씬·라이프스타일) · slot `main`/`hero`/`extra*` → `photoreal`
  - 라벨/브랜드 스토리(S5) 슬롯(detail 中 story art·label) → `authentic_art`
- 명시 오버라이드: 자산에 `realism_lane` 메타가 있으면 우선(AssetRegistry 확장 컬럼 또는 asset_jobs intervention_payload 경유 — 구현 턴서 택1, P2021/P2022 가드).
- 비명화 상품: `authentic_art` 레인이 비어도 `photoreal` 룰(회화 마감 금지)은 보편 적용(#55).

## 3. 가드 (PHOTOREAL 슬롯 회화 마감 경고)

### 3.1 판별 (휴리스틱 · 결정론 우선)

- PHOTOREAL 슬롯 자산에 대해 "회화/유화/페인터리" 신호를 점검. 1차는 **메타·프롬프트 기반**(생성 프롬프트에 painting/illustration/painterly/oil/watercolor 토큰 잔존 = 위험), 2차(선택)는 픽셀 휴리스틱(엣지 부드러움·붓터치 텍스처)으로 보강.
- 외부 이미지 API 호출 0(#37·#38) — 정적 자산 + Sharp 휴리스틱만.

### 3.2 표면화 (control-tower-engine · 기존 가드 동형)

- `seo-guard` / `fidelity_check`와 동일 패턴: `main_image_white_bg` 가 fail→info 강등되는 구조처럼, PHOTOREAL 슬롯 회화마감 의심을 **경고(info/warn)**로 노출.
- 관제탑: `ApplyStatus` 또는 개입카드에 `realism_lane` 경고 1줄(레드 아님 · 강제모달 0 · #56). 위젯은 firefly_auto `settingsVerified` 체크리스트와 동형 1줄(Check/Clock).
- 스튜디오: PHOTOREAL 슬롯 확정 시 회화마감 의심이면 "실사 마감 확인" 서브체크(운영자 1클릭 통과).

### 3.3 AUTHENTIC-ART 게이트

- `authentic_art` 슬롯은 퍼블릭도메인 실제 작품 소스만 허용. 비-퍼블릭도메인/AI 생성 소스 감지 시 경고 + 저작권 게이트 연동(구현 턴서 PublishedAsset provenance와 정합).

## 4. 개입카드 페이로드 (구현 턴 — 동형 확장)

`FireflyDropPayload` 계열의 `generateModeConfirmed` / `settingsVerified` 와 동형으로, firefly_auto(또는 신규 realism 카드)에 `realismLaneVerified?: { lane: 'authentic_art'|'photoreal', finishOk: boolean }` 추가 검토. 미확인 → 검증대기. additive · firefly_drop 무영향.

## 5. 비범위 (이번/구현 턴 모두 금지)

- 네이버 무접촉(읽기/쓰기 0).
- 외부 이미지 API 런타임 호출 0(#37·#38).
- 강제 차단/모달 0 — 경고·서브체크만(#56).
- 신규 상품 단건 하드코딩 0(#55) — 전상품 파생.

## 6. 구현 체크리스트 (다음 턴)

1. realism_lane 파생 유틸(slot/stage → lane, 순수 함수).
2. PHOTOREAL 회화마감 휴리스틱(프롬프트 토큰 1차 · Sharp 2차).
3. control-tower-engine 경고 표면화(ApplyStatus 또는 개입카드 1줄).
4. 위젯 체크리스트 1줄(firefly_auto settingsVerified 동형).
5. tsc0 · build0 · 이모지0 · 한글리터럴0 · prisma 싱글톤.
