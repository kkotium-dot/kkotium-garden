# HANDOFF — PLANT 페이지 상단 헤더 중복 등록 버튼 정합 (B-13 후속) [CLOSED 2026-05-27 PM]

> **작성**: 2026-05-27 PM Desktop turn (b6ce4bb 검증 중 발견)
> **상태**: ✅ CLOSED — 2026-05-27 PM Code turn 본 commit으로 옵션 A(단순 제거) 적용 완료.
> **후속**: Desktop이 production 7탭 순회 재검증 후 §7 ARCHIVED.
> **선행 상태**: B-13 commit `b6ce4bb` 적용 후, 하단 체크박스+버튼 블록은 visual 탭에 정상 흡수됨

## ✅ CLOSED 결과

- `src/app/products/new/page.tsx` line 1792-1805 14줄 `<div style={{ display: 'flex', gap: 8 }}>...</div>` 블록 삭제 (handleNaverDirect 버튼 + handleGenerate 버튼 헤더 인스턴스)
- 핸들러 grep 카운트: handleNaverDirect 3->2, handleGenerate 4->3 (line 817 비-functional 주석 포함)
- functional call site: 양쪽 visual 탭 1곳만 잔존
- TSC 0 + npm run build OK (`/products/new` 64.2 -> 63.9 kB)
- 부모 `flex items-center gap-2` div + 진행률 dots + 완료 배지 정합 보존
- 작업원칙 #45 (실측 evidence 기반 fix) 직접 사례


---

## 0. TL;DR

`b6ce4bb` Desktop 재검증 중 **잔존 회귀 1건 신규 발견**: page.tsx **line 1793-1804**에 "네이버 직접 등록" + "네이버 엑셀 다운로드" 버튼이 페이지 상단 헤더(진행률 옆)에 **별도로 존재**. visual 탭 외부, 7개 탭 모두에서 항상 노출.

원인: 5-19 진단 당시 *하단 블록만* 식별, 상단 헤더 중복 인스턴스를 누락. b6ce4bb 하단 정합 직후 production 클릭 검증에서 식별.

---

## 1. Desktop 실측 증거 (2026-05-27 PM)

### 1-1. 코드 정밀 검증

```
$ grep -n "handleNaverDirect\|handleGenerate" src/app/products/new/page.tsx
1418:  const handleNaverDirect = async () => {
1493:        if (autoRunVisual) {
1508:const handleGenerate = async () => {
1793:              <button onClick={handleNaverDirect} ...>  # HEADER 잔존
1799:                {naverLoading ? '...' : '네이버 직접 등록'}
1801:              <button onClick={handleGenerate} ...>      # HEADER 잔존
1803:                네이버 엑셀 다운로드
3431:                onClick={handleNaverDirect}              # b6ce4bb visual 탭 안
3440:                {naverLoading ? '...' : '네이버 직접 등록 (API)'}
3442:              <button onClick={handleGenerate} ...>      # b6ce4bb visual 탭 안
3444:                네이버 엑셀 다운로드
```

* line 1793-1804 = page header (진행률 dots + "완료" 배지 옆)
* line 3431-3444 = b6ce4bb로 visual 탭 안에 흡수된 정상 위치

### 1-2. production 화면 실측 (Chrome MCP)

```json
{
  "totalRegisterButtons": 2,
  "instances": [
    { "text": "네이버 직접 등록", "top": 115, "zone": "HEADER (top)" },
    { "text": "네이버 엑셀 다운로드", "top": 115, "zone": "HEADER (top)" }
  ],
  "verdict": "DUPLICATE confirmed: header + bottom"
}
```

[기본] 탭 / [옵션] 탭 양쪽에서 동일 top=115px 위치 노출 확인.

### 1-3. 라벨 차이

| 위치 | 직접 등록 라벨 | 엑셀 라벨 |
|---|---|---|
| Header (line 1799) | `네이버 직접 등록` | `네이버 엑셀 다운로드` |
| Visual tab (line 3440) | `네이버 직접 등록 (API)` | `네이버 엑셀 다운로드` |

핸들러는 양쪽 동일 (`handleNaverDirect` / `handleGenerate`). 두 버튼 모두 *같은 동작*을 트리거.

---

## 2. 본 작업 (Code, 1-commit)

### 2-1. 결정 사항 (대표 결정 필요할 수 있음)

