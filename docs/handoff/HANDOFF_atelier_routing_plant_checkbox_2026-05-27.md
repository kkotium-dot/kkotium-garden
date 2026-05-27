# HANDOFF — 온실 아틀리에 라우팅 + PLANT 체크박스 정합 (정정판) [CLOSED 2026-05-27 PM]

> **작성**: 2026-05-27 Desktop turn (Chrome MCP + Filesystem read 실측 진단)
> **상태**: ✅ CLOSED — 2026-05-27 PM Code turn 본 commit으로 작업2-b(체크박스 스코프 정합) 해소. 작업1(/atelier 404)·작업2-a(7번째 탭)는 코드 이미 반영 완료로 폐기 단정.
> **후속**: Desktop이 production 6탭 체크박스 미노출 + visual 탭만 노출 재검증 후 §7 ARCHIVED.
> **성격**: 5-19 진단 작업1·작업2의 *실제 코드 상태 재검증 후 정정*. 원래 지시문 일부 폐기.

## ✅ CLOSED 결과

- `src/app/products/new/page.tsx` 2 edit (+3/-3): visual 탭 종료 `</>)}` 위치를 line 3401 -> 하단 버튼 `</div>` 직후로 이동
- 결과: autoRunVisual 체크박스 + 네이버 직접 등록 + 엑셀 다운로드 버튼 블록 전체가 `activeTab === 'visual'` 조건 안으로 흡수
- TSC 0 + npm run build OK + sentinel 0
- 작업원칙 #44 stale fact 직접 해소 사례
- (선택) `/atelier -> /studio` redirect는 대표 결정 사항으로 보류


---

## 0. TL;DR (한 줄 요약)

5-19 진단의 작업1(라우팅 404)·작업2(7번째 탭)는 **대부분 이미 코드에 반영 완료**. 실제로 남은 결함은 **단 1건** — "등록 후 비주얼 자동 생성" 체크박스 + 하단 버튼 블록이 `visual` 탭 조건문 *바깥*에 있어 **7개 탭 전부에서 노출됨**. 이 블록을 `visual` 탭 안으로 이동하는 것이 유일한 본 작업.

---

## 1. Desktop 실측 진단 (2026-05-27)

### 검증 방법
- `Filesystem:read` — `Sidebar.tsx` 전문 + `products/new/page.tsx` (3,991줄) 정밀 분석
- `Chrome MCP` — production 실제 화면 클릭/네비게이션 검증

### 검증 결과 매트릭스

| 원래 지시 (5-19) | 실측 결과 | 증거 | 판정 |
|---|---|---|---|
| **작업1** `/atelier` 404 수정 — Sidebar link를 `/studio`로 교체 | Sidebar.tsx 이미 `{ href: '/studio', label: '온실 아틀리에' }` (line 159). `/atelier` 링크는 코드에 **존재하지 않음** | Sidebar.tsx line 159 직접 확인 + production `/atelier` 404는 *URL 직접입력 시에만* 발생 (메뉴 클릭 시 정상 `/studio` 진입) | **폐기 — 수정 불필요** |
| **작업2-a** 7번째 "비주얼 자동화" 탭 위치 정합 | `activeTab` 타입에 `'visual'` 포함 (line 454), 7번째 탭 패널 존재 (line 3386), `savedProductId` 가드로 잠금/해제 | page.tsx line 454 / 3386 / 3398 | **이미 완료** |
| **작업2-b** 체크박스 "마지막 탭/비주얼 탭에서만 노출 (다른 탭 hidden)" | 체크박스 + 하단 버튼 블록(line 3403~3447)이 `{activeTab === 'visual' && ...}` 블록 *밖*에 위치 → 전 탭 공통 하단으로 렌더 → **7개 탭 모두 노출** | page.tsx: visual 탭 닫힘 `</>)}`이 line 3401, 하단 버튼 블록 시작이 line 3403 (조건문 밖). production `/products/new` [기본] 탭에서 `checkboxVisibleOnThisTab: true` 실측 | **결함 — 본 작업 대상** |

### 5-27 점검의 `/atelier 404`에 대한 정정
직전 세션이 production에서 본 `/atelier` 404는 메뉴 클릭 결과가 아니라 **URL을 직접 추정 입력**한 결과. 사용자 실제 동선(사이드바 "온실 아틀리에" 클릭)은 정상 `/studio` 진입. (5-19 대화의 "발견 1 정정"과도 일치.)

### PROGRESS.md <-> 코드 불일치 (작업원칙 #44 stale fact)
PROGRESS.md 2026-05-15 Phase 3-C-3 entry에 *"체크박스 위치: 페이지 하단(공통) -> 네이버 직접 등록 버튼 바로 위에만"* 으로 기록돼 있으나, 실제 코드는 *visual 탭 전용이 아니라 전 탭 공통 하단*. 본 작업으로 코드를 문서 의도에 맞게 정렬.

---

## 2. 본 작업 (Claude Code, 1-commit)

### 2-1. (필수) 체크박스 + 하단 버튼 블록을 `visual` 탭 안으로 이동

**파일**: `src/app/products/new/page.tsx`

**현재 구조 (line 3386~3447)**:

```
{activeTab === 'visual' && (<>
  <div className="space-y-3">
    {!savedProductId ? (안내 카드) : (<PlantVisualInner ... />)}
  </div>
</>)}                                    <- line 3401: visual 탭 조건 닫힘

{/* 하단 버튼 */}                         <- line 3403: 조건문 밖 (전 탭 공통)
<div className="pt-4 border-t ...">
  <label> ... autoRunVisual 체크박스 ... </label>   <- line 3406~3430
  <button onClick={handleNaverDirect}>네이버 직접 등록 (API)</button>  <- line 3431
  <button onClick={handleGenerate}>네이버 엑셀 다운로드</button>        <- line 3443
</div>
```

