# KKOTIUM GARDEN — 전체 작업 로드맵
> 최종 업데이트: 2026-04-29 (Phase E+ Sprint 4 E-11 — AI 리뷰 감정분석 + SEO 재활용 완료, Sprint 4 전체 종결)
> **Phase A ✅ | Phase B ✅ | Phase C ✅ | Phase D ✅ 전체 완료 | Phase E 진행 중 (E-7, E-1, E-3, E-8 완료) | Phase E+ Sprint 1·2·3·4 완료 (E-4, E-2C, E-2A, E-2B, E-13A, E-13C, E-14, E-10, E-11)**
> **다음 작업 후보: 수수료 개편 미반영분 적용 (1순위) / E-12 Discord 리뷰 알림 (2순위) / E-13B 알림톡 활성화 (월 50건+ 시점)** — 본 문서 하단의 "다음 채팅에서 시작할 작업 후보" 섹션 참조
> 전략 참고문서:
> - `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵`
> - `스마트스토어 리뷰 관리와 반품안심케어, 무엇을 먼저 할 것인가` (Claude 리서치 2026-04-16)
> - `네이버 스마트스토어 파워셀러의 2025-2026 실전 무기 총정리` (Claude 리서치 2026-04-16)
> - `카카오 비즈니스 채널 2025-2026 완전 가이드` (Claude 리서치 2026-04-16)
> - `스마트스토어 셀러의 무료 알림톡, 정말 가능한가` (Claude 리서치 2026-04-16)

---

## Phase A: 무료 기능 전부 적용 + 배포 ✅ 완료 (2026-04-10)

| Task | 상태 | 내용 |
|------|------|------|
| A-1 | ✅ | 엑셀 다운로드 전 검증 모달 |
| A-2 | ✅ | 검색 조련사 AI 상품명 역반영 |
| A-3 | ✅ | 주소록 API 연동 |
| A-4 | ✅ | deliveryInfo 역추출 |
| A-5 | ✅ | 카테고리별 필수 속성 가이드 |
| A-6 | ✅ | 꿀통지수 키워드 검색량 가중치 |
| A-7 | ✅ | 마진 위험 Discord 고도화 |
| A-8 | ✅ | 네이버 DataLab 트렌드 연동 (Perplexity → silent fallback) |
| A-9 | ✅ | 오늘 할 일 지능화 확장 |
| A-10 | ✅ | SEO 2026 AEO 업데이트 |
| A-11 | ✅ | Vercel 배포 설정 |
| A-12 | ✅ | 프로덕션 빌드 검증 + 배포 |

---

## Phase B: 매출 발생 후 운영 자동화 ✅ 완료 (2026-04-12)

| Task | 상태 | 내용 | 완료일 |
|------|------|------|--------|
| B-1 | ✅ | 주문 관리 v3 (상태필터/드로어/동기화) | 2026-04-11 |
| B-2 | ✅ | 발주확인 + 송장등록 반자동화 | 2026-04-12 |
| B-3 | ✅ | 정원 창고 네이버 실시간 동기화 버튼 + 불일치 뱃지 | 2026-04-12 |
| B-4 | ✅ | 상품 자동 품절 처리 (cron/daily) | 2026-04-12 |
| B-5 | ✅ | 주간 수익 보고서 자동 생성 → Discord | 2026-04-12 |

---

## Phase C: 성장기 확장 (진행 중 — 2026-04-14 전략 리서치 기반 재정렬)

> 원칙: 무재고 1인셀러 + 무료 기능 최대 활용 + 검색 노출 직결 순서
> 전략 근거: `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵`

### Sprint 1: 등록 품질 기반 (무료, 즉시 착수)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| C-6 | ✅ | 원산지코드 518건 자동완성 | `naver-origin-codes.ts` 로컬 상수, 씨앗심기 검색 UI, 복수원산지+수입자 지원, originAreaCode 매핑 |
| C-7 | ✅ | 카테고리 정합성 검증 + 속성 매핑 | 4,993건 대조 검증, 카테고리별 필수/선택 속성 매핑 테이블 구축 |
| C-8 | ✅ | 상품 속성 완성도 체커 | 카테고리별 필수 속성 점수화, 미입력 안내, 씨앗심기+정원창고+검색조련사 표시 |

### Sprint 2: API 전환 (무료, 핵심 업그레이드)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| C-1 | ✅ Step 1~3 | 커머스 API 직접 상품 등록 | product-builder.ts, register API, NaverRegisterModal, 플로팅바 버튼, C-8 체커 내장 |

### Sprint 3: AI 최적화 + 운영 모니터링 (무료)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| C-2 | ✅ | AEO 상세페이지 Q&A + FAQ 자동 생성 | Gemini/Groq Q&A 구조화, AI 쇼핑 에이전트 대응 |
| C-12 | ✅ | **네이버 오픈 API + Groq 실시간 트렌드 분석** | 네이버 쇼핑검색/DataLab API → Groq AI 컨텍스트 주입 → 실시간 경쟁/트렌드 분석 → 꼬띄 추천/검색 조련사 강화 |
| C-9 | ✅ | 굿서비스 점수 대시보드 | 3축 게이지 + 등급 시뮬레이터 + 개선팁 + API |

