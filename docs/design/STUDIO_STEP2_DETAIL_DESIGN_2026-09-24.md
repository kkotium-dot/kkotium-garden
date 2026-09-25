# 꽃단장 작업실 Step 2 "상세 캔버스" 설계 (2026-09-24, 대표님 승인 대기)

> 기준: docs/design/STUDIO_MASTER_PLAN_FINAL_2026-09-24.md (Step 2 + 흡수된 Step 3 "씨앗심기 정보 반영").
> 역할 분담(§A): 씨앗심기 = 상품정보·SEO 주인 / 작업실 = 상세 **제작**, 씨앗심기 값은 읽기 전용.

## 1. 실측 근거 (2026-09-24)

### 1-1. 네이버로 가는 상세 HTML의 실제 조립 순서 (product-builder.ts buildDetailContent)
상단 공지(이미지·글) → 훅 문구(hookPhrase) → 상세 합성 1장(detail_image_url) → 상세 이미지 여러 장(detail_images) → 상품 설명 글(description, HTML 이스케이프된 순수 텍스트) → **AEO Q&A·FAQ 블록(aeo_content, h2/h3 구조)** → 하단 공지.
→ 작업실 Step 2는 **새 발행 경로를 만들지 않고 이 칸들을 채운다**(#295 단일권위, IDIOM-10 교훈).

### 1-2. 실데이터 채움 현황 (36개 상품)
| 칸 | 채워짐 | 비고 |
|---|---|---|
| hookPhrase | 34 | 대부분 자동 채움 |
| detail_images | 5 | |
| detail_image_url | 2 | generate-detail PNG 적용분 |
| description | 2 | |
| **aeo_content (Q&A·FAQ)** | **0** | 생성기(`/api/products/[id]/aeo-generate`, Groq)·렌더러 모두 있으나 호출처가 naver-seo 표 1곳뿐 → **가장 큰 AEO 공백** |

### 1-3. 공식·교차 확인 사항
| 항목 | 결과 | 출처 |
|---|---|---|
| 커머스API는 스마트에디터 ONE 미지원, API로 detailContent 재저장 시 SE ONE 레이아웃 깨짐, 수정 시 detailContent 생략하면 기존 유지 | 확인 | 네이버 커머스API 공식 답변(commerce-api discussion #26) |
| `<script>`·`<style>` 태그 제거됨 → **JSON-LD 은닉 주입 불가** | 확인(2차) + 네이버 도움말 HTML 태그 제한 문서 존재(faq 4414, 허용되지 않은 속성 필터 5305) | smarteditor2 이슈 #84, gpters 2026-07 |
| 권장 구성 = 텍스트 HTML + 복잡한 표·인증서만 860px 이미지 혼합 | 2차 | gpters 2026-07 |
| 상세 권장 가로 860px | 확인 | 네이버 상품등록 안내, 코드 CANONICAL_WIDTH=860 |

→ 마스터플랜 A15(JSON-LD)는 **제외 확정**. 구조화는 이미 있는 h2/h3 Q&A 블록으로 대체.

## 2. [P0 안전장치] 스토어센터 수정 상세 덮어쓰기 방지 — 설계 최우선
- 현재: `/api/naver/products/update`는 "앱 상세가 상품명 div뿐일 때만" 네이버 상세를 보존. hookPhrase가 34/36개 상품에 있어 **보존 조건이 사실상 미작동** → 스토어센터에서 SE ONE으로 다듬은 상세가 앱 수정 발행 시 앱 HTML로 교체될 수 있음(얼굴망 상품이 해당 유형).
- 설계: 수정 발행 전 네이버 현재 상세를 조회(읽기 전용)해 **SE ONE 작성 흔적이 있으면 기본값 = 상세 보존**, 셀러가 "앱 상세로 교체"를 명시 선택할 때만 교체. 판별 표식은 실제 발행 상품 1건을 읽기 전용 조회(dryRun)로 실측해 확정(추정 금지).
- 비가역 PUT 테스트는 대표님 GO 없이 하지 않음.

## 3. Step 2 화면 구성 (새 기능만, 레거시 숨김 유지)
| 영역 | 내용 | 재사용 |
|---|---|---|
| 중앙 | 네이버에 실제로 올라갈 순서 그대로의 **세로 미리보기**(PC 860 / 모바일 약 390 토글) — 섹션: ① 훅 문구 ② 상세 이미지(순서 변경·교체) ③ 상품 설명 글 ④ Q&A·FAQ | `buildDetailContent` 결과를 그대로 미리보기(화면=발행물 일치) |
| 우측 "씨앗심기 정보 반영" | 씨앗심기 확정 상품명·키워드·속성·태그를 읽기 전용 배지로 표시 + 각 키워드가 상세 글(③④)에 들어갔는지 표시. 수정은 씨앗심기 딥링크 | GET /api/products/[id] |
| AI 초안 | ③ 설명 글 = 기존 aesthetic-wit(Hook/Detail/Attitude) / ④ Q&A = 기존 aeo-generate. 초안은 셀러가 확인·수정 후 저장 | 기존 API 2종 |
| 저장 | 같은 경로 `PUT /api/products {id, hookPhrase, detail_images, description, aeo_content}` | 씨앗심기와 동일 |
| Step 3 연동 | 전송 패널의 "상세 대기" → 칸별 채움 상태로 교체 | StudioHandoffPanel |

## 4. 단계 나눔 (마스터플랜 누락 없이, 순서만 조정)
| 단계 | 범위 | 신규 의존성 |
|---|---|---|
| 2-A | P0 안전장치(실측 → 보존 기본값) | 없음 |
| 2-B | 세로 미리보기 + ①②③④ 편집·저장 + 우측 씨앗심기 정보 반영 | 없음 |
| 2-C | AI 초안(설명 글·Q&A) 연결 | 없음(기존 API) |
| 2-D | 이미지별 alt(현재 전부 상품명 고정 → 씨앗심기 정보 기반 이미지별 설명) — product-builder 공통 수정 | 없음 |
| 2-E | Fabric.js 섹션 이미지 편집기(대표 썸네일 → 상단 비주얼 자동 승계, 레이어 드래그) | fabric 설치 |
| 2-F | Adobe Firefly/Express 브릿지 버튼 배치(기존 FireflyPromptBuilder 재사용) | 없음 |
| 이후 | 제미나이 채팅(좌측 AI 배양실)·향기 레시피 DB | 마스터플랜 순서대로 |

## 5. 제외·보류
- JSON-LD 은닉 주입: 제외(스크립트 태그 제거).
- 모바일 750/PC 1000 미리보기: 860/약 390으로 조정(§A 확정).
