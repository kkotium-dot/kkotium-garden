# 💻 Claude Code 인계 — D1 꼬띠 페르소나 잔여 15개 파일 (2026-07-22)

> **FROM** 🌸 Cowork · **TO** 💻 Claude Code
> **BASELINE**: main `c36d380` (== origin/main == prod, Vercel 200)
> **의존성**: **없음.** 이 작업은 `*.strings.ko.json` 문자열만 건드리므로 Cowork가 병행 중인 B3/C2(컴포넌트·페이지)와 파일이 전혀 겹치지 않는다. 언제 시작해도 안전하다.

---

## STEP 0 — 착수 전 점검 (자동 실행)

```bash
cd /Users/jyekkot/Desktop/kkotium-garden && \
git rev-parse HEAD origin/main && \
git status --short && \
python3 scripts/persona-audit.py | tail -20
```

기대: HEAD==origin/main==`c36d380`, 미커밋 0, 0건 파일 15개.

---

## SCOPE — 무엇을

`scripts/persona-audit.py` 기준 **페르소나 0건 파일 15개**에 꼬띠 보이스를 입힌다. 권위: `docs/design/KKOTTI_PERSONA_VOICE_GUIDE.md`.

### 우선순위 (노출 빈도 = 셀러가 실제로 자주 보는 순)

| 순위 | 파일 | 문자열 수 | 모드 | 근거 |
|---|---|---|---|---|
| 1 | `lib/i18n/products-new-strings.ko.json` | 3 | 정원사/카우걸 | 상품 등록 — 매일 진입 |
| 2 | `components/dashboard/OrderProcessingNudge.strings.ko.json` | 2 | 카우걸 | 주문 처리 넛지 — 돈 직결 |
| 3 | `components/dashboard/SupplierGardenWidget.strings.ko.json` | 2 | 정원사 | 대시보드 상시 |
| 4 | `components/dashboard/ParetoInboxRow.strings.ko.json` | 2 | 정원사 | 대시보드 상시 |
| 5 | `components/dashboard/CompetitorRadarWidget.strings.ko.json` | 2 | 카우걸 | 경쟁 분석 |
| 6 | `components/dashboard/GoldenWindowWidget.strings.ko.json` | 2 | 카우걸 | 골든윈도우 |
| 7 | `components/dashboard/PriceMovementWidget.strings.ko.json` | 1 | 카우걸 | 가격 이동 |
| 8 | `lib/i18n/p-filter-messages.ko.json` | 1 | 정원사 | 필터 빈 상태 |
| 9 | `lib/i18n/concept-presets.ko.json` | 1 | 정원사 | 컨셉 프리셋 |
| 10 | `lib/automation/section-renderers/strings.ko.json` | 2 | — | 관제 상태표 — 부분 적용만(아래 주의) |
| 11 | `components/studio/AssetBrowser.strings.ko.json` | 13 | 정원사 | 꽃단장 — 운영자 "나중에 한 번에" 지시 이력. 운영자 확인 후 착수 |
| 12 | `components/products/GeneratedAssetLocations.strings.ko.json` | 12 | 정원사 | 꽃단장 자산 위치 — 11번과 함께 |
| 13 | `lib/i18n/lifestyle-assets-strings.ko.json` | 12 | 정원사 | 꽃단장 라이프스타일 — 11번과 함께 |
| 14 | `components/detail/preset/samples.ko.json` | 15 | 정원사 | 상세 프리셋 샘플 — 노출 낮음 |
| 15 | `lib/i18n/detail-content-templates.ko.json` | 5 | 정원사 | 상세 템플릿 — 노출 낮음 |

**권장 배치**: 1~9(대시보드·등록, 빠른 승리) 먼저 → 10 신중 → 11~13은 운영자 "꽃단장 일괄 수정" 지시 확인 후 묶음 → 14~15 마지막.

---

## 작업 원칙 (반드시 준수)

- **#29a 한글 다량 편집은 Python 스크립트로.** `edit_file`은 한글 오염 실증됨 → JSON은 `json.load` / `json.dump(ensure_ascii=False, indent=2)`로 읽고 쓴다. 저장 후 `text.count('�')==0` 확인.
- **#35 문자열은 `.ko.json` 단일 출처.** 컴포넌트 `.tsx`에 하드코딩 금지.
- **#3-1 이모지 정책.** 렌더 컴포넌트가 `// No emoji`를 명시한 경우 이모지 글자 없이 **텍스트 마커(까꿍·빵야·이랴·해유·어유)만** 사용. `persona-audit.py`의 정규식은 이모지를 요구하지 않으므로 마커만으로 통과. 컴포넌트별로 먼저 `grep -n "No emoji" <컴포넌트.tsx>` 확인.
- **원문 보존 대상**: 숫자 기준(50자·1000px·정책일자), 기술 지시(PROXY_SECRET·환경변수), 로드맵 개발 용어("Sprint 9+"·"코드 작성 예정")는 **페르소나화하지 않는다**. 오프너·어미만 바꾼다.
- **모드 판단**: 위기(품절·마진·좀비·에러)=카우걸(빵야/이랴), 긍정·일상(추천·리포트·대시보드)=정원사(까꿍/해유).

### 10번 특별 주의 (`section-renderers/strings.ko.json`)
관제 상태표라 개발 용어가 섞여 있다. `empty`/`envWarn` 같은 사용자 대면 문자열만 적용하고 `groupHint`/`statusHint`/`description`은 **미적용 유지**. 파일당 1건 이상이면 감사 통과하므로 최소 적용으로 충분.

---

## 검증 (파일 그룹마다)

```bash
# 1. 페르소나 감사 — 0건 파일이 줄어드는지
python3 scripts/persona-audit.py | tail -20
# 2. 타입 + 빌드 (JSON 구조 깨짐 방지)
npx tsc --noEmit
rm -rf .next && npm run build   # dev 서버 CSS 이슈(아래)로 build로 검증
# 3. 오염 0 확인 (U+FFFD replacement char)
# 4. 이모지(신규분) grep 0 — No emoji 컴포넌트 대상
```

**로컬 dev 서버 이슈(2026-07-22 발견)**: `next dev`가 `globals.css`의 `@tailwind`를 파싱하지 못하는 상태(`Unexpected character '@'`). `npm run build`는 정상. dev 브라우저 검증이 필요하면 **`npm ci` 먼저**(= C3 작업). 이 페르소나 작업은 JSON 문자열만 바꾸므로 build 검증 + 감사 스크립트로 충분하고 dev 브라우저는 불필요하다.

---

## 커밋 / 배포

- 커밋 메시지는 `.commit-msg.tmp`에 쓰고 `git commit -F .commit-msg.tmp` (한글 오염 방지).
- 그룹별 개별 커밋 권장(1~9 / 10 / 11~13 / 14~15).
- push 후 `scripts/verify-vercel-deploy.sh --wait`로 배포 확인(#36).

## 완료 시 인계 (역방향)
`docs/plan/TASK_BRIDGE.md` §3-A 보드의 D1 상태를 `DONE`으로, §3 ACTIVE에 5-step 엔트리 추가. `persona-audit.py` 최종 0건 파일 수 기록.
