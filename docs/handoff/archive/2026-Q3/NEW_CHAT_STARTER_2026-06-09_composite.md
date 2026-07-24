# 다음 채팅 인계 — 누끼·합성·대표이미지 작업 이어가기 (2026-06-09 마감)

이 문서 = 새 채팅 시작 시 붙여넣기 진입의 권위본. 정독 순서: 본 문서 → PARALLEL_WORK_TRACKER.md → TASK_BRIDGE §3 → REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md + CUTOUT_CROP_FEATURE_BUILD_PLAN.md.

## 1. 지금까지 (검증 완료)
- **C-1 인앱 SIMPLE 누끼** (feat/white-bg-simple 2ff4a77) — Desktop 코드검증완. /white-bg dry-run→confirm(가역).
- **C-7 합성 파이프라인** (feat/composite-pipeline 65275b9, 베이스=dbbb04d라 C-1 포함) — Desktop 검증완. apply-composite(in-app sharp + Firefly 회수 → extra_images 슬롯, 가역). 라우팅·CHECK제약(product_composite/harmonize 존재)·P2022 가드 정합 확인.
- **extra_images jsonb 마이그레이션 = Desktop 적용완**(기본 []·NOT NULL·additive·가역). C-7 confirm 끝까지 동작.
- **§9 대표이미지 규격 표준** 박제(REPRESENTATIVE_IMAGE_FINISHING_SYSTEM §9, 전상품).
- **합성 레시피** 박제(HANDOFF_myeonghwa_composite_recipe_2026-06-09.md, 톤·그림자·비율·Firefly 프롬프트).
- 명화 대표 = **가죽 라이프스타일 확정**(재변경 없음). 누끼·합성은 추가이미지·전상품 기능.

## 2. 환경 상태
- Firefly 탭 준비됨: Chrome **id 1396049947**(랜딩 페이지 → 생성 워크스페이스 진입·로그인 확인 필요). Adobe Express **1396049445**.
- 스튜디오 production 탭 **1396049659**. 도매매 **1396049864**. 네이버센터 **1396049817**.
- ⚠ Adobe **이미지 처리 MCP 백엔드(bartlebee encode)가 2026-06-09 세션에서 400** — MCP 누끼/편집/미리보기 불가했음. 다음 세션 재시도 or Firefly 웹 UI 직접 구동.

## 3. 다음 작업 (우선순위)
1. **명화 무드 합성 (Firefly 브라우저 반자동, #52)** — Firefly 탭(1396049947)에서 로그인·생성 워크스페이스 확인 → 본품 누끼 레퍼런스 업로드 → 레시피 프롬프트(HANDOFF_myeonghwa_composite_recipe §3) 구동 → 후보 생성·선택 → 다운로드는 대표님. 결과 URL을 `POST /api/products/[id]/apply-composite { compositeUrl }`(recovery 모드)로 회수 → extra_images 슬롯 적용. (대표 아님·추가이미지.)
2. **병합 권고 결정** — feat/composite-pipeline은 C-1+C-7 포함. apply-composite·white-bg는 **순수 additive 라우트(UI 미연결→production blast 0)**라, **feat/composite-pipeline → main 병합으로 C-1+C-7 동시 반영**이 가장 단순(충돌 0). 병합하면 production에서 /white-bg·/apply-composite 라이브 실측 + 명화 합성 적용 가능. (대표 OK 시 Code/터미널 병합.)
3. **병렬 Code 청크** — C-2(어도비 누끼 적용)·C-4(가드→대기열) 병렬 / C-3(finish-image+스키마)→C-5(스튜디오 통합 UI)→C-8(추가이미지 멀티슬롯) 직렬. 진입 문구 = CUTOUT_CROP_FEATURE_BUILD_PLAN.md.

## 4. 유의사항 (하드 룰)
- 비가역 0: 네이버 PUT/발행은 대표 "GO" 전 절대 미실행(#46). 누끼·합성·DB는 전부 가역.
- 전상품 범용(#55): 명화는 검증 사례. 단건 아닌 체계.
- 한글 편집은 **직접 타이핑**(유니코드 이스케이프 금지 — 반복 글자깨짐 원인).
- 실측 우선(#45)·stale 방지(#44): Code 보고는 production/DB 직접 교차검증, 화면은 reload 후 신뢰.
- 이미지 산출 = 앱 파이프라인(Code) or Firefly 브라우저 — MCP 백엔드 다운 시 후자.

## 5. 붙여넣기 — 다음 채팅(Desktop, 명화 합성 + 병합 결정)
```
[꽃틔움 가든 / Desktop 세션 / 이어서: 명화 무드 합성 + 병합 결정]
정독: docs/handoff/NEW_CHAT_STARTER_2026-06-09_composite.md → PARALLEL_WORK_TRACKER → TASK_BRIDGE §3.
1) Firefly 탭(Chrome id 1396049947) 로그인·생성 워크스페이스 확인 → 명화 본품 누끼 레퍼런스로 합성 구동(레시피 HANDOFF_myeonghwa_composite_recipe §3) → 결과 회수 → apply-composite(compositeUrl)로 extra_images 적용.
2) 병합 권고 확인: feat/composite-pipeline(C-1+C-7) → main(additive·blast 0). 대표 OK 시 병합 → production /white-bg·/apply-composite 라이브 실측.
3) 병렬 Code 청크(C-2·C-4·C-3→C-5→C-8) 진입 문구는 CUTOUT_CROP_FEATURE_BUILD_PLAN.md.
규칙: 비가역0·한글 직접입력·실측우선·전상품 범용. 리서치 도구 미사용(앱 작업).
```
