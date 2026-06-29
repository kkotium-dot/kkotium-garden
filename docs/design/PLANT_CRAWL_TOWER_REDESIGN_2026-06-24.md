# DESIGN BRIEF 2026-06-24 (rev27) - COPY-AUTO-2 확정·2.1 진행 · Gemini 로그결론 · ★NAVER-APP 장애 발견

Authoring: DESKTOP -> CODE-CLI. SD-01 untouched. #45/#46/#55/#62/#82/#124/#155/#157/#158/#159.
Baseline prod edd0281 (COPY-AUTO-2). 권위 리서치: docs/research/NAVER_PRODUCT_NAME_DIAGNOSIS_AND_HOOK_PHRASE_2026-06.md

================================================================
## COPY-AUTO-2 - 확정(신규 PASS) · COPY-AUTO-2.1 진행 중
================================================================
- COPY-AUTO-2 신규 플로우: Desktop 라이브 PASS(자동초안·1회·Anthropic 0·편집점유). Code 정적 fact-check(allowPaidFallback:false가 seo-workflow:472에서 Anthropic 차단·hookPhrase PUT 동적 allowlist 라운드트립·POST 명시저장·GET include 로드)·tsc0/build0. prod=edd0281.
- COPY-AUTO-2.1(재오픈 캐시 레이스): Desktop 발견(fresh 캐시 상품 재오픈 시 비동기 로드 전 자동발사 1회). Code 수정 진행 중. 배포 후 Desktop 검증(재오픈 seo-workflow 0·미덮어쓰기).

================================================================
## Gemini 상태 - 로그 실측 결론 (운영자 질의)
================================================================
- Vercel 런타임 로그(승인) 실측: prod edd0281 statusCode 200(90)/304(46)·**4xx/5xx 없음** → 서비스 건강·Groq 정상 응답·사용자 영향 0.
- ★Gemini 429는 prod 로그로 **격리 불가**: Gemini는 폴백이라 Groq 200 성공에 가려져 에러로그에 미표출. 직접 smoke(이전 429·공유 GCP 쿼터)가 유일 근거.
- 결론: Groq=정상(로그 확정). Gemini=키 유효·쿼터 제한 추정·서비스 무지장. **운영자 GCP 프로젝트 분리가 정확한 해법(진행 중)**. 분리 후 Desktop이 강제 폴백 경로로 재검증 가능.

================================================================
## ★★ NAVER-APP-1 (네이버 커머스 API 애플리케이션 상태 무효) [신규 발견·운영자 조치 — 중요]
================================================================
Desktop 로그 실측(prod edd0281, 최근 1h, 1분 간격 반복):
```
GET /api/dashboard/stats → [NAVER_DIAG] HTTP_ERROR status=500
GET [proxy]/v1/pay-order/seller/product-orders ...
body: Naver OAuth failed: 400 - {code:BadRequest, message:"입력한 데이터가 유효하지 않습니다",
  invalidInputs:[{type:"auth.eapp-application.status.invalid", message:"어플리케이션 상태가 유효하지 않습니다"}]}
```
- 증상: 대시보드 주문/매출 통계(pay-order/product-orders)가 **1분마다 500 실패**. OAuth 단계에서 네이버가 **애플리케이션 상태 무효(eapp-application.status.invalid)**로 거부.
- 근본원인: **코드 아님 — 네이버 커머스 API 애플리케이션 상태 문제**(만료/미승인/비활성/계약 갱신필요 등). 자격증명(키/시크릿)이 아니라 '애플리케이션 상태'.
- ★영향 확대(#62): 동일 OAuth 경로를 쓰는 **명화 발행 PUT(#46/#124)도 동일 사유로 실패할 것** → NAVER-APP-1 미해결 시 발행 불가. 즉 발행 GATE에 이 항목 추가.
- 조치(운영자): 네이버 **커머스 API 센터**에서 애플리케이션 상태 확인 — 승인/재승인, 약관 재동의, 등록/계약 갱신, 또는 애플리케이션 재활성화. (Claude는 네이버 콘솔 접근·키 미취급.)
- Code(보조): /api/dashboard/stats가 이 상태를 사용자에게 친화적으로 표면화(무한 500 대신 "네이버 앱 상태 확인 필요" 안내)하는 graceful 처리 검토 — 단건 아닌 전 네이버 호출 경로 공통(#62). 우선순위는 운영자 콘솔 조치가 먼저.

================================================================
## LANE PLAN (우선순위)
================================================================
1. COPY-AUTO-2.1 재오픈 캐시 레이스 수정 (Code, 진행 중) → Desktop 검증.
2. ★NAVER-APP-1: 운영자 네이버 커머스 API 센터에서 애플리케이션 상태 조치(대시보드 복구 + 발행 GATE 해제 전제).
3. 명화 backfill (operator).
4. 명화 publish PUT <- backfill+reconcile+**NAVER-APP-1 해결**+GO (#46/#124).

================================================================
## BACKLOG SPECS (영구 #157)
================================================================
- NAVER-APP-1 graceful 표면화(Code·전 네이버 경로 공통)·운영자 콘솔 조치 후.
- HOOK-3: detail→온실 아틀리에 이송. CR-1 폴리시(선택). Gemini 키 GCP 분리(운영자 진행). NAME-DIAG-1.1 CLOSED.

================================================================
## PRINCIPLES
================================================================
- #160 (NEW): 런타임 로그로 발견한 무관 장애도 단건 무시 말고 즉시 표면화·영향 확대(#62) 분석 — NAVER-APP-1은 대시보드뿐 아니라 발행 경로 공통 OAuth라 발행 GATE에 연결. 정적 코드검증으론 못 잡는 운영 장애는 prod 로그/실측으로만.
- #159 비동기 로드 이후 평가 자동동작은 로드 완료 게이트(프리뷰 미검출·prod 레이스). #158 검증 대상 정체 먼저확정. #155 자동경로 무료 전용. #82 정직·로그 한계 명시(Gemini 격리 불가). #45 Done=실측. #46/#124 발행 lock. SD-01 불가침.