### Sprint 4: 수익 최적화 + 확장 (무료)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| C-4 | ✅ | 수익성 분석 대시보드 | 유입경로별 수수료(5.73% vs 3.91%) + 마진 분포 + 상품별 순위 |
| C-10 | ✅ | 배송 자동화 확장 | 자동 발주확인(cron 2h) + 클레임 API(취소/반품/교환 승인·거부) + 주문페이지 버튼 |
| C-3 | ✅ | 대량 등록 배치 파이프라인 | 배치 API(20개 제한, 2초 rate limit) + 기존 NaverRegisterModal 배치 UI 활용 |
| C-11 | ✅ | 씨앗 심기 UX 2-Panel Split | 좌측 6탭(기본/옵션/이미지/배송/SEO/혜택) + 우측 38% sticky 고정패널 |
| **C-5** | **✅** | **꼼띠 추천 v2** | **TOP5+소싱보관함+검색량 (2026-04-12 완료)** |

### Phase D: 중기 개선 (Phase C 완료 후 — 즉시 착수 가능)

> 원칙: 검색 노출 직결 + 운영 효율 + 무료 기능 우선

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| D-1 | ✅ | 상품명 품질 체크 | 13개 검증룰 (50자 제한, 판매조건 금지어 25개, 수식어 17개, 참조문구, 특수문자, 단어반복, 셀러명, 브랜드위치, 키워드포함, 괄호짝, 앞15자 키워드, 조사과다), S~D 등급, 씨앗심기+검색조련사 적용, 스토어명 자동로딩 |
| D-2 | ✅ | 대시보드 위젯 레이아웃 정리 | GoodService+Profitability 2열 그리드, MarketTrend 전폭, 빠른 작업 바로가기 4개 (씨앗심기/검색조련사/주문관리/꿘통사낥터) |
| D-3 | ✅ | 경쟁 상품 모니터링 | competition-monitor.ts 스냅샷/변화감지, /api/competition GET+POST, CompetitionMonitorWidget 대시보드 위젯, 가격위치바+경쟁상품+변동률, daily cron 자동스캠, Discord PRICE_CHANGE 알림 |
| D-4 | ✅ | Naver DataLab API 직접 통합 | /api/datalab GET period=7/30/90, 10개 카테고리 3개씩 배치 호출, DataLabTrendWidget 스파크라인 차트+기간선택기+상승/하락 배지, Perplexity 대체 완료 |
| D-5 | ✅ | 씨앗 심기 탭 UX 추가 개선 | 6개 탭별 완성도 동적 판단 (basic: 카테고리+상품명+판매가, image: 대표이미지, option: 옵션없음=완료, shipping: 템플릿연결, seo: 키워드+원산지, benefit: 기본값=완료), 초록점/빨간점+연분홍배경 실시간 반응 |

### 장기 로드맵 (매출 성장 후)

| 항목 | 내용 | 트리거 시점 |
|------|------|----------|
| 알림톡 자동화 활성화 | E-13B 2단계: 솔라피 키 입력 → 구매확정/리뷰/한달리뷰 3단계 자동발송 | 월 주문 50건+ |
| 크리마/브이리뷰 검토 | 전문 리뷰 솔루션 도입 (AI 감정분석, 외부채널 연동) | 월 매출 500만원+ |
| N배송 + 반품안심케어 연계 | 네이버배송 가입 시 반품안심케어 수수료 네이버 지원 | 물류 안정화 후 |
| 5만개 상품 제한 관리 | 2025년부터 50만→5만개로 축소 | 상품 1,000개+ |
| 멀티채널 확장 | 쿠팡/11번가 연동 (현재 네이버 단일 채널 집중) | 월 매출 1,000만원+ |

### Phase E: 다음 단계 확장 (진행 중)

> 확정 순서: E-7 → E-1 → E-3 → E-8 → (Phase E+ Sprint 순서)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| **E-7** | **✅** | **꼬띠 소싱 추천봇 (1단계)** | DataLab 트렌드 → 키워드 검색량 → 경쟁분석 → BlueOcean 점수 → Groq AI → Discord 매일 발송 + 대시보드 위젯 + 도매꾹/도매매 바로검색 |
| **E-1** | **✅** | **상세페이지 템플릿 빌더** | 6종 블록 HTML 에디터(Hook/Image/Text/Q&A/Specs/Divider) + 실시간 미리보기 + AEO Q&A import + 씨앗심기 통합 + 저장 시 빌더 HTML 우선 |
| **E-3** | **✅** | **상품 수명 주기 대시보드** | 5단계 라이프사이클(NEW/GROWING/PEAK/DECLINING/ZOMBIE) + 좀비 리스크 바 + 판매속도 + 개선제안 + 대시보드 위젯 |
| **E-8** | **✅** | **도매 자동 매칭** | 도매꾹 OpenAPI 최소수량1 필터 + 도매매 검색 + 마진계산 + Discord/대시보드 통합 |
| E-5 | ⬜ 대기 | 실제 매출 데이터 기반 꼬띠 추천 고도화 | 판매 패턴 학습 (상품 20~30개 이상 후) |
| E-6 | ⬜ 대기 | 대시보드 위젯 드래그 정렬 + 카스터마이징 | 위젯 수 많아지면 의미 있음 |

---

### Phase E+: 리뷰·반품안심케어·카카오채널 전략 (2026-04-16 확정, 꽃졔님 승인 후 착수)

