# 빌드 스펙 — 이미지 자산 폴더 자동분류 시스템 (전상품·앱 영구구조)

작성 2026-06-09 세션2 · Desktop 설계. 권한 = 본 문서 + PRINCIPLES_LEARNED #57. 실행 = Code(#41 핑퐁: 파일 편집은 Code). 검증 = Desktop(production/Storage 실측 #45).

## 0. 목표 (대표 지시)
생성물(누끼/합성/썸네일/상세)을 **단계별 폴더로 자동 분류·저장**하고 반자동 업로드. Adobe CC는 작업장(입구만 정리), **진짜 분류 체계는 Supabase + 앱 코드**에 박제 → 앞으로 만들 전상품 자동 적용.

## 1. 현재 상태 (실측 완료, 추측 0)
- 저장 어댑터: `src/lib/storage/automation-storage.ts`
- 경로 규약(현재): `product-assets/{productId}/{kind}-{variant}-{ts}.png`
- 타입(현재): `AssetKind = 'thumb' | 'detail'`
- 생산자(실측):
  - C-2 `apply-cutout` → `kind:'thumb', variant:'cutout'` → `{pid}/thumb-cutout-{ts}.png`
  - C-7 `apply-composite` → `kind:'detail', variant:'composite'` → `{pid}/detail-composite-{ts}.png`
  - (그 외 thumb-crop/white-bg/generate-detail/save-assets 등도 thumb|detail 사용 — 변경 전 grep으로 전수 확인 필수)
- 문제: 단계(cutout/composite)가 **variant 문자열에만** 있어 "누끼만 모아보기" 불가. 폴더 분류 본질 약함.

## 2. 설계 — 단계기반 AssetKind 확장 (additive·하위호환)
### 2-1. 타입 확장 (automation-storage.ts)
```ts
export type AssetKind = 'thumb' | 'detail' | 'cutout' | 'composite' | 'archive';
```
- 기존 'thumb' | 'detail' 유지(하위호환). 'cutout'·'composite'·'archive' 추가.

### 2-2. 경로 규약 — 단계 prefix 디렉토리
```
product-assets/{productId}/
  cutout/{variant}-{ts}.png      ← 누끼 (투명 PNG)
  composite/{variant}-{ts}.png   ← 합성 (무드/새배경)
  thumb/{variant}-{ts}.png       ← 썸네일 (1:1 대표 후보)
  detail/{variant}-{ts}.png      ← 상세 섹션
  archive/{variant}-{ts}.png     ← 폐기/대체본
```
- `uploadAutomationAsset` path 생성을 `${productId}/${kind}/${variant}-${ts}.png`로 변경.
- ★ 하위호환: 기존 flat 파일(`{pid}/thumb-cutout-{ts}.png`)은 그대로 둠(이동 X — URL 깨짐 방지). `listProductAssets`/`findCachedAsset`는 **신규 하위폴더 + 기존 flat 둘 다** 조회하도록 확장.

### 2-3. listProductAssets 확장 (하위폴더 재귀)
- 현재 `.list(productId)` 1-depth만 → 각 단계 폴더(`{pid}/cutout` 등)도 list 후 병합.
- 반환에 `stage` 필드 추가(폴더명 = 단계). UI가 단계별 그룹핑 가능.

### 2-4. 생산자 호출부 수정 (의미 정합)
- C-2 apply-cutout: `kind:'thumb', variant:'cutout'` → **`kind:'cutout', variant:'<source>'`**(예: whitefront/carleather/fieldwoman). 단 대표로 적용된 누끼 흰배경본은 의미상 thumb이므로, **누끼 원본=cutout / 흰배경 대표본=thumb** 2개로 분리 저장 권장(원본 추적성).
- C-7 apply-composite: `kind:'detail', variant:'composite'` → **`kind:'composite', variant:'<mood>'`**(예: newbg_linen/firefly_carleather).
- thumb-crop/white-bg → 그대로 `thumb`. generate-detail → 그대로 `detail`.
- ※ 변경 전 전 생산자 grep 필수, 누락 시 자산 흩어짐.

## 3. 자동 분류 헬퍼 (신규, src/lib/storage/asset-taxonomy.ts)
```ts
// kind → Adobe CC 미러 폴더명 (입구 정리용, 1:1 매핑)
export const STAGE_FOLDER: Record<AssetKind,string> = {
  cutout:'01_cutout', composite:'02_composite', thumb:'03_thumbnail',
  detail:'04_detail', archive:'99_archive',
};
// source 라벨 → kind 추론 (회수 라우트가 분류 자동화)
export function kindForSource(source:string): AssetKind { ... }
```
- #57 가이던스(finishing-guidance.ts)와 연결: 합성 소스 선택 UI에 '실촬영 히어로컷 우선' 표기 유지.

## 4. Adobe CC 입구 정리 (트랙 B · 승인 게이트)
- `asset_create_folders`는 **승인 필요**(Desktop에서 "No approval received" 확인). 대표 승인 시 Desktop이 생성:
  - `KKOTIUM_GARDEN/00_inbox · 01_cutout · 02_composite · 03_thumbnail · 04_detail · 99_archive`
- 중복 `kkotium`~`kkotium (5)` 6개: 신규 루트로 의미있는 자산만 이관 후 빈 폴더 정리(이관·삭제 모두 승인·비가역 주의 — 대표 확인).
- Adobe는 어디까지나 작업장. Firefly 생성물은 대표가 다운로드 → 앱 apply-* 라우트가 Supabase로 회수·정규화(진짜 분류는 여기서).

## 5. 검증 체크리스트 (Code 완료 후 Desktop 실측)
- [ ] tsc 0 / build OK / 이모지 0 / 코드 한글 0 / 비가역 0
- [ ] AssetKind 확장 후 기존 호출부 전부 컴파일 통과(타입 누락 0)
- [ ] 신규 업로드 → `{pid}/cutout/...` 등 하위폴더 생성 확인(Storage 실측)
- [ ] 기존 flat 파일 URL 여전히 유효(하위호환 — 깨진 이미지 0)
- [ ] listProductAssets가 flat + 하위폴더 둘 다 반환(stage 필드 포함)
- [ ] apply-cutout/apply-composite 회수 시 올바른 단계 폴더로 분류
- [ ] 전상품 동작(명화·달항아리·아이스트레이 productId로 동일 구조)

## 6. 영향범위·리스크
- 위험: AssetKind 사용처 전수 미수정 시 타입에러 / 자산 흩어짐 → grep 전수 + tsc로 차단.
- 가역성: 신규 경로는 additive. 기존 자산 미이동(URL 보존). 발행 파이프라인이 읽는 mainImage/extra_images는 절대 URL이라 무영향.
- 롤백: 경로 로직만 되돌리면 됨(데이터 손실 0).

## 7. Code 진입 문구
```
[꽃틔움 가든 / Code / Target Session: 폴더 자동분류 시스템 / Branch: feat/composite-pipeline 누적]
권한: docs/plan/ASSET_FOLDER_TAXONOMY_BUILD.md + PRINCIPLES_LEARNED #57.
작업: automation-storage AssetKind 단계확장(cutout/composite/archive) + 경로 {pid}/{kind}/{variant}-{ts} + listProductAssets 하위폴더 재귀(하위호환) + asset-taxonomy.ts(STAGE_FOLDER/kindForSource) + 생산자 호출부 의미정합(grep 전수). 검증=§5 체크리스트.
규칙: 이모지0·영어주석·tsc·비가역0·기존 자산 URL 보존. 완료 시 커밋·push·SHA 보고.
```
