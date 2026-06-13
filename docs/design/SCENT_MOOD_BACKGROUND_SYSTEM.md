# Scent/Concept -> Mood Background 시스템 (전상품 공통)
> 2026-06-13 (Desktop, 세션7-e) · 명화 april/cotton 발견 케이스 → 전상품 공통 규약으로 승격
> 본질: 단건 수습 금지. 발견된 오류는 프로젝트 전역 가드로 승격(#76). 앱 개입점에 자연스럽게 녹임(#56).

---

## 0. 발견 (명화 april/cotton — 검증 케이스)
운영자 지적: april(꽃)=부실·컨셉컷 부적합·톤 부적합 / cotton=린넨 천 사진처럼 보임.
근본원인 2가지:
1. **컨셉 미스매치** — 프롬프트가 "사물"(linen fabric stack / wild meadow)을 묘사 → 향(香)의 무드가 아니라 물건 사진이 나옴.
2. **생성설정 미스** — 비율 자동·해상도 1K·그라운딩 OFF·이전 결과 참조 잠금 상태로 생성(캡처 확인).
→ 둘 다 단건이 아니라 전상품 공통 가드로 승격.

---

## 1. 규칙 A — 배경은 "사물"이 아니라 "가치/감각의 무드" (제품 불문)
모든 상품의 배경/무드컷은 **그 상품의 핵심 가치·감각 제안을 시각화**한다. 사물을 그대로 찍지 않는다.
- 향(香) 상품 → 그 향이 환기하는 **공기감·빛·분위기**(섬유 더미 ✗, 꽃 접사 ✗).
- 기능 상품 → 그 기능이 주는 **결과/감정 상태**(제품 단독 ✗).
- 판별 질문: "이 배경이 *제품의 약속*을 느끼게 하는가, 아니면 *재료/사물*을 보여주는가?" 후자면 컨셉 재정의.

### 명화 4향 적용 예 (RULE의 worked example — 일반 규칙이 우선)
| 향 | 사물(✗ 금지) | 무드(✓ 채택) |
|---|---|---|
| April Fresh | 들꽃밭/잡초 접사 | 봄 첫 햇살의 맑은 플로럴 공기감(풍성 파스텔 블라썸·골든 백라이트·청량 haze) |
| Cotton Around | 린넨 천 더미/건조대 | 갓 세탁한 면의 청량한 공기(햇살 창가·산들바람 시어 화이트·빛 입자) |
| Black Cherry | (현 컷 양호) | 체리 과수원 골든아워·보케 |
| Lemon Eucalyptus | (현 컷 양호) | 유칼립투스+레몬 이슬·청량 그린 |

### 프롬프트 공식 (Scent→Mood)
`Photorealistic [무드 형용] atmosphere expressing a [scent descriptor] fragrance, [감각 디테일: 빛·공기·움직임], [광학: 85mm f/1.4 등], clean uncluttered lower-center space for a small product, luxurious perfume advertisement mood, true-to-life premium editorial product background. Avoid: [사물 직물·잡초 등 컨셉 오염 + 표준 네거티브].`

---

## 2. 규칙 B — Firefly 생성설정 체크리스트 (전상품 공통 가드)
생성 직전 반드시 확인(미설정 = 품질 저하 무성 발생). 발견 오류의 가드화.
| 설정 | 기본(위험) | 규약 |
|---|---|---|
| 비율 | 자동 | 목적별: lifestyle/배경 **16:9**, 썸네일 **1:1**, 상세 세로 **3:4** |
| 해상도 | 1K | **2K 이상**(프리미엄 컷) |
| 그라운딩(Google 검색) | OFF | 구조 사실감 필요 씬 **ON**(차량 통풍구 등)·#75 경계(제품=실사누끼) |
| 참조(reference) | 이전 결과 잠금 | **의도적 관리** — 컨셉 전환 시 잠금 해제. 단 view=edit는 base 참조 필요할 수 있음(강한 새 프롬프트가 우선) |

---

## 3. 앱 개입점 (firefly_auto 개입카드 확장 — Code 후속)
기존 `generateModeConfirmed` 게이트(세션7-c-Code 박제)에 **설정 검증 서브체크** 추가:
- payload: `FireflyDropPayload.settingsVerified?: { ratio:boolean, resolution:boolean, grounding:boolean, reference:boolean }`
- 위젯 체크리스트 1줄(Check/Clock, 강제모달 0·#56): "생성 설정 확인 — 비율/해상도/그라운딩/참조"
- 미확인 = false(개입 알림), 운영자 1클릭 확인.
- 전상품 공통·additive·하드코딩 0(#55).

---

## 4. 적용 현황 (2026-06-13 세션7-e)
- ✅ april_v3 → composite/lifestyle-1781357077702.png(2,879,601B) · cotton_v3 → composite/lifestyle-1781357121767.png(3,102,931B) 적재·SQL 3-tier.
- ✅ 그라운딩 sp-switch checked=true set(앱 상태 반영은 생성 시 시각확인 필요·정직#46).
- ⏳ 비율 16:9·해상도 2K: 버튼 포착했으나 Spectrum 드롭다운 자동선택 미실행(운영자 1클릭 또는 다음 자동화 셀렉터 확정).
- ⏳ april_v3/cotton_v3 운영자 시각확인 → 통과 시 누끼합성, 미흡 시 2K+그라운딩 확정 재생성.

## 5. 전상품 확장
달항아리·아이스트레이 등 모든 상품: 배경 컨셉을 "가치/감각 무드"로 정의 + 생성설정 체크리스트 적용. 본 시스템이 단일 권위.