> 전략 근거: 4개 리서치 리포트 종합 (리뷰/반품안심케어/파워셀러 전술/카카오 비즈니스)
> 원칙: 무료 기능 우선 + 네이버 내장 기능 최대 활용 + 알림톡은 매출 성장 후 활성화
> 카카오 비즈니스 채널: 꽃틔움 KKOTIUM (`_xkfALG`) — 이미 개설 완료

#### Sprint 1: 즉시 효과 기반 구축 (비용 0원)

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| **E-4** | **✅** | **반품안심케어 마진 시뮬레이터** | `return-care-fees.ts` 16개 카테고리별 수수료, DB `return_care_enabled`, Tab4 토글+배지, 마진계산기 건당비용, 꿀통지수 +15점 |
| **E-2C** | **✅** | **리뷰 적립금 최적 설정 가이드** | Tab6 적립금 권장값, 최적 설정 시 초록 변경, 마진계산기 건당비용, 꿀통지수 +10점 |

#### Sprint 2: 리뷰 성장 엔진 (비용 0원) — 2026-04-27 완료

| Task | 상태 | 내용 | 상세 |
|------|------|------|------|
| **E-2A** | **✅** | **리뷰 성장 트래커 + 운영 체크리스트** | `/api/review-growth` GET/PATCH, ReviewGrowthWidget 대시보드 위젯, 9항목 체크리스트 (자동감지: returnCare 30%↑/kakaoQrExposure), 단계 판정 (1: 0~10, 2: 11~50, 3: 51+), 작성률 목표 20~25%, 카카오 채널 칩 (single source of truth from `store_settings`), 친구 자산 안내 |
| **E-2B** | **✅** | **구매확정/리뷰 유도 타이밍** | orders/page.tsx 3단계 뱃지 — 배송완료D+1~3 (구매확정 유도/초록), 구매확정D+1~3 (리뷰 요청/파랑), 구매확정D+28~32 (한달 리뷰/보라). 알림톡 토스트 UI (E-13B 솔라피 미연동 안내). 7개 케이스 시뮬레이션 검증 완료 |

#### Sprint 3: 카카오 비즈니스 채널 통합 (비용 0원, 알림톡 발송 시만 건당 13원) — ✅ E-13A + E-13C 완료 (2026-04-29), E-13B는 월 50건+ 도달 시 활성화

| Task | 상태 | 내용 | 변경 파일 | 상세 |
|------|------|------|----------|------|
| **E-13A** | **✅** | **카카오 채널 설정 페이지** | `src/app/settings/kakao/page.tsx`, `src/components/kakao/KakaoChannelQR.tsx`, `src/app/api/kakao-settings/route.ts` | 채널 정보(꽃틔움 KKOTIUM / `_xkfALG` / pf.kakao.com URL) GET 자동 로드 + QR 미리보기(api.qrserver.com) + 4슬롯 컬러 팔레트 + 솔라피 4입력필드(API Key/Secret/PFID/발신번호 — E-13B 활성화 시 사용) + 7항목 가이드 체크리스트 + PATCH 저장. `store_settings` 5개 신규 필드(kakao_channel_id/kakao_channel_url/solapi_api_key/solapi_pf_id/sender_phone_number)가 single source of truth |
| **E-13B** | ⏳ 보류 | **알림톡 발송 API (2단계 접근)** | solapi-client.ts(신규), api/alimtalk(신규) | **1단계(현재)**: UI 진입점만 E-13A에 구현 — 솔라피 키 미입력 상태로 비활성. **2단계(트리거: 월 주문 50건+)**: 솔라피 가입→키 입력→즉시 활성화. 초기에는 네이버 내장 무료 리뷰 알림 + 인서트 카드로 충분 |
| **E-13C** | **✅** | **인서트 카드 생성기** | `src/app/ops/insert-card/page.tsx`, `src/lib/insert-card-colors.ts` | A6 105×148mm 실시간 미리보기 + 4슬롯 컬러 테마(E-13A 팔레트 상속) + HSL 헬퍼로 9가지 톤 자동 생성(`getCardColorScheme`: background/accentLight/accentMid/accentBorder/textOnLight/textOnDark/headerBg/shadow) + 카카오 QR(`store_settings.kakao_channel_id` 단일 소스) + 리뷰 적립금 3프리셋(텍스트 500/포토 1000/베스트 3000) + A4 4매 배치/A6 단일 + `window.print()` 기반 PDF 저장 |

#### Sprint 4: 등록 워크플로우 + 경쟁 정보 + AI 분석 강화 (비용 0원) — ✅ E-14 완료 (2026-04-29)

