# 작업 인계 — "네이버에도 반영" 부분 재연동 실구현 승인 (운영자 승인 완료)

> **담당 레인**: Claude Code
> **작성**: Desktop, 2026-08-11
> **BASELINE**: main 최신(`git pull`, 현재 `7b00816`)
> **의존성**: 없음 — 다른 진행 중 작업과 write set 무관
> **승인 상태**: ✅ 운영자가 설계(`docs/design/NAVER_PARTIAL_SYNC_2026-08-11.md`)를 승인. 이번 라운드는 §5에서 예고한 "다음 라운드" 실구현.

---

## 1. 구현 대상 (설계 §3 그대로)

설계 문서(`docs/design/NAVER_PARTIAL_SYNC_2026-08-11.md`)를 그대로 구현한다. 이미 완성도 높은 설계이니 재설계하지 말고 그대로 따를 것.

### 3-A. 변경 감지 (dirty-field tracking)
- `src/app/products/new/page.tsx`: hydrate 시점 스냅샷(`useRef`) → 저장 시점과 비교 → 변경된 필드 목록(사람이 읽는 라벨) 생성.
- **비교 대상은 `buildNaverProductPayload`가 참조하는 필드만**(화이트리스트) — 무관한 내부 필드(예: 내부 메모) 변경을 "네이버 반영 대상"으로 오표시하지 않을 것. 먼저 `product-builder.ts`를 읽고 정확한 필드 목록을 화이트리스트로 뽑을 것.

### 3-B. UI — 진입점 + 미리보기 + 확인
- 씨앗심기 저장 버튼 근처 **"네이버에도 반영"** 버튼(LINKED 상품에만 노출, `naverProductId` 있을 때만).
- 변경 필드 0건이면 버튼 비활성 + "변경된 내용이 없어요" 안내.
- 클릭 → 1단계: `/api/naver/products/update`를 `dryRun:true`로 호출 → 응답을 dirty-field 라벨과 매칭해 "이 필드가 바뀝니다" 모달(변경 필드 강조, 안 바뀐 필드는 "그대로 유지" 문구).
- 모달에서 운영자 명시 확인 후 2단계: `confirm:true`로 재호출 → 실 PUT.

### 3-C. 백엔드
- 기존 `/api/naver/products/update`를 그대로 재사용. 설계가 예상한 대로 백엔드 변경이 불필요한지 실측 후 확정 — 필요하면 `fields` 파라미터를 응답 필터링(하이라이트)용으로만 활용, PUT 자체 로직은 절대 안 바꿀 것(전체 재구성 원칙 유지).

## 2. 절대 준수 사항 (설계 §4 그대로, 재확인)
- **부분 PUT 금지** — 항상 `buildNaverProductPayload`로 전체 재구성.
- **GO 게이트 재사용** — 기존 `confirm:true && dryRun:false` 그대로, 새 게이트 만들지 말 것.
- **미리보기 필수** — dryRun 프리뷰 없이 바로 실행하는 경로를 만들지 말 것.
- **필드 화이트리스트** — 무관 필드 변경으로 오해 유발 금지.

## 3. 이번 라운드에서도 지킬 것
- **실제 네이버 PUT(즉 `confirm:true`로 실제 호출)은 이번 구현 라운드에 하지 말 것.** 코드 구현·`dryRun:true` 검증까지만. 실제 상품에 대고 진짜 PUT을 날리는 최종 검증은 운영자가 실제 상품 하나를 골라 명시적으로 재승인한 뒤, Desktop과 함께 진행.
- 이유: 이건 비가역 쓰기(#46)이고, 처음 배선하는 신규 UI 흐름이라 dryRun으로 여러 번 검증한 뒤 실전 투입하는 게 안전.

## 4. 검증 방법
1. LINKED 상품(예: `?edit=cmsk2387l0001vzjevn46oxa4`)을 열어 상품명이나 태그 하나를 수정.
2. "네이버에도 반영" 버튼이 활성화되는지, 변경 필드 목록에 정확히 그 필드만 표시되는지 확인.
3. dryRun 프리뷰 모달에서 "이 필드가 바뀝니다"가 실제로 수정한 필드와 일치하는지, 안 건드린 필드는 "그대로 유지"로 나오는지 확인.
4. **confirm:true 실행은 하지 말 것** — 모달까지만 검증하고 취소.
5. tsc 0 · build 0.

## 5. 완료 후
- 결과 문서: `docs/handoff/CODE_NAVER_PARTIAL_SYNC_RESULT_2026-08-11.md`
- 커밋·push → 채팅 인계 → Desktop이 dryRun까지 재검증 → 운영자에게 "실전 투입 승인" 별도 요청

## 체크리스트
- [ ] `git pull` 후 baseline 확인
- [ ] `product-builder.ts` 읽고 네이버 payload 필드 화이트리스트 확정
- [ ] 3-A: hydrate 스냅샷 + dirty-field 비교 로직
- [ ] 3-B: "네이버에도 반영" 버튼 + dryRun 프리뷰 모달 + confirm 실행 흐름
- [ ] 3-C: 백엔드 변경 필요 여부 실측, 필요시 최소 추가
- [ ] tsc 0 · build 0
- [ ] dryRun까지만 브라우저 검증(실제 confirm:true 실행 금지)
- [ ] 결과 문서 + 커밋·push + 채팅 인계
