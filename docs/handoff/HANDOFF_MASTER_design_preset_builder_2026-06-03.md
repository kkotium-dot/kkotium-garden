# 마스터 핸드오프 — 디자인 시스템 + 빌더 정리 + 상세페이지 (2026-06-03)

> 작성: 2026-06-03 Desktop | 성격: 이번 사이클 단일 진실 공급원 (다음 채팅 A/B/C의 진입점)
> 이 문서 하나로 다음 작업들이 누락·중복 없이 이어지도록 설계됨.
> 짝 문서: docs/design/{KKOTIUM_DESIGN_SYSTEM, CONCEPT_PRESET_SYSTEM, DETAIL_PAGE_PLAYBOOK}.md

---

## 0. 이번 사이클 요약 (무엇이 결정됐나)

1. **디자인 시스템 3종 표준 수립 완료** (docs/design/):
   - `KKOTIUM_DESIGN_SYSTEM.md` — 브랜드 코어 토큰 (고정: 로고·시그니처색 Red #E62310/Pink #FFCCEA·Pretendard·꼬띠)
   - `CONCEPT_PRESET_SYSTEM.md` — 하이브리드 컨셉 프리셋 엔진 (3단계 가변 강도 L1/L2/L3, 카테고리별 프리셋)
   - `DETAIL_PAGE_PLAYBOOK.md` — 상세페이지 제작 SOP (5단계 파이프라인, 7섹션 공식)
2. **핵심 원칙 확정**: "모든 상품을 한 톤으로 밀지 않는다." 브랜드 코어는 고정, 상품 컨셉은 카테고리 성격에 맞춰 가변 강도 조절 (감성=L3 강한 변주, 실용=L1 절제). SEO는 디자인과 직교(분리).
3. **명화 디퓨저 발행 준비 상태 (DB 실측 확정)**:
   - SEO 7필드 우리 검증 키워드로 교정 완료 → 발행 게이트 GREEN (publishReady=true)
   - 향 3종 옵션(레몬유칼립/에이프릴 후레쉬/블랙체리, 추가금 0) 양쪽 정합 삽입 완료 (Product + product_options)
   - 상세페이지 = aroma 프리셋 첫 레퍼런스로 제작 예정 (다음 채팅 A)
4. **빌더 처리 방향 확정 (코드 실측 기반)**: `products/DetailPageBuilder.tsx`(구 6종 블록 빌더, 4월 E-1)는 `studio/` 골격 시스템과 충돌하는 중복물. **흡수·제거가 정답.** (아래 §3 상세)

---

## 1. 다음 작업 분할 (채팅 A / B / C — 각 새 채팅에서 진행)

| 채팅 | 작업 | 환경 | 선행조건 | 비가역 |
|---|---|---|---|---|
| **A** | 명화 디퓨저 상세페이지 레퍼런스 완성 (aroma 프리셋 검증) | Desktop + 디자인도구(Firefly/Claude Design) | 없음 | 디자인 승인 = 대표 |
| **B** | 프리셋 시스템 코드화 + 빌더 흡수/제거 | Claude Code | 채팅 A 완료(프리셋 패턴 검증) 권장 | Code register 금지 |
| **C** | 크롤러 옵션 매핑 수정 | Claude Code | 없음 (명세 작성 완료) | Code register 금지 |

순서 권고: **A → B**, **C는 독립(병행 가능)**. C는 명세(`HANDOFF_crawl_option_mapping_fix_2026-06-03.md`)가 이미 완성돼 단독 진행 가능.

---

## 2. 채팅 A — 명화 디퓨저 상세페이지 (aroma 프리셋 첫 레퍼런스)

**목표**: 명화 디퓨저 상세페이지를 내추럴·미니멀·고급(다크 아님) 감성 + 절제 카피로 완성. 이게 aroma 프리셋(Level 3)의 실증 레퍼런스가 됨.

**확정 디렉션 (대표 지침)**:
- 무드: 내추럴 감성 (어스톤 — 세이지/스톤/웜크림/테라코타). 미니멀·고급. 다크 금지.
- 컨셉: "예술적 일상" — 명화를 입힌 차량용 디퓨저. 과잉 정보 금지("저작권 만료" 류 삭제).
- 카피: 논픽션식 절제 후각 카피 (향 노트 → 장면/감정 번역 + 시그니처 한 줄). 컨셉 톤 일관.
- 7섹션: 후킹 → 가치3 → 향3종+스펙 → 사용법 → 아트스토리 → CTA → 안내.
- 향 3종: 레몬유칼립("창문 연 아침, 정원의 풀잎") / 에이프릴 후레쉬("비 갠 뒤 꽃에 스민 햇빛") / 블랙체리("늦은 오후, 잘 익은 체리 한 입").
- 이미지: Firefly로 향기 전달 이미지 (commercial-safe, IP 면책 유료플랜). 명화 풍 인상주의 배경 + 제품 합성. AI 얼굴 금지.

**작업 흐름 (반자동 — 핸드오프 카드 방식)**:
1. Desktop이 aroma 프리셋 기준 상세페이지 시안(아티팩트/Claude Design) 제작
2. Firefly 이미지 = 대표 1-click 생성(수동) → Desktop이 프롬프트·핸드오프 카드 제공
3. 대표 디렉팅·승인 → 확정
4. 860px 분할 export → 발행 준비

**유의**: 발행(register)은 상세페이지 완성 + 대표 명시 승인 후. 비가역 0.

**채팅 A 시작 시 읽을 것**: 이 문서 §2 + docs/design/ 3종 + 이전 시안(에디토리얼 갤러리 버전 — 내추럴로 전환 필요).

---

## 3. 채팅 B — 프리셋 코드화 + 빌더 흡수 (Claude Code)

### 3-A. 빌더 흡수/제거 (코드 실측 확정)
- **현황**: `src/components/products/DetailPageBuilder.tsx` 존재(구 6종 블록: Hook/Image/Text/Q&A/Specs/Divider). `src/components/studio/`에 신 골격 시스템 완비(DetailPageCard, DiagnosisCard, workbench/FireflyPromptBuilder 등).
- **판단**: 빌더는 studio와 충돌하는 중복물. 1인 셀러에게 수동 블록 조합은 비효율 + 프리셋 자동화와 정면 충돌.
- **작업 (Code가 직독 후 실행)**:
  1. DetailPageBuilder가 import/사용되는 곳 grep (씨앗심기 이미지 탭 추정).
  2. **흡수 확인**: Q&A·Specs(사양테이블) 기능이 studio 골격에 이미 있는지 대조. 있으면 그대로 제거, 없으면 studio로 이전 후 제거.
  3. SEO 훅문구 → studio 진단 메타데이터로 흡수.
  4. 빌더 위치 → "상세페이지 자동화" 안내 카드로 교체(studio/비주얼 자동화로 점프).
  5. DetailPageBuilder.tsx 제거 + 참조 정리. TSC 0 + build 0.
- **주의**: 제거 전 반드시 기능 이전 확인(손실 방지). dryRun grep 먼저.

### 3-B. 프리셋 시스템 코드화 (CONCEPT_PRESET_SYSTEM.md 구현)
- Supabase `Product`(또는 products)에 컬럼 추가: `concept_preset`(text, default 'kitchen'), `preset_intensity`(text, default 'l1'), `preset_overrides`(jsonb). Prisma 마이그레이션.
- globals.css: `:root`(코어 토큰) + `[data-preset="aroma|gift|tradition|kitchen|pet"]`(가변 토큰). 우선 프리셋 4~5개.
- 7섹션 컴포넌트 CVA variant (preset × intensity 2축).
- SEO 가드는 프리셋과 분리 유지 (상품명 50자·대표이미지 1:1 검증 별도).
- 점진 전략: 프리셋 5개+ 시 Style Dictionary 도입. 그 전엔 수동 CSS 변수.
- **주의**: 한글 리터럴 금지(영어 상수), 이모지 금지(Lucide), Prisma 싱글톤, 한글 MD = write_file/Python.

### 3-C. MD 본문 갱신 (이 채팅에서 함께)
- `docs/plan/PROGRESS.md`, `ROADMAP.md`, `SESSION_LOG.md`, `TASK_BRIDGE.md` 갱신: 디자인 시스템 3종 수립·빌더 흡수·프리셋 코드화·명화 발행준비 반영.
- 대용량 한글 MD = Python 안전삽입 스크립트(#29b), heredoc 금지(#26), 커밋 한글 = .commit-msg.tmp(#17).

---

## 4. 채팅 C — 크롤러 옵션 매핑 수정 (Claude Code, 독립)

- 명세: `docs/handoff/HANDOFF_crawl_option_mapping_fix_2026-06-03.md` (작성 완료).
- 핵심: crawl_logs.options(정상 저장됨)가 Product 승격 시 누락 → 변환 매핑 추가. 재크롤 불필요.
- 양쪽 정합 필수: Product(hasOptions/optionName/options) + product_options 테이블.
- 명화 디퓨저는 이미 수동 보정 완료 → backfill 시 중복 INSERT 방지.

---

## 5. 작업 유의사항 (대표 강조 — 전 채팅 공통)

**절대 준수 (비가역·정직)**:
- 비가역 0: 네이버 발행(register)·POST mutate는 대표 명시 승인 전 금지. Code는 register 실호출 금지.
- 허위 0 (#46): 표준문구·실데이터만. 옵션·검색량·404 날조 금지. 검증은 3-tier(API응답+DB행+필드 교차).
- 못 하는 작업은 거짓말 말고 즉시 대표에게 요청 (예: register, Firefly 1-click, 외부 로그인).

**환경·핑퐁 (#41)**:
- Desktop(이 환경): MCP 검증·실측·register 실호출 권한. Supabase/Vercel/Filesystem/Chrome.
- Claude Code: 파일편집·git·TSC/build. register·POST mutate 금지. 대표가 paste 중계.
- 핸드오프 메시지에 Target Session + Branch 명시.

**코드 규칙**:
- 한글 리터럴 금지(영어 상수 분리), 주석 영어, 이모지 금지(Lucide React only).
- 수정 전 read_file로 파일 상태 확인 → 수정 후 tsc --noEmit.
- Prisma 싱글톤(src/lib/prisma.ts), new PrismaClient() 금지.
- 의존성 없는 작업 동시 진행.

**MD 관리**:
- 대용량 한글 MD = Python 안전삽입(#29b), heredoc 금지(#26), 커밋 한글 = .commit-msg.tmp(#17).
- 새 MD는 docs/ 적절 폴더에 저장(design/handoff/research/plan).
- 작업 마무리 시 PROGRESS/ROADMAP/SESSION_LOG/TASK_BRIDGE/HANDOFF 갱신.

**Production**:
- Vercel이 진실(#28). push 후 verify-vercel(#36). npm run dev를 프로덕션 런타임으로 쓰지 않음.

**컨텍스트 보존**:
- 작업을 채팅 단위로 분할(A/B/C). 한 채팅에 과부하 금지 → 중간 끊김·중복작업 방지.
- 각 채팅 시작 시 이 마스터 핸드오프 + 관련 docs 먼저 읽기.

**SD-01**: /studio 아랍어 footer 영구 미접촉.

---

## 6. 현재 상태 스냅샷 (명화 디퓨저)
- id: cmpnooli40001f0gveaxr8iim / 도매매 원본 65322245
- SEO 7필드 GREEN, 향 3종 옵션 삽입 완료, 발행 게이트 publishReady=true
- 남은 것: 상세페이지 디자인(채팅 A) → 발행게이트 재확인 → 대표 승인 → register(비가역)
- 가격: 판매 29,000 / 공급 14,300 / 도매배송 3,000 / 고객 무료배송 / 마진 정상
- 카테고리 50003356 (automotive-fragrance, scent 허용)