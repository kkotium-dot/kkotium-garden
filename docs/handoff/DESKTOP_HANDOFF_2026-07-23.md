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
