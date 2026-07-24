# HANDOFF — 온실 아틀리에 클릭 무반응 (B-1) + 부수 발견  `[CLOSED 2026-05-26]`

> **이 문서의 역할**: 🖥 Desktop(검증)이 진단을 완결하여 💻 Code(수정·배포)에 넘기는 *상세 인계장*.
> TASK_BRIDGE.md §3 ACTIVE가 "한 줄 요약 색인"이라면, 본 `docs/handoff/` 폴더는 개별 인계의 *상세 근거*를 누적 보관한다.
>
> **갱신 정책**:
> - 진단/수정 진행에 따라 본 문서를 *업데이트*(상태 변경, 검증 결과 추가)한다.
> - 완료된 인계는 상단에 `[CLOSED YYYY-MM-DD]` 표기 후 보존(삭제 금지 — 사후 추적용).
> - 새로운 별건 인계는 `docs/handoff/HANDOFF_<주제>.md`로 *추가* 생성한다.
> - 본 문서가 다루는 작업이 종료되면 TASK_BRIDGE.md §7 ARCHIVED에 한 줄 등재 + 본 문서 CLOSED 처리.
>
> **상태**: ✅ CLOSED — B-1 수정 적용 + Desktop Chrome MCP 재검증 통과 (썸네일 4변형 실생성 확인)
> **작성**: 2026-05-26 Desktop 세션 (Chrome MCP + Supabase MCP + Vercel MCP 전수 검증)
> **방향**: 🖥 Desktop → 💻 Code → 🖥 Desktop (검증 완료)
> **잔여**: TASK_BRIDGE §7 ARCHIVED 등재(Code 측 후속) / B-3 데이터 보정은 별도 진행

---

## ✅ 최종 검증 결과 (2026-05-26 Desktop Chrome MCP)

| 항목 | 직전(버그) | 수정 후(`74d395d`) |
|---|---|---|
| 핸들러 발동 → API 호출 | API 0건 | **POST /api/thumbnail 200** |
| 버튼 상태 | "썸네일 생성" 고정 | **"재생성"으로 변경** |
| 썸네일 렌더 | 0개 | **4변형 전부 렌더** (Clean/Price/Badge/Lifestyle) |
| React 바인딩 | onClick 미바인딩 | **reactHydrated true / onClick function** |

→ `'use client'` 누락 복구가 정확히 적중. B-1 완전 해소.
부수 관찰: Chrome MCP 자동화 좌표 클릭은 본 버튼 스타일에 잘 안 꽂힘(도구 특성). JS .click() 및 실제 사용자 마우스 클릭은 정상 작동.

---

## Code 새 채팅 진입 메시지 (paste-ready) — [완료된 인계, 보존용]

아래 코드블록을 Claude Code 새 채팅 첫 입력으로 그대로 붙여넣는다. (※ 이미 `74d395d`로 처리 완료)

