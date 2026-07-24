# HANDOFF — P0 첫 발행 트랙 (명화 우선) + 게이트 사각지대 하이브리드 수술

> 작성: 2026-06-04 Desktop | 권위: 발행 관제탑 STEP A~E 완료(production cb5151d) 후속
> 성격: 비가역(네이버 register/POST) 트랙. 새 채팅에서 신중 진행.
> 전제: 발행 관제탑 production 반영 완료. 명화/달항아리 GREEN, 아이스트레이 RED 라이브 실증.

---

## §0 이번 트랙이 막아야 할 핵심 함정 (Desktop 실측 발견)

발행 관제탑 라이브 API(production)가 명화를 `naverPayloadComplete:true / publishReady:true`로
보고하지만, 명화의 실제 `main_image_url` / `detail_image_url` 은 **Supabase 공개 URL**이다.

```
main_image_url:   https://doxfizicftgtqktmtftf.supabase.co/.../thumb-clean-...png
detail_image_url: https://doxfizicftgtqktmtftf.supabase.co/.../detail-S6-...png
```

네이버 커머스 API는 Supabase URL을 거부한다(메모리 확정 학습). 반드시
`POST /external/v1/product-images/upload`로 먼저 업로드 → 반환된
`shop-phinf.pstatic.net` URL만 발행 페이로드에 써야 한다.

### 근본 원인 (코드 레벨, src/lib/automation/publish-readiness.ts)

게이트의 이미지 검사는 "값의 존재"만 본다:
```ts
main_image_url: isNonEmptyString(input.main_image_url),         // 비어있지 않은가?
detail_image_url: isNonEmptyString(input.detail_image_url),
// 진정성 검사도 https:// 시작 여부까지만:
if (!input.detail_image_url || !input.detail_image_url.startsWith('https://')) { ...위반... }
```
Supabase URL도 `https://`로 시작하는 멀쩡한 문자열이라 전부 통과한다.
→ 게이트는 "재료 존재"까지만 책임, "네이버 규격 형식"은 검사 범위 밖 = 거짓 초록.

---

## §1 하이브리드 수술 설계 — "표시는 솔직하게, 변환은 자동으로"

단순 `url.includes('shop-phinf')` 한 줄 추가는 명화를 빨강으로 바꿔 셀러 멘탈모델을
무너뜨린다(하수). 2개 레이어로 분리한다.

| 레이어 | 위치 | 동작 | 셀러 경험 |
|---|---|---|---|
| L1 표시 게이트 | 대시보드 위젯(항상) | 자산 존재 = GREEN 유지 + "발행 시 이미지 자동 변환" 배지 | "창작 끝났다" 안심 |
| L2 발행 전처리 | 발행 route(버튼 누를 때) | Supabase URL 감지 → 네이버 이미지 API 자동 업로드 → shop-phinf URL을 페이로드 주입 + DB 영구 저장 | 셀러 개입 0 (자동 흡수) |
| L3 안전핀 | 변환 실패 시 | 하드 스톱 + 정직 에러("이미지 변환 실패, 발행 중단"). 가짜 "등록 완료" 금지(#46) | 실패해도 거짓 0 |

### 설계 근거
1. 메모리 핵심 목표 정합 — 셀러는 창작 지점에서만 개입, 형식 변환은 엔진이 흡수.
2. 재발행 멱등성 — L2가 변환 후 shop-phinf URL을 DB에 되써서 2회차부터 변환 스킵.
3. #46 영구 차단 — L3가 실패 시 발행 중단 + 정직 보고 → "초록인데 실패" 함정 소멸.

### 부가(선택) — 진단 전용 플래그
L1 게이트에 `naverImageReady`(차단 안 함, 진단용)를 넣어 "변환 대기" 색 구분 가능.
단 L2 자동 변환이 들어가면 셀러가 신경 쓸 필요 없어지므로 1차는 배지 + 자동변환으로 충분.

---

## §2 구현 순서 (새 채팅, Desktop→Code 핑퐁)

### STEP P-1 (Code) — 네이버 이미지 업로드 어댑터
- 기존 발행 route에서 이미지 업로드 헬퍼 위치 확인(이미 존재하면 재사용, 중복 금지).
- `uploadImagesToNaver(urls[]) -> shopPhinfUrls[]` 단일 진입점.
  POST /external/v1/product-images/upload, 반환 URL만 사용.
- 비결정/실패 시 throw(L3) — 절대 원본 URL 폴백 금지(네이버 거부 확정).

### STEP P-2 (Code) — 발행 route L2 전처리 배선
- 발행 페이로드 빌드 직전: main/detail/additional 이미지가 shop-phinf 도메인이 아니면
  uploadImagesToNaver 호출 → 결과로 치환 → Product 컬럼 되쓰기(멱등).
- shop-phinf 이미 적용분은 스킵(재호출 0).

### STEP P-3 (Code) — L1 위젯 배지
- PublishControlTowerWidget: main/detail URL이 shop-phinf 아니면 "발행 시 이미지 자동 변환"
  배지 표시(GREEN 유지, 차단 아님). i18n control-tower-strings.ko.json에 문구 추가.

### STEP P-4 (Desktop) — 발행 직전 최종 실측 + 대표 승인 게이트
- Supabase로 명화 이미지 URL이 shop-phinf로 전환됐는지 확인(또는 L2가 발행 시 처리하는지).
- 17 naver_* 필드 + 옵션(향 3종 COMBINATION) 재확인.
- ★ 대표 명시 승인 후에만 발행 API 호출(하드 스톱, 비가역).

---

## §3 명화 발행 페이로드 실측 스냅샷 (2026-06-04 Desktop, Supabase 직독)

| 항목 | 값 | 상태 |
|---|---|---|
| id | cmpnooli40001f0gveaxr8iim | |
| name | 선물 본품리필 가벼운 명화 송풍구 방향제 | OK |
| status | DRAFT / naverProductId null | 미발행 정상 |
| salePrice / supplierPrice | 29000 / 14300 (실마진 50.7%) | OK |
| margin 컬럼 | 2.03 (진단등급용 배수=의도값, 미교정) | 유지 |
| naverCategoryCode | 50003356 | OK |
| naver_title | 명화 차량용방향제 송풍구 디퓨저... (35자) | OK |
| 옵션 | 향 3종 COMBINATION(레몬유칼립/에이프릴후레쉬/블랙체리) 각 재고999 | OK |
| asPhone / naver_as_info | 고객센터+운영시간+010-3227-4805 | OK |
| originCode / naver_origin | 200037 / 중국 | OK |
| naver_tax_type | 과세상품 | OK |
| keywords / golden_keyword_score | 7개 / 72점 | OK |
| **main_image_url** | supabase.co/.../thumb-clean.png | ★ 변환 필요 |
| **detail_image_url** | supabase.co/.../detail-S6.png | ★ 변환 필요 |

→ 명화는 "이미지 네이버 변환" 한 단계만 빼면 발행 준비 완료. 그 외 17 필드 충족.

---

## §4 달항아리 (P0 후순위)
- publishReady true, 단 가격기반 마진 23.2% (얕음) → 가격 재검토 후 발행 권고.
- main_image_url = product-images/.../main.jpg (역시 형식 확인 필요).

## §5 비가역 하드룰 (불변)
- 네이버 register/POST는 대표 명시 승인 없이는 절대 호출 0.
- 변환 실패 = 발행 중단 + 정직 보고. 가짜 "등록 완료" 금지(#46).
- 라이브 production API가 코드/게이트 표시보다 우선 권위(#45).
