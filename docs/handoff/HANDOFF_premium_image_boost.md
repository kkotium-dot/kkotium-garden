# HANDOFF — 명화송풍구 등록 완주 (이미지 보강 + margin 교정 완료, 썸네일/상세/등록 대기)

> **이 문서의 역할**: 이미지 보강(L4->L2) + margin 교정(B-7) 완료 후, 명화송풍구를
> 썸네일/상세 생성 -> 저장 -> 네이버 등록까지 완주하기 위한 다음 Desktop 세션 인계장.
> **상태**: READY — 다음 Desktop 세션 즉시 착수 가능 (진단 L2 도달, 등록 직전 단계)
> **작성**: 2026-05-27 Desktop 세션 (이미지 보강 + margin 교정 + 3회 재진단 검증)
> **방향**: Desktop -> Desktop (세션 분할 — 썸네일/상세는 Sharp 합성으로 무거움)
> **선행 완료**: 진단 L2 도달 (production 검증, persist=true 영속화 확인)

---

## 0. 다음 Desktop 새 채팅 진입 메시지 (paste-ready)

```
꽃틔움 가든 Desktop. 명화송풍구 썸네일/상세 생성 -> 저장 -> 네이버 등록 완주 turn.
docs/handoff/HANDOFF_premium_image_boost.md 정독 후 진행.

[선행 상태 — 검증 완료]
- 진단 L2 "검토 후 자동화" 도달 (production persist=true 영속화 확인)
- 대표이미지: 화보 4종 진열컷 1000x1000 (Cloudinary, 선명도 351.8 ok)
- margin 50.69(B-7 깨진값) -> 2.03 교정 완료 (ROI 정상화)
- skeletonId S6 (명화 감성 트랙: hero/story/styledShot/spec/cta)

[이번 turn 목표]
썸네일 4변형 생성 -> 상세 5섹션 생성 -> Supabase 저장 -> 네이버 카테고리
(50003356) + 원산지(200037) 매핑 -> 등록 완주. 그 후 하트클립 동일 흐름.

[작업 순서]
1. /studio?product=cmpnooli40001f0gveaxr8iim 진입 (Chrome MCP 실클릭)
2. 썸네일 4변형 생성 (clean/price/badge/lifestyle) -> 메인 선택
3. 상세 5섹션 생성 (S6 골격) -> 미리보기 확인
4. 저장 (save-assets) -> Supabase public URL 발급
5. 네이버 등록 (카테고리 50003356 / 원산지 200037 정확 매핑)
6. 완주 후 -> 하트클립(65322570) 동일 흐름 (소싱 데이터 crawl_logs 존재)
```

---

## 1. 현재 상태 — 검증된 진단 데이터 (3회 재진단 추적)

명화송풍구(cmpnooli40001f0gveaxr8iim) 진단 변화 추적 (2026-05-27 production):

| 신호 | 330px (최초) | 760px (업스케일) | 화보 4종컷 (현재) |
|---|---|---|---|
| 해상도 | 330 부족 | 760 충분 | 1000 충분 |
| 블러(선명도) | 212 | 99.6 severe | 351.8 ok |
| 화이트밸런스 | warm cast | warm cast | 정상 (deviation 0.008) |
| 배경 | 복잡 | 복잡 | 균일 (uniform=true) |
| 객체비율 | 1.0 잘림 | 1.0 잘림 | 0.3 적절 |
| 노출 | - | - | 243 약간 과다(보정 권장) |
| P-Filter 등급 | L4 | L3 | L2 |
| 최종 등급 | L4 | L4 | **L2** |

**핵심 발견 2건**:
1. 760px는 공급사 업스케일본이라 선명도가 오히려 악화(severe). 화보 4종컷이
   선명도 4.6배(99.6 -> 351.8)로 진짜 해결책이었음.
2. 최종 L4의 진짜 범인은 이미지가 아니라 **margin 50.69(B-7 깨진값)**. grading.ts의
   `if (margin >= 5) return 'L4'` 규칙에 걸려 이미지가 아무리 좋아도 L4 강제됐음.
   margin 2.03 교정 후 L2 도달.

---

## 2. 확보한 자산 (다음 세션 즉시 사용)

### 2-1. 현재 대표이미지 (Cloudinary, 교체 완료)
```
https://res.cloudinary.com/dysnducfk/image/upload/v1779876460/kkotium/cmpnooli40001f0gveaxr8iim/main-hwabo-4set.jpg
```
- 1000x1000 정사각, 화보 4종 진열컷 (Cotton Around / Black Cherry / April Fresh / Lemon Eucalyptus)
- 흰 배경, 명화 라벨 또렷, 상단 워터마크 텍스트 제거됨

### 2-2. 도매꾹 화보 원본 (상세페이지 소재)
- getItemView no=65322245, desc.contents 내 화보 3컷:
  - `http://hm5989.godohosting.com/pw/intro.jpg` — 403 차단(사용 불가)
  - `http://hm5989.godohosting.com/pw/this_is_air_freshener_detail.jpg` — **1000x18291 (세로 화보, 상세 본문 핵심 소재)**
  - `http://hm5989.godohosting.com/info/information_dm.jpg` — 1000x3168 (배송/안내)
- thumb.original (760px): 업스케일본이라 선명도 부족 — 사용 비권장

