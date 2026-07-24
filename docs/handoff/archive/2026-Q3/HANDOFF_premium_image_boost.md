# HANDOFF — 명화송풍구 등록 완주 (B-11 우회 완료, B-12 등록 라우트 수정 대기)

> **이 문서의 역할**: 명화송풍구를 네이버 등록까지 완주하기 위한 Desktop 세션 인계장.
> **상태**: BLOCKED — B-12(등록 라우트 구조결함) Code 근본수정 후 등록 가능.
> **작성**: 2026-05-27 Desktop 세션 (B-11 우회 완주 + B-12 발견)
> **방향**: Desktop -> (Code B-12 수정) -> Desktop 등록 완주
> **선행 완료**: B-11 우회 완주 (상세 Storage 업로드 + Product URL DB 기록, 3중 검증 통과)

---

## 0. 다음 Desktop 새 채팅 진입 메시지 (paste-ready)

```
꽃틔움 가든 Desktop. 명화송풍구 네이버 등록 완주 turn (B-12 Code 수정 후).
docs/handoff/HANDOFF_premium_image_boost.md 정독 후 진행.
브라우저 Browser 1 사용. studio 탭 product=cmpnooli40001f0gveaxr8iim.

[STEP 0 — 사전 정독]
docs/handoff/HANDOFF_premium_image_boost.md ->
docs/handoff/HANDOFF_naver_register_fix.md (B-11/B-12 인계) ->
docs/plan/PROGRESS.md (헤더) -> TASK_BRIDGE.md §3 ACTIVE

[선행 상태 — 검증 완료]
- B-11 우회 완주: 상세 PNG(186KB) Storage 업로드 + Product main/detail_image_url
  DB 기록 완료 (DB 3중 검증 통과)
- 진단 L2 / 골격 S6 / margin 2.03 / 카테고리 50003356 / 원산지 200037 전부 확정
- 대표이미지 Cloudinary 화보 4종컷 + 상세 S6(186KB) 모두 살아있음

[차단 해제 조건]
B-12 (네이버 등록 라우트 구조결함) Code 근본수정 완료 신호 필수.
B-12 미해결 상태로 등록 시 -> 방향제가 '의류'로 오등록 + 실패를 성공으로 거짓기록됨.

[이번 turn 목표]
1. Code의 B-12 수정 production 반영 확인 (register 라우트가 naverCategoryCode 사용)
2. 명화송풍구 네이버 커머스 API 등록 (사용자 승인 하 — 비가역)
3. 3중 검증: 등록 응답 naverProductId 실재 / Product.status / 네이버센터 실 노출
4. 완주 후 -> 하트클립(도매꾹 65322570) 동일 흐름 (아직 Product 미생성)

[필수 기법]
- studio 버튼: pointerdown~mouseup~click 풀 이벤트 시퀀스 (단순 .click() 무반응)
- save-assets 우회 검증된 패턴: 페이지내 fetch로 thumbBase64+detailBase64 동시 전송
  (B-11 근본수정 전까지). 단 Code가 B-11도 고치면 정식 버튼 경로 재테스트.
- 네트워크 가로채기(window.__kkotiumNetLog) + DB 3중 검증. API 200 단정 금지(#45).
- base64 직접 화면 출력은 브라우저 보안 차단됨 -> 페이지내 fetch 경유.

작업원칙 절대 준수 — 검증은 production + DB 기준, 거짓 진행 보고 금지.
```

---

## 1. B-11 우회 완주 기록 (2026-05-27 Desktop)

명화송풍구 저장배관 버그(B-11)를 우회로 완전 해소. DB 3중 검증 통과.

| 단계 | 방법 | 결과 |
|---|---|---|
| 1. 진단/썸네일/상세 메모리 확인 | studio get_page_text + DOM base64 probe | 4단계 모두 메모리 생존 (상세 860x5980 포함) |
| 2. Product 행 DB 검증 (1차) | Supabase execute_sql | main/detail_image_url 둘 다 **null** -> B-11 실재 확정 |
| 3. save-assets 재호출 (우회) | 페이지내 fetch로 thumbBase64+detailBase64 동시 전송 | 200/ok:true/detailUrl 발급/errors 0 |
| 4. Storage 검증 | Supabase storage.objects | detail-S6(186KB) + thumb-clean(44KB) 둘 다 실재 |
| 5. Product UPDATE (우회) | Supabase 직접 UPDATE (main/detail_image_url) | DB 기록 완료, updatedAt 갱신 |

**B-11 근본 원인** (Code 인계 -> HANDOFF_naver_register_fix.md):
1. save-assets 라우트가 Storage 업로드만 하고 Product 테이블 UPDATE 로직 부재(설계상).
2. studio 프론트 호출부가 detailBase64 미전송 (thumb만 전송).

---

## 2. B-12 — 네이버 등록 라우트 구조결함 (신규, 치명, Code 수정 대기)

`src/app/api/naver/register/route.ts` 정독 결과 발견. 상세 명세는
`docs/handoff/HANDOFF_naver_register_fix.md` §2 참조. 요약:

| # | 결함 | 영향 |
|---|---|---|
| 1 | categoryMap(의류 7종)에 없으면 '50000006'(의류) fallback, naverCategoryCode 무시 | 방향제가 의류로 오등록 |
| 2 | API 실패해도 status='registered' + PENDING_/ERROR_ id | 거짓 성공 기록 (#46 위반) |
| 3 | detailContent = description 만, detail_image_url 미포함 | 상세페이지 누락 등록 |
| 4 | X-Naver-Client-Id/Secret 헤더 인증 | 커머스 API는 OAuth2 Bearer+전자서명 — 인증부터 의심 |

---

## 3. 확정 등록값 (B-12 수정 후 이 값으로)

| 필드 | 값 |
|---|---|
| 상품 id | cmpnooli40001f0gveaxr8iim |
| 상품명 | 선물 본품리필 가벼운 명화 송풍구 방향제 |
| 판매가 / 공급가 / margin | 29,000 / 14,300 / 2.03 |
| 배송비 | 3,000 |
| 네이버 카테고리 | 50003356 (아로마방향제/디퓨저) |
| 원산지 | 200037 (중국) |
| 대표이미지 | Cloudinary 화보 4종컷 (mainImage 컬럼) |
| 상세이미지 | Supabase detail-S6 186KB (detail_image_url 컬럼) |
| 옵션 | 레몬유칼립 / 에이프릴후레쉬 / 블랙체리 |

---

## 4. 후속 — 하트클립 (Product 미생성)

명화송풍구 완주 후 동일 흐름. 도매꾹 no=65322570. 카테고리 50003356 / 원산지 200037.
생성 시 margin = salePrice/supplierPrice 정확히, 카테고리/원산지 처음부터 정확히(B-7 회피).

---

## 5. 작업 유의사항 (영구 환기)
1. **#45 3중 검증** — 등록은 API 200 + 네이버 실 노출 + DB 행 3중. 화면 표시 신뢰 금지.
2. **#46 거짓 라벨 금지** — B-11/B-12 둘 다 "실패를 성공으로 기록" 병. 등록도 같은 함정 주의.
3. **#26 MCP 행 패턴** — 상세는 Sharp 합성으로 무거움. 세션 분할, 행 발생 시 재시도 금지.
4. **이미지/URL 교체 = Supabase 직접 UPDATE** (B-11 근본수정 전까지 우회).
5. **카테고리·원산지** — 명화 = 50003356/200037. naverCategoryCode 컬럼이 진실.
6. **SD-01 아랍어 footer 영구 보존** — 수정/조사/문서화/grep 금지.
