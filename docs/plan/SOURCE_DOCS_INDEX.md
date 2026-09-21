# SOURCE_DOCS_INDEX — project_knowledge 문서 전수 인덱스

> 신설 2026-09-22 (대표님 지시 — project_knowledge 진행도를 매번 재검색 없이
> 즉시 확인하기 위한 하이브리드 관리 방안). 목적: 새 md 파일을 받을 때마다
> project_knowledge 전체를 재검색하지 않고, 이 표 하나로 "이미 반영됐는지"를
> 먼저 확인한다.
>
> **이 표는 인덱스일 뿐, project_knowledge 원본 파일을 대체하지 않는다.**
> 정확한 원문 확인이 필요하면 반드시 project_knowledge_search로 원문을
> 재조회한다 — 이 표의 "핵심 요구사항" 칸은 요약이라 뉘앙스가 생략될 수 있음.

## 사용법

1. 새 md 파일을 받으면 먼저 이 표에서 파일명/날짜/주제가 이미 있는지 확인
2. 있으면 → "MASTER_CHECKLIST 매핑" 칸의 항목번호로 바로 이동, 중복 등재 금지
3. 없으면 → project_knowledge_search로 원문 확인 후 신규 항목으로 등재하고
   이 표에도 새 행 추가
4. "재확인필요"로 표시된 행은 다음 조사 우선순위로 편입

---

## 카테고리 1 — 이미 반영 완료(코드/문서 양쪽 확인됨)

| 파일명 | 핵심 요구사항 | MASTER_CHECKLIST 매핑 | 상태 |
|---|---|---|---|
| Research_Report.md (이미지업로드 400에러) | representativeImage에 외부URL 직접 사용 금지, 2단계 업로드(POST /product-images/upload → 반환 URL만 사용) | #25(추정, 재확인 필요) | 반영됨(추정) |
| 제미나이_꽃틔움_시스템_고도화_2026-09-17.md | OCR스펙추출/반응형HTML/Aesthetic Wit카피/스킬프리셋/Canva/오너클랜/재고크론/드래그정렬 등 9섹션 | #46-50, #16, #38, #17-20 | 반영됨(2026-09-22 원문 재대조 완료) |
| 앱_사용_시_오류_개선_정리-원본_2026-09-17.md | 위 제미나이메모의 원본 — OCR 업그레이드, 채팅형 스킬 저장("MCP 스킬을 앱 전용으로") | #46-50 | 반영됨(2026-09-22 원문 재대조 완료. "09:00/14:00 크론시각"이 제미나이의 창작이고 원본메모엔 없음을 확인 — #38 판단(21시KST 채택, #357) 재확인됨) |

## 카테고리 2 — 미반영 발견(2026-09-22 신규 확인, 조사/등재 필요)

