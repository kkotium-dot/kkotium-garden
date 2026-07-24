# 꽃틔움 가든 UI/UX 통합재설계 — 진행 핸드오프 (2026-06-01 갱신 v4)

> 목적: 컨텍스트 중단 시 다음 세션이 즉시 이어받기 위한 단일 진실 문서.
> 새 채팅 진입 시 정독 순서: PROGRESS.md → ROADMAP.md → SESSION_LOG.md → TASK_BRIDGE.md §3 → 본 문서.

## 진행 상태 보드
| Phase | 내용 | 상태 | Commit |
|---|---|---|---|
| 1 | v6 토큰(Retro Pop Garden Fantasy) + 공통 셸 | ✅ Desktop 검증 | 94de20e |
| 2-A-1~3d | 씨앗심기 SEO 작업대(드로어·게이지·키워드막대·발행게이트·미저장가드) | ✅ 전수 검증 | ~76cd8b1 |
| 2-B-1 | 아틀리에 3분할 작업벤치 셸 | ✅ | 0936a59 |
| 2-B-2 | 캔버스 4변형 그리드 + 드래그앤드롭 5상태 | ✅ Desktop 검증 | 754d5c6 |
| 2-B-3 | Firefly 합성 프롬프트(6요소) + AI 큐 stepper | ✅ Desktop 검증 | a356550 |
| 2-MOBILE-1 | viewport 해제 + 하단 탭바 + 상품목록 카드 스택 | ✅ 코드검증 / ⚠️육안 미검증 | e0d5b25 |
| 2-NAMING | S6/L2 등 명칭 직관화 + 용어집 | ✅ Desktop 검증 | 878d8fc |

→ 씨앗심기(2-A) + 아틀리에(2-B) 두 P0 화면 완료. 모바일 기초 + 명칭 직관화 완료.
→ 남은 단일 트랙: 2-MOBILE-2 (아틀리에/SEO 모바일 심화).

## 2-NAMING 검증 결과 (2026-06-01 Desktop production 육안)
- ★통과: 아틀리에 AI 진단 패널 6라벨 전부 한글 전환 직접 확인:
  S6→"상세페이지 구성안 6번" / L2→"이미지 가공 단계 2단계(보통)" / 신뢰도→"AI 추천 정확도 73/100" /
  이미지품질→"사진 품질 점수 56/100" / 30-40s→"타깃 연령 30·40대" / friendly→"말투 다정함".
- 점수 /100 척도 표기 정상. 가운뎃점(·) 인코딩 정상(깨짐 0). 데이터 로직 회귀 0(코드 값 불변, 표시 라벨만).
- 용어집: docs/research/NAMING_GLOSSARY_2026-06.md (단일 진실). 매핑 함수: src/lib/i18n/diagnosis-labels.ts.
- ★미검증: Pill 툴팁 호버(title 속성+cursor:help, 표준 HTML이라 작동 구조) → 대표 마우스 호버 확인 권장. "됐다" 단정 안 함.

## 2-MOBILE-1 검증 결과 (이전, 유지)
- 코드 정독 통과(MobileTabBar lg:hidden·44px·iOS safe-area·shadowing 가드·v6). viewport 메타 production 검출.
- ★★미검증: Chrome MCP resize_window가 실제 뷰포트에 반영 안 됨 → 모바일 육안 불가. 대표 휴대폰 확인 요청:
  (1) 하단 탭바 4개 (2) 상품목록 카드 스택 (3) 가로 스크롤 0.

## ⭐ NEXT — 마지막 트랙 (새 채팅)
| 트랙 | 내용 | 우선 | 권위 문서 |
|---|---|---|---|
| 2-MOBILE-2 | 아틀리에 3분할 모바일 심화(중앙 캔버스 주화면 + 상단 목록 칩 + 하단 바텀시트 컨트롤) + SEO 편집 드로어 모바일 전체화면 모달 | P1 | MOBILE_NAMING_FIREFLY 주제1 |

> baseline: 878d8fc (origin/main, Vercel READY).
> 2-MOBILE-2 완료 시 UI/UX 통합재설계 Sprint 대단원 종료 → 이후 보류 누적(G8 파이프라인/달항아리 발행) 재개 검토.