| Task | 상태 | 내용 | 변경 파일 | 상세 |
|------|------|------|----------|------|
| **E-14** | **✅** | **Upload Readiness Command Center (등록 준비 명령탑)** | `src/components/dashboard/UploadReadinessWidget.tsx` (신규), `src/app/dashboard/page.tsx`, `src/app/products/new/page.tsx`, `src/app/products/page.tsx` | DRAFT 상품 11점 키디니스 점수 정렬 TOP 5 + Stat strip(등록가능/작업필요/평균점수) + 부족 항목 칩 deep-link(`?focus={tab}` → 씨앗심기 5개 탭 자동 활성화) + 90+ "바로 등록" CTA(`?registerId=` → 정원창고 자동 체크 + NaverRegisterModal 자동 노출) + ITEM_TO_TAB 11개 매핑 + Loading skeleton + Empty state. 셀러 첫 등록 차단점 해소 = 매출 발생까지의 인지 부담 5단계 → 1클릭 |
| **E-10** | **✅** | **경쟁 진입장벽 모니터링 (옵션 A 간접 추정)** | `src/lib/competition-monitor.ts` (+135줄), `src/lib/sourcing-recommender.ts` (+79줄), `src/components/dashboard/CompetitionMonitorWidget.tsx` (+137줄), `src/components/dashboard/SourcingRecommendWidget.tsx` (+95줄), `src/app/api/competition/route.ts` (+9줄) | 원래 계획은 리뷰수/평점 직접 스크래핑이었으나, API 안정성 부족으로 **옵션 A 구현** — 4-factor proxy(topSellers 30%+priceSpread 30%+totalResults 25%+competitionLevel 15%) weighted score로 진입장벽 0~5점 추정. `estimateEntryBarrier()`가 single source of truth. BlueOcean breakdown 구조(`{ base, entryBarrierBonus, total }`)로 +15/+5/0 가산. CompetitionMonitorWidget에 5단계 막대+4-factor+Recommendation 패널, SourcingRecommendWidget에 Shield chip(LOW/MEDIUM/HIGH 3색)+BlueOcean breakdown+3 metrics. **라이브 검증 완료** — Block A+C 8개 상품 실제 데이터, Block B+D mock 주입로 3색 chip 모두 시각 확인. DB 스키마 변경 없음 |
| **E-11** | **✅** | **AI 리뷰 감정 분석 + SEO 재활용** | `src/lib/review-sentiment-analyzer.ts` (신규 348줄), `src/app/api/review-analysis/route.ts` (신규 78줄), `src/components/naver-seo/NaverSeoProductTable.tsx` (+368줄), 보강 커밋 `fb418bd` (+35줄) | `analyzeReviewSentiment()` Groq round-robin (3 keys) → Gemini (3 keys) → Anthropic fallback. SentimentResult: 감정 평판/비율 + topKeywords + suggestedTags + strengths/painPoints + aiSummary. ReviewAnalysisPanel이 SeoEditPanel 내부 SEO 태그 섹션 다음에 통합 — 보라색 점선 박스 + Textarea + AI 분석 시작 + 결과(AI 요약/감정분포/강점약점/키워드/추천태그 1클릭·일괄추가). **라이브 검증 완료**: 10개 mock 리뷰 “꿔 인테리어 소품”, 긍정 80% / 추천 태그 8개 (선물용·인테리어 등 구매자 언어 정확 추출). 보강: round-robin이 401/403/JSON 파싱 손서닫 fallback + max_tokens 1500→2500 + parseJsonSafe LLM JSON 정리. 비용: 0 KRW (Groq 무료 14400/키/하루 × 2키 = 28800/하루). |

#### Sprint 5: 알림 자동화 + 수수료 업데이트 (비용 0원)

| Task | 내용 | 변경 파일 | 상세 |
|------|------|----------|------|
| **E-12** | **Discord 리뷰 알림** | cron/daily, Discord 웹훅 | 자체 스토어 리뷰 페이지 폴링 → 신규 리뷰 감지 → Discord `#review-alert` 알림, 6번째 웹훅 채널 추가 |
| **기존개선** | **굿서비스+수수료 업데이트** | good-service.ts, 수익성 대시보드(C-4) | 톡톡 응답 기준 24h→12h **부분 완료** (2025-04 톡톡 12h 기준 commit b5606c4 반영 — good-service.ts), 2025.6.2 수수료 개편(유입수수료 2% 폐지→판매수수료 2.73%, 자체마케팅 유입 0.91%) 미반영 |

---

## 다음 채팅에서 시작할 작업 후보 (E-11 완료 이후)

> 2026-04-29 E-11 마무리 세션에서 다음 작업 우선순위 재평가. **수수료 개편 → E-12 → E-13B** 순서 권장 (수익성 직결도 + 트리거 적합성 종합 평가). Phase E+ Sprint 4 전체 종결 상태.

### E-11 완료 요약 (2026-04-29)

**구현 결과**: 1인 셀러의 자체 리뷰 0개 상태에서도 즉시 작동하는 "경쟁사/도매 텍스트 붙여넣기 → Groq AI 감정분석 → SEO 태그 자동추천" 워크플로우. 검색조련사 인라인 패널에 통합 — 소싱→등록 파이프라인의 마지막 단계에서 구명자 언어 기반 정확한 태그 확정.

**변경 파일** (총 3개, +831줄, 3 commits):
- `src/lib/review-sentiment-analyzer.ts` (신규 348줄) — `analyzeReviewSentiment()` + 3-tier provider fallback
- `src/app/api/review-analysis/route.ts` (신규 78줄) — POST endpoint with input validation
- `src/components/naver-seo/NaverSeoProductTable.tsx` (+368줄) — ReviewAnalysisPanel + SeoEditPanel 통합
- 보강: 위 라이브러리 (+30/-8줄) + ai-generate (+5/-2줄) — round-robin 401/403/JSON 손서닫 fallback + max_tokens 2500 + parseJsonSafe LLM JSON 정리

**커밋 이력**: 00272f7 (Block A) → c870707 (Block B) → fb418bd (Block A 보강) → (현 docs)

