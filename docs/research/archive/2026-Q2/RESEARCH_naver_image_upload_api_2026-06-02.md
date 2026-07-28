# 네이버 커머스 API v2 상품등록 이미지 처리 — "올바른 이미지 파일이 아닙니다" 400 해결 명세

> 저장일: 2026-06-02 | 출처: Desktop 심층 리서치 | 권위 문서 (이미지 업로드 API baseline)
> 트리거: 달항아리 register 18:34 KST → 400 {"code":"BAD_REQUEST","message":"올바른 이미지 파일이 아닙니다."}
> 다른 필드(정보고시 ETC/카테고리 50000963/주소/배송/minorPurchasable/PRIMARY) 전부 통과, 이미지만 남음.

---

## TL;DR
- **원인은 이미지 파일이 아니라 흐름(flow).** 네이버는 representativeImage.url에 외부 스토리지(Supabase) public URL 직접 사용 불가.
  반드시 "상품 이미지 다건 등록 API(POST /external/v1/product-images/upload)"에 파일 바이너리를 먼저 업로드 →
  응답 shop-phinf.pstatic.net URL만 상품등록 payload에 사용해야 함.
- 메인테이너 권현철(Discussion #1964): representativeImage.url은 "상품 이미지 다건 등록API를 통하여 반환된 URL로만 설정 가능".
- 해결 = 2단계: (1)Supabase 바이트 fetch → (2)multipart/form-data로 imageFiles 필드 업로드(per-part MIME 실제값) →
  (3)반환 네이버 URL을 representativeImage.url/optionalImages에 매핑. 1000x1000 progressive JPEG 자체는 거부원인 낮음.
- detailContent HTML 내부 <img> src도 동일하게 네이버 업로드 URL이어야 함(아니면 InvalidImageUrl).

## Key Findings

### 1. 외부 URL 직접 사용 불가 — 2단계 업로드 필수
메인테이너 권현철(GitHub #1964, 2024-09-20): originProduct.images.representativeImage.url은
"상품 이미지 다건 등록API를 통하여 반환된 URL로만 설정이 가능". Supabase/S3/Cloudinary public URL을
representativeImage.url에 직접 넣으면 거부 = 현재 꽃틔움 가든 상황 그대로.
- 업로드 API는 호출자가 이미지 바이트(바이너리)를 multipart로 전송 → 네이버 CDN(shop-phinf.pstatic.net)에 올린 뒤 자사 URL 발급.
  (네이버가 외부 URL을 직접 fetch하는 방식 아님)

### 2. 이미지 업로드 API 정확 스펙 (공식 FAQ #117)
- 엔드포인트: POST https://api.commerce.naver.com/external/v1/product-images/upload
  (약식 표기 /v1/product-images/upload, 실제 base는 /external)
- 형식: multipart/form-data, boundary 필수(헤더선언 + 각 파트구분 + EOF구분)
- 폼 필드명: 모든 파일 동일하게 "imageFiles" (다수여도 같은 이름 반복)
- per-part Content-Type: 실제 포맷 MIME (JPEG image/jpeg, PNG image/png, GIF image/gif, BMP image/bmp)
- 제약: 1회 최대 10개 / 합계 10MB(10^7 bytes) 미만 / JPEG·GIF·PNG·BMP만 / 해상도 제한 없음 /
  스토어 계정당 동시 1건만(동기 호출 필수)
- 응답(#1884 실제): {"images":[{"url":"https://shop-phinf.pstatic.net/..._JPEG/...jpg"}, ...]}

### 3. "올바른 이미지 파일이 아닙니다"(PhotoInfraUpload.unavailable) 400 원인
- 외부 URL 직접 사용 (현재 핵심 원인). 응답 type=PhotoInfraUpload.unavailable (#1666).
- per-part Content-Type ≠ 실제 MIME (확장자 .jpg인데 데이터는 PNG, 또는 image/jpeg 하드코딩).
  권현철: "MIME Type은 저장된 실제 이미지 포맷 기준. 확장자와 다를 수 있음". type=PhotoInfraUpload.extension.
- multipart boundary 누락/오류. 권현철: 라이브러리 래핑 메소드 사용 권장.
- 헤더 Content-Type을 application/json으로 호출 → 415 UNSUPPORTED_MEDIA_TYPE (#2216).
- Authorization 헤더에 Content-Type/boundary 혼입 → 인증오류. Authorization엔 토큰만.
- **progressive JPEG/CMYK가 거부원인이라는 공식 근거 없음.** 1000x1000 progressive JPEG 파일 자체는 원인 가능성 낮음.

### 4. detailContent 내부 이미지도 동일 규칙
#1882: 상세 HTML <img> src에 미업로드 URL → originProduct.detailContent / type=InvalidImageUrl /
"정상적으로 업로드한 이미지만 등록 가능". 상세이미지도 네이버 업로드 URL 필수.

## Details

### 작동하는 2단계 구현 (Node 18+ / Next.js / Vercel)

**1단계 — 업로드 함수**
```js
async function uploadImagesToNaver(imageUrls, accessToken) {
  const form = new FormData();
  for (const url of imageUrls) {                 // 최대 10개, 합계 10MB 미만
    const resp = await fetch(url);               // Supabase public URL에서 바이트 취득
    const buf = Buffer.from(await resp.arrayBuffer());
    const mime = resp.headers.get('content-type') || 'image/jpeg'; // 실제 MIME (매직바이트 sniff 권장)
    const blob = new Blob([buf], { type: mime }); // Blob type → per-part Content-Type
    form.append('imageFiles', blob, 'image.jpg'); // 필드명 반드시 imageFiles
  }
  const res = await fetch(
    'https://api.commerce.naver.com/external/v1/product-images/upload',
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }
    // Content-Type 수동설정 금지 (boundary 자동생성)
  );
  if (!res.ok) throw new Error(`이미지 업로드 실패: ${await res.text()}`);
  const { images } = await res.json();           // [{url:'https://shop-phinf.pstatic.net/...'}]
  return images.map((i) => i.url);
}
```

**2단계 — 상품등록 payload 매핑**
```js
const naverUrls = await uploadImagesToNaver([supabaseMainUrl, ...subUrls], token);
payload.originProduct.images = {
  representativeImage: { url: naverUrls[0] },
  optionalImages: naverUrls.slice(1).map((u) => ({ url: u })),
};
// detailContent 내부 <img>도 naverUrls로 교체
```

핵심 주의: FormData 전송 시 Content-Type 헤더 수동지정 금지(boundary 빠짐). undici/axios가 자동 생성.
axios+form-data는 form.append('imageFiles', buffer, {filename, contentType: realMime}) + headers:{...form.getHeaders(), Authorization}.
프록시(Tailscale) 경유 시에도 동일 — 단 멀티파트가 프록시를 온전히 통과하는지 확인 필요.

### 이미지 규격 (2025~2026)
- 대표이미지 1000x1000 적합. 업로드 API 해상도 제한 없음. 권장 1:1 정방형 1300px+.
- 허용: JPEG/GIF/PNG/BMP(업로드 API). 최대 합계 10MB/회. 52,888B 단일파일 여유 통과.
- progressive vs baseline: 공식 거부근거 없음. 안전 위해 baseline sRGB 재인코딩은 무해한 예방책.
- 대표/추가이미지 → images.representativeImage.url / optionalImages[].url. 상세 → detailContent <img src>. 모두 shop-phinf URL.

### Vercel/IP 주의
커머스API센터는 앱별 호출IP 최대 3개 등록. Vercel 동적 IP 불일치 시 거부 가능.
단 꽃틔움 가든은 다른 API(카테고리/배송/정보고시) 이미 통과 → 현재 문제는 IP 아닌 이미지 흐름. IP는 향후 분리 과제.

## Recommendations (실행)
1. **즉시(핵심)**: representativeImage.url에 Supabase URL 직접 넣는 코드 제거 → 2단계 파이프라인 도입.
   Supabase 바이트 fetch → /external/v1/product-images/upload(imageFiles) → 반환 shop-phinf URL을 payload에 사용.
   이 하나로 현재 400 해소 가능성 매우 높음.
2. per-part MIME 정확화: 각 파일 Content-Type을 확장자 아닌 실제 포맷으로(file-type 매직바이트 sniff).
3. 헤더 위생: FormData에 Content-Type 수동지정 금지(라이브러리 boundary 자동). Authorization엔 토큰만.
4. 동시성 직렬화: 이미지 업로드는 계정당 동시 1건 → 순차(동기) 호출.
5. detailContent 이미지: 상세 HTML 모든 <img> src를 네이버 업로드 URL로 교체(외부 URL 잔존 시 InvalidImageUrl).
   ※ 공통슬롯 notice-top/bottom 이미지도 동일 — 네이버 업로드 거쳐야 detailContent에 넣을 수 있음.
6. IP 고정(Vercel): 향후 IP 불일치 오류 시 고정 egress IP 경로 + 커머스API센터 등록.

**변경 트리거(다음 판단 기준)**: 1번 적용 후에도 400 + 응답 type —
- PhotoInfraUpload.extension → MIME 불일치(2). 실제 포맷 재확인.
- boundary 메시지 → 헤더/라이브러리(3). FormData 자동헤더 전환.
- 415 UNSUPPORTED_MEDIA_TYPE → 요청헤더 multipart 교정.
- InvalidImageUrl(detailContent) → 상세 HTML 외부 URL 잔존(5).
- 모든 경우 GNCP-GW-Trace-ID 캡처 후 네이버 GitHub 문의.

## Caveats
- progressive JPEG/CMYK 거부 공식근거 없음. 가능성 낮으나 1번 후에도 특정 파일만 실패 시 baseline sRGB 재인코딩 시도.
- 저장소 실전예시는 대부분 Python(requests files=[('imageFiles',(filename,bytes,'image/jpeg'))]). 위 Node 코드는 공식 규칙 이식, 운영 검증 필요.
- 이미지 업로드 v1 / 상품등록 v2 — 버전 다름이 정상(상품등록 v1은 2022-12-21 중단).
- detailContent 공통슬롯 이미지(notice-top/bottom)도 네이버 업로드 선행 필요 → 슬롯 URL을 Supabase→네이버 변환하는 단계 추가.

## 출처
- 네이버 커머스 API GitHub Discussions: #1964(외부URL 불가/MIME/boundary 권현철), #117(업로드 API FAQ),
  #1884(응답 구조), #1666(PhotoInfraUpload.unavailable), #1882(detailContent InvalidImageUrl),
  #2216(415/IP), #1(FAQ)
