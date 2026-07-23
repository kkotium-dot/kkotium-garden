# 꽃틔움 가든 — Desktop 인계 (2026-07-23)

BASELINE: main `73046a2` (== origin/main == prod, Vercel 200)
작성: Desktop 세션(DESKTOP-1 종결 시점). **Filesystem MCP 다운 → Desktop Commander로 저장(#298).**
정본 트래커: `docs/plan/PARALLEL_WORK_TRACKER.md` rev81 · 원칙 #295~#299 · PROGRESS 2026-07-23.

## 이번 세션 완료
- **DESKTOP-1 처분 7채널 정합 실측 종결**: 정합 6/7, 부활소 이탈 확정, 원복 완결.
  - 주입: inventory_snapshots qty=-1 3행(now/-1h/-2h 끼임회피) + Product naverProductId=TEST-NAVER-1.
  - 실측: sourceGone=TRUE(선두 연속음수 3). 채널1(처분 대기함) 육안 PASS(삭제안전 1건). 부활소 육안+grep 이탈.
  - 원복: TESTDISP-* 전량 삭제 + pid/naver_status_type NULL 복귀 확인(0 / null / null).
- Code 산출 검토: 감사(부활소 + products/page.tsx:878 부분이탈) · 강건성 티켓 · 스모크 스크립트.
- 카테고리 회귀 의심 포착: 부활소에 미발행("등록 미완료") 노출 = 발행여부 분리(스펙 §1) 미전파.

## 다음 Desktop READY
1. **처분 스모크 실행** — 대상: naverProductId 有 + inventory_snapshots 0건 상품.
   현 3상품: 달항아리(DRAFT·pid null) · 아이스트레이(DRAFT·pid null) · 플라티코(INACTIVE·pid 10523253208).
   적합 대상 없으면 임시 등록상태 부여 후 실행→원복. 안전조건 위반 시 abort 확인.
2. **일원화 구현(Code) 배포 후 브라우저 재검증** — 부활소/처분/목록/대시보드 6→7 정합 확인.
3. **카테고리 회귀 확정** — Code 검증 보고분(발행여부 분리 부활소 미전파) 결과 확인.
4. **명화→플라티코 상품셋 교체 경위 확인**(명화=검증 baseline #55).

## 능력 경계 / 커넥터
- **Filesystem MCP 다운 시 → Desktop Commander**(read_multiple_files/write_file/edit_block/start_process)로 우회(#298). 또는 Cmd+Q 재실행으로 Filesystem 복구.
- Supabase MCP 정상. Vercel 조회 정상. Chrome 스크린샷은 컨텍스트 전송 불가 → UI 시각검증은 운영자 육안(#265).

## 절대 금지
- 네이버 스토어 PUT/POST(#46) — "GO — 실제 반영" 금지. 발행게이트는 모달 열기까지만.
- 디스코드 실발송(크론 수동 실행) — 운영자에게 실제 알림 발송됨.
- 테스트 데이터 방치 — 주입 시 원복 필수(TESTDISP-* 전량 삭제).

## 원복 SQL (스모크 수동 실행 시)
```
DELETE FROM inventory_snapshots WHERE id LIKE 'TESTDISP-%';
UPDATE "Product" SET "naverProductId"=NULL, naver_status_type=NULL WHERE id='<대상 productId>';
-- 확인: SELECT count(*) FROM inventory_snapshots WHERE id LIKE 'TESTDISP-%';  (0이어야)
```

## 병렬 (의존성 없음)
- **Cowork**: 생애주기 3문서 설계(LIFECYCLE_STATE_MACHINE / COPY_SYSTEM / SURFACE_RULES · deriveLifecycleState · 발행여부 축).
- **Code**: 미커밋 3파일 커밋 + 카테고리 회귀 검증(읽기) + 강건성 정책확정 준비.
- **유일 순서**: 실제 코드 수정(부활소·SubstituteEditor:878·발행여부 필터)은 Cowork 설계 확정 후.

---

# 2026-07-23 세션 말미 상태 (Desktop · rev84 시점)

## ⚠️ 최우선 — 미push 5커밋
`git rev-list --left-right --count HEAD...origin/main` = **5 0** (로컬 5커밋 앞섬, 미push).
- `8472fe6` 부활소 발행게이트 + draft_incomplete 제거 + 정원창고 이어서작성 큐
- `a4a47c6` 브리지 §3 정정 + tracker rev83 + COLLABORATION_PLAYBOOK 신설
- `e2048ba` **lifecycle.ts 신설** + CLAUDE.md 포인터 + TASK_BRIDGE stale 정정
- `7bdbc0f` DOMAIN_FACTS + LIFECYCLE_BRIDGE_V2 + tracker rev82 + 원칙 #300~304
**→ 프로덕션에 오늘 작업이 전혀 반영되지 않았다. push 없이는 프로덕션 검증 불가(#305/#306).**

## 미커밋 (untracked) — Cowork v2 3종
`docs/design/LIFECYCLE_STATE_MACHINE.md` / `COPY_SYSTEM.md` / `SURFACE_RULES.md`
(Cowork가 폴더 연결 후 실제 저장 성공. 코드값 대조 완료: 상태 7종·액션 5종·실제 메뉴 라벨.)
→ 커밋 대상. Code에 위임.

## 완료 (로컬 기준)
- lifecycle.ts 신설(7상태 파생 단일함수, source-gone/sales-assets 재사용)
- 부활소 발행 게이트(T-19) + draft_incomplete 제거 + 정원창고 "이어서 작성" 큐(착지처)
- 브리지 "9종" 오기 3곳 전량 정정(§3 제목·§4 표·§9 1항) → 7종 확정
- Cowork v2 3종 저장 + 코드 정합 검증

## 다음 Desktop READY (배포 후에만 유효)
1. **프로덕션 배포 확인** — Vercel SHA가 최신 커밋과 일치하는지 먼저 확인
2. Chrome 실측 3화면 교차검증: 부활소(미발행 0건이어야) · 정원창고("이어서 작성 N건" 배지) · 꽃밭돌보기(발행분만)
3. 처분 스모크 실행(scripts/smoke-disposition-channels.ts) — 대상 선정 필요
4. 명화→플라티코 상품셋 교체 경위 확인

## 미진행
- SubstituteEditor(products/page.tsx:878) 넛지 → dispositionVerdict 소비 전환
- surfaceRules.ts 권한 매트릭스 + T-01~T-20 테스트
- 부활소 판정 엔진 자체를 deriveLifecycleState() 소비로 전환(Code 보류 — 리팩터 위험도)
- 운영자 결정 2건: 보관함(ARCHIVE) 도입 여부 · sourceGone 강건성 정책(권장 C)
- 명화 스토어 판매중지 PUT(#46 GO 대기)

## 절대 금지
네이버 PUT/POST(#46) · 디스코드 실발송 · 테스트데이터 방치.

---

# 2026-07-23 프로덕션 실측 검증 (Desktop · rev85 시점 · 배포 `1d50ed1`)

배포 확인: production SHA = `1d50ed1` == HEAD (Code 3중 확인 + Desktop Chrome 실측).

## 검증 결과 3화면

| # | 화면 | 결과 | 실측값 |
|---|---|---|---|
| 1 | 좀비 부활소 | ✅ PASS | 전체 **0건**, 등록 미완료 0, "모두 양호합니다" — 미발행 2건 제거 확인(T-19 해소) |
| 2 | 정원 창고 | ✅ PASS | 전체 3개 중 **표시 2개**(아이스틀·달항아리), 발행 가능 2, "준비된 것 일괄 발행 2" — 착지 확인(#301/#56) |
| 3 | 꽃밭 돌보기 | ✅ PASS | 전체 3개 중 **표시 1개**(플라티코, 발행분만) — 발행여부 경계 정상 |

## 신규 발견 — 미해결 2건 (다음 세션 최우선)

### F1. 꽃밭돌보기 "재활성화 필요 1" ↔ 부활소 0건 모순 (★교차 화면)
- 꽃밭돌보기 플라티코 행: 배지 `좀비 발견·판매중지`, 라벨 **"재활성화 필요 1"**, 버튼 **재활성화**
- 그러나 부활소는 **0건**("모두 양호합니다") → 버튼을 눌러 이동하면 **빈 화면**
- 원인: 부활소에만 `!!p.naverProductId` 필터를 넣고, **꽃밭돌보기의 "재활성화 필요" 카운트는 여전히 자체 기준**
- 판정: #295 위반 패턴의 **이동**. 한 화면 수정으로 모순이 옮겨갔을 뿐. **두 화면이 같은 판정 소스를 소비해야 해소**
- 부수 의문: 플라티코는 발행 상품(NAVER-10523253208)인데 부활소 4사유(품절/장기미판매/점수급락/미완료) 어디에도 안 잡힘 → 부활소 사유 판정 누락 가능성 조사 필요

### F2. 정원창고 "이어서 작성" 배지 미노출 — 트리거 축 불일치
- Code는 `gardenCounts.notReady` 기반 배지를 신설했으나, 실측 **준비 미흡 = 0** → 배지 미노출
- 원인: 부활소가 쓰던 `draft_incomplete`(= **미발행 상태**)와 정원창고 `notReady`(= **입력 정보 부족**)는 **다른 축**
- 현재 두 상품 상태: 준비도 84%, 발행 8/8, 상품명 S → 시스템상 "발행 가능"
- 제안: 배지 문구를 "등록 미완료 N건 — 이어서 작성"이 아니라 **"발행 가능 N건 — 발행하러 가기"**로 재정의하거나, 이미 존재하는 "준비된 것 일괄 발행 N" 버튼과 **중복이므로 제거**
- 근거: "준비 미흡 0"이라 말하면서 "이어서 작성" 배지를 띄우면 **T-20 계열 모순**(진단↔처방 불일치)

## 다음 Desktop READY
1. F1 수정 배포 후 → 꽃밭돌보기·부활소 카운트 **일치** 재검증
2. F2 배지 재정의 후 → 정원창고 실측
3. 처분 스모크 실행(대상: naverProductId 有 + 스냅샷 0건)
4. 명화→플라티코 상품셋 교체 경위 확인