**Groq 키 회전 이벤트 기록**:
- 세션 중 GROQ_API_KEY 첨 번좌가 401 Invalid로 확인되어 round-robin이 다음 키로 넘어가지 않은 버그 발견 — 코드 보강 추가
- 꽃졔님께서 GROQ_API_KEY (`lrltQb`), GROQ_API_KEY_2 (`CAVylw`), GROQ_API_KEY_3 (`3IGN7i`) 3개 모두 신규 발급·등록 완료 (이전 3pEakT 폐기 키는 Vercel에서 회전 처리됨)
- 최종 정상 키: GROQ × 3개 (lrltQb + CAVylw + 3IGN7i = 43,200회/일 capacity) — 1인 셀러 일 사용량 대비 무한대
- **키 무효화 근본 원인**: `.env.backup.*`, `.env.back`, `.env.complete.backup` 등 9개 백업 파일이 git에 추적되어 GitHub에 키 노출 → Groq 자동 폐기 시스템 발동. 2026-04-29 마지막 세션에서 모두 `git rm --cached` + `.gitignore` 강화 (.env.* 와일드카드, !.env.example 예외)로 완전 차단. 향후 동일 사고 방지
- Vercel 존재하는 "Needs Attention" 알림 6개 (GROQ_API_KEY_2 폐기, GEMINI_API_KEY/_2/_3 quota 소진, 기타 보안 권고): 현 작업과 무관, 독립적으로 정리 권장

**라이브 검증 결과** (Chrome MCP, 10개 mock 리뷰):
- API HTTP 200, provider: groq-llama3, GROQ_API_KEY=lrltQb
- 감정 분포: 긍정 80% / 중립 10% / 부정 10% — 정확한 렌더링
- 추천 SEO 태그 8개 (색이예쁘다/품질좋다/포장이꼼꼼하다/가격대비좋다/고급스럽다/가성비최고/선물용/인테리어) — 특히 "선물용·인테리어" 같은 구매자 언어 정확 추출이 핵심 가치

---

### 다음 작업 후보 — 우선순위 평가 (10년차 파워셀러 + UI/UX 디자이너 관점)

| 후보 | 매출 임팩트 | 트리거 적합성 | 종합 |
|------|------------|---------------|------|
| **수수료 개편 미반영분 적용** | 높음 — 2025.6.2 개편 미반영 (유입수수료 2% 폐지 → 판매수수료 2.73%, 자체마케팅 0.91%) | C-4 수익성 대시보드 + good-service.ts 미반영분 지금 수정 가능 | **★ 1순위** — 소규모(0.5일 이내) + 수익성 정확도 직결 |
| **E-12 Discord 리뷰 알림** | 중간 — 운영 알림 강화 | 자체 리뷰 발생 후 의미 (현재 0개) | ★ 2순위 — 자체 리뷰 1건 발생 시점 추천 |
| **E-13B 알림톡 발송 API** | 높음 — 리뷰 재구매 유도 | 월 50건+ 시점 (현재 미도달) | 장기 — 도달 시 즉시 활성화 가능한 UI 세팅 완료 상태 |

#### 추천 순서 — 수수료 개편 → E-12 → E-13B

**수수료 개편 1순위 이유**:
1. 2025.6.2 시행된 개편이 현재 수익성 표시/good-service.ts/마진계산기 3곳에 미반영 — 수익성 표시 신뢰도 직접 영향
2. 독립 작업 + 소규모 (약 0.5일 이내)
3. C-4 수익성 대시보드(유입경로별 수수료 5.73% vs 3.91%)와 관련되어 양쪽 동시 업데이트 필요
4. 마진계산기 동기화 필요 — 마진 렌더링 정확도 단소

**구체 작업 항목 (수수료 개편)**:
- `src/lib/profitability.ts` (또는 유사 라이브러리): 자체마케팅 유입 경로의 수수료 0.91% 도입
- 기본 유입 수수료 2.73% 적용 (기존 유입수수료 2% 제거)
- C-4 수익성 위젯에서 유입 경로별 구분 강화
- `MarginCalculator.tsx`에 구조 적용
- `good-service.ts`와 연동 (2026-04 커밋 `b5606c4`에서 톡톡 12h 적용 완료, 수수료 부분만 추가 필요)

**E-12 2순위 이유**:
- 자체 리뷰 발생 후(50건+ 시) 의미 있음 — 현재 자체 리뷰 0개
- 대시보드 알림 이미 충분 — 운영 경고는 ReviewGrowthWidget(E-2A)이 보완

**E-13B 장기 이유**:
- 월 주문 50건+ 도달 시점에 활성화 — 현재 소라피 키 입력만 하면 즉시 작동하는 UI 세팅 완료 상태 (E-13A)
- 1단계: 네이버 내장 무료 리뷰 알림 + 인서트 카드(E-13C)로 충분

---

### 다음 채팅 시작 메시지 템플릿

다음 새 채팅을 시작할 때 그대로 복붙해서 사용:

```
꿔튰움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md를 읽고
현재 상태 파악 후 수수료 개편 미반영분 적용 작업을 시작해주세요.
(2025.6.2 개편: 유입수수료 2% 폐지 → 판매수수료 2.73%, 자체마케팅 유입 0.91%)

작업 시작 전 필수:
1. git log -5로 직전 작업 잔재 없는지 먼저 확인 (E-11 4개 commit이 origin/main에 push 완료 상태여야 함)
2. KKOTIUM_PROGRESS.md / KKOTIUM_ROADMAP.md 정독
3. 관련 코드 파일 (good-service.ts, profitability.ts, MarginCalculator.tsx, C-4 수익성 대시보드) 현재 상태 파악
4. 작업 계획 브리핑 후 제 승인 받고 시작
5. 작업 완료 후 PROGRESS.md/ROADMAP.md 업데이트 + git push

추가로 Vercel "Needs Attention" 표시는 GEMINI 키 quota 초과 경고 — GROQ 정상이라 fallback 거치지 않으므로 앱 사용에는 무관. 작업 직접 영향 없음.
```

