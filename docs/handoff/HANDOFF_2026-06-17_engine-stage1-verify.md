# HANDOFF 2026-06-17 — 엔진 Stage 1 독립검증 + CAT-CODE-명화 (세션8 Desktop 종료)

- 작성: Desktop 독립검증(#45/#88) — Code 보고 비신뢰·production 직접 확인
- 다음 세션: Desktop 첫(브라우저 실측 + CAT-CODE 확인) -> Code 후속(CAT-CODE 해소)
- prod SHA: ba34fae (READY·롤백후보)
- 선행 문서: docs/handoff/HANDOFF_2026-06-16_engine-stage1-build.md(빌드 스펙) / TASK_BRIDGE §3(94) ENG-1 hand-off / 권위 docs/design/IMAGE_SEO_STRATEGY_ENGINE.md

---

## §0. 한 줄 요약
ENG-1(엔진 Stage 1) **데이터+배포+API 독립검증 PASS**. 브라우저 시각/조작 렌더 1건만 미검증(다음 채팅 첫 액션). 명화는 카테고리 불일치로 엔진 **fallback 4슬롯(scent_note 부재)** = 향 이미지 워크플로 차단 -> **CAT-CODE-명화** 해소가 명화 진행의 핵심 선결.

---

## §1. 독립검증 결과

| 항목 | 방법 | 결과 |
|---|---|---|
| #62 명명정렬(3a) | Supabase 컬럼 | PASS — rating·performance_metric 둘 다 generation_id 제거·slot_generation_id 정렬 |
| DNA 시드(3b) | Supabase row | PASS — 50014980 live(v1·conf 0.7·active·9슬롯·필수3 scent_note·use_install·trust) |
| 6축+엔진 머지 | Vercel meta | PASS — 349b9db가 main/production(머지 확정) |
| 배포 | Vercel | PASS — 최종 prod ba34fae READY |
| 엔진 API 런타임 | web_fetch | PASS — /api/engine/strategy?productId=cmpnooli40001f0gveaxr8iim 200·전략 정상 조립 |
| /studio 서빙 | web_fetch | PASS — 200·셸 정상·회귀0 |
| 3컴포넌트 시각/조작 렌더 | 브라우저 | 미검증(client-rendered) -> 다음 채팅 첫 액션 |

데이터·배포·API 계층 검증 완료. 남은 검증 = 브라우저 시각/인터랙션 1건.

---

## §2. 검증 중 발견 (전부 전상품 시스템 #62)

### A. CAT-CODE-명화 — 표시 문제가 아니라 명화 이미지 워크플로 차단 (상향)
- 명화 naverCategoryCode=50003356, 시드 DNA=50014980 -> 엔진 dnaSource:"none" fallback(draft·conf 0.3·필수슬롯 0·demographics/seasonality empty).
- Code 보고 "9슬롯" 부정확(#45 적발): production 실측 명화 = 4슬롯만(hero·solution_usp·gift·cta, 전부 required:true). 누락 5 = problem·scent_note·use_install·size_duration·trust.
- 원인: fallback DNA 필수슬롯 0 -> 결정테이블이 코어 4슬롯만 방출. **적응형 퍼널의 의도된 동작**(시드 없는 카테고리=최소 / 시드 카테고리=풍부)이라 버그 아님. 보고 표현만 명화에 대해 틀림.
- 결정적 함의: cut-1~4가 들어갈 scent_note 슬롯이 명화 엔진 plan에 부재 -> 카테고리 정렬 전까지 명화 향 슬롯 작업 차단.

### B. 근본원인 가설 + 권고 (단건 수습 금지)
- 명화 = 차량용 송풍구 디퓨저 -> 올바른 카테고리는 거의 확실히 차량용방향제(50014980, 이미 시드). 50003356은 오분류 의심.
- 정렬 시 이중 이득: (1) 풍부한 DNA + scent_note 슬롯 확보 (2) 정확 카테고리 = 네이버 SEO 랭킹 개선.
- 권고: 다음 채팅에서 로컬 NAVER_CATEGORIES_FULL(또는 카테고리 파일)로 50003356 vs 50014980 정체 확인 -> 명화 재분류 50014980(우선) 또는 50003356 DNA 시드.
- 시스템 일반화: 엔진 가치 = DNA 커버리지 비례. "신규 상품 카테고리 DNA 미시드 시 fallback" 상태를 개입대기열에 노출하는 dna_coverage 개입을 Stage 2 후보로 박제 권고.

### C. gate.status drift (발행 트랙·minor)
- 엔진 gate 응답이 status:"ACTIVE"·naverProductId:13564133057 반환. 메모리상 명화는 네이버 SUSPENSION -> app statusType 필드 vs 네이버 라이브 statusType 불일치 가능. 발행 트랙에서 실측 재확인.

### D. 프롬프트 토큰 누수 (Stage 2 튜닝·minor)
- 조립 프롬프트 도입부에 옵션/속성 토큰이 다소 거칠게 결합("...선물 본품리필 가벼운 명화 송풍구 방향제..."). 발행 차단 아님. Stage 2 프롬프트 정제 후보.

---

## §3. 다음 채팅 우선순위 + 의존성

| 순위 | 작업 | 레인 | 의존성 |
|---|---|---|---|
| 1 | ENG-1 브라우저 실측(/studio 3탭·9슬롯 보드·개입카드) | Desktop | Stage 2 착수 게이트 |
| 2 | CAT-CODE-명화 해소(확인 -> 재분류/시드) | Desktop 확인 -> Code | scent_note 차단 해제 |
| 3 | 명화 발행 사전확인(원산지·옵션·gate.status·SUSPENSION 원인) -> 비가역 GO #46 | Desktop | 독립 병행 |
| 4 | IMG-INGEST cut-1~4 -> scent_note 슬롯 | Desktop(브라우저) | 2 선행 |
| 5 | Stage 2 학습루프(tuple 로깅·CTR/CVR 백링크·promote) | Code | 1 통과 후 |
| 6 | 달항아리·아이스트레이 확장(#55) | 양 레인 | 명화 후 |

---

## §4. 핵심 인계 메시지 (paste-ready)

### 블록 1 — 다음 Desktop (첫 액션)
```
[Target: Claude Desktop / 검증+확인]
ENG-1 데이터+배포+API 독립검증 PASS(prod ba34fae). 남은 검증 = 브라우저 시각/조작.
1) Control Chrome로 production /studio 실측(보호 아님): 분석 DNA카드 / 이미지 9슬롯 보드 칩·진행률 조작 / 발행 정책게이트 / 개입대기열 dna_confirm·variant_select. 실무 흐름 깨짐0 확인 후 Stage 2 착수 가능.
2) CAT-CODE-명화: 로컬 NAVER_CATEGORIES_FULL(또는 카테고리 파일)로 50003356 vs 50014980 정체 확인. 명화=차량용 송풍구 디퓨저 -> 50014980(차량용방향제) 정렬이 정답인지 판정. 결과를 Code 블록으로 인계.
주의: 명화 4슬롯 fallback은 정상 동작(시드 없는 카테고리). scent_note 슬롯은 카테고리 정렬 후 등장. 턴 분리(#26).
```

### 블록 2 — 다음 Code (Desktop 판정 후)
```
[Target: Claude Code CLI]
CAT-CODE-명화 해소(전상품 #62). Desktop 판정에 따라:
(A) 재분류가 정답: Product.naverCategoryCode 50003356->50014980 정정(DB·검증·네이버 무접촉) + 발행 payload/카테고리속성 영향 점검.
(B) 50003356가 별도 유효 카테고리: 50003356 CategoryDna 시드(DataLab 파생 또는 50014980 baseline 파생).
해소 후 /api/engine/strategy?productId=cmpnooli40001f0gveaxr8iim 재호출로 scent_note 슬롯 등장 확인. 트래커 §5 델타 Python 반영.
```

---

## §5. 트래커 델타 (Code Python 전체덮어쓰기 — 한글 손상방지 #41)
- PARALLEL_WORK_TRACKER LIVE BOARD: ENG-1 "검증대기" -> "데이터+배포+API 검증완료·브라우저 대기" / CAT-CODE-명화 항목에 "9슬롯 보고->production 4슬롯 정정(#45)·scent_note 차단 함의" 추가 / dna_coverage 개입 Stage 2 후보 메모.
- SESSION_LOG: 2026-06-17 세션8-Desktop 검증 블록(위 §1~§2).
- TASK_BRIDGE §3: ENG-1 검증 부분완료(브라우저 대기) + CAT-CODE-명화 다음1액션 갱신.

---

## §6. 작업 유의사항 (이번 세션 강화)
- #45 실례 박제: Code "9슬롯" 보고 vs production 4슬롯 — 보고 비신뢰·직접검증 원칙 재확인.
- 적응형 퍼널 = DNA 커버리지 의존: 엔진 가치를 위해 카테고리 DNA 시드 커버리지 확장이 로드맵 상수(전상품 #62).
- 커넥터 턴 분리(#26) 준수: 본 세션 Supabase+Vercel 한 턴 / Filesystem 쓰기 별도 턴 — 행 0.
- 비가역 발행 PUT은 명시 GO(#46) / 전상품 범용(#55) / 자연 개입점 비모달(#56).

---

## §7. 상품별 앱 적용 현황
- 명화: 엔진 fallback 4슬롯(scent_note 부재=차단) · cut-1~4 평가완·ingest 대기 · 발행 SUSPENSION(원인·gate.status·원산지/옵션 실측 대기). 검증 케이스.
- ENGINE: Stage 0+1 prod LIVE · 데이터+배포+API 검증완 · 브라우저 렌더 검증 대기.
- 달항아리 / 아이스트레이: 명화 완료 후 확장.
