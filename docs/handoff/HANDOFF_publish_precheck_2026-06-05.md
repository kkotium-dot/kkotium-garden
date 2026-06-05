# HANDOFF — P0 명화 첫 발행 직전 실측 완료 + 발행 실행 경로 확정

> 작성: 2026-06-05 Desktop 산출 → Code 저장 위임(#49, Filesystem MCP 행으로 Desktop write 불가)
> FROM: Desktop -> TO: Code
> 권위: STEP 0 정독 + 발행 직전 라이브 실측(Supabase 직독 + Vercel MCP + curl 이미지 생존)
> 성격: 점검 전용. 코드/DB mutate 0, 발행 미접촉, 비가역 0. register/POST 호출 0건.
> baseline: production f2ea274 (HEAD==origin/main, Vercel READY)

## 1. 발행 직전 라이브 실측 (Desktop 직접 확인분 = 최신 권위)
- 명화 cmpnooli40001f0gveaxr8iim: status DRAFT / naverProductId null (미발행 확정, 비가역 안전)
- name "선물 본품리필 가벼운 명화 송풍구 방향제"(원본) ≠ naver_title 35자 (덮어쓰기 버그 없음)
- salePrice 29000 / supplierPrice 14300 (가격기반 실마진 50.7%)
- naverCategoryCode 50003356 / originCode 200037(중국) [컬럼명 camelCase 주의]
- mainImage=Cloudinary(발행 대표 실사용) / detail_image_url=Supabase detail-S6
- 이미지 생존 curl: 대표 HTTP 200 99224B / 상세 HTTP 200 185670B (Adobe 만료 리스크 영구적재로 차단 확인)
- 옵션(product_options 테이블): COMBINATION ["향"] 3종 레몬유칼립/에이프릴 후레쉬/블랙체리, 각 stock 999 ON_SALE
- naver_material/color/size = null (dryRun 경고 2건 정체) / naver_as_info 완비 / keywords 7종
- crawl_logs 소스 레코드 0건 → 재질/색상 신뢰 근거 부재 → 추측 금지(#46), "상세참조" 유지
- Vercel: production f2ea274 READY (발행 로직 미접촉, 회선/dryRun f689625 실측값 유효)

## 2. 발행 준비 종합 — 3축 + 5대 점검 전부 통과, 발행 차단 결함 0건
1축 DB/비가역 DRAFT·null / 2축 회선 200·L2 allShopPhinf true / 3축 dryRun canRegister true
이미지 생존 200·200 / 옵션 향3종 정상 / 상품명 정합 / margin 함정 재발 없음 / 재질색상 null(근거없어 비움이 정답)

## 3. ★ 발행 실행 경로 (Desktop register 호출 불가 — 정직 #46)
register는 NAVER_PROXY_URL/PROXY_SECRET 사용 = Vercel env + 대표 home 프록시 전용. Desktop MCP 부재.
→ 발행 실행 = (1) 앱 UI 발행 버튼, 또는 (2) Code 발행(권장: 발행 후 naverProductId+DB+노출 3중 검증).
하드룰: register/POST는 대표 명시 승인 없이 호출 0건. 실패=중단+정직 보고. 가짜 ID/완료 금지(#46).

## 4. 발행 후 보강 계획 (A안 채택)
재질/색상은 발행 후 실제 상품 확인 → 수정 API 보강(신상품 가점 24~48h 내). 추측 금지. imageCount 0 → additionalImages 집계 후속 점검.

## 5. 다음
(A) 대표 발행 GO → 경로1/2 택 → 명시 승인 → 실 register. (B) 발행 후 둘째 상품 hero 시안 + 명화 재질/색상 보강.