### E-10 완료 요약 (2026-04-29)

**구현 방식 결정 — 원래 계획 vs 실제 적용** (이후 세션이 혼동하지 않도록 명시):

| 항목 | 원래 ROADMAP 계획 | 실제 구현 (옵션 A) |
|------|---------------------|---------------------|
| 데이터 소스 | 네이버 쇼핑검색 API의 reviewCount/productRating 직접 수집 | 기존 수집 데이터 4-factor proxy(topSellers/priceSpread/totalResults/competitionLevel) |
| DB 스키마 | `CompetitorSnapshot`에 reviewCount, avgRating 컬럼 추가 예정 | **스키마 변경 없음** — 런타임 계산으로 완전히 대체 |
| 진입장벽 판단 | 리뷰수 100+ = 높음 / 30~99 = 중간 / 0~29 = 낮음 | 4-factor weighted score 0~5점으로 자체 임계값 |
| 장점 | 리뷰 = 직접 경쟁 지표로 직관적 | API 의존 없음, 즉시 작동, DB 마이그레이션 불필요 |
| 단점 | API 응답에 reviewCount가 누락될 때 취약 | 간접 추정이라 일부 도메인(소수 판매자만 있는 틈새 카테고리)에서 과대/과소 가능성 |

**구현 결과 변경 파일** (총 5개, +445/-10 lines, 4 commits):
- `src/lib/competition-monitor.ts` (+135줄) — `estimateEntryBarrier()` + 4-factor weighted score
- `src/lib/sourcing-recommender.ts` (+79줄) — BlueOcean 가산 로직 + breakdown 구조
- `src/components/dashboard/CompetitionMonitorWidget.tsx` (+137줄) — 5단계 막대+4-factor+Recommendation 패널
- `src/components/dashboard/SourcingRecommendWidget.tsx` (+95줄) — Shield chip+BlueOcean breakdown+3 metrics
- `src/app/api/competition/route.ts` (+9줄) — entryBarrier 세분 응답 삽입

**커밋 이력**: d1d6202 (Block A) → 0d216fb (Block B) → 9a81b87 (Block C) → 6c6de96 (Block D) → (현 docs 커밋)

**장기적 권고**: 쇼핑검색 API의 reviewCount 안정성이 추후 확인되면, 자체 스토어 웹 크롤링으로 경쟁사 리뷰 수집 경로 확보 후 옵션 A + 원래 계획 하이브리드로 업그레이드 권장.

---

### 다음 작업 후보 — 우선순위 평가 (10년차 파워셀러 + UI/UX 디자이너 관점)

| 후보 | 매출 임팩트 | 트리거 적합성 | 종합 |
|------|------------|---------------|------|
| **E-11 AI 리뷰 감정 분석 + SEO 재활용** | 중간~높음 — 경쟁사 리뷰 붙여넣기 대응 + 실제 SEO 태그 추천 정확도 향상 | 자체 리뷰 0개여도 경쟁사 리뷰 텍스트로 즉시 작동 가능 | **★ 1순위** |
| **수수료 개편 미반영분 적용** | 높음 — 2025.6.2 개편 미반영 (유입수수료 2% 폐지 → 판매수수료 2.73%, 자체마케팅 0.91%) | 수익성 대시보드(C-4) + good-service.ts 미반영분 지금 수정 가능 | ★ 2순위 — 수익성 정확도 직결 |
| **E-12 Discord 리뷰 알림** | 중간 — 운영 알림 강화 | 자체 리뷰 발생 후 의미 (현재 0개) | E-11 다음 자연스러운 후속 |

#### 추천 순서 — E-11 → 수수료 개편 → E-12

**E-11 1순위 이유**:
1. E-10으로 진입장벽 추정 모듈 완성 → 다음 가치 = "경쟁사 리뷰의 질적 인사이트"
2. 자체 리뷰 0개 상태에서도 즉시 작동 (경쟁사 리뷰 텍스트 붙여넣기 → Groq 분석)
3. 기존 Groq 인프라 활용 (추가비용 0원)
4. SEO 태그 자동추천 → 검색조련사 정확도 향상 → 등록 품질 ↑ → 매출 흐름 강화
5. E-10 BlueOcean breakdown에 "AI 감정분석 가산" 항목 추가 자연스러움

**수수료 개편 2순위 이유**:
- 2025.6.2 시행된 유입수수료 2% 폐지 → 판매수수료 2.73%(자체마케팅 등 0.91%)가 현재 수익성 대시보드(C-4)에 미반영
- 마진 계산기/수익성 표시와 동기화 필요
- 독립 작업이며 소규모 (약 0.5일 이내)

**E-12 후순위 이유**:
- 자체 리뷰 발생 후(50건+ 시) 의미 있음 — 현재 자체 리뷰 0개
- 대시보드 알림 이미 충분 — 운영 경고는 ReviewGrowthWidget(E-2A)이 보완

---

### 다음 채팅 시작 메시지 템플릿

다음 새 채팅을 시작할 때 그대로 복붙해서 사용:

