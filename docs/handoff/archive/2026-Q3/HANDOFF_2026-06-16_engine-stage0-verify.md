# HANDOFF — 엔진 Stage 0 빌드완료 -> Desktop 독립검증 -> Stage 1

작성: 2026-06-16 세션8 (Desktop) · Target Session: 다음 Desktop(검증) -> 이후 Code(Stage 1)
Branch: feat/mood-camera-system (HEAD 349b9db, preview only · main/production 불변)
선행 핸드오프: docs/handoff/HANDOFF_2026-06-16_image-seo-engine.md (Stage 0 빌드 스펙·보드 구조 원본)

---

## 1. 현재 진실 (검증된 사실만)

- 엔진 Stage 0 빌드+커밋 완료 = Code `349b9db` (push `c1e2bd3..349b9db`, feat/mood-camera-system).
- 게이트 전부 통과(Code 보고): tsc 0 · build 성공 · thumbnail-policy.test 6/6 · 이모지0/한글리터럴0/prisma싱글톤/Sharp만/네이버PUT무접촉/additive/sentinel clean.
- Supabase 6 엔진 테이블 생성(Code 보고): category_dna · slot_plan · prompt_version · **slot_generation** · rating · performance_metric.
- 신규 코드: src/lib/naver/datalab-client.ts(8 엔드포인트·연령6구간·top-500 별도경로 TODO) · src/lib/naver/thumbnail-policy.ts(발행전 하드게이트 + assertThumbnailPolicy + .test 6/6).
- 트래커/원칙 갱신 완료(Code, Python full-file): 관제탑 LIVE BOARD 삽입 · IMG-컷34/IMG-앱 정정 · PRINCIPLES #87~#89 · CLAUDE.md 인덱스 · PROGRESS/ROADMAP/TASK_BRIDGE/SESSION_LOG.
- **이 모든 것은 Code 보고 기준 — Desktop 독립검증 전(#45/#88). ENG-0 상태 = 검증대기.**

## 2. Code 판단 2건 (운영자 승인·정합 확인)

1. `Generation` 모델명 충돌 -> **`SlotGeneration`(table slot_generation)** 분리. 6축이 이미 prod에 `generation` 테이블(entryId/productName/naverCtr) 보유 -> 완전 additive. **검증 시 `generation` 아닌 `slot_generation` 확인.**
2. 단일 브랜치 feat/mood-camera-system 커밋(신규 feat/image-seo-engine 대신). 엔진이 미머지 6축 위에 빌드 + 관련 docs untracked로 이미 존재. preview만 생성 · production SHA 불변.

## 3. L0 라이브 실증 (Desktop 세션8, PlayMCP NaverSearch)

- find_category + datalab_shopping_category/by_age/by_gender + search_shop 전부 라이브 정상 -> datalab-client 빌드 리스크 사전 제거.
- 실측: 여름피크 시즌성(6~7월 정점·11월 저점·4월 회복) / 연령 30~50 핵심·40대 선두·50대 상승 / 가격 중상 28~40k(명화 밴드) / 소재 가죽·무광메탈=프리미엄 / 필수슬롯 scent_note·use_install·trust.
- 산출물: docs/research/CATEGORY_DNA_SEED_50014980_2026-06-16.md (첫 CategoryDna 시드 · Stage 1 로드용).
- 경쟁사 썸네일 픽셀 미fetch·미분석·재게시 0(법적 가드).

## 4. 보드 델타 (다음 트래커 터치 시 반영 — Code 또는 Desktop 클린턴)

- ENG-0: 상태 -> **검증대기** (Code 빌드완 · Desktop 독립검증 전).
- 신규 행 `ENG-L0-PROOF` ✅ 완료 — DataLab 라이브 실증, 빌드 리스크 제거.
- 신규 행 `DNA-SEED-50014980` ✅ 완료 — 첫 DNA 시드 박제.
- 엔진 권위문서 §2 텍스트 동기화 TODO: `model Generation` -> `model SlotGeneration` + Rating/PerformanceMetric `generationId` -> `slotGenerationId` (코드는 이미 정합 · 문서 드리프트만 · 비차단).

## 5. 다음 액션 (순서)

1. **[Desktop, 즉시 · 커넥터 클린: Supabase+Vercel만 · Filesystem 미혼용]** ENG-0 독립검증(#45/#88):
   - Supabase execute_sql: 6 테이블 존재 확인(category_dna, slot_plan, prompt_version, **slot_generation**[NOT generation], rating, performance_metric).
   - Vercel list_deployments: feat/mood-camera-system preview SHA 349b9db target=null READY · production SHA 불변(c3962b6).
   - PASS -> ENG-0 검증대기->완료 · Stage 1 진입.
2. **[Code, Stage 1]** DNA 시드(위 경로) -> CategoryDna 로드 + 슬롯 결정테이블 + 전략 조립기 + Firefly/NB 연동 + 개입 #1~3 UI + thumbnail-policy 게이트를 발행경로 배선.
3. **[결정 3건 — 대표]** (a) 6축 main 머지(preview UI 시각확인 후 권장) (b) 경쟁 캡처방식(B 하이브리드: DataLab+search_shop API 골격 + 운영자 1클릭 브라우저 캡처·분석전용·재게시0) (c) 명화 발행(발행전 2건 확인: 원산지 live=중국산0200037 vs payload 국산 / 옵션 live3 vs payload4 — 비가역 PUT은 명시 GO에만 #46).
4. **[Desktop, 브라우저 턴 — Filesystem 분리]** IMG-INGEST cut-1~4 -> POST ingest-firefly ×4(stage=composite, scent_note 슬롯). 이후 /assets 정합(#80/#81).
5. 명화 완료 후 달항아리·아이스트레이로 파이프라인 확장(#55).

## 6. 운영 주의

- #26: 한 턴은 단일 커넥터 클래스 유지. 브라우저/데이터 커넥터와 Filesystem write 혼용 금지(직전 PlayMCP->Filesystem 행 발생). hung 호출 재시도 0.
- Supabase RLS advisory(44테이블 RLS off, 신규6 포함) = 사전존재 설계(서버측 Prisma 단일테넌트), 본 마이그레이션 무관 · 자동적용 안 함 · 정책과 함께 결정 위임.