**목표 구조**:

```
{activeTab === 'visual' && (<>
  <div className="space-y-3">
    {!savedProductId ? (안내 카드) : (<PlantVisualInner ... />)}
  </div>

  {/* 하단 버튼 — visual 탭 안으로 이동 */}
  <div className="pt-4 border-t ...">
    <label> ... autoRunVisual 체크박스 ... </label>
    <button onClick={handleNaverDirect}>네이버 직접 등록 (API)</button>
    <button onClick={handleGenerate}>네이버 엑셀 다운로드</button>
  </div>
</>)}                                    <- visual 탭 조건 닫힘이 하단 버튼 블록 뒤로 이동
```

**수정 핵심**: line 3401의 `</>)}` (visual 탭 조건 종료)를 line 3447의 하단 버튼 `</div>` *뒤*로 옮긴다. 즉 하단 버튼 블록 전체가 `activeTab === 'visual'` 조건 안에 포함되도록 한다.

> **주의 — 들여쓰기/JSX 구조**: line 3403의 `{/* 하단 버튼 */}` 주석과 그 div를 visual 블록 안으로 흡수. `</div>{/* tab content end */}` (line 3449)와 `</div>{/* 좌측 끝 */}` (line 3450)는 그대로 유지.

> **회귀 주의**: "네이버 직접 등록"과 "네이버 엑셀 다운로드" 버튼이 *현재는 모든 탭에서 접근 가능*하다. visual 탭 안으로 이동하면 두 버튼도 visual 탭에서만 보이게 된다. 이는 의도된 동선(등록은 마지막 단계) — 단, 사용자가 다른 탭에서 바로 등록/엑셀을 눌러왔다면 동선 변화가 있으니 Desktop 재검증 시 확인.

### 2-2. (선택·대표 결정) `/atelier` -> `/studio` redirect 보험 추가

작업1은 수정 불필요하나, 사용자가 과거에 `/atelier`를 북마크했거나 외부 링크가 있을 가능성에 대비해 *방어적 redirect*를 추가하면 404 출혈을 영구 차단할 수 있음. 비용 5분.

**옵션 A — `next.config.js`의 `redirects()` (권장, SEO상 301)**:

```js
async redirects() {
  return [
    { source: '/atelier', destination: '/studio', permanent: true },
  ];
}
```

**옵션 B — `src/app/atelier/page.tsx` 신설**:

```tsx
import { redirect } from 'next/navigation';
export default function AtelierRedirect() {
  redirect('/studio');
}
```

> 대표 결정 필요: redirect 추가 여부. (없어도 메뉴 동선은 정상이므로 필수 아님.)

---

## 3. 검증 (Code 측 의무)

```bash
npx tsc --noEmit          # 0 errors
npm run build             # exit 0
# 한글 sentinel grep (0 hits 의무)
grep -nE "혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두" src/app/products/new/page.tsx
```

### Desktop 재검증 신호 (push 후)
1. production `/products/new` 진입 -> [기본]/[옵션]/[이미지]/[배송]/[SEO]/[혜택] 탭에서 **체크박스 미노출** 확인
2. [비주얼 자동화] 탭(저장 후)에서만 **체크박스 + 2개 버튼 노출** 확인
3. (redirect 추가 시) `/atelier` 직접입력 -> `/studio` 301 리다이렉트 확인

---

## 4. 절대 준수 (작업원칙)

- **#29 / #3-1** 한글 inline 주석·리터럴 금지 (영어 상수). 본 작업은 *기존 JSX 블록 이동*이라 신규 한글 0건이 정상
- **#29 b / #31** MD 갱신은 `Write`(전체 덮어쓰기) 또는 Python 안전 삽입
- **#17** 커밋 메시지 한글 다량 시 `.commit-msg.tmp` 경유 -> `git commit -F` -> 즉시 삭제
- **#32** TSC 통과 != build 통과 -> 둘 다 실행
- **#36** push 후 `scripts/verify-vercel-deploy.sh --wait` exit 0
- **#46** 거짓 진행 보고 금지
- **SD-01** Studio footer 아랍어 텍스트 영구 보존 — 본 작업 무관, 조사/수정 금지

---

## 5. 커밋 메시지 (제안)

```
fix(plant): move visual-tab action block inside visual tab condition

- autoRunVisual checkbox + naver-register/excel buttons were rendered
  outside the activeTab==='visual' guard, leaking into all 7 tabs
- relocate the action block into the visual tab so it only shows
  at the registration step (5-19 diagnosis finding 2 resolution)
- (optional) add /atelier -> /studio redirect as a defensive guard
```

---

## 6. MD 갱신 체크리스트 (Code 마무리)

- [ ] `docs/plan/PROGRESS.md` — 헤더 갱신 + 본 entry prepend (체크박스 정합 + 작업1 폐기 정정)
- [ ] `docs/plan/SESSION_LOG.md` — 본 entry prepend (1500줄 임계 확인 후 필요시 분할)
- [ ] `docs/plan/ROADMAP.md` — 헤더 갱신
- [ ] `docs/plan/TASK_BRIDGE.md` — §3 ACTIVE 갱신 + 본 hand-off §7 ARCHIVED 이동
- [ ] `docs/handoff/HANDOFF_atelier_routing_plant_checkbox_2026-05-27.md` — 본 문서 `[CLOSED]` 처리