```
꽃틔움 가든 개발 이어서 진행합니다. KKOTIUM_PROGRESS.md, KKOTIUM_ROADMAP.md를 읽고
현재 상태 파악 후 E-11 (AI 리뷰 감정 분석 + SEO 재활용) 작업을 시작해주세요.

작업 시작 전 필수:
1. git log -5로 직전 작업 잔재 없는지 먼저 확인 (E-10 5개 commit이 origin/main에 push 완료 상태여야 함)
2. KKOTIUM_PROGRESS.md / KKOTIUM_ROADMAP.md 정독
3. 관련 코드 파일 (sourcing-recommender.ts, naver-seo 페이지, ai-generate API 등) 현재 상태 파악
4. 작업 계획 브리핑 후 제 승인 받고 시작
5. Block 별로 commit해서 컨텍스트 한계로 인한 작업 손실 방지

브라우저 테스트는 Chrome MCP로 경쟁사 리뷰 텍스트 붙여넣기 →
감정분석 결과 + SEO 태그 추천 결과 정상 작동하는지 확인해주세요.
완료 후 PROGRESS.md/ROADMAP.md 업데이트 + git push로 마무리.
```

---
## 2026-04-13 완료 작업 (이번 세션)

### UI 원칙 확립 및 전면 적용
- **이모지 완전 제거**: JSX 내 모든 이모지 → Lucide React SVG 아이콘 교체
  - `products/new/page.tsx`: lucide-react import 추가, DSection icon prop `React.ReactNode`
  - `ProductFilters`, `ProductSort`, `ProductStats`, `ProductTable`, `SourcedProductManager`
  - `QuickActions`, `SearchFilter`, `ViewToggle`, `ProductForm` 등 전체
  - `workflow/page.tsx` 완전 재작성 (5단계 운영 가이드, Lucide 아이콘)
  - `crawl/page.tsx`, `naver-seo/page.tsx`, `settings/platforms/page.tsx` 등

- **상태 라벨 통일**:
  - `초안` → `임시저장`
  - `ACTIVE` 변경 메뉴 라벨 → `판매 중`
  - `pending` 탭 → `네이버 등록 대기`
  - `ProductSort.tsx`: `icon` prop optional로 변경

### AI API 체계 개선
- **cron Perplexity 분리**: `trend-analyzer.ts` fallback → `{ trendKeywords: [], trendCategories: [], source: 'fallback' }` (silent)
- **Groq 무료 fallback 추가**: `llama-3.1-8b-instant`, 하루 14,400회 무료
  - `ai-generate/route.ts`: Gemini → Groq → Perplexity 순서
  - Vercel 환경변수 `GROQ_API_KEY` 등록 완료
  - 브라우저 테스트 완료: `ok: true, provider: groq-llama3`

### 검색 조련사 SEO 인라인 편집 패널 v3
- `NaverSeoProductTable.tsx` 전면 재작성
- 행 클릭 시 열리는 인라인 패널:
  - 꼬띠 AI 최적화 버튼 3개 (정석SEO / 감성타겟 / 틈새키워드)
  - SEO 검색최적화 필드 전체 직접 편집 가능:
    네이버 상품명 / 키워드 / 상품설명 / 브랜드 / 원산지 / 소재 / 색상 / 사이즈 / 세탁방법
  - SEO 태그 인라인 추가/삭제 (최대 10개)
  - **전체 저장 버튼** → `PATCH /api/products/{id}` 한 번에 저장
  - 저장 완료 시 초록색 체크 표시 (2초 후 자동 복원)
  - 글자수 실시간 표시 (상품명 25~40자, 설명 80~200자 가이드)
  - 키워드 입력 시 칩 미리보기 자동 업데이트
- 브라우저 테스트 완료: 21개 입력 필드, 전체 저장 버튼, AI 버튼 모두 정상

---

## 미분류 개선 항목

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| detail_image_url 입력 | 기존 8개 상품 씨앗 심기 편집 모드에서 직접 입력 (꽃졔님 직접) | 낮음 |
| API 키 교체 | 노출된 Gemini 3개 + Groq 키 교체 권장 | 보안 |
| 사이드바 배지 실시간화 | 소싱/등록대기/품절 숫자 실시간 업데이트 | 낮음 |
| 대시보드 파이프라인 배지 | 병목 구간 숫자 표시 | 낮음 |
| 엑셀 다운로드 이미지 경고 | 상세이미지 없는 상품 다운로드 시 강화 경고 | 낮음 |

---

## 비용 로드맵

| 시점 | 비용 |
|------|------|
| **지금 (Phase A+B+C+D+E+ Sprint 1~5)** | **0원** (E-13B 알림톡 UI만 구현, 발송 비활성) |
| 월 주문 50건+ | 솔라피 알림톡 건당 13원 (월 ~650원~1,950원) |
| 월 매출 50만+ | Gemini 유료 ~$20/월 |
| 월 매출 100만+ | Supabase Pro $25/월 |
| 월 매출 200만+ | Vercel Pro $20/월 |
| 월 매출 500만+ | 크리마/브이리뷰 전문 리뷰 솔루션 검토 |

---

## 새 채팅 시작 체크리스트

1. `KKOTIUM_PROGRESS.md` 전체 읽기
2. `KKOTIUM_ROADMAP.md` 전체 읽기
3. 해당 TASK 관련 코드 파일 확인
4. 꽃졔님 승인 후 작업 시작
5. 완료 후 **두 파일 모두** 업데이트

