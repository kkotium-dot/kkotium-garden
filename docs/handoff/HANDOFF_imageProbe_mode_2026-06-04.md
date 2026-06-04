# HANDOFF — imageProbe 검증 모드 추가 + STEP 2 L2 실증 (명화 우선)

> 작성: 2026-06-04 Desktop | 권위: P0 발행 회선 검증(production e2353d4) 후속
> 성격: **검증 모드 추가(비가역 0)**. register/POST 실 발행은 본 범위 밖 — 대표 명시 승인 게이트 별도.
> FROM: Desktop  →  TO: Code

---

## §0 왜 imageProbe가 필요한가 (Desktop 실측 확정)

STEP 1 회선 200 / STEP 3 dryRun 정상이나, **STEP 2(이미지 변환 실증)가 양 환경 모두 막힘**:
- Desktop: production·proxy 직접 호출 보안 차단.
- Code: NAVER_PROXY_URL/PROXY_SECRET 로컬 부재(Vercel env + 대표 home proxy 전용). 시크릿 대화 노출 금지.

→ **해결**: register route에 `imageProbe` 모드 추가. production 경로(Vercel의 proxy 시크릿 사용)로
이미지만 네이버 업로드 → shop-phinf URL 반환 확인. **상품 register(POST) 호출 0, DB mutate 0 = 비가역 0.**

### ★ Desktop DB 직독 — 이미지 도메인 진실 (핸드오프 §1 전제 정정, #45)
명화(cmpnooli40001f0gveaxr8iim) 이미지 컬럼 3종:
| 컬럼 | 값 | 발행 사용 |
|---|---|---|
| `mainImage` | **Cloudinary** res.cloudinary.com/.../main-hwabo-4set.jpg | ★ 대표이미지 소스 |
| `main_image_url` | Supabase thumb-clean-...png | 미사용(레거시) |
| `detail_image_url` | Supabase detail-S6-...png | 상세이미지 소스 |
| `additionalImages` | null | — |

→ 직전 HANDOFF §1 "main=Supabase"는 **틀린 컬럼**(main_image_url)을 본 것. 발행 실사용은
`mainImage`=Cloudinary. register route `supaMain = product.mainImage`(7-img 단계)가 이를 확인.
→ **숨은 리스크**: Cloudinary 401 차단 이력(2026-05-15) — 살아있어야 L2가 원본 fetch 성공.
imageProbe가 생존+변환을 동시 실증.

---

## §1 코드 패치 사양 (register/route.ts 단일 파일, 가산식)

### 패치 1 — body 구조분해에 imageProbe 추가
**기존:**
```ts
    const { productId, forceRegister, dryRun } = body as {
      productId: string;
      forceRegister?: boolean;
      dryRun?: boolean;
    };
```
**변경:**
```ts
    const { productId, forceRegister, dryRun, imageProbe } = body as {
      productId: string;
      forceRegister?: boolean;
      dryRun?: boolean;
      imageProbe?: boolean;
    };
```

### 패치 2 — payload 빌드 직후 / register(8단계) 직전에 imageProbe 분기 삽입
**삽입 지점**: `// 7. Build full payload with Naver shop-phinf URLs.` 블록의
`const payload = buildNaverProductPayload(...)` **다음 줄**, `// 8. Register on Naver Commerce API` **앞**.
**삽입 코드:**
```ts
    // 7-probe. imageProbe — L2 이미지 변환만 실증. 위 7-img/7-img-notice 업로드는
    // 실행됨(gallery/detail/notice → shop-phinf 치환). 단 상품 register는 호출 안 함.
    // 비가역 0: naverRequest POST 0, prisma.update 0. 이미지만 네이버에 업로드됨
    // (상품 미연결 = 발행 하드룰 대상 아님). Cloudinary 생존 + 회선 + 코드 동시 검증.
    if (imageProbe) {
      const repUrl = payload.originProduct.images.representativeImage.url;
      const optUrls = (payload.originProduct.images.optionalImages ?? []).map((i) => i.url);
      const isShopPhinf = (u: string | undefined): boolean =>
        !!u && u.includes('shop-phinf.pstatic.net');
      const allShopPhinf =
        isShopPhinf(repUrl) &&
        (naverDetail ? isShopPhinf(naverDetail) : true) &&
        optUrls.every(isShopPhinf);
      return NextResponse.json({
        success: true,
        imageProbe: true,
        sourceUrls: { main: supaMain, detail: supaDetail, additionalCount: supaAdditional.length },
        convertedUrls: {
          representativeImage: repUrl,
          optionalImages: optUrls,
          detailImageNaver: naverDetail,
          noticeTop: noticeForBuild.topImageUrl,
          noticeBottom: noticeForBuild.bottomImageUrl,
        },
        allShopPhinf,
        note: '이미지 업로드만 실행 — register/POST 호출 0, DB mutate 0 (비가역 0)',
      });
    }

```