## 권위 문서 (UI/UX Sprint, 정독 우선순위)
1. docs/research/GARDEN_DESIGN_BRIEF_2026-06.md (★레트로 팝 무드)
2. docs/research/GARDEN_CONCEPT_ANALYSIS_2026-06.md (정원 매핑·꼬띠 튤립)
3. docs/research/UIUX_INTEGRATED_DESIGN_SYSTEM_2026-06.md (디자인 시스템)
4. docs/research/MOBILE_NAMING_FIREFLY_2026-06.md (모바일·명칭·Firefly)
5. docs/research/NAMING_GLOSSARY_2026-06.md (명칭 용어집 — 신규 추가 명칭은 여기 등재)
6. docs/handoff/UIUX_PROGRESS_HANDOFF_2026-06-01.md (본 문서)

## 2-MOBILE-2 설계 방향 (착수 참조)
- 아틀리에 3분할(WorkbenchShell)은 2-MOBILE-1에서 모바일 1열 스택(목록→캔버스→탭)으로 collapse됨. 하지만 1열 스택은 캔버스가 작아지고 컨트롤이 멀어짐 → 심화 재구성 필요.
- 목표(주제1): 모바일에서 중앙 캔버스를 주화면으로, 상품목록은 상단 가로 스크롤 칩으로, 우측 4탭 컨트롤은 하단 바텀시트(드래그 핸들 50%/90% 스냅)로.
- SEO 편집 드로어(SeoEditDrawer): 데스크톱 우측 슬라이드 유지 / 모바일은 전체화면 모달(미리보기 상단 고정, 폼 하단 스크롤, 저장·닫기 하단 고정 바). NN/g: 바텀시트는 임시용이라 오래 머무는 SEO 편집엔 전체화면 모달이 안전.
- 컨테이너 쿼리(@container) 활용 — 컴포넌트가 부모 폭에 적응.
- ★Chrome MCP resize 한계로 Desktop 모바일 육안 어려움 → 코드 정독 + 대표 휴대폰 검증 병행 전제.

## 절대 준수 (전 Phase 공통 — 대표 강조)
- ★SD-01 아랍어 footer 장식+문구 영구 보존(조사/grep/수정 전면 금지).
- ★비가역 0: 네이버 발행 API 호출 금지(대표 명시 승인 전). DRAFT 유지. 런타임 외부 이미지 생성 0(#38).
- ★얼굴 없는 인체 일부 전략.
- Firefly 전 모델 자유 사용(Gemini/Nano Banana/FLUX, 크레딧 무관). Gemini 자체 API는 키 노출 사고로 revoke(키 보안 해결 시 재사용) — Firefly 웹 모델 선택과 무관.
- 한글리터럴 금지 i18n JSON(#35). 이모지 금지 Lucide만. 영어 주석. Prisma 싱글톤.
- heredoc 금지(#26). Korean commit(.commit-msg.tmp→git commit -F→temp삭제)+push 동일turn(#17/#24). TSC 0.
- Desktop 검증: paste 신뢰 아닌 Chrome MCP 직접 클릭 테스트 + 코드 정독 교차. 못하는 작업(MD 편집·모바일 resize 등)은 정직 보고 후 대표/Code 위임.
- 작업 분할: 컨텍스트 중단 방지 위해 트랙별 새 채팅 진행.

## 알려진 도구 한계 (Desktop Chrome MCP)
- resize_window가 실제 뷰포트에 반영 안 됨 → 모바일 반응형 육안은 대표 휴대폰 또는 실제 좁은 창에서. 코드 정독으로 구조 단정은 가능.
- 해상도 바뀌면 sticky 탭/사이드바 클릭 좌표 흔들림 → 클릭 전 스크롤 위치 정렬 필요.
- 정적 스크린샷으로 호버/툴팁 동작 단정 어려움 → 대표 확인 또는 코드 구조 단정.

## 보류 누적 (스코프 외)
- 2-MOBILE-1 모바일 육안 최종 확인(대표 휴대폰).
- 2-NAMING 툴팁 호버 확인(대표 마우스).
- Firefly "프롬프트 복사" 버튼 실제 클립보드 동작 확인(2-B-3 미검증분).
- G8-ENGINE 이미지 파이프라인 재개 / 달항아리 네이버 발행(대표 승인) / 명화송풍구 cutout 적재.
- Lane 2 BackdropCard / firefly-generate.ts / 아이스트레이 단품복구.
- SEO 필드 dedup(DEBT-01, 발행 후). 닥스훈트 배송·좀비소 = 컨셉 후보 미실현.
- prisma/schema.prisma baseline dirty + untracked(handoff/research) — 사용자 미지정 보존.
- 인라인 SeoEditPanel/KeywordStatsPanel dead path 코드 보존.
