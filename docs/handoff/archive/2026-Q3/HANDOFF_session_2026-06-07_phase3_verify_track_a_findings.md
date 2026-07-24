# HANDOFF — 세션 인계 (2026-06-07, Phase3 검증 완료 + Track A 명화 화보 발견)

> **세션 성격**: Desktop (MCP·검증·DB·이미지분석·docs write)
> **전제**: Code가 Track B 작업1~4 push (1f0b11d, baseline 268e7a2). Desktop 검증 트리거.
> **권위 문서**: KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md + HANDOFF_session_2026-06-06_3_simple_mode_correction.md

---

## 0. 이번 세션 한 일 (Desktop, COMPLETED)

### A. Track B Phase2 + Phase3 마이그레이션 적용 + 검증 (비가역 0, 가산 DDL)
- Supabase apply_migration 2건 적용:
  - `phase2_product_swap_loop`: asset_jobs concept_combo_id + status CHECK 12종 + asset_references 테이블/FK.
  - `phase3_adaptive_mode_v2`: Product 모드컬럼 4종(brand_line/quality_score/recommended_mode/quality_reasons) + brand_line/recommended_mode CHECK + asset_jobs job_type CHECK 21종.
- Phase2는 대표 "보류 가능" 했으나 순수 가산·멱등이고 배포된 Phase2 코드와 스키마 정합(degrade 해소) 위해 함께 적용(최선안).
- 스키마 검증: Product 모드컬럼 4/4 · concept_combo_id 1 · asset_references 1 · job_type CHECK 21종 확인.
- Production 3-tier 검증(#45):
  - matrix API HTTP 200 · migrationPending=false (degrade 해소).
  - assess-quality(명화) HTTP 200 → score 62 · recommendedMode ENHANCE · needsVlm true. 6지표 정상.
  - DB 영속화: Product.quality_score=62 · recommended_mode=ENHANCE 확인.

### ★ Code 수정 필요 — 결함 2건 (#46 정직)
1. **마이그레이션 파일 테이블명 버그**: `docs/handoff/MIGRATION_phase3_adaptive_mode_2026-06-07.sql`가 `"products"`(소문자) 참조 → 실제 테이블은 `"Product"`(PascalCase). 첫 apply가 `relation "products" does not exist`로 롤백됨. Desktop이 `"Product"`로 교정해 재적용 성공. **파일 자체를 `"Product"`로 수정 + 향후 마이그레이션 테이블명 규약 확인**(asset_jobs/published_assets=snake / Product=PascalCase 혼재).
2. **quality_reasons 미영속**: assess-quality 응답엔 reasons 6건이나 DB `quality_reasons`=0건. 라우트가 reasons 배열을 Product에 저장하도록 보강(Json 캐스팅 확인).

### B. Track A — 명화 상세페이지(화보) 이미지 실측 분석
대표 업로드 `this_is_air_freshener_detail.jpg` 실측:
- **해상도 437x8000** (원본 ~1000px 화보의 다운스케일). → 단품 1:1 크롭 영역 폭 ~150~250px → **1000px 규격화 시 5배 업스케일=블러**. 정석 간편모드 크롭 여전히 풀해상 화보 필요(대표 원본 제공 대기).
- **정보고시(하단) 속성 근거 확보** — ★ DB와 충돌 2건:

| 항목 | 정보고시(실제) | DB 현재 | 판정 |
|---|---|---|---|
| 제조국 | **대한민국** | 중국 (originCode 0200037) | ★ 충돌 — 오등록 위험 |
| 안전확인 신고번호 | HB21-12-2572(코튼)·HB19-12-1462(블랙체리) 등 생활화학제품 | 미표시 | ★ SUSPENSION 유력 원인 |
| 향 종류 | 4종(코튼어라운드·블랙체리·에이프릴프레쉬·레몬유칼립투스) | 3종(옵션) | 누락 1종(코튼어라운드) |
| 제형 | 액체형·보충액 | null | 보강 |
| 용량 | 15ml·30ml | null | 보강 |
| 판매원 | (주)다믐 | - | 확인 |

---

## 1. ★ 명화 SUSPENSION→SALE — 차단 사유 재정의 (중대)

- 자동차용 방향제 = **안전확인대상 생활화학제품** → 네이버 상품정보제공고시에 **안전기준 신고번호 표시 필수**. 미표시가 판매중지(SUSPENSION) 유력 원인.
- **제조국 충돌 미해소**(DB 중국 vs 정보고시 대한민국) 상태로 PUT하면 잘못된 원산지 발행 = 더 큰 사고.
- **결론**: 제조국 진실 확정 + 안전확인 신고번호 표시 보강 전까지 SUSPENSION 해제(비가역 PUT) **보류가 최선안**. 무리한 해제 금지(#46).
- 해소 순서: (1) 대표 제조국 확정(정보고시=대한민국 유력) → originCode 교정(가역) (2) 정보고시 ETC에 안전확인 신고번호 4종 추가(Code) (3) 재질 무관 속성(향/제형/용량) 보강 (4) update dryRun(statusType SALE + 회귀0) (5) 대표 승인 → 실 PUT(비가역) → 3중 검증.

---

## 2. 명화 텍스트 SEO 초안 (가역 · 대표 승인 시 DB 반영)

- 상품명(현행 39자): 중복 정제안 = `명화 송풍구 차량용방향제 자동차 디퓨저 에어컨냄새제거 신차선물 차량용품` (차량용 중복 제거, 롱테일 투입). 검색량은 네이버 키워드도구 라이브 검증 후 확정.
- 태그 10: 차량용방향제·송풍구방향제·차량디퓨저·자동차방향제·에어컨냄새제거·신차선물·운전자선물·차량인테리어·차량용품·명화방향제 (태그사전 등록어 통과 가드 필요).
- 속성(정보고시 근거): 향 4종·용도 자동차용(실내용)·제형 액체형/보충액·용량 15/30ml·제조국 [대표확정]·판매원 (주)다믐. 재질/색상은 디퓨저 특성상 향/용량 우선, 본체 소재는 대표 확인.

---

## 3. Code 다음 작업 (Track B 작업5~7 + 결함 + 정리)

1. **마이그레이션 파일 버그 수정** (products→Product) + quality_reasons 영속 보강 (위 0-A 결함 2건).
2. **간편모드 크롭 도구**(작업5): 상세페이지 이미지 입력 → 영역 선택(사람 박스 또는 smartcrop-sharp attention/entropy) → 1:1 크롭 → 1000px Sharp 규격화 → OCR 정책가드. 누끼/합성 없음. 입력 소스가 1000px 미만이면 경고(명화 화보 437px 사례).
3. **BG_SWAP 재사용**(작업6): 기존 누끼+AI배경 합성 파이프라인을 NEW 모드 bg_swap job으로 연결.
4. **SEO 텍스트 자동 일괄**(작업7): 카테고리·속성·상품명·태그 + brand_line별 템플릿. 명화 초안(위 §2)을 첫 케이스로.
5. **생활화학제품 안전기준 표시**: 정보고시 ETC 빌더에 안전확인 신고번호(HB...) 필드 추가 — 방향제/생활화학제품 카테고리 발행 차단 해소 핵심.
6. **정리(#34, 별도 commit)**: `* 2.*` macOS 중복본 + 미커밋 권위 문서 25건 → 보존(#49) 또는 제거 결정 반영. 기능 commit과 분리.
7. **MD 분할(#31, 별도 commit)**: SESSION_LOG.md(1528줄)·TASK_BRIDGE.md(1074줄) 임계 초과 → docs/plan/archive/로 분할.

---

## 4. 대표 결정 대기

- **★ 제조국 진실 확정** (정보고시 대한민국 vs DB 중국) — SUSPENSION 해제 선결.
- NAVER_AUTOSUSPEND_ENABLED: 현재 off 유지 권고(1상품·세팅 중, 자동중지 위험). 변경 시 Vercel env.
- Phase2 마이그레이션: 적용 완료(보류 해제).
- 명화 풀해상 화보(1000px+) 제공 시 간편모드 크롭 즉시 시연 가능.

---

## 5. 원칙 재확인

- 간편모드 = 상세페이지 부분 크롭(누끼 아님). 입력 1000px+ 필요.
- 비가역 0(#46): 네이버 PUT 대표 명시 승인 없이 0. SUSPENSION 해제는 제조국+안전기준 해소 후.
- 환경분담(#41): Desktop=MCP·검증·DB·이미지분석·핸드오프 write / Code=코드·git·빌드·큰MD.
- 마이그레이션 = 가산 DDL·멱등. 적용 전 테이블명/CHECK 베이스라인 실측(이번 products/Product 버그 교훈).
