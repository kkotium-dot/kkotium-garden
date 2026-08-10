# 작업 인계 — 꼬띠 소싱 v2 로드맵 1b (다중 발굴 렌즈)

> **담당 레인**: Claude Code
> **작성**: Desktop, 2026-08-10
> **BASELINE**: main `d50b45a` (`git pull` 후 확인)
> **의존성**: 없음 — write set이 크론 조사(`cron/`, `.github/workflows/`)와 완전히 다름, 로드맵 1(`wholesale-matcher.ts`, 완료됨)과도 무관
> **선행 완료**: 로드맵 1(공급사 축 수집기, `searchBySupplier`)이 방금 커밋·배포됨(`d50b45a`)

---

## 1. 목표

설계 문서 §3-0(다중 소싱 렌즈)을 구현. 지금 소싱 추천은 "DataLab 뜨는 키워드" 하나의 렌즈만 쓰는데, 이를 8개 렌즈로 확장한다: 급상승📈·시즌선점🗓️·니치💎·블루오션🌊·꿀통🍯·황금🏆·스테디📚 + 레드오션⚠️(경고 렌즈).

**핵심 발견(설계 문서에 이미 기록됨)**: `src/lib/naver/recommendation-type.ts`가 **이미 황금/니치/시즌 3렌즈 분류기를 보유**하고 있다. 신규 대발명이 아니라 **이 기존 분류기를 8개로 확장**하는 작업이다.

## 2. 읽어야 할 것 (순서대로)
1. `docs/design/KKOTTI_DAILY_SOURCING_V2_2026-08-07.md` §3-0 (다중 렌즈 표·설계 원칙)
2. `src/lib/naver/recommendation-type.ts` (기존 3렌즈 분류기 — 확장 베이스)
3. `src/lib/trend-analyzer.ts` (현재 DataLab 트렌드 신호 추출 — 급상승/스테디 신호 추가 지점)

## 3. write set
| 파일 | 작업 |
|---|---|
| `src/lib/sourcing-lenses.ts`(신규) | 8개 렌즈 정의 + 렌즈별 판정 로직 |
| `src/lib/trend-analyzer.ts` | 급상승률·변동성(스테디 판정용) 신호 추가 추출(기존 함수 확장, 신규 함수 추가 권장) |
| `src/lib/naver/recommendation-type.ts` | 필요시 8개 렌즈 라벨/색상 상수 확장(기존 3종 라벨 패턴 재사용) |

**수정 금지**: `wholesale-matcher.ts`(로드맵1 완료분), `cron/*`, `.github/workflows/*`(Code가 진행 중인 크론 조사)

## 4. 설계 원칙 (설계 문서 §3-0 요약)
- 매일 10개를 렌즈별로 배분(초안: 급상승2·시즌선점2·니치2·블루오션2·꿀통1·스테디1) — **상수로 만들어 조정 가능하게**(하드코딩 금지).
- 한 상품이 여러 렌즈에 동시 해당 가능 — 배지 다중 표시 가능한 구조로.
- ⚠️ 레드오션은 발굴 렌즈가 아니라 **경고 렌즈** — 다른 렌즈로 뽑힌 후보에 경고만 붙인다.
- 시즌 선점은 `naver-margin-advisor`의 seasonality(peak 근접 판정)를 재활용 — 새로 만들지 않는다.
- 급상승·스테디는 `trend-analyzer.ts`가 현재 갖고 있는 DataLab 트렌드 데이터에서 "상승률"과 "변동성(낮음=스테디)"을 추가로 뽑아내면 된다(기존 API 재호출 최소화, 이미 가져온 데이터 재해석).

## 5. 검증 방법
- 렌즈 판정 함수들을 순수 함수로 만들어 단위 테스트 가능하게(로컬 스크립트로 알려진 트렌드 데이터 샘플 넣어 렌즈가 정확히 분류되는지 확인).
- 실제 API 재호출 최소화 검증 — 새 외부 API 호출이 추가됐다면 왜 필요한지 명시(설계는 "기존 데이터 재해석" 우선을 권장).

## 6. 완료 후
- 결과 문서: `docs/handoff/CODE_SOURCING_V2_LENSES_RESULT_2026-08-10.md`
- tsc 0 · build 0
- 커밋·push → 채팅 인계

## 체크리스트
- [ ] `git pull` 후 baseline 확인
- [ ] `sourcing-lenses.ts` 신규 — 8개 렌즈 정의(급상승·시즌선점·니치·블루오션·꿀통·황금·스테디·레드오션)
- [ ] `trend-analyzer.ts` 확장 — 급상승률·변동성 신호 추가
- [ ] 렌즈별 배분 로직(상수화, 하드코딩 금지)
- [ ] tsc 0 · build 0
- [ ] 결과 문서 + 커밋·push + 채팅 인계