★ 회귀 가드: imageProbe 미전달(undefined) 시 분기 건너뜀 → 기존 발행/ dryRun 흐름 100% 불변.

---

## §2 검증 (Code)
```
[ ] npx tsc --noEmit → 0 errors
[ ] npm run build → OK
[ ] git diff: register/route.ts 단일 파일(패치 1+2만). 다른 파일 0.
[ ] 이모지 0 / 사용자 노출 한글 리터럴은 응답 note만(API 응답이라 허용) / 비가역 0
[ ] 엔진(publish-readiness.ts)·관제탑 미접촉
```

## §3 STEP 2 실증 (배포 후 Code curl — production 경로 = Vercel proxy 시크릿 사용)
```
curl -s -X POST https://kkotium-garden.vercel.app/api/naver/products/register \
  -H "Content-Type: application/json" \
  -d '{"productId":"cmpnooli40001f0gveaxr8iim","imageProbe":true}' | python3 -m json.tool
```
- 기대: `allShopPhinf: true` + representativeImage/detailImageNaver가 `shop-phinf.pstatic.net`.
  → **L2 전체 경로 실증 완료**(Cloudinary main + Supabase detail → shop-phinf). 발행 시 이미지 400 불가 확정.
- `allShopPhinf:false` 또는 502: convertedUrls/diagnostic 보고 → Desktop 분기.
  - main fetch 실패(Cloudinary 401): mainImage 소스 교체 필요(main_image_url Supabase 또는 재업로드).

## §4 분기 판정
| imageProbe 결과 | 다음 |
|---|---|
| allShopPhinf true | **발행 준비 완료** → Desktop 새 채팅 → 대표 명시 승인 → 실 register |
| Cloudinary fetch 실패 | mainImage 소스 교체(Supabase main_image_url 사용 검토) 후 재probe |
| 회선 502 | proxy 점검 |

## §5 (선택, 비차단) dryRun 경고 보강 — attributeGrade 개선
dryRun 경고 2건: 필수속성 `재질`·`색상` 누락(canRegister=true라 발행은 가능). 발행 후 보강 가능.

## §6 세션 종료 MD 갱신 (5종) + 핸드오프 보존
- PROGRESS/ROADMAP/SESSION_LOG/TASK_BRIDGE §3/(CLAUDE) 갱신. 한글 MD = Python full-overwrite(#29b).
- 기록 핵심: (1) 이미지 도메인 진실(mainImage=Cloudinary, main_image_url=Supabase, §1 전제 정정 #45)
  (2) imageProbe 모드 추가 (3) STEP 2 실증 결과 (4) 발행은 대표 승인 대기.
- 본 핸드오프 docs/handoff/ 보존.

## §7 비가역 하드룰 (불변)
- register/POST 대표 명시 승인 없이 호출 0. imageProbe는 이미지 업로드만(상품 미연결) = 비가역 0.
- 변환 실패 = 중단 + 정직 보고(#46). 라이브 production 우선 권위(#45).
