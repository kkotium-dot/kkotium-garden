# 🔬 docs/research/ — 리서치 + API 진단 보고서

> **이 폴더의 역할**: 작업 중 발생한 디버그·진단·전략 리서치 결과를 누적 저장. **매 세션 정독 불필요**. 관련 주제 작업 시에만 grep/read로 참고.

---

## 📂 보고서 인덱스

| 파일 | 작성일 | 주제 | 참고 시점 |
|------|--------|------|----------|
| **COMMERCE_API_403_ROOT_CAUSE.md** | 2026-05-06 | Naver Commerce API 403 근본 원인 진단 — `.env.local` `$` 미escape로 인한 dotenv-expand 부분 치환 버그. naver-doctor 진단 라우트 8체크 결과. | Naver API 인증 문제 발생 시 |
| **COMMERCE_API_ORDER_DIAGNOSIS.md** | 2026-04 | Naver Commerce Order API 403 진단 보고서 (Track B Deep Diagnosis) — `lastChangedFrom` 마이그레이션 가설 검증. 결과: 가설 빗나감, api-client.ts 그대로 정답. | Naver Order API 403/엔드포인트 변경 의심 시 |

---

## 🔍 사용 패턴

### 매 세션 정독 X
이 폴더의 보고서는 **매 세션 자동 읽기 대상이 아닙니다**. 새 채팅 시작 시 자동 정독 대상은 `docs/plan/`의 3종만 정독하세요.

### 필요할 때 참고 O
다음 상황에서 grep으로 키워드 검색 후 해당 보고서 정독:

| 작업 상황 | 검색 키워드 예시 |
|----------|----------------|
| Naver API 403 / GW.AUTHN / 인증 문제 | `grep -l "GW.AUTHN\|403" docs/research/*.md` |
| dotenv / 환경변수 / `$` escape 이슈 | `grep -l "dotenv\|escape" docs/research/*.md` |
| Order API 엔드포인트 변경 의심 | `grep -l "lastChangedFrom\|product-orders" docs/research/*.md` |

---

## 📝 새 보고서 추가 가이드

### 1. 파일명 규칙

```
<DOMAIN>_<TOPIC>_<TYPE>.md
```

예시:
- `COMMERCE_API_403_ROOT_CAUSE.md` — Commerce API 403 근본원인
- `NAVER_DATALAB_TREND_ANALYSIS.md` — DataLab 트렌드 분석
- `SUPABASE_RLS_DIAGNOSIS.md` — Supabase RLS 진단

### 2. 보고서 구조 권장 (최소 4섹션)

```markdown
# <제목>

> 작성일: YYYY-MM-DD | 작성 컨텍스트: <세션 또는 commit hash>

## 1. 증상 / 발견된 문제

## 2. 진단 과정 (가설 → 검증 → 결과)

## 3. 근본 원인

## 4. 해결책 / 영구 조치
```

### 3. 인덱스 갱신

새 보고서 추가 시 본 README의 "보고서 인덱스" 표에 한 줄 추가.

---

## 🗂 향후 분류 확장 제안 (현재 적용 X, 보고서 10개 이상 시 검토)

보고서가 많아지면 다음 하위 폴더로 분류 가능:

```
docs/research/
├── api/        ← API 관련 진단/디버그
├── strategy/   ← 비즈니스 전략 리서치
├── ux/         ← UI/UX 리서치
└── perf/       ← 성능/최적화 리서치
```

현재는 평탄 구조 유지 (보고서 2개로 분류 불필요).
