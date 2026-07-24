# HANDOFF — P0 첫 발행 회선 + L2 이미지 변환 실증 검증 (명화 우선)

> 작성: 2026-06-04 Desktop | 권위: 발행 관제탑 STEP A~E 완료(production cb5151d) 후속
> 성격: **검증 전용(비가역 0)**. 실 register(POST)는 본 핸드오프 범위 밖 — 검증 통과 후 별도 대표 명시 승인.
> FROM: Desktop  →  TO: Code

---

## §0 이번 핸드오프의 결정적 발견 (Desktop 실측, 중복작업 방지)

직전 HANDOFF_publish_track_2026-06-04.md는 STEP P-1(네이버 이미지 업로드 어댑터 신설)과
P-2(발행 route L2 전처리 배선)를 "구현 필요"로 지시했으나, **Desktop 코드 직독 결과 이미 완성됨**:

| HANDOFF 지시 | 실제 코드 상태 (2026-06-04 Desktop 직독) | 결론 |
|---|---|---|
| P-1 업로드 어댑터 | `src/lib/naver/api-client.ts` `uploadImagesToNaver()` 완비(proxy/direct 양모드 + 매직바이트 MIME 판별 + 실패 throw) | **신설 금지(중복)** |
| P-2 route L2 배선 | `src/app/api/naver/products/register/route.ts` 7-img 단계: Supabase→네이버 업로드→shop-phinf 치환→detailContent img src 교체 | **배선 완료** |
| L3 안전핀 | 업로드 실패 시 502 + DRAFT 유지 + 정직 에러(#46) | **구현 완료** |
| home-proxy uploadImages | `scripts/home-proxy.mjs` `action:'uploadImages'` 블록 완비 | **코드 완비(가동은 검증 필요)** |

→ **P-1/P-2/L3 신규 구현 금지.** 발행을 막는 건 코드가 아니라 **회선(물리 인프라) 가동 확인**뿐.
→ P-3(L1 위젯 배지)는 발행과 무관(셀러 안심 UI) → 발행 후 별도 트랙으로 분리(이번 범위 밖).

---

## §1 Desktop 선실측 결과 (확정 사실)

- **명화 이미지 = Supabase URL 확정** (DB 직독):
  - main: `product-assets/cmpnooli40001f0gveaxr8iim/thumb-clean-1779884980341.png`
  - detail: `product-assets/cmpnooli40001f0gveaxr8iim/detail-S6-1779884981263.png`
  - → 발행 시 route가 자동으로 네이버 업로드→shop-phinf 치환(L2). DB 미리 변경 불필요.
- **proxy health 살아있음**: `{ok:true, cached_token:true, uptime≈2일}` (대표 브라우저 확인).
  - health는 "서버 가동 + 토큰 발급"까지만 보장. **실 API 200 + uploadImages 가동은 미검증.**
- 명화 발행 필드: salePrice 29000 / supplierPrice 14300(실마진 50.7%) / naverCategoryCode 50003356 /
  naver_title 35자 / 옵션 향3종 COMBINATION / originCode 200037(중국) / status DRAFT·naverProductId null.

---

## §2 Code 검증 절차 (전부 비가역 0 — 네이버 상품 등록 호출 0건)

### STEP 0 — 점검 (자동)
```
cd /Users/jyekkot/Desktop/kkotium-garden && \
git rev-parse HEAD origin/main && git status --short && \
curl -s -o /dev/null -w "production_http=%{http_code}\n" https://kkotium-garden.vercel.app/
```

### STEP 1 — 회선 실측 (production GET, 읽기 전용)
production 주소록 조회로 production→proxy→네이버 GET 회선 생존 확정.
```
curl -s -w "\nHTTP=%{http_code}\n" https://kkotium-garden.vercel.app/api/naver/addressbooks
```
- 기대: HTTP 200 + releaseAddressId/returnAddressId 노출(또는 diagnostics).
- 실패(502/ECONNRESET/IP_NOT_ALLOWED): diagnostic.kind 보고 → Desktop이 분기 판정.

### STEP 2 — ★ L2 이미지 변환 실증 (핵심, 비가역 0 — 이미지만 업로드, 상품 등록 아님)
proxy에 명화 main 이미지 1장만 보내 shop-phinf URL 반환을 확인.
회선 + 최신 코드(uploadImages 액션) + 네이버 이미지 API를 **한 번에** 검증.
`.env.local`에서 NAVER_PROXY_URL / PROXY_SECRET 로드 후:
```
source <(grep -E '^(NAVER_PROXY_URL|PROXY_SECRET|CRON_SECRET)=' .env.local | sed 's/^/export /')
PROXY_SECRET="${PROXY_SECRET:-$CRON_SECRET}"
curl -s -w "\nHTTP=%{http_code}\n" -X POST "$NAVER_PROXY_URL" \
  -H "Content-Type: application/json" \
  -H "x-proxy-secret: $PROXY_SECRET" \
  -d '{"action":"uploadImages","imageUrls":["https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/thumb-clean-1779884980341.png"]}'
```
- 기대: HTTP 200 + `{"images":[{"url":"https://shop-phinf.pstatic.net/..."}]}`.
  → shop-phinf URL이 나오면 **L2 전체 경로(회선+코드+이미지API) 실증 완료**. 발행 시 이미지 400 불가 확정.
- 400 "PhotoInfraUpload.*": proxy가 구버전(uploadImages 미적용) 또는 이미지 형식 이슈 → 사유 보고.
- 401 Unauthorized: PROXY_SECRET 불일치 → .env.local 값 확인.
- 502/타임아웃: 회선 이슈 → STEP 1 결과와 대조.

### STEP 3 — dryRun 페이로드 최종 점검 (네이버 호출 0, DB mutate 0)
명화 발행 페이로드 17필드 + 옵션 최종 검증. dryRun은 이미지 미업로드(Supabase URL 미리보기).
```
curl -s -X POST https://kkotium-garden.vercel.app/api/naver/products/register \
  -H "Content-Type: application/json" \
  -d '{"productId":"cmpnooli40001f0gveaxr8iim","dryRun":true}' | python3 -m json.tool
```
- 점검: leafCategoryId=50003356 / name(naver_title) / optionCombinationCount=3 /
  originAreaInfo.importer / productInfoProvidedNotice.type=ETC + etcKeys 9 /
  claimDeliveryInfo / minorPurchasable / imagesToUpload(main/detail 노출).

---

## §3 검증 결과 → 분기

| STEP 1 | STEP 2 | STEP 3 | 다음 |
|---|---|---|---|
| 200 | shop-phinf | 정상 | **발행 준비 완료** → Desktop 새 채팅에서 대표 명시 승인 → 실 register |
| 200 | shop-phinf | 필드 누락 | 누락 필드 보강 후 재검증 |
| 200 | 400/401 | - | proxy uploadImages 가동/시크릿 점검 (대표 home proxy 재pull+재시작 여부) |
| 502 | - | - | 회선 장애 → Tailscale Funnel proxy 재가동(대표 home) |

★ **하드룰(불변)**: 네이버 register/POST는 대표 명시 승인 없이 호출 0건.
  본 핸드오프 STEP 0~3은 전부 읽기/이미지업로드/dryRun = 비가역 0. 실 발행은 별도 승인 게이트.

---

## §4 세션 종료 시 Code MD 갱신 의무 (5종)
- PROGRESS.md 헤더 + ROADMAP.md + SESSION_LOG.md + TASK_BRIDGE.md §3 ACTIVE + (CLAUDE.md 있으면).
- 기록 핵심: (1) P-1/P-2/L3 기구현 확정으로 직전 HANDOFF_publish_track 지시 중복 무효화
  (2) 회선 health 생존 (3) STEP 1~3 실측 결과 (4) 발행은 대표 승인 대기.
- 한글 MD는 Python full-overwrite(작업원칙 #29b). heredoc 금지(iterm), Filesystem:write_file 사용.
- 본 핸드오프 파일을 docs/handoff/ 로 보존.

## §5 비가역 하드룰 (재확인)
- register/POST 대표 명시 승인 없이 호출 0. 변환 실패 = 중단 + 정직 보고(#46).
- 라이브 production API 우선 권위(#45). 가짜 "등록 완료" 금지.