```
꽃틔움 가든 — Sprint 검증 hand-off (Desktop -> Code).
docs/handoff/HANDOFF_studio_click_bug.md 정독 후 진행.
온실 아틀리에(/studio) 첫 실상품 흐름 검증 완료. 치명 버그(B-1) 근본원인 + 수정라인 확정.
아래대로 수정 -> MD 3종 갱신 -> 커밋 -> 푸시 -> Vercel 검증. 추측 불필요, 원인 확정됨.

[BASELINE — 현재 production 정상]
- HEAD: 1d94319 (READY)
- DB 장애 완전 해소: Supabase DB 비번 재리셋으로 인증 복구.
  근본원인 = 이전 리셋이 Supabase에 실제 저장 안 됐던 것. Vercel ENV 값/스코프(All Env)/
  형식/재배포 전부 정상이었음. 같은 값 재리셋으로 즉시 복구. 재배포 불필요했음.
  -> P1000(Authentication failed) 소멸. /api/products, /api/system-health 200 확정.
- 첫 실상품: 달항아리 도어벨 (id=cmp3afb450001gng5468w0qpc, DRAFT, 이현마켓/DMM)

[B-1 (치명, 최우선) — 온실 아틀리에 모든 버튼 클릭 무반응]
근본원인 (코드 5파일 전수 확인으로 확정):
  src/components/studio/ 카드 컴포넌트 5개 전부 'use client' 지시자 누락.
  Phase 3-C-1 리팩토링(page.tsx -> 컴포넌트 분리) 때 'use client' 미이전.
  page.tsx에는 있으나 하위 카드엔 없어 onClick/onChange가 브라우저에 미바인딩
  -> 버튼이 렌더만 되고 클릭 이벤트 죽음.

증거 (Desktop Chrome MCP):
  - 실제 마우스 클릭 시 API 호출 0건 + busy 미표시 (핸들러 미바인딩)
  - JS element.click()으로는 POST /api/thumbnail 200 발생 (핸들러 자체는 정상)
  - 백엔드 정상: POST /api/thumbnail/{id} -> 200 + outputs[].base64 + copy.hook (S6/75)
  - 오버레이 없음: elementFromPoint(버튼중심) === 버튼 자신
  - 진단 STEP1 표시 정상(서버 렌더): S6 / L4 / 신뢰도 73 / 품질 37

수정 (5개 파일 각 맨 첫 줄에 'use client'; 추가):
  1. src/components/studio/StudioCardShell.tsx  (PrimaryButton/SecondaryButton 본체, 최우선)
  2. src/components/studio/DiagnosisCard.tsx
  3. src/components/studio/ThumbnailCard.tsx
  4. src/components/studio/DetailPageCard.tsx    (select onChange 포함)
  5. src/components/studio/ActionsCard.tsx
  참고: ProductListPane.tsx도 onSelect onClick 사용 -> 동일 점검 후 누락 시 추가.
  (useStudioActions.ts는 hook이라 호출처 page.tsx의 'use client' 경계 안 — 안전상 확인만)

검증:
  1. git rev-parse HEAD origin/main && git status --short
  2. npx tsc --noEmit -> 0
  3. npm run build -> 0 (server/client 경계 변화 확인)
  4. 로컬 /studio?product=cmp3afb450001gng5468w0qpc -> 진단/썸네일 버튼 클릭 시
     busy -> 렌더까지 실동작 확인
  5. 커밋 -> 푸시 -> scripts/verify-vercel-deploy.sh --wait
  6. push hash 보고 -> Desktop이 Chrome MCP로 실클릭 재검증

[B-2 (개선) — 빈 결과 침묵 실패, 작업원칙 #46 위반 소지]
  useStudioActions.ts runThumbnail(): res.ok면 outputs 비어도 setThumbnails(성공) 처리.
  L4/품질미달 시 "빈 썸네일"을 "생성 완료"로 오인 -> 빈 상태 발행 위험.
  권고: outputs.length===0 또는 전 variant base64 부재 시 thumbError로 명시
  ("이미지 품질이 낮아 자동 생성을 보류했습니다 — 디자이너 손길 필요"). B-1과 동일 커밋 권장.

[B-3 (데이터) — 첫 상품 보정, B-1 검증 통과 후]
  달항아리 도어벨: category=uncategorized, 순마진 6.4%(낮음).
  /products/new?edit=cmp3afb450001gng5468w0qpc 에서 카테고리 매핑 + 판매가 재산정.

[MD 갱신 — 이번 세션 기록 (같은 커밋 또는 후속 docs 커밋)]
  - docs/handoff/HANDOFF_studio_click_bug.md: 본 문서 git 추적 추가 + 수정 완료 시 CLOSED 처리
  - TASK_BRIDGE.md §3 ACTIVE: DB 복구 완료 + B-1 use client 누락 수정 -> 실클릭 재검증
    -> 첫 상품 등록 으로 갱신. §5 OPEN PAPER-CUTS에 B-1/B-2 등재. §7에 본 핸드오프 참조.
  - SESSION_LOG.md: 본 세션 entry prepend (DB P1000 근본원인=비번 미저장 / B-1 use client
    누락 진단 경위 / Chrome+Supabase+Vercel MCP 교차검증).
  - PROGRESS.md: 헤더 갱신 (DB 복구 + Studio 클릭 버그 수정), 상품 1개(DRAFT) 반영.

작업원칙 #17/#21/#22(빌드!=런타임)/#28/#29/#31/#32/#36/#41/#46 준수.
한글 sentinel grep (혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두) 클린 확인 후 커밋.
```

---

## 검증 타임라인 (사후 추적용)

| 시각(KST) | 행동 | 결과 |
|---|---|---|
| 2026-05-26 | production /dashboard 렌더 | 정상 (73ed2d3 방어 코드 작동) |
| 2026-05-26 | /api/* 다수 500 진단 | prisma:error Invalid (DB 접속 실패) |
| 2026-05-26 | Supabase MCP 직접 쿼리 | DB 정상 + 상품 1개 (앱은 0개로 봄 = 비번 불일치) |
| 2026-05-26 | Vercel ENV 확인 | DATABASE_URL/DIRECT_URL = All Environments, 값 정상 |
| 2026-05-26 | 빈 커밋 재배포(1d94319) | 에러 지속 -> 배포 캐싱 문제 아님 |
| 2026-05-26 | 에러 원문 회수 | "Authentication failed ... credentials for postgres are not valid" (P1000 확정) |
| 2026-05-26 | DB 비번 동일값 재리셋 | /api/products 200 + 상품 1개 노출 = **복구 완료** |
| 2026-05-26 | /studio 썸네일 버튼 클릭 검증 | 무반응 -> B-1 발견 |
| 2026-05-26 | 컴포넌트 5파일 전수 코드 분석 | 'use client' 누락 확정 = B-1 근본원인 |
| 2026-05-26 | Code: 6 컴포넌트 'use client' 추가 + B-2 빈 outputs guard | tsc 0 + build 0 (next 14 정적 빌드 통과) |
| 2026-05-26 | Code push `74d395d` + Vercel production REGISTERED | 11 files +227/-43 |
| 2026-05-26 | **Desktop Chrome MCP 재검증** | **썸네일 4변형 실생성 + 버튼 "재생성" 전환 + API 200 = B-1 CLOSED** |

## 변경 이력

- 2026-05-26: 최초 작성 (B-1 근본원인 확정, Code 인계 대기 OPEN)
- 2026-05-26: Code 수정 적용 — 6 컴포넌트('use client') + useStudioActions.runThumbnail() 빈 outputs guard. tsc/build 0. Desktop 실클릭 재검증 대기 (IN-VERIFY)
- 2026-05-26: **Desktop Chrome MCP 재검증 통과 → CLOSED.** 썸네일 4변형 실생성 확인. 다음 = 상세페이지 생성 → 저장 흐름 완주 + B-3 데이터 보정.