| 파일명 | 핵심 요구사항 | MASTER_CHECKLIST 매핑 | 상태 |
|---|---|---|---|
| Research_Report.md (정보고시) | productInfoProvidedNotice 객체(34종 유형, ETC 권장) 필수 — 없으면 BAD_REQUEST | 없음 | 재확인필요 — 실제 네이버 발행 payload에 이 객체가 있는지 코드 확인 시급 |
| Domeggook_Open_API_and_Private_API_Integration_Strategy | 도매꾹 Private API 신청(재고폴링/자동발주 등 고급기능), Open API getItemList 미사용 상태 | 없음 | 재확인필요 |
| 꽃틔움_가든_Dashboard_and_App_Shell_Redesign(ADHD포커스) | ADHD 대시보드 설계(단일초점/점진적공개/7-8개 이하 요소), 사이드바 16개→5그룹 재편, 장식강도 3단계 토글 | 없음 | 재확인필요 — 대규모 UX 리서치, 별도 스프린트 논의 필요 |
| STUDIO_REFACTOR_RESEARCH_KO.md | 스테퍼 4단계, 모바일 하단탭 반응형, 에셋브라우저 그리드, 맥락형 인스펙터패널(SEO관제탑) | 없음(#21 3단분할과 일부 겹침, 재확인 필요) | 재확인필요 |
| Kkotium_Garden_Design_System(Balancing_Retro-Pop) | 색상토큰(75/15/10), 타이포스케일, 8px간격시스템, 그림자 elevation | 없음 | 재확인필요 |
| Modular_Auto-Assembly_Design_Engine | 슬라이스 기반 상세페이지 자동조립(12종 슬라이스), Satori+Sharp 렌더링, HITL 디렉팅 워크플로우 | #47과 연관 가능성, 재확인 필요 | 재확인필요 |
| Naver_Smart_Store_Product_Identity_Keyword_Extraction | 키워드 확장 엔진 5단계(SearchAd 검증게이트로 LLM환각 차단), "< 10" 마스킹 처리, 황금키워드 비율 | #41(AI키워드 검증)과 밀접 — 이미 구현한 로직과 얼마나 일치하는지 재확인 필요 | 재확인필요 |
| 꽃틔움_가든_네이버_상품명_진단_엔진과_SEO_훅문구_개선(2026-06) | 상품명 9원칙 신호등, 이벤트필드(혜택형)/상세헤드라인(감성형) 분리, 경쟁강도 공식 | #33, #48과 연관 — 재확인 필요 | 재확인필요 |
| 한국어_이커머스_소싱의_카테고리_전환_동음이의어_필터링 | 카테고리 전환 수식어 사전 6개 축(신체부위/동물/장소/기기/연령/소재축소어) | 카테고리 매처(#1/#43/#44/#45) 계열과 밀접 — 이미 구현한 IDIOM-2/6과 얼마나 겹치는지 재확인 필요 | 재확인필요 |
| Naver_Commerce_API_Order_Management_403_Diagnosis | 주문관리 403 진단 및 3-엔드포인트 흐름 분석 | 없음 | 재확인필요 |
| Naver_Smart_Store_Selective_Import_and_Bidirectional_Sync | 선택적 가져오기+양방향 동기화 설계 | 없음 | 재확인필요 |
| 스마트스토어_1인_셀러_품절_대응과_대체상품_전환(SUBSTITUTE/PL-3) | 품절 대응+대체상품 전환 앱기능 설계 | #39와 밀접 — 재확인 필요 | 재확인필요 |
| 스마트스토어_1인_셀러를_위한_운영_자동화_전략 | 운영 자동화 전략 전반 | 없음 | 재확인필요 |
| 스마트스토어_리뷰_관리와_반품안심케어 | 초기 셀러 우선순위 전략 분석 | 없음 | 재확인필요 |
| 네이버_스마트스토어_파워셀러의_2025-2026_실전_무기_총정리 | 파워셀러 실전 전략 총정리 | 없음 | 재확인필요 |
| 카카오_비즈니스_채널_2025-2026_완전_가이드 | 카카오 채널 연동 가이드 | 없음(카카오채널 메뉴 존재하는지 확인 필요) | 재확인필요 |
| Kkotium_Garden_AI_이미지_생성_및_프롬프트_자산화_전략 | AI 이미지 생성 프롬프트 자산화 | #49(스킬 프리셋)와 밀접 | 재확인필요 |
| Kkotium_Garden_Mood-to-Camera-Spec_Image_Generation | 무드→카메라스펙 이미지생성 시스템 설계 | 없음 | 재확인필요 |
| Category-Agnostic_AI_Image_and_SEO_Engine | 카테고리 무관 AI 이미지+SEO 엔진 | 없음 | 재확인필요 |
| Masterpiece_Car_Diffuser_Smart_Store_Detail_Page | 카디퓨저 상세페이지 전환/SEO 리서치(사례연구) | #47과 연관 가능 | 재확인필요 |
| Claude_Design_심층_활용_가이드 | Claude Design(Artifacts) v1 감성유지+위젯교체 실무전략 | 없음(작업방식 가이드, 기능요구 아닐 수 있음) | 재확인필요 |
| Refactoring_Onsil_Atelier_Studio | 온실아틀리에 UX/IA 재설계 리서치 | #21-24(Studio)와 밀접 — 재확인 필요 | 재확인필요 |
| 꽃틔움_가든_개선_방향(2026년_네이버_스마트스토어_운영_동향) | 2026 운영 동향 종합 리서치(단위가격 unitCapacity, 카테고리개편 등) | 없음 | 재확인필요 |

## 카테고리 3 — 마스터플랜/설계문서(요구사항이라기보다 구조설계, 별도 취급)

| 파일명 | 성격 |
|---|---|
| Kkotium_Master_Plan_v2.1/v3.2/Consolidated | 앱 전체 마스터플랜 — MASTER_CHECKLIST의 상위 출처 문서 |
| kkotium-architecture-v2.md | 아키텍처 설계도 |
| KKOTTI_DESIGN_PLAN.md | 디자인 플랜 |
| Research_Report.md (다수 청크) | 여러 리서치가 "Research Report.md"라는 동일 파일명 아래 섞여있을 가능성 — 재확인 시 청크별 주제 구분 필요 |

---

## 갱신 규칙

- 새 md 파일을 받으면: 이 표에 먼저 없는지 확인 → project_knowledge_search로 원문 확인 → 카테고리 1(반영됨) 또는 2(미반영)로 분류해 행 추가.
- #46~50처럼 이미 MASTER_CHECKLIST 항목으로 등재된 요구사항의 출처 문서가 새로 확인되면, 이 표의 상태를 "반영됨"으로 갱신하고 근거(재대조 날짜)를 남긴다.
- 카테고리 2("재확인필요")의 각 행은 다음 조사 시 "MASTER_CHECKLIST 신규 항목 후보"로 우선 검토한다 — 특히 **정보고시 productInfoProvidedNotice**(발행 실패 위험 직결)와 **도매꾹 Private API**(재고폴링 고도화)는 실무 영향이 커서 우선순위 높음.
