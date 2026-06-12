# 새 채팅 스타터 — 2026-06-12 image-studio production LIVE (P0 실사용 검증)

작성 2026-06-12 / Code turn / 권위 보조 = docs/plan/PARALLEL_WORK_TRACKER.md(rev13) · TASK_BRIDGE §3(82)

---

## A. 직전 상태 (검증됨)

- **production LIVE**: feat/image-studio 3커밋(715f564 C-5 / dbb9fe7 충실도카드 / fa9ad01 적재v2+마운트) → main FF 병합 `015cc3f..fa9ad01`. Vercel production READY 확정(dpl_AK4omPEX·target=production·SHA fa9ad01·verify-deploy exit0·smoke /dashboard·/studio·/assets 200).
- **DB LIVE** (production Supabase): Product.fidelity 컬럼 + 명화 카드 **완성** / asset_registry 테이블 / product_asset_objects 함수(service_role).
- **명화 fidelity 완성 seed**: mountType=hanging_car_vent · components 5 · decorAllowed 5 · decorForbidden 5(metallic_leaves 등) · mountMechanic("spring clip on neck clamps one vent slat, bottle hangs in front straight down, cap+sticks up") · scents 4향(Cotton Around · Black Cherry · April Fresh · Lemon Eucalyptus) · promptInject · sourceRef.

## B. 이번 세션 산출 (요약)

- C-5 자산 브라우저(stage 그리드 + 대표/추가/아카이브 + 직접업로드 + Supabase 딥링크/경로복사).
- 적재 taxonomy v2(8스테이지: source/cutout/plate/reference/composite/thumbnail/detail/archive, thumb→thumbnail 레거시 읽기 별칭) + STAGE_NAMING 토큰(angle/mood/slot/context) + AssetRegistry 반자동 인테이크(stage 추론·정규리네임·sharp 치수·insert).
- 충실도 카드: 이미지 프롬프트 자동 주입(promptInject prepend + decorForbidden "Avoid:" 네거티브 + 마운트 물리정합 clause) + 발행 게이트 fidelity_check(set_main/add_extra)·mount_check(슬롯확정) 개입카드(#56·INPUT_DECISION).
- refetch broadcast(#62, window CustomEvent).
- 신규 작업원칙 #62~#65 등재. ENGINE v8.3 / PRODUCT_REGISTRATION #64.

## C. ★ 미해결 (정직 #63 — 가짜보고 금지)

- **production /assets composite 9개 미표시**: prod 런타임 Supabase Storage `list()`가 composite 중첩 prefix에 빈 배열 무오류 반환(cutout 3은 정상). **사전존재·내 병합 무관 입증**(로컬 순차 listProductAssets는 composite=9). 영향=자산 브라우저 composite 스테이지 표시 누락(파일·URL·extra_images 무손상).
- **RPC 결정적 수정 차단**: storage.objects 직접조회 함수 생성·service_role grant까지 했으나, 앱의 신형 `sb_secret_`(41자) 키 롤이 **public 스키마 USAGE 부재(42501)**. 앱에 .rpc() 선례 0. → 해소엔 "해당 롤 `GRANT USAGE ON SCHEMA public`"(미상 롤·스키마 권한 확대)이 필요 → **대표 결정 대기**(anon 미노출, 서버 전용 경로).

## D. 다음 순서 (P0 → P3)

- **P0 — Desktop 실사용 검증(#63)**: production fa9ad01에서 /studio·/dashboard 브라우저 테스트.
  1. 관제탑 fidelity_check·mount_check 카드 인라인 렌더(강제모달0·#56) — 액션 시드 후 노출.
  2. 에셋탭 업로드 → 자동분류·정규리네임 → asset_registry insert(execute_sql 확인).
  3. set_main/add_extra 후 헤더·캔버스 대표이미지 즉시 갱신(#62).
  4. firefly_drop 페이로드 promptInject + "Avoid:" + 마운트 물리정합 주입 확인.
  5. ★/assets composite 9개 표시 여부(C 이슈 재확인).
- **P1 — 이미지**: 명화 4컷 하모나이즈(Firefly 트랙2·reference/ 드롭) → composite/ 적재 → extra_images 스왑(가역) → 발행 GO(비가역 #46).
- **P2 — 타상품**: 달항아리·아이스트레이 v8 + 적재 v2 + fidelity 카드 자동생성(#64).
- **병행/대표 결정**: /assets composite RPC = 신형키 스키마 usage grant 승인 후 완성. asset-hygiene/main·origin-integrity = 별도 세션.

## E. 절대 준수

비가역 0(네이버 PUT/발행 = 대표 GO 전 0) · 한글 직접입력 · 실측 우선(#45) · **가짜보고 0(#63)** · Production=Vercel only · 전상품 범용(#55).
