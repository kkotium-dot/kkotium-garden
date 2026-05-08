# 📋 docs/plan/ — 매 세션 필수 정독 문서

> **이 폴더의 역할**: 꽃틔움 가든 프로젝트의 핵심 계획서. 새 채팅 세션 시작 시 **반드시** 이 폴더의 3개 MD 파일을 정독해야 합니다.

---

## 📂 파일 목록 (3종)

| 파일 | 역할 | 정독 우선순위 |
|------|------|---------------|
| **PROGRESS.md** | 현재 프로젝트 진행 현황 + 작업원칙(#21~#35) + 환경/도구 정보. 최상단 헤더에 가장 최근 세션 결과 + 다음 작업 우선순위 명시. | 1순위 (헤더 정독 필수) |
| **ROADMAP.md** | 미래 작업 계획 + Phase별 상태 표 + **다음 새 채팅 시작 메시지** (현재 유효 섹션 1개 + deprecated 섹션 보존). | 2순위 (현재 유효 메시지 정독) |
| **SESSION_LOG.md** | 세션별 자세한 작업 이력 누적 기록. 각 세션의 변경 파일·검증 결과·교훈·인계 범위. | 3순위 (최상단 1~2개 세션만 정독) |

---

## 🚀 새 채팅 시작 시 필수 작업

```
1. docs/plan/PROGRESS.md 헤더 (최상단 약 15줄) 정독 → 현재 상태 파악
2. docs/plan/ROADMAP.md "현재 유효 ✅" 표시된 다음 채팅 시작 메시지 정독
3. docs/plan/SESSION_LOG.md 최상단 가장 최근 세션 정독
4. 사전 점검 8항목 수행 (작업원칙 #21):
   - git rev-parse HEAD origin/main → 두 값 같은지
   - git status 깨끗한지
   - TSC 0 errors 확인
   - dev :3000 실행 중인지 (또는 Vercel production HTTP 200)
5. 작업 계획 브리핑 후 사용자 승인 받고 시작
```

---

## ⚠️ 작업원칙 #29 (한글 처리 절대 규칙) — 영구 적용

매 세션 시 다음 규칙을 강제 적용합니다:

| 작업 | ❌ 위험 패턴 | ✅ 안전 패턴 |
|------|------------|------------|
| MD 신규 작성 | edit_file의 newText에 한글 다량 포함 | **write_file로 직접 입력** 또는 별도 임시 파일 + Python 안전 삽입 |
| MD 일부 수정 | edit_file (한글 newText) | write_file 전체 재작성 또는 edit_file (oldText/newText 모두 영어/구두점만) |
| 코드 작성 | 한글 주석/타입 | **영어 주석/타입만 사용** (한글 자체 회피) |
| 셸 명령 한글 | `echo "사용자명"` 직접 입력 | **`cat .tmp_message.txt`** (한글은 파일에) |
| Python 한글 literal | `print("사용자명")` 직접 | `\uXXXX` escape 또는 별도 파일에서 read |
| 사용자 이름 호명 | 답변 본문에 직접 입력 | 인용 / 변수 / Filesystem:write_file 만 (작업원칙 #29 e+) |

### 사용자 닉네임 — 정확한 표기 (절대 변경 금지)

사용자가 직접 명시한 닉네임은 본인 메시지 인용 외에는 답변 본문에 *직접 입력 금지*. memory_user_edits 항목으로도 등록되어 있음.

### 한글 작업 후 즉시 grep 검증 의무화

```bash
# 실제로 발생했던 잘못된 변종 패턴 누적 사전 (검출 대상)
# 주의: 정상 닉네임 표기는 이 패턴에 포함되어선 안 됨.
grep -nE "꽃졤|꽃제|꽃젤|혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두|일찰|즈시|융지|론이|좌비|꼬뜸한" docs/plan/*.md docs/research/*.md
# 결과 0건이어야 정상. 매칭이 있으면 즉시 git restore + write_file 패턴으로 재작성.
# (검증 패턴 자체 인용은 정상 매칭이며 깨짐 아님 — 사용자에게 보고 시 구분 표기)
```

### 작업원칙 #35 — 한글 사전 분리 패턴 (대량 한글 작성 시 의무)

5채널 디스코드 알림 등 *대량 사용자 대면 한글*은 코드와 분리:

- 사전 파일: `src/lib/notifications/discord-strings.ko.json` (87+ strings)
- 빌더 코드: 영문 식별자만, `STRINGS.section.title` 패턴
- 검증 스크립트: `scripts/verify-korean-dict.py`
- 자세한 내용은 `PROGRESS.md` 작업원칙 #35 참조

---

## 📁 관련 폴더

- **docs/research/**: 리서치 보고서 + API 진단 보고서. 매 세션 정독 불필요. 필요할 때만 grep/read.
- **docs/decisions/**: 기존 의사결정 기록 (legacy).
- **docs/design/**: UX/IA 마스터 블루프린트. 디자인 작업 시점에 정독.

---

## 🔄 파일 갱신 정책

- **PROGRESS.md**: 헤더만 매 세션 갱신 (짧은 요약). 본문 세션별 요약 누적.
- **ROADMAP.md**: 헤더 갱신 + 새 채팅 시작 메시지 1개 갱신 (이전 메시지는 deprecated 표시 + 보존).
- **SESSION_LOG.md**: 매 세션 새 섹션을 최상단에 추가 (최신 세션이 위로).

각 파일이 1500줄 초과 시 신규 MD 파일 생성 (작업원칙 #31 자동 분할):

- 예: `archive/SESSION_LOG_2026Q3.md` 분할 (분기별)
- 예: `archive/PROGRESS_2026Q2_MAY.md` (5월 누적 세션)
- 예: `archive/ROADMAP_2026Q2_MAY.md` (deprecated 시작 메시지 누적)

분할 시 README + 헤더에도 새 파일 명시.
