# 인계 — 적재 시스템 v2 (앱 직접업로드 + 데스크톱 정리 + 폴더 바로가기)

작성 2026-06-12 / Desktop 직접 기록 (#49) / 보조 = HANDOFF_assetfolder_continuation_2026-06-12.md / 권위 = docs/plan/PARALLEL_WORK_TRACKER.md
대표 추가 요청 누락분 반영. 전상품 체계. 단건 아님.

---

## 0. 현재 코드 실태 (실측)
- 택소노미 완비: `asset-taxonomy.ts` AssetKind 6종 = source/cutout/composite/thumb/detail/archive. STAGE_FOLDER Adobe 미러(00_source~99_archive). kindForSource/safeVariant 존재. → **source 스테이지 이미 반영됨.**
- 자동 적재 LIVE: apply-cutout/composite/detail, capture-source-detail 가 stage 자동분류. listProductAssets flat+하위폴더 재귀.
- 라우트 보유: assets(GET), save-assets, apply-*, capture/adopt-source-detail.
- **누락(신규 구축 대상)**: ① 단계 지정 직접 업로드 전용 라우트/UI ② 데스크톱 다운로드 정리 규약 ③ 폴더 바로가기.

---

## 1. 두 레인 반자동 적재 아키텍처

### 레인 1 — 앱 ↔ Supabase (단일 진실원천)
- AUTO(유지): 생산 라우트가 stage 자동분류(현행).
- SEMI-AUTO(신규): 자산 브라우저에서 운영자가 파일 드롭/선택 → stage 선택(또는 kindForSource 자동추천) → 업로드.
  - 라우트: `POST /api/products/[id]/assets/upload { stage, file }` → uploadAutomationAsset(kind=stage). 가역.
- 자산 브라우저(C-5 내장): 상품별·stage별 그리드 + 액션(대표지정/추가이미지/아카이브/삭제/다운로드/업로드). 운영자 정식 표면.

### 레인 2 — 앱 → 데스크톱 (다운로드 정리)
웹앱은 Mac FS 직접 기록 불가 → 규약 + 번들로 해결.
- **다운로드 네이밍 규약**: `{YYYY-MM-DD}__{상품명}__{stage}__{variant}.ext` (구분자 `__` = 파서 안전, 자기정렬).
- **상품 번들 ZIP**: 상품별 "ZIP 받기" → 서버가 stage 구조로 압축 `{상품명}_{YYYYMMDD}.zip` (내부 cutout/ composite/ thumb/ detail/). 풀면 즉시 정리.
  - 라우트: `GET /api/products/[id]/assets/bundle` (stage 폴더 zip 스트림).
- **로컬 관리 폴더 규약**: `~/Desktop/꽃틔움_자산/{YYYY-MM}/{상품명}/{stage}/`.
- **자동 파일링 헬퍼(선택, 1회 설정)**: macOS Folder Action(Automator) — ~/Downloads 감시 → `__` 파싱 → 관리 폴더로 이동. set-and-forget. (대안: Python watcher 스크립트 scripts/desktop-filer.py)

### 레인 3 — 폴더 바로가기 (접근성)
- **Supabase 웹 딥링크**(즉시 작동, 0설정): 앱 카드 "Supabase 폴더 열기" → `https://supabase.com/dashboard/project/doxfizicftgtqktmtftf/storage/buckets/product-assets?path={pid}/{stage}`.
- **로컬 경로**: "경로 복사" 버튼(+ 상품별 관리 경로 저장). 1클릭 Finder 오픈은 (선택) Automator 앱 "꽃틔움 폴더 열기"(상품명→Finder) 또는 custom URL scheme `kkotium://open?product=`.
- 공개 URL 패턴: `https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/{경로}`.

---

## 2. 우선순위 (대표 지시 순)
| P | 항목 | 레인 | 세션 |
|---|---|---|---|
| P1 | 단계 지정 직접 업로드 + 자산 브라우저 | 1 | C-5(세션2) |
| P2 | 다운로드 네이밍 규약 + 상품 번들 ZIP | 2 | C-5(세션2) |
| P3 | 폴더 바로가기(Supabase 딥링크 + 경로복사) | 3 | C-5(세션2) |
| P4 | 데스크톱 자동 파일링 헬퍼(Automator/watcher) | 2 | 세션4 부가 |
| P5 | 하우스키핑(archive 6 + stray 2 + orphan 탐지) | - | 세션4 |

---

## 3. Claude Code 핸드오프 (갱신)

### 세션 2 — C-5-studio (확장: 자산 브라우저 + 직접업로드 + 다운로드 정리 + 바로가기)
```
Target Session: C-5-studio
Branch: main
작업: 온실아틀리에 "이미지 스튜디오" + 자산 브라우저. v8 합성 + 적재 v2. 전상품 범용.
[합성] 무드보드→누끼 드롭(Firefly 참조, 슬롯 자동클리어)→Nano Banana 2 하모나이즈→형태가드→편집루프(?view=edit)→4~6컷 세트. 폴백=결정론 sharp(warm tint 8~10%/shadow alpha .30~.40 blur w24 offset w18·w12/contact ellipse alpha95 blur w6).
[자산 브라우저] 상품별·stage별(source/cutout/composite/thumb/detail/archive) 그리드 + 액션(대표지정/추가이미지/아카이브/삭제/다운로드/업로드).
[직접업로드] POST /api/products/[id]/assets/upload { stage, file } → uploadAutomationAsset(kind=stage). 자동추천=kindForSource. 가역.
[다운로드 정리] 단일 다운로드 파일명 규약 {YYYY-MM-DD}__{상품명}__{stage}__{variant}.ext. 상품 번들 GET /api/products/[id]/assets/bundle (stage 폴더 zip).
[바로가기] 카드에 Supabase 딥링크(path={pid}/{stage}) + 로컬 경로 복사.
[라우팅 고정] 제품 등장 컷=compose 경로만. 개입(무드픽/누끼드롭/최종픽/편집승인)=Operator Action Queue 카드.
규칙: 이모지0·주석영어·tsc·비가역0·기존 URL 보존. .commit-msg.tmp 체인.
```

### 세션 4 — asset-hygiene (확장: 데스크톱 헬퍼 포함)
```
Target Session: asset-hygiene
Branch: main
작업: 적재 정비 + 데스크톱 정리 헬퍼. storage 클라이언트(raw SQL 금지). 가역·dry-run 선행.
1) 자동 아카이브: extra_images 스왑 시 탈락 composite→{pid}/archive/ 자동이동 + DB 참조 무결성.
2) 명화 composite 폐기 6종→archive(참조 3종만 유지). stray lifestyle/ 2개→참조점검 후 archive.
3) 고아 탐지 유틸: storage vs DB(mainImage/extra_images) 대조→미참조 플래그.
4) 데스크톱 자동 파일링: scripts/desktop-filer.py (또는 Automator 가이드 docs/) — ~/Downloads `__` 파싱→~/Desktop/꽃틔움_자산/{YYYY-MM}/{상품명}/{stage}/ 이동. 1회 설정 문서화.
규칙: 이모지0·주석영어·비가역0·URL 보존. .commit-msg.tmp 체인.
```

### 세션 1(완료)·세션 3(origin-integrity) = 기존 핸드오프 유지.

---

## 4. MD 영구화 (등록 시 자동 적용)
- ADAPTIVE_COMPOSITE_ENGINE.md(v8, 완료) + PRODUCT_REGISTRATION_WORKFLOW.md(완료)에 **적재 v2** 교차참조 추가 → Code 세션 1 후속 또는 세션 2에서 1줄 링크.
- 신규 상품 등록 시 자동 적용 규칙: 생성물=stage 자동분류, 다운로드=규약 네이밍, 상품 폴더=관리폴더 규약.

---

## 5. 병행 트래커 (누락 0, 갱신)
| 트랙 | 상태 |
|---|---|
| C-3 finish-image | DONE·검증 |
| docs-standard(v8+등록) | DONE 015cc3f |
| route 2.ts 중복 | 삭제 대기(대표 GO) |
| FT 자동분류(source 포함 6단계) | LIVE·검증 |
| 적재 v2 직접업로드+브라우저 | P1·세션2 |
| 다운로드 정리+번들 ZIP | P2·세션2 |
| 폴더 바로가기 | P3·세션2 |
| 데스크톱 자동 파일링 헬퍼 | P4·세션4 |
| 하우스키핑(archive/stray/orphan) | P5·세션4 |
| origin-integrity | 세션3 |
| Operator Action Queue | 개입 5점(BLUEPRINT) |
| 명화 4컷 하모나이즈 | 누끼 드롭 후 즉시 |
| 명화 발행 | 이미지셋 교체 후 GO(비가역) |
| 달항아리·아이스트레이 | v8+적재v2 적용 |

---

## 6. 다음 채팅 첫 액션
1. (선택) route 2.ts 삭제 GO.
2. 명화 첫 하모나이즈: cutout_C Firefly 참조 드롭(운영자)→Claude 운전.
3. Code paste 병렬: 세션2(스튜디오+적재v2), 세션3, 세션4.
4. 산출 후 extra_images 스왑(가역)→명화 발행 GO 게이트.
