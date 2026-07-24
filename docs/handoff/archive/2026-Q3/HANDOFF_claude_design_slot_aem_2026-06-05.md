# HANDOFF — Claude Design 슬롯 편입 + AEM 정정 + P0 발행 GO 게이트

> 작성: 2026-06-05 Desktop (#49 write_file 직접 작성, 대표 다운/업로드 0)
> FROM: Desktop → TO: Code
> 권위: 본 세션 = doc 전체 정독 + 최근 대화('명화 이미지 네이버 변환 및 발행 관제탑 P0 트랙') 정독 + 대표 신규 지시 2건 반영
> 성격: docs only (코드/DB mutate 0, 발행 미접촉, 비가역 0)
> baseline: production f689625 (HEAD==origin/main, Vercel READY)

---

## §0 본 세션 핵심 (중복작업 방지 — Code 정독 필수)

대표 신규 지시 2건 + 발행 트랙 현황 재확인. **새 코드 작업 0건** — 본 turn은 정책/문서 갱신 + 발행 GO 게이트 정리만.

1. **Claude Design 미활용 → 활용 체계 편입** (대표 누차 강조, SESSION_LOG에도 "Claude Design 미활용" 명시돼 있던 빈 슬롯).
2. **AEM 재연결** (대표가 만료된 연결 재연결) → #48 "미사용" 문구 정정 필요.
3. **P0 명화 첫 발행** 3축 GREEN 유지 확인 — 대표 명시 승인만 남음(비가역 하드룰).

---

## §1 Claude Design 슬롯 편입 (작업원칙 #48 보강)

### 정직한 범위 정의 (#46)
"Claude Design"이라는 별도 캔버스 인터페이스 제품 그 자체는 Desktop 채팅 세션에서 직접 구동 불가. 그러나 *같은 역할*(캔버스에 시안을 펼치고 채팅으로 반복)을 하는 도구가 세션에 살아있음 = 인라인 시각화 캔버스(Visualizer) / Canva MCP / Adobe for creativity MCP. 따라서 "Claude Design 활용"은 실무상 **"캔버스 기반 시각 산출을 파이프라인 정식 슬롯으로 승격"**으로 구현.

### 슬롯 위치 (대표 확정: "둘 다 융통적으로")
기존 도구 라우팅(#48)에 신규 슬롯 1개 추가. 면책 경계 밖(내부용)이라 #48 파트너 모델 면책 규칙과 충돌 0.

| 단계 | 도구 | 성격 |
|---|---|---|
| 이미지 생성 | Firefly 웹 1-click(대표 수동) | 기존, 발행물 |
| 가공 | Adobe MCP | 기존 |
| 양산 | Figma 마스터 | 기존, 발행물 |
| 합성 | 빌더(composeContinuous) | 기존, 발행물 |
| **시안·의사결정·배너 (신규)** | **캔버스 시각화 / Canva** | **내부용 — 발행 GO 카드·둘째 상품 hero 시안 탐색·단발 이벤트 배너. IP 면책 불요(판매 자산 아님).** |

### 본 세션 실증
명화 디퓨저 발행 GO/NO-GO 의사결정 카드를 캔버스 시각화로 1회 렌더(3축 신호등 + 페이로드 핵심 + 승인 게이트). 대표가 발행 결정에 직접 사용 가능. = 슬롯이 채워진 첫 산출물.

### #48 갱신 지시 (Code, PRINCIPLES_LEARNED.md)
작업원칙 #48 "미사용 명문화" 블록에 다음 추가:
- 신규 슬롯: "캔버스 시각화(Claude Design 류) = 내부 시안/의사결정/단발 배너 전용. 판매 발행물은 여전히 Firefly-native + Figma 양산만(면책 경계 불변)."

---

## §2 AEM 재연결 정정 (작업원칙 #48 + #44 stale-fact)

대표가 만료된 AEM(Adobe Experience Manager) MCP 연결을 재연결. 그러나 **정직 평가(#46): AEM은 엔터프라이즈 CMS 운영 도구로, 현재 1인 셀러 워크플로우에서 직접 호출 표면 없음.** 연결은 유지(향후 자사몰 등 멀티채널 확장 시 활용 가능)하되 억지 편입 금지.

### #48 갱신 지시 (Code)
- 기존: "AEM MCP / Adobe Marketing Agent MCP: 엔터프라이즈 마케팅 운영용 — 1인 솔로 셀러 무관 → 사용 안 함."
- 변경: "AEM MCP: 연결 유지(2026-06-05 대표 재연결), 단 현재 1인 셀러 워크플로우 미해당 — 향후 멀티채널 확장 시 활용. Adobe Marketing Agent MCP: 동일(미해당)."

---

## §3 P0 명화 첫 발행 — 3축 GREEN 유지 (라이브 재확인)

직전 Code turn(316f1f2/f689625)에서 확정된 3축 그대로 유효. 본 Desktop 세션에서 PROGRESS/SESSION_LOG/TASK_BRIDGE 직독으로 재확인(코드 미접촉).

| 축 | 상태 | 근거 |
|---|---|---|
| 1축 회선 | GET 200 | /api/naver/addressbooks production 200, 토큰 생존 |
| 2축 L2 이미지변환 | allShopPhinf=true | imageProbe production 실증 — 대표(Cloudinary)·상세(Supabase)·공지 전부 shop-phinf 전환 |
| 3축 dryRun | canRegister=true | 17필드 + 옵션 향3종 COMBINATION + ETC 9키 정상, 경고 2(재질·색상 미차단) |

명화 페이로드: salePrice 29000 / supplierPrice 14300(실마진 50.7%) / naverCategoryCode 50003356 / naver_title 35자 / originCode 200037(중국) / status DRAFT · naverProductId null.

### 하드룰 (불변)
- 네이버 register/POST는 **대표 명시 승인 없이 호출 0건**.
- 변환/등록 실패 = 중단 + 정직 보고(#46). 가짜 "등록 완료" 금지.
- 라이브 production API가 코드/게이트 표시보다 우선 권위(#45).

---

## §4 Code 작업 지시 (docs only, 코드/DB mutate 0)

1. **PRINCIPLES_LEARNED.md #48 보강**: §1 신규 슬롯(캔버스 시각화) + §2 AEM 정정 문구 반영. Python full-overwrite(#29b).
2. **5종 추적 MD 헤더/§3 갱신**: PROGRESS 헤더 + ROADMAP 헤더 + SESSION_LOG(26) + TASK_BRIDGE §3(26). 본 세션 = Claude Design 슬롯 편입 + AEM 정정 + 발행 3축 GREEN 재확인.
3. **본 핸드오프 git add 보존** (#49 — Desktop write_file 작성분).
4. ★ CLAUDE.md quick-index backfill(#46~#48 누락 기존 상태 + #49)은 여전히 별도 소작업 — 대표 지시 시에만.

### 검증 의무
- git diff = docs only (src/·prisma/ 변경 0)
- 비가역 0 (발행 미접촉)
- 이모지 0(MD 관례 ★ 허용) / 한글 sentinel 0 / 코드 한글 리터럴 N/A(코드 미변경)

---

## §5 다음 (Desktop 새 채팅) — 컨텍스트 분할

본 세션은 정독+정책+실증으로 포화. 다음 작업은 새 채팅에서:
- **(A) P0 명화 첫 발행** — 대표 "발행 GO" 시: 발행 직전 실측(DRAFT·dryRun·회선 재확인) → ★대표 명시 승인 → 실 register(비가역). register/POST 승인 없이 호출 0.
- **(B) 둘째 상품(달항아리/아이스트레이) 상세페이지 hero 시안** — 캔버스 시각화 슬롯 첫 본격 활용. 발행 후 진행.