## 중요 체크포인트

- 코드 수정 후: `npx tsc --noEmit` → **0 errors** 확인 필수
- push 전: 이모지 없는지 확인 (`grep -rn "이모지" src/`)
- Vercel 환경변수 변경 후: 반드시 `git commit --allow-empty && push`
- 브라우저 테스트: API 성공만으로 완료 처리 금지, 반드시 Chrome MCP로 확인
- E-13B 알림톡: 2단계 접근 — 1단계 UI만 구현(키 미입력 시 안내), 2단계 매출 성장 후 솔라피 키 입력→즉시 활성화
- 반품안심케어 수수료: 2025.8.1 개편 기준 사용 (식품50/생활90/가구160/패션의류650원), 보상금 상한 8,000원
- 리뷰 API: 네이버 커머스 API 미지원 (GitHub Discussion #1582 공식 확인) — 수동 입력 + 크롤링만 가능
- 카카오 채널: 꽃틔움 KKOTIUM, Public ID `_xkfALG`, URL `pf.kakao.com/_xkfALG` (하드코딩 금지, store_settings에서 읽기)
- 네이버 내장 무료 리뷰 알림: 배송완료 3일 후 구매확정 요청 + 구매확정 시 리뷰 작성 알림 + 기본 적립금(텍스트50원/포토150원) — 이미 자동 작동 중
- 톡톡 소식알림: 월 1회 무료, 추가 건당 10원. 쇼핑챗봇과 외부 챗봇 API는 동시 사용 불가
- 알림톡 완전 무료 지속 발송은 불가: 솔라피 무료 플랜 = 플랫폼 0원 + 건당 13원 종량제, 가입 시 300포인트(약 23건분)
- 카카오 프로젝트 단골: 연 매출 10억 이하 소상공인 → 비즈월렛 30만원 지원 (톡채널 메시지용)
- 2025.12.31 친구톡 종료 → 브랜드 메시지 전환 (단가 2.5~3배 인상). 알림톡 중심 CRM 전략이 합리적
- 카나나 상담매니저: 카카오 AI 자동 CS, 모든 톡채널 무료 제공 (2025.9 정식 출시)
- 카카오 챗봇 빌더: 일반 기능 무료, Event API만 건당 15원
- 쉬운광고(우리 매장 알리기): 일일 100원부터, 신규 6만원 무료 쿠폰
- AiTEMS 추천 ON: 스토어관리에서 활성화 → 횟수 제한 없이 개인화 노출, 전체 클릭 약 10% 차지
- 2026.1.1부터 알림톡 쿠폰/마일리지 사용유도 메시지 제한 강화 — 템플릿 내 "네이버 포인트" 등 구체 혜택 금액 언급 시 카카오 심사 반려

### 코드 작성 원칙 (strictly enforced)
- JSX 이모지 완전 금지 — Lucide React 아이콘만 사용
- 주석 영어로만
- 한글 리터럴 타입 정의 금지 (예: '조합형' → 영어 상수로 분리)
- `new PrismaClient()` 금지 → `src/lib/prisma.ts` 싱글톤
- 카테고리 검색: `NAVER_CATEGORIES_FULL` 로컬 데이터 사용 (API 호출 금지)
- 수정 후 `npx tsc --noEmit` 필수 → 0 에러 확인 후 진행
- 파일 수정 전 `read_file`로 현재 상태 확인
- 수정할 수 없는 작업은 거짓말 없이 즉시 상황 설명 후 요청

### 작업 흐름 원칙
- 모든 작업 시작 전 `KKOTIUM_PROGRESS.md` + `KKOTIUM_ROADMAP.md` 확인 필수
- 작업 시작은 꽃졔님 승인 후에만 진행
- "진행해줘요" = end-to-end 완료 후 통합 브리핑 (중간 보고 없이)
- 작업 완료 후 반드시 테스트 실행 → 실제 앱 사용 시 문제없는지 확인
- 완료 후 KKOTIUM_PROGRESS.md + KKOTIUM_ROADMAP.md 업데이트

### 도구 사용 패턴
- **iTerm MCP**: `list_all_sessions` → 세션 확인 후 사용. heredoc(`<< 'EOF'`) 절대 금지 → Python 스크립트 작성 후 실행
- **Filesystem MCP** (`edit_file`): byte-perfect `oldText` 필수 — 수정 전 `read_text_file`로 정확한 내용 확인
- **대형 TSX 파일 (600줄+)**: `write_file`로 전체 교체 또는 Python 패치 스크립트 사용. `edit_file` byte 매칭 실패 방지
- **도매꾹 OpenAPI**: `https://domeggook.com/ssl/api/?ver=4.5&mode=getItemView&aid={KEY}&no={productNo}&om=json`

### 도매매/도매꾹 플랫폼 이해
- **도매매(DMM)** = 플랫폼 (Platform 테이블)
- **도매꾹(DMK)** = 플랫폼 (Platform 테이블) — 도매매 계열사
- 플랫폼 안의 **개별 판매자** = 공급사 (Supplier 테이블)
- 공급사의 `domeggookSellerId` = 도매꾹/도매매에서의 판매자 고유 ID

### 수수료 구조 (2026 확정)
- 카테고리별 차등 없음 (2025-06-02 개편 이후)
- 판매자 등급 기반: 중소3 = 3.003% + 2.73% = **5.733%**
- 예외: 디지털/가전 4.8%, 도서 4.5%
