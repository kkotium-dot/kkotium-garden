# 현재 인계 (CURRENT) — 2026-08-05 세션 3 (트랙C-1 소싱 낙점 파이프라인 완결)

> 활성 인계 1개. 다음 세션은 이 파일 → `docs/design/SOURCING_NAKJEOM_PIPELINE_2026-08-05.md` → `docs/design/SOURCING_DEEP_DIVE_WEBAPP_2026-08-04.md` → `PRINCIPLES_LEARNED.md` 순으로 읽고 시작.

- **status**: **트랙C-1(소싱 낙점 파이프라인) 완결·로컬 브라우저 실사용+DB 실측 검증 완료·커밋·push**.
- **branch**: `main` (HEAD `4a8f56d`)
- **배포 상태**: `4a8f56d`(트랙C-1) push 완료 → Vercel 배포 **BUILDING**(다음 세션 READY 확인 + 프로덕션 재확인 필요)
- **next-action(최우선)**: ① `4a8f56d` 배포 READY 확인 ② 프로덕션 `/growth` 낙점 파이프라인 재확인 ③ 트랙C-2(상태별 필터/뱃지 강화) 또는 Cowork 키워드 리서치 결과 반영

---

## 1. ★★★ 트랙C-1 — 소싱 낙점 파이프라인 (커밋 `4a8f56d`, 로컬+DB 검증 완료)

발굴(트랙A) → 심화 확인(트랙B 드로어) → **낙점·추적(트랙C)**. "발견만 하고 끝"이 아니라 "이 키워드로 소싱 진행 중"을 상태로 추적. 유료 셀러툴(셀러오션·아이템스카우트)의 "발견 → 검토 → 실행" 파이프라인 패턴.

**설계 — 기능 유지, 조작은 1탭(운영자 확정, "칸반형 낙점 파이프라인")**:
```
발견(미검토) ──탭──▶ ⭐관심 ──탭──▶ 🌱소싱중 ──▶ (씨앗심기 자동 연결)
     └──────────── ✕ 제외 (관심 흐름에서 빠짐, 접힘) ─────────┘
```
- **행동이 곧 상태(자동화)**: 드로어 "소싱 시작" 클릭 시 자동 `sourcing_started` 낙점 후 씨앗심기 이동. 별도 조작 없음.
- 관심(⭐)은 카드에서 한 번 탭 토글. 제외(✕)는 조용히 접기(정보 손실 0).

**구현(4단계 전부 Desktop 순차)**:
- **C-1b API**: 신규 `PATCH /api/sourcing-recommend/status`(스캔 POST와 분리 #316, recordId 우선·keyword+date 폴백, P2021/P2022 가드). GET db-full에 `recordId`·`operatorStatus` 추가. `SourcingOpportunity` 타입 확장.
- **C-1c 훅**: `useSourcingRecommend`에 `setStatus` 액션 — PATCH + 낙관적 업데이트(GET 5분 캐시 stale 우회, revalidate:false). best-effort(#82). `SourcingOpportunityItem` 타입 확장.
- **C-1d 위젯(프리미엄 SaaS)**: 상단 요약 배지(⭐관심 N·🌱소싱중 M, 0이면 숨김) / 카드 ⭐관심 토글 칩(stopPropagation) + 관심=노란·소싱중=초록 강조 / 확장 상세 제외 버튼 + 드로어 자동 낙점 / 제외 접기("제외 N건 보기" + 되돌리기).

**★ 근본원인 발견·수정 (중요, 신규 원칙 #330)**: 신규 route를 `create_file`로 만들었으나 그 도구는 **별도 샌드박스에 써서 로컬 맥에 파일이 안 생겼다**(PATCH 404). tsc·build는 런타임 fetch 문자열이라 파일 부재를 못 잡음. `Desktop Commander:write_file`로 로컬 맥 재생성해 해결. **이 프로젝트에서 신규 파일은 반드시 `Desktop Commander:write_file` 사용(create_file 금지)**. 기존 파일 `edit_block`은 로컬 맥에 정상 반영됨(위젯·훅·타입 전부 확인).

**검증(로컬 브라우저 실사용 + Supabase DB 실측)**:
- PATCH 낙점 `ok:true`. GET이 recordId·operatorStatus 정상 반환.
- ⭐관심 토글 → 요약배지 즉시 "관심 2" 낙관적 업데이트 + DB 저장(가습기·발마사지기 interested) 확인.
- 카드 관심=노란/소싱중=초록 강조 시각 확인.
- **드로어 "소싱 시작" → DB에 청소기 sourcing_started 자동 저장 확인(핵심 자동화)**.
- 제외 → 메인 목록서 사라짐 + "제외 1건 숨기기" 토글 + 취소선/되돌리기.
- **테스트 데이터 원복**: 2026-08-05 낙점 상태 전부 NULL 복구(방치 0, Supabase UPDATE).

---

## 2. 이번 세션+직전 누적 (전부 push 완료)

| 작업 | 커밋 | 상태 |
|---|---|---|
| 웹 스캔/발송 분리 | 4489739 | ✅ discordSent:false 검증 |
| 트랙A DB 완전 영속화 | 9f1363c | ✅ db-full 검증 |
| 트랙B 상세 드로어 | a4efb79 | ✅ 로컬+프로덕션 검증 |
| 문서 rev104 | cc7bcf0 | ✅ 배포 READY |
| **트랙C-1 낙점 파이프라인** | 4a8f56d | ✅ 로컬+DB 검증·push (배포 BUILDING) |

---

## 3. 미착수 (다음 세션 계획)

**트랙C 나머지**:
- **C-2**: 상태별 필터/뱃지 강화(현재는 요약배지+접기만). "관심만 보기" 필터, 소싱중 진행 추적.
- **C-3**: 주간 소싱 요약(한 주 발굴 키워드·낙점 현황 리포트).

**Cowork 리서치 결과 반영**: 키워드 카테고리 정밀화("청소기→귀청소기" 동음 혼입) 방안 확정 시 wholesale-matcher 3번째 축 추가. 문서: `docs/handoff/COWORK_KEYWORD_CATEGORY_RESEARCH_2026-08-05.md`.

**부수**:
- 아침 소싱봇 실발송 모바일 최종확인(운영자 승인).

---

## 4. 다음 세션 시작 순서
```
1. [확인] 4a8f56d 배포 READY(Vercel) — 이번 세션 BUILDING이었음
2. [검증] 프로덕션 /growth 낙점 파이프라인 재확인(관심/소싱중/제외)
3. [착수] 트랙C-2(상태별 필터) 또는 Cowork 리서치 결과 반영
```

## 5. 절대 금지 + 이번 세션 교훈
- 네이버 PUT/POST → 운영자 GO 없이 금지 · 자동발행 영구금지(#307)
- 디스코드 실발송 → 승인 없이 금지(크론 자동발송은 소싱봇 정상 동작)
- **신규 파일은 Desktop Commander:write_file만 사용(#330) — create_file은 샌드박스에 씀**
- 테스트 데이터 방치 금지 → 이번 세션 낙점 테스트는 Supabase UPDATE로 원복 완료
- 미실측 단정 금지(#310) · 부재증명 전수검색(#323)
- dev 서버: 이번 세션 전부 kill 완료. 다음 시작 시 `lsof -ti:3000` 확인
