# 트랙C-1 — 소싱 낙점 파이프라인 설계 (2026-08-05)

> 권위 문서. 트랙C(실무 자동화)의 첫 단계 = 발굴한 소싱 키워드의 낙점 상태 관리.
> 상위 설계: `docs/design/SOURCING_DEEP_DIVE_WEBAPP_2026-08-04.md` §3 트랙C.

## 1. 목표

발굴(트랙A) → 심화 확인(트랙B 드로어) → **낙점·추적(트랙C)**. "발견만 하고 끝"이 아니라 "이 키워드로 소싱을 진행 중"임을 상태로 추적한다. 유료 셀러툴(셀러오션·아이템스카우트)의 소싱 관리 = "발견 → 검토 → 실행" 파이프라인 패턴 차용.

## 2. 설계 원칙 — 기능은 유지, 조작은 1탭 (운영자 확정)

기존 스키마의 3상태(`operatorStatus`: null=미검토 / interested / skipped / sourcing_started)를 **버튼 나열이 아니라 단일 파이프라인**으로 표현한다.

```
발견(미검토) ──탭──▶ ⭐관심 ──탭──▶ 🌱소싱중 ──▶ (씨앗심기 자동 연결)
     └──────────── ✕ 제외 (관심 흐름에서 빠짐, 접힘) ─────────┘
```

**핵심: 행동이 곧 상태(자동화)**
- 드로어의 "이 키워드로 소싱 시작" 클릭 시 → **자동으로 `sourcing_started`** 저장. 별도 조작 없음.
- 관심(⭐)은 카드에서 한 번 탭 → 나중에 볼 것 북마크.
- 제외(✕)는 조용히 접기 → 화면 정리(관심 흐름에서 빠짐, 완전 삭제는 아님).

## 3. 상태 정의 (스키마 값 그대로 사용)

| operatorStatus | 의미 | UI 표현 | 진입 방법 |
|---|---|---|---|
| `null` | 미검토(발견됨) | 상태 칩 없음(기본) | 스캔으로 발굴됨 |
| `interested` | 관심 | ⭐ 관심 칩 | 카드 ⭐ 탭 |
| `sourcing_started` | 소싱 진행 중 | 🌱 소싱중 칩 | "소싱 시작" 클릭 시 자동 |
| `skipped` | 제외 | 접힘(기본 숨김) | ✕ 탭 |

- `operatorStatusAt`: 상태 변경 시각 기록(최근 낙점 순 정렬·주간 요약용).
- 상태는 **키워드+날짜 단위**로 저장(같은 키워드가 다른 날 재발굴되면 별도 레코드 — 스키마가 date 포함).

## 4. UI 구성 (프리미엄 SaaS)

### 4-1. 위젯 상단 요약 배지 (파이프라인 가시화)
```
소싱 추천  [DataLab]          ⭐ 관심 3 · 🌱 소싱중 2      [스캔 시작]
```
- 관심·소싱중 건수를 상단에 요약. 0이면 숨김(노이즈 방지).

### 4-2. 카드 상태 칩 (한 번 탭으로 관심 토글)
- 카드 우측에 상태 칩. 미검토=칩 없음 / interested=⭐관심 / sourcing_started=🌱소싱중.
- ⭐ 아이콘 탭 = 관심 토글(interested ↔ null). stopPropagation(카드 확장과 분리).
- 제외(✕)는 카드 확장 상세 또는 드로어에 배치(자주 쓰지 않으므로 1차 노출 아님).

### 4-3. 드로어 "소싱 시작" = 자동 낙점
- 드로어 푸터 "이 키워드로 소싱 시작" 클릭 시:
  1. `operatorStatus='sourcing_started'` PATCH(비동기, best-effort)
  2. `/products/new?prefillName=키워드`로 이동
- 실패해도 이동은 진행(낙점 저장 실패가 소싱 착수를 막지 않음, #82 degrade).

### 4-4. 제외 항목 접기
- `skipped` 상태는 기본 목록에서 숨김. "제외 N건 보기" 토글로 펼침(정보 손실 0).

## 5. API 설계

**신규 엔드포인트**: `PATCH /api/sourcing-recommend/status`
- 스캔(POST)과 목적이 다르므로 별도 route로 분리(#316 게이트 분리 사상).
- body: `{ recordId?: string, keyword?: string, date?: string, status: 'interested'|'sourcing_started'|'skipped'|null }`
- recordId 우선, 없으면 keyword+date(오늘)로 조회.
- operatorStatus + operatorStatusAt(now) 갱신. P2021/P2022 가드(마이그레이션 안전).
- 응답: `{ ok, recordId, status }`.

**GET 확장**: 기존 GET이 반환하는 opportunity에 `operatorStatus`·`recordId` 추가(위젯이 칩 표시·PATCH 대상 식별에 필요). db-full 경로(SourcingOpportunityRecord)에서 `id`·`operatorStatus`를 함께 내려준다.

## 6. 구현 순서 (전부 Desktop 순차 — write set 물림)

| 단계 | 작업 | write set |
|---|---|---|
| C-1b | PATCH /status route 신설 + GET에 operatorStatus·recordId 추가 | route.ts(신규 status/) + route.ts(GET 확장) |
| C-1c | 훅 타입에 operatorStatus·recordId 추가 + setStatus 액션 | useDashboardData.ts |
| C-1d | 위젯: 상단 요약 배지 + 카드 상태 칩 + 드로어 자동낙점 + 제외 접기 | SourcingRecommendWidget.tsx |

## 7. 검증 계획
- tsc 0 · build 0
- 로컬 브라우저: ⭐관심 토글 → GET 재조회로 반영 확인 → "소싱 시작" 클릭 시 sourcing_started 저장 확인 → 제외 접기 확인
- 프로덕션: 동일 시나리오 재확인
- **테스트 데이터 방치 금지**: 낙점 상태는 실제 운영 데이터라 원복 불필요(오늘자 소싱 레코드에 상태만 붙음). 단 테스트 중 임의 상태는 확인 후 정리.

## 8. 안전·경계
- 낙점 상태 변경은 **비가역 아님**(언제든 되돌리기 가능) → 확인 다이얼로그 불필요.
- 네이버/디스코드와 무관(내부 상태만) → 발송·PUT 위험 0.
- best-effort degrade(#82): 상태 저장 실패가 발굴·드로어·소싱착수를 막지 않는다.
