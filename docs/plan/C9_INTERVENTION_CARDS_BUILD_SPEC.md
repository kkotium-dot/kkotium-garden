# C-9 개입카드 빌드 스펙 (2026-06-11) — Desktop 작성, 실측 기반

> 권위: `docs/playbook/CUTOUT_HERO_STANDARD.md §3` + `docs/design/OPERATOR_SYSTEM_BLUEPRINT.md §3·§4`.
> 작성: Desktop(#49), `control-tower-engine.ts` 실측 직독 기반. 구현 = Code(#41). 전부 additive·가역.

## 0. 핵심 발견 (범위 축소)
- **개입대기열은 이미 가동 중**: `src/lib/automation/control-tower-engine.ts`가 `ActionQueueItem`(4분류 AUTO/INPUT_DECISION/GO_PENDING/AUTH) + `computeActionQueueItem()`를 이미 산출. → C-9 = **신규 큐 구축 아님**, 기존 큐 카드에 "개입 타입 정밀도" 추가.
- 현재 한계(오류): 누끼/합성 잡이 `image.status==='awaiting_human'`이면 **일반 AUTH 카드**(`stage:'auth_image'`, deepLink `/swap`)만 뜸 — 어떤 개입인지(드롭/크롭/소스) 구분 0.
- **토대 스키마 = 적용 완료**: `asset_jobs.intervention_type text null` + `intervention_payload jsonb null` (Desktop apply_migration `c9_intervention_fields`, 검증완). Code는 코드만 빌드.

## 1. 개입카드 3종 (CUTOUT_HERO_STANDARD §3)
| intervention_type | 트리거 | payload(jsonb) | 대표 액션 | 후속 자동 |
|---|---|---|---|---|
| `source_request` | detail-source 부재 상태로 이미지 파이프라인 진입 | `{ supplierUrl?, productId }` | URL/파일 제공 | 크롤→`source/` 적재 |
| `hero_crop_request` | 누끼(bg_clean) 잡 진입인데 양질 히어로 소스 부재 (판정: 소스 최장변<300px OR 텍스트 OCR 검출) | `{ guide, minEdge:300, examples }` | 크롭 이미지 업로드 | remove_bg→검증→`cutout/` 적재 |
| `firefly_drop` | 합성(composite) 잡 진입 | `{ dropkitPath, promptTrack1, promptTrack2, model:'Nano Banana Pro', ratio:'4:3' }` | Firefly 드롭+생성 | 후보선택→`composite/` 적재 |

## 2. 엔진 변경 — `control-tower-engine.ts` (additive, 순수모듈 유지)
1. `ComputeContext`에 추가:
   ```ts
   // The active image-track job's intervention (asset_jobs.intervention_type/payload),
   // null when none. The route loads the latest awaiting_human image job and passes it.
   imageJobIntervention?: { type: string; payload?: unknown } | null;
   ```
2. `ActionQueueItem`에 추가(둘 다 optional — 기존 호출부 무파손):
   ```ts
   interventionType?: string;   // 'source_request' | 'hero_crop_request' | 'firefly_drop'
   payload?: unknown;           // pass-through for the card (dropkit path/prompt/guide)
   ```
3. `computeActionQueueItem()` 시그니처에 `intervention?: { type; payload } | null` 추가. 분기 정밀화:
   - `image.status==='awaiting_human'` AND `intervention` 존재 → 정밀 카드:
     - `firefly_drop` → `{ category:'AUTH', stage:'firefly_drop', deepLink:'/products/{id}/studio', interventionType, payload }`
     - `hero_crop_request` → `{ category:'INPUT_DECISION', stage:'hero_crop_request', deepLink:'/products/{id}/studio', interventionType, payload }`
     - `source_request` → `{ category:'INPUT_DECISION', stage:'source_request', deepLink:'/products/{id}', interventionType, payload }`
   - intervention 없으면 기존 일반 AUTH 카드 폴백(하위호환).
4. `computeControlTowerRow()`에서 `ctx.imageJobIntervention`을 `computeActionQueueItem`에 전달.

## 3. 라우트 변경 — 매트릭스 로더 + 잡 생산자
- **매트릭스 로더**(control-tower 행을 만드는 route — `/api/products` 또는 관제탑 route): 각 상품의 최신 `awaiting_human` 이미지 잡에서 `intervention_type/intervention_payload`를 읽어 `ctx.imageJobIntervention`로 전달.
- **`apply-cutout/route.ts`**: 소스 품질 부족 판정 시(소스 최장변<300 OR OCR 텍스트 — `src/lib/images/subject-containment.ts`·`bg-difficulty.ts` 재사용) bg_clean 잡을 `intervention_type='hero_crop_request'` + payload 세팅 + `status='awaiting_human'`로. (그냥 진행 금지)
- **`apply-composite/route.ts`**: composite 잡 진입 시 `intervention_type='firefly_drop'` + payload(드롭킷경로·프롬프트 트랙1/2·모델·비율) + `status='awaiting_human'`.
- **소스 부재**(`capture-source-detail`/`asset-source-resolver`): 이미지 파이프라인 진입 시 detail-source 없으면 `source_request` 잡 세팅.
- 업로드 수신: `hero_crop_request` 크롭 업로드 = **기존 업로드 경로 재사용**. ★주의: `SOURCE_KIND_RULES`에 `source` 규칙 없음 — kind 처리 확인 필요(CUTOUT_HERO_STANDARD §3 플래그).

## 4. UI 변경 (강제 모달 금지 #56)
- **개입대기열 위젯 + 스튜디오 카드**: 카드를 `interventionType`별로 렌더. payload 표시:
  - `firefly_drop`: 드롭킷 경로 + 프롬프트(복사버튼) + "Firefly에 드롭→생성" 1줄 안내.
  - `hero_crop_request`: 크롭 가이드(완전포함·실사·minEdge) + 업로드 영역.
  - `source_request`: 상세 URL 입력/파일 업로드.
- **i18n**: 3종 한글 라벨을 `src/lib/i18n/control-tower-strings.ko.json`(또는 `finishing-labels.ko.json`)에 추가. 코드 한글리터럴 금지(영문 키→JSON 매핑).
- 큐 위젯 위치 = 관제탑 상단(기존 actionQueue 소비처). 위젯 파일은 `actionQueue` grep로 특정.

## 5. 검증 체크리스트 (Code)
- [ ] tsc 0 / build exit 0 / 이모지 0 / 코드 한글리터럴 0
- [ ] 기존 `computeActionQueueItem` 호출부 무파손(optional 인자라 하위호환)
- [ ] intervention 없을 때 기존 일반 AUTH 카드 그대로(회귀 0)
- [ ] 명화 composite 잡 1건 세팅 → 큐에 `firefly_drop` 카드(드롭킷 경로 노출) 확인 = **명화 트랙2 개입을 앱 내로 흡수**
- [ ] 전상품 범용(#55): 카드 로직에 명화 하드코딩 0

## 6. 가치 (선제적)
- C-9 완료 시 **명화 트랙2 Firefly 드롭이 out-of-band 핸드오프 → 앱 내 자연카드**로 전환. 대표가 핸드오프 문서 없이 앱에서 "여기 B누끼 드롭(경로표시)" 안내 받음 → #56 실체화.
- 전상품: 달항아리·아이스트레이도 동일 카드로 자동 안내(템플릿 복붙 0, 컨셉은 상품별).

## 7. Code 진입 순서
스키마(완료) → 엔진 2 → 라우트 3 → UI 4 → 검증 5. 비가역 0·additive. 막히면 정직 보고(#46).
