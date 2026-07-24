# HANDOFF 2026-06-17 — 프로덕션 검증 + REGISTRY↔STORAGE 드리프트 발견

- **Lane**: Claude Desktop (verify + docs)
- **선행 세션**: 'Production 검증 및 카테고리 정렬 확인' (에러로 중단) → 본 세션이 중단지점 재개
- **검증 방식**: 프로덕션 직접 검증(#45) — Code/문서 보고 불신, Supabase 그라운드 truth 직접 조회

---

## 1. 검증 완료 (프로덕션 그라운드 truth, 전건 PASS)

| 항목 | 검증값 | 판정 |
|---|---|---|
| 명화 naverCategoryCode | 50014980 (차량용방향제) — 구 50003356에서 정정 | PASS |
| 명화 category 라벨 | "차량용방향제" (category-sync 동기화 반영) | PASS |
| category_dna 50014980 | status=active · version=1 · confidence=0.7 · slot_sequence=9 · mandatory=3 | PASS |
| 현행 향 composite (IMG-INGEST) | fresh-1781657005726.jpg(April) · dark_luxury-1781657008705.jpg(BlackCherry) / 06-17 00:43 / 1456×1807 portrait / web-JPEG(#91) | PASS (DB tier) |
| 명화 salePrice / mainImage | 29000 / thumbnail/thumb-cropmain 정상 | PASS |

- IMG-INGEST 2건은 asset_registry(mood=fresh / dark_luxury 등록) + storage 물리파일 양쪽 확인. 직전 세션의 publicUrl 200 + AssetBrowser DOM newest-first(브라우저 tier)는 이미 PASS 처리됨 → 본 세션은 DB tier 독립 재확인.
- 명화 composite의 `slot` 컬럼은 **둘 다 null** = Phase 3(scent_note 슬롯 배정) 전제 미충족 상태. 이는 버그가 아니라 예정된 미작업.

---

## 2. 신규 발견 — REGISTRY ↔ STORAGE 드리프트 (전상품 공통, #62 승격 대상)

명화 composite 스테이지 기준:

| 소스 | 건수 |
|---|---|
| storage 물리 파일 | **20** |
| asset_registry 등록 | **12** |
| 불일치 | **8** |

**구성 분해 (명화 composite 20 storage):**
- **9건 (06-11 `lifestyle-*` JPEG, 69~108KB)**: storage에만 존재. 레지스트리 시스템 도입(06-13) 이전 생성 → **미등록 고아(orphan-in-storage)**.
- **9건 (06-13 `lifestyle/hero_lifestyle/fresh_lifestyle` PNG, 1.7~3MB, 1408×768 landscape)**: registry 등록됨. 구 6축 이전 구버전 → 폐기 대상.
- **2건 (06-17 fresh/dark_luxury JPEG, portrait)**: 현행 향 composite. 유지 대상.
- registry에는 `botanical-1781410335495.png`(06-14 manual_upload, 614×768)가 있으나 composite 폴더 물리파일 미관측 → **레지스트리 고아(orphan-in-registry)** 의심.

**기타 스토리지 사실:**
- 명화 stage 분포: archive=10(과거 정리 이력) · composite=20 · cutout=3 · detail=3 · **plate=3** · thumbnail=4.
- `plate`(3)는 6단계 택소노미(source/cutout/composite/thumb/detail/archive) 외 스테이지. 택소노미 문서/상수 갱신 필요.

**근본 원인 / 시스템적 의미:**
- 레지스트리 도입 이전 등록 상품 + 수동 업로드 상품은 **모두 동일 드리프트** 보유 → 명화 단건 문제 아님.
- 따라서 P3 COMPOSITE-CLEANUP을 단건 정리가 아니라 **"레지스트리↔스토리지 정합성 패스(전상품 범용 가드/잡)"로 승격**.
  - 기능: (a) storage-only 고아 탐지 → 등록 or 아카이브 제안, (b) registry-only 고아 탐지 → 경고, (c) plate 등 미정의 스테이지 탐지 → 택소노미 반영.
- Phase 3가 `/api/products/{id}/assets`를 filename-dependent로 읽는 한, 펀널보드는 20건(고아 9 + 구버전 9 + 현행 2)을 그대로 노출 → 슬롯픽 UX 오염. **Phase 3 착수 전 또는 병행으로 정합성/태깅 정리 권장**.

---

## 3. 대표 결정 대기 (개입 대기열 — #56 자연 노출)

| ID | 결정 사항 | 비고 |
|---|---|---|
| PUBLISH-명화 (P1, 비가역 #46) | Naver FULL-REPLACE PUT 전 **2건 확인 필수** | (1) 원산지: live=중국산(0200037) vs payload=국산(00) → 허위 국산 = 법적 리스크 / (2) 옵션: live 3 vs payload 4(4번째 코튼어라운드 품절, 상세 포함 결정됨). readiness S/94, statusType SALE, payload-ready. **명시적 GO 필요** |
| CAPTURE-METHOD (P2, 3h) | 경쟁사 캡처 방식 — B 하이브리드 권장 | 대표 채택 대기 |
| NEXT-TRACK | 다음 트랙 선택 | (a) Phase 3 슬롯조립(Code) vs (b) Lemon 재생성(Desktop/Firefly) vs (c) 정합성패스 우선 |

---

## 4. 미진행 / 대기 (의존성 순)

1. **Phase 3 슬롯조립** (PENDING-Code, branch feat/funnel-slot-fill, P3): April/BlackCherry composite를 scent_note 펀널 슬롯에 조립. 전제: `/api/products/{id}/assets`가 asset_registry meta(variant·source_tag·funnelSlot) JOIN. = composite funnelSlot 태그 + SlotFunnelBoard fill-state/assignment UI.
2. **REGISTRY↔STORAGE 정합성 패스** (신규, PENDING-Code, 본 세션 발견 — P3 COMPOSITE-CLEANUP 승격본): 전상품 범용 고아/미정의스테이지 탐지+정리 가드.
3. **Lemon 재생성** (PENDING-Desktop/Firefly): cut-1 구 06-13 pre-6axis 버전만 존재 → 6축 재생성. **Cotton 품절후보 결정**(cut-2). 후 scent_note 인제스트.
4. **UNSEEDED-BACKLOG-BADGE Stage2** (PENDING-Code, branch feat/unseeded-backlog-badge, P3): 미시드 카테고리 카운트 저긴급 상시 배지(비마스킹, #55·#56).
5. **firefly_auto settingsVerified subcheck** (PENDING-Code, rev19): 6축 firefly_auto 카드 가드.
6. **Stage 2 학습루프** (PENDING-Code): 엔진 학습 루프(Stage 1 이후).
7. **달항아리 도어벨 + 아이스트레이 이미지 파이프라인 확장** (PENDING, 명화 이후).
8. **CUT34-EVAL 슬롯 재매핑 확인** (PENDING-Desktop).
9. **운영자 §6**: 중복 `route 2.ts` 삭제 GO, 공급사 셀러ID(이현마켓/gseller2022), 크롤러 스코프(P16/P21/P22).

---

## 5. LIVE BOARD 드리프트 (Code가 PARALLEL_WORK_TRACKER Python overwrite로 정정)

- ENG-1 행: "빌드완료·검증대기" → **"검증완료 PASS(3탭 브라우저)"** 로 갱신.
- "지금 큐": "ENG-1 Desktop 검증"(stale) → **"Phase3 슬롯조립 / Lemon재생성 / 정합성패스 중 택1"**.
- 신규 항목 등록: **REGISTRY↔STORAGE 정합성 패스(전상품)** — P3, 발견 2026-06-17.
- 택소노미 상수에 `plate` 스테이지 반영 여부 검토 항목 추가.

---

## 6. 원칙 추가 (PRINCIPLES_LEARNED 반영 요청)

- **#93 (신규)**: 자산 검증은 storage 물리 + asset_registry DB **양쪽 교차**로 한다. 한쪽만 보면 고아(storage-only/registry-only)를 놓친다. 단건 발견 시 전상품 정합성 패스로 승격(#62 적용).
- **#94 (신규)**: 스테이지 택소노미는 storage 실측(`string_to_array(name,'/')[2]`)으로 주기 점검. 코드 상수에 없는 스테이지(예: plate)가 물리적으로 존재할 수 있다.

---

## 7. 다음 세션 즉시 1액션

- **Code 택1**: Phase 3 착수 OR 정합성 패스 우선 (대표 NEXT-TRACK 결정 따름).
- **Desktop 택1**: Lemon 6축 재생성(Firefly) OR PUBLISH-명화 원산지/옵션 2건 대표 확인 진행.
- 검증 절차: 작업 후 본 핸드오프 §1 방식대로 Supabase DB tier + (필요시) 브라우저 tier 재확인.
