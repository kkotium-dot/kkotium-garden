# KKOTIUM GARDEN — Plan Archive (분할 누적 보관소)

> **이 폴더의 역할**: 작업원칙 #31에 따라 분할된 *옛 누적 기록*의 보관소입니다.
> archive 파일은 **append-only history** — 한 번 분할되면 *동결 상태*로 보존됩니다.
> 새 채팅 시작 시 정독 대상 *아님*. 검색이 필요할 때만 `grep`으로 참조하세요.

---

## 작동 원리 (작업원칙 #31)

**분할 흐름**:
```
신규 세션 entry 작성
   ↓
SESSION_LOG.md (라이브, 직전 5세션 + 본 세션)
   ↓ 줄 수 1500 초과 시 자동 분할
6번째 이전 세션 → archive로 이동 (동결)
```

**3중 임계 트리거**:
- T1 (1000줄): 분할 *권고* 알림
- T2 (1500줄): 분할 *의무* — 자동 진행
- T3 (2000줄): 분할 *즉시 차단* — 다른 작업 중단

**분할 대상 파일**:
- `PROGRESS.md` 헤더 누적 → `PROGRESS_*.md`
- `ROADMAP.md` 옛 인계 메시지 + Phase 이력 → `ROADMAP_*.md`
- `SESSION_LOG.md` 6번째 이전 세션 → `SESSION_LOG_*.md`

---

## 현재 보관 중인 archive 파일

### 2026 Q2 (May) — 첫 분할

| 파일 | 분할 일시 | 내용 |
|------|----------|------|
| `PROGRESS_2026Q2_MAY.md` | 2026-05-07 | 5월 누적 PROGRESS 헤더 + 작업 원칙 학습 이력 (워크플로우 재설계 Sprint Part A1a~A3-4a + 옵션 C/D/E + E-15 Block D Part 2 마무리 등) |
| `ROADMAP_2026Q2_MAY.md` | 2026-05-07 | deprecated 인계 메시지 9개 + Phase A/B/C 완료 이력 + 작업 후보 표 |
| `SESSION_LOG_2026Q2_MAY.md` | 2026-05-07 | 2026-05-01 ~ 2026-05-06 세션 24+ 건 (A1a~A3-4a + Tailscale + cron + UX/IA 블루프린트 + 폴더 정리 등) |

**포함 기간**: 2026-05-01 ~ 2026-05-06 (5월 첫 6일간 집중 작업)

### 2026-05 — 두 번째 분할 (ISO 패턴 적용)

| 파일 | 분할 일시 | 내용 |
|------|----------|------|
| `SESSION_LOG_2026-05.md` | 2026-05-11 | 2026-05-06 ~ 2026-05-08 세션 9건 (Z-3d Phase A + UX/IA 블루프린트 v1 + 소싱 워크플로우 진단 Z-1/Z-2 + Z-3b 사이드바 deep-link + Sprint 6/7/8 계획 + Z-Hotfix 빌드복구 + Private API 리서치 + STEP 0 재검토 등) |
| `ROADMAP_2026-05.md` | 2026-05-12 | Session B 작업 디테일 (Sprint 6-A UI Phase 2 LowStockAlertWidget, commit `9fabfca`) + deprecated 인계 메시지 9개 (2026-05-07 ~ 2026-05-12 Session A/B 이전) |

**포함 기간**:
- `SESSION_LOG_2026-05.md`: 2026-05-06 ~ 2026-05-08 (6~14세션, SESSION_LOG.md 1628줄로 1500 임계 초과)
- `ROADMAP_2026-05.md`: 2026-05-07 ~ 2026-05-12 (ROADMAP.md 1351줄로 T1 1000 초과 후 Session C-1 분할)
**상위 문서**:
- `docs/plan/PROGRESS.md` (현재 헤더 + 영구 참조)
- `docs/plan/ROADMAP.md` (현재 Sprint 6/7/8 계획 + 영구 참조)
- `docs/plan/SESSION_LOG.md` (직전 5세션 라이브)

---

## 검색 패턴 (필요 시)

### 키워드 검색
```bash
# archive 전체에서 키워드 검색
grep -rn "키워드" docs/plan/archive/

# 특정 archive 파일에서만
grep -n "Z-3a" docs/plan/archive/SESSION_LOG_2026Q2_MAY.md
```

### 특정 commit / 파일의 archive 매칭
```bash
# git history에서 분할 commit 찾기
git log --oneline --all -- docs/plan/archive/

# 분할 전 원본 내용 복원 (archive 동결 후 절대 수정 금지)
git show <hash>:docs/plan/SESSION_LOG.md > /tmp/old.md
```

### 시점별 작업 회고
```bash
# 2026-05-04 작업이 어디 있는지
grep -l "2026-05-04" docs/plan/archive/*.md
```

---

## 파일명 규칙 (2026-06 분할부터 적용 예정)

**현재 (2026-05 첫 분할)**: `*_YYYYQN_MONTH.md` 패턴 (예: `*_2026Q2_MAY.md`)
- 단점: 분기와 월 중복 + 같은 분기 안에 여러 파일 시 정렬 모호

**향후 (2026-06부터)**: `*_YYYY-MM.md` 패턴 (예: `*_2026-06.md`)
- 장점:
  - ISO 8601 표준 준수
  - 자연 정렬 (alphabetical = chronological)
  - 분기 정보는 본 README의 인덱스 표에 메타데이터로 보관
  - 같은 월 안에 추가 분할이 필요한 경우 `*_2026-06a.md` / `*_2026-06b.md` 등 확장 가능

**기존 3개 파일은 rename 안 함** — 동결 후 rename은 (1) git 이력 분리 (2) 다른 MD의 backlink 깨짐 (3) 작업원칙 #31 (b) 분할 후 인덱스 무결성 검증 실패 위험. 신규 분할 파일에만 신 패턴 적용.

---

## 절대 규칙

```
1. archive 파일은 한 번 분할되면 절대 수정 금지 (append-only history)
2. 새 채팅 시작 시 정독 대상 아님 — 검색이 필요할 때만 참조
3. 분할 작업은 작업원칙 #31 (b)~(g) 강제:
   - 의미 단위 분할 (헤더 + 핵심 인덱스 본 파일 보존)
   - 인덱스 무결성 자동 검증 (양방향 backlink + wc -l 합계 ±5줄)
   - idempotent 가드 (재실행 시 skip 보장)
   - 분할 직후 한글 grep 검증 (작업원칙 #29 (e))
4. 본 README는 archive 파일 추가 시마다 인덱스 표 갱신 의무
```

---

## 다음 분할 발생 시 자동 작업 흐름

다음 세션 시작 시 `wc -l docs/plan/*.md` 결과 1500줄 초과 파일 발견 시:

1. 본 README의 "현재 보관 중인 archive 파일" 표에 새 행 추가
2. 신규 archive 파일 작성 (`*_2026-06.md` 패턴)
3. 본 파일에서 *분할 대상 영역만* 추출하여 archive로 이동
4. 본 파일 헤더 갱신 (분할 시점 + 영역 명시)
5. wc -l 합계 검증 (±5줄 오차)
6. 한글 grep 검증
7. 단일 commit (`docs(plan): split MD per principle 31 (T2 trigger NNN lines)`)
8. push (한 turn)