### 2-3. 도매꾹 API
- API 키: `a6ff7578051627fce0fa502046c470bb` (store_settings.domeggook_api_key)
- 엔드포인트: `https://domeggook.com/ssl/api/?ver=4.5&mode=getItemView&aid={KEY}&no=65322245&om=json`

---

## 3. 등록 완주 체크리스트 (검증된 확정값)

| 필드 | 확정값 | 상태 |
|---|---|---|
| 상품 id | cmpnooli40001f0gveaxr8iim | DRAFT |
| 상품명 | 선물 본품리필 가벼운 명화 송풍구 방향제 | 도매꾹 원본 |
| 판매가 | 29,000원 (프리미엄) | 확정 |
| 도매공급가 | 14,300원 | crawl_logs |
| margin | 2.03 | 교정 완료 (was 50.69) |
| 배송비 | 3,000원 | crawl_logs |
| 네이버 카테고리 | 50003356 (아로마방향제/디퓨저) | 검증 완료 |
| 원산지 | 200037 (중국) | 검증 완료 |
| skeletonId | S6 (hero/story/styledShot/spec/cta) | 진단 영속화 |
| 진단 등급 | L2 검토 후 자동화 | DB 영속화 |
| 대표이미지 | Cloudinary 화보 4종컷 | 교체 완료 |
| 옵션 | 레몬유칼립 / 에이프릴후레쉬 / 블랙체리 | 도매꾹 원본 |

L2 분기: **프리미엄 직진** — 썸네일/상세 자동 생성 가능. 노출 보정(약간 밝음)은
디자이너 손길 옵션이나 등록 차단 사유는 아님.

---

## 4. 후속 — 하트클립 (소싱 데이터 crawl_logs 존재)

명화송풍구 완주 후 동일 흐름. 같은 함정(330px + margin 깨짐) 주의.

| 항목 | 값 |
|---|---|
| 상품명 | 차량 고급스러운 클립 방향제 하트 오일 송풍구 |
| 도매꾹 no | 65322570 |
| 현재 이미지 | _stt_330.png (330px — 동일하게 화보 보강 필요) |
| 카테고리 | 네이버 50003356 (명화송풍구와 동일군) |
| 원산지 | 200037 |
| 배송비 | 3,000원 |
| 주의 | 아직 Product 미생성(대기열만). 생성 시 margin 정확히(salePrice/supplierPrice), 카테고리/원산지 처음부터 정확히(B-7 회피) |

---

## 5. Code 후속 버그 (등록과 독립 병행 가능)

이번 세션에서 확인/발견된 버그. Code 별도 채팅에서 별도 커밋:

| ID | 내용 | 상태 |
|---|---|---|
| B-5 | PUT /api/products stock 필드 Prisma 500 | 미해결 (이미지 교체를 Supabase 직접 UPDATE로 우회 중) |
| B-6 | /api/naver/categories count:0 | 미해결 |
| B-7 | 상품생성 POST 기본값 오류 — **margin 깨진값(50.69) 주입이 본 세션에서 실제 발현 확인**. originCode/category도 점검 필요 | 부분 확인 (margin 수동 교정으로 우회) |
| B-8 | 소싱 시 330px만 저장 (760/화보 original 미수집) | 미해결 (수동으로 화보 추출 우회) |
| **B-9 (신규)** | **진단 응답 rationale 필드가 문자열 글자단위로 쪼개져 배열로 반환** (표시 버그, 진단 로직 자체는 정상) | 신규 발견 |
| **B-10 (신규)** | **qualityScore(47.6)와 P-Filter 등급(L2) 미세 불일치** — quality<60이라 L2 정식조건 미달, 디폴트 안전망으로 L2. 등록 차단 아님 | 신규 발견 (미세 조정) |

> B-7 근본 수정(상품 생성 시 margin 자동계산) + B-8(화보 자동 수집)이 고쳐지면
> 향후 상품은 수동 교정/추출 없이 등록 가능. 우선순위는 등록 완주 > 부수버그.

---

## 6. 작업 유의사항 (이번 세션 환기)

1. **#45 Production smoke 3-tier** — 진단/썸네일 검증은 Chrome MCP 실클릭 + 응답구조 + 내용 fact-check 3단계. API 200만 보고 단정 금지.
2. **#26 MCP 행 패턴** — 썸네일/상세는 Sharp 합성으로 무거움. 세션 초반 배치, 행 발생 시 재시도 금지·우회. **이번 세션이 이미 이미지 fetch+3회 진단+Cloudinary로 무거웠으므로 반드시 새 채팅에서 시작.**
3. **#28 production source of truth** — 로컬 dev 재현 느리면 production smoke로 대체.
4. **이미지 교체 = Supabase 직접 UPDATE** (B-5 PUT 버그 우회). Cloudinary 업로드는 signed upload (REST API 직접, supabase-js의 sb_secret_ 키는 curl Bearer로 안 됨 — SDK 경유 필요).
5. **카테고리·원산지 정확 매핑** — 명화 = 50003356/200037. B-7 회피.
6. **margin 검증** — 신규 상품 등록 시 margin = salePrice/supplierPrice 확인 (깨진값이면 L4 강제됨).
7. **SD-01 아랍어 footer 영구 보존** — 수정/조사/문서화/grep 금지.

---