* **권장 옵션 A (단순 제거)**: line 1792-1805 `<div style={{ display: 'flex', gap: 8 }}>...</div>` 블록 전체 삭제.
  - 근거: visual 탭 안에 동일 동작이 이미 존재. 사용자 동선상 *마지막 단계*에서만 등록 트리거가 옳음.
  - 효과: [기본]/[옵션]/[이미지]/[배송]/[SEO]/[혜택]에서 입력 도중 등록 버튼 노출 0 -> 미완성 데이터 등록 위험 차단.

* 옵션 B (조건부 노출): `{activeTab === 'visual' && (<div ...>두 버튼</div>)}` 로 헤더에서도 visual 탭일 때만 노출.
  - visual 탭에서 *상단·하단 둘 다 노출*되는 중복 UI라 권장 안 함.

* 옵션 C (헤더 유지 + 하단 제거): 5-19 진단과 정반대 방향.
  - 헤더 = sticky 상단이라 *진행 중 언제든 등록 가능*하다는 의도였을 수 있음. 그러나 사용자 동선상 위험.

> **권장 = 옵션 A**. 비주얼 탭(7번째 = 마지막 단계)에서만 등록/엑셀 노출이 안전. b6ce4bb 의도와도 정합.

### 2-2. 작업 명세 (옵션 A 기준)

**파일**: `src/app/products/new/page.tsx`

**제거 대상 (line 1792-1805)**:

```tsx
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleNaverDirect} disabled={naverLoading} style={{...}}>
                {naverLoading ? (<svg>...</svg>) : (<svg>...</svg>)}
                {naverLoading ? '등록 중...' : '네이버 직접 등록'}
              </button>
              <button onClick={handleGenerate} style={{...}}>
                <svg>...</svg>
                네이버 엑셀 다운로드
              </button>
            </div>
```

**처리**: 위 14줄 div 블록을 그대로 삭제. 부모 `flex items-center gap-2` div(line 1771)는 유지 — 진행률 dots + 완료 배지(line 1772-1791)는 그대로 남음.

### 2-3. 회귀 차단 검증

* `grep -c "handleNaverDirect" src/app/products/new/page.tsx` -> **2 (handler 정의 1 + visual 탭 사용 1)**
* `grep -c "handleGenerate" src/app/products/new/page.tsx` -> **2 (handler 정의 1 + visual 탭 사용 1)**
* (현재는 4·3이 나옴. 위 둘로 줄어야 정상)

---

## 3. 검증 (Code 측 의무)

```bash
npx tsc --noEmit                  # 0 errors
npm run build                     # exit 0
grep -nE "혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두" src/app/products/new/page.tsx
```

### Desktop 재검증 신호 (push 후)
1. production `/products/new` 진입 -> 페이지 상단 헤더에 **등록/엑셀 버튼 미노출** 확인
2. 7개 탭 순회 -> 모두 상단·하단 모두 등록 버튼 0 (visual 탭만 하단에 노출)
3. [비주얼 자동화] 탭(저장 후)에서만 체크박스 + 2개 버튼 노출 유지 (b6ce4bb 정합 보존)

---

## 4. 절대 준수

* #29 / #3-1 한글 inline 금지 (본 작업은 *삭제 only*라 신규 한글 0건이 정상)
* #17 commit msg 한글 -> `.commit-msg.tmp` -> `git commit -F` -> 삭제
* #32 TSC != build, 둘 다 실행
* #36 push 후 verify-vercel-deploy.sh --wait exit 0
* #45 production smoke + 클릭 검증 의무
* #46 거짓 진행 보고 금지
* SD-01 아랍어 footer 영구 보존

---

## 5. 커밋 메시지 (제안)

```
fix(plant): remove duplicate naver-register/excel buttons from page header

- header (line 1793-1804) had a second copy of the register/excel buttons
  that leaked across all 7 tabs, including basic/option/image/shipping/seo/benefit
- b6ce4bb localized the bottom action block into the visual tab but missed
  the upstream header duplicate; only the visual-tab copy should remain
- registration action is now scoped strictly to the final visual tab,
  preventing incomplete-data registration

Refs: B-13 follow-up
```

---

## 6. MD 갱신 체크리스트 (Code 마무리)

- [ ] `docs/plan/PROGRESS.md` — 헤더 갱신 + 본 entry prepend (B-13 후속 header dup 제거)
- [ ] `docs/plan/SESSION_LOG.md` — 본 entry prepend
- [ ] `docs/plan/ROADMAP.md` — 헤더 갱신
- [ ] `docs/plan/TASK_BRIDGE.md` — §3 ACTIVE 갱신 + B-13 archive 확장 또는 B-13a 신설
- [ ] 본 핸드오프 `[CLOSED]` 처리 (Desktop 재검증 통과 후)
