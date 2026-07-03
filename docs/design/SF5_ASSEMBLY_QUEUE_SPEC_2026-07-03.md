# SF-5 — 상세 조립 상태 → Operator Action Queue 통합 스펙 (2026-07-03)

Authoring: DESKTOP. 권위: OPERATOR_SYSTEM_BLUEPRINT(#56) + C9_INTERVENTION_CARDS_BUILD_SPEC + intervention.ts(C-9 개입 타입) + control-tower-engine.computeActionQueueItem. 구현=Code. 원칙 #55/#56/#35/#181.
전제: SF-1~4a + SF-3b(조립 엔진 코어) DONE·prod검증. Operator Action Queue = **이미 성숙 구현**(C-9, 12종 개입 타입). SF-5 = **개입 타입 1종 추가**(신규 시스템 아님).

================================================================
## 0. 목적 (왜)
================================================================
조립 엔진(SF-1~4a)을 운영자 작업 흐름에 자연스럽게 녹임(#56 완성). **"자산은 준비됐는데 상세페이지가 아직 조립 안 된 상품"**을 Operator Action Queue가 **비강제 넛지 카드**로 표면화 → 1클릭으로 배양실 상세 캔버스 진입. 1인 셀러가 "다음에 뭘 조립해야 하는지" 큐만 보면 알게 됨.

================================================================
## 1. verify-first (#181 — Code 착수 전 실측)
================================================================
★Code 필수 — 기존 C-9 패턴을 정확히 미러(신규 스타일 금지):
- `intervention.ts` — 개입 타입 const 선언 + payload builder + InterventionType union 패턴.
- `control-tower-engine.ts` `computeActionQueueItem`(line 456~) — actionQueue vs **extraQueue**(idle 부가 넛지) 생성 로직, idle-gating(category_dna_unseeded/firefly_auto식 "otherwise-idle만 노출").
- `control-tower-strings.ko.json` — 한글 라벨 격리(#35) 키 구조.
- 조립 상태 판정 데이터: `detail_images`(jsonb·SF-2) + `description`(SF-3b 카피) + 조립 가능 자산 존재(composite/cutout/detail stage).

================================================================
## 2. 신규 개입 타입 — `detail_assembly`
================================================================
- **const**: `INTERVENTION_DETAIL_ASSEMBLY = 'detail_assembly'` (InterventionType union 추가).
- **트리거(판정)**:
  - 조립 가능(assemblable): 상품에 composite/cutout/detail stage 자산 ≥1 존재.
  - 미완(incomplete): `detail_images` 비어있음(이미지 미배정) **OR** `description`에 조립 카피 없음(빈/플레이스홀더).
  - → 둘 다 참이면 카드 후보.
- **분류**: INPUT_DECISION · **비강제·extraQueue idle 넛지**(category_dna_unseeded 미러) — 긴급 작업(발행 대기·source_request 등) 있으면 그게 우선, 상품이 otherwise-idle일 때만 노출(#56 "숨기거나 강제하지 않음").
- **payload**: `{ productId, missingImages: boolean, missingCopy: boolean }` (product-agnostic #55, productId에서 파생).
- **딥링크**: `/studio?product={id}&tab=image` + 배양실 탭 활성(상세 캔버스). (#182 배양실 탭이라야 보드 마운트.)
- **한글 라벨**(control-tower-strings.ko.json #35): 예 —
  - title: "상세 조립 미완"
  - desc: "자산은 준비됐으나 상세페이지가 아직 조립되지 않았습니다."
  - action: "상세 캔버스 열기"
  - (missingImages/Copy에 따라 desc 미세 분기: "이미지 미배정" / "카피 미작성" / "이미지·카피 미완")

================================================================
## 3. 단계 (단일 증분·저위험)
================================================================
- **SF-5**: 개입 타입 추가 + computeActionQueueItem 트리거 배선 + 한글 라벨 + 딥링크. 판정은 읽기(기존 필드), 신규 컬럼 0·발행 무관(#46).
- 검증(Desktop): 조립 미완 상품이 **관제탑/큐에 넛지 카드로 노출** · 1클릭 → 배양실 상세 캔버스 진입 · 조립 완료(detail_images+description 채운) 상품은 카드 **미노출**(음성) · 긴급작업 상품은 넛지가 그걸 안 가림(idle-gating).

================================================================
## 4. 원칙·규격
================================================================
- 전상품 범용(#55)·key-only 코드+한글 i18n 격리(#35)·이모지0·Lucide.
- 비강제(#56) — 강제 모달 금지·idle 넛지·1클릭 딥링크.
- 판정=읽기 전용(detail_images/description/자산)·신규 컬럼 0·발행 무관(#46).
- 기존 C-9 패턴 정확 미러(#181) — 새 카드 스타일/큐 경로 만들지 말 것.

================================================================
## 작업 유의사항/원칙
================================================================
- #190: 개입점 추가는 **기존 C-9 Operator Action Queue(intervention.ts + computeActionQueueItem)에 타입 1종 확장**으로 — 별도 큐/카드 UI 신설 금지(#56/#62 단일 관제탑 #87).
- #56 재확인: 넛지는 idle-gating(otherwise-idle만) — 긴급 작업을 절대 가리지 않음.
- SF-5로 조립 엔진(SF-1~4a)이 #56 개입 흐름에 완전 편입 → "조립 엔진 + 운영 큐" 통합 완성.
