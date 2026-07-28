# 명화 원산지 정정 — 국산 확정 + naver_origin 필드 오류 (정정본) (2026-07-10)

Authoring: DESKTOP(Supabase + origin-codes-full.ts 실측 + 운영자 정정). 원칙 #45/#62/#242. ★이 문서가 PUBLISH_READINESS_VERIFY_ORIGIN_DRIFT의 잘못된 방향을 정정함. 상태: Code 조치 대기(발행 전 필수).

## 0. 결론 (정정)
- **명화 원산지 = 국내산/국산(한국).** 운영자 명시 정정 + 코드표 실측 일치.
- Desktop 이전 발견("originCode 00은 오류·0200037 중국으로 정정")은 **틀렸음 → 철회.** 스테일 기억(중국산)에 근거한 역방향 오판이었음.

## 1. 실측 근거
- origin-codes-full.ts: `code '00' = 국산 (importer:false)` · `code '0200037' = 중국`.
- 명화 DB: originCode="00"(=국산·정확) · naver_origin="중국"(오류).
- 발행 payload(product-builder.ts:955~1019): originAreaCode = resolveOriginAreaCode(originCode) = "00"(국산) 전송 → **발행은 국산으로 정확히 나감**. isImport=Number("00")<200000=false(국산 처리 정확). 단 naver_origin이 있으면 originAreaInfo.content로 첨부 → **content="중국"이 붙어 코드(국산)와 모순**.
- evaluateOriginTruth("00"): 원산지코드표(518건)에 "00" 존재 → 통과(정상·"00"은 유효 국산코드). 이전 "체크가 플레이스홀더를 통과시킴" 주장도 오류.

## 2. 조치 (Code·발행 전 필수·독립)
1. **명화 naver_origin "중국" → "국산"(또는 "한국")로 정정.** originCode="00"은 **그대로 둠**(국산 정확). → 코드·텍스트 정합.
   - 다른 상품(아이스트레이·달항아리)은 originCode=0200037·naver_origin=중국으로 정합(그들은 중국산이 맞으면 유지·운영자 미언급이므로 변경 안 함).
2. **systemic 정합 체크(#62·#242)**: evaluateOriginTruth/getPublishReadiness에 "originCode↔naver_origin 라벨 정합" 검증 추가 — code가 국산('00', importer:false)인데 content(naver_origin)가 수입국명이면 모순 경고/fail. 전 상품 대상. (origin-codes-full.ts의 label과 대조.)
3. 검증: 명화 naver_origin=국산 → 발행 준비/미리보기 payload에서 originAreaCode=00 + content 모순 없음 → Desktop 재확인.

## 3. 교훈
- 스테일 기억(중국산 confirmed)을 근거로 실데이터("00")를 "오류"로 단정 → 역방향 오판. **코드표 원본(origin-codes-full.ts) 먼저 대조했어야 함.** 확정 사실도 운영자 재확인 시 갱신하고, 필드 의미는 소스로 검증.

## 작업 유의사항/원칙 (갱신)
- **#242(갱신)** 코드-라벨 이중 필드(originCode↔naver_origin)는 정합 검증 필수하되, **어느 쪽이 정답인지는 소스 코드표(origin-codes-full.ts)와 운영자 확인으로 판정**(스테일 기억으로 방향 단정 금지). "00"은 유효한 국산코드(플레이스홀더 아님). 발행 준비 체크는 "코드 유효성 + 코드-라벨 의미 정합(국산코드인데 content가 수입국이면 모순)"까지 전 상품 검증(#62).
