# 꽃단장 작업실(Studio) 2.0 — 인앱 채팅+이미지생성+스킬프리셋 통합설계

작성: 2026-09-22 (설계 확정 진행 중, 구현 착수 전)
관련: #47/#48/#49/#59, 대표님 업로드 "꽃단장_작업실_재건축_2026-09-22.md"
(제미나이 작성), 대표님 직접 지시(채팅형 워크플로우, Gemini 2키, Adobe
Firefly 폴백)

## 0. 경위 — 이 설계에 도달하기까지 정정된 오판들 (재발 방지 기록)

1. **오판1**: #47/#59를 "완전 자동 생성 버튼 하나"로 설계하려 했음 →
   대표님이 "드래그 구현 방식은 유지하며, **채팅형 반복 워크플로우**가
   진짜 요구"라고 정정. 원본 md 파일(제미나이 리서치)을 재확인해서야
   "Aesthetic Wit 3단계", "채팅형 이미지 생성+픽스+팔레트 저장" 요구가
   원래부터 있었음을 확인 — 원칙#387(원본 재대조)의 재발 사례.
2. **오판2**: "제미나이의 캔바"를 내 도구함의 Canva MCP(프레젠테이션
   전용) 또는 Canva Connect API(Enterprise 전용 autofill)로 추정 →
   실제로는 "Canva Connected App for Gemini"(Gemini 앱 UI의 @Canva
   기능, 2026-05-19 출시)를 가리켰음. 원칙#389로 재발방지 기록.
3. **확정된 사실**: Gemini API 공식 리소스 목록에 Canva 관련 항목
   없음 — @Canva는 Gemini 앱 UI 전용, 우리 앱 서버가 Gemini REST
   API를 호출하는 방식으로는 재현 불가능.

## 1. 최종 확정 설계 — 정확히 무엇을 만드는가

### 1-A. 인앱 채팅 UI (신규, 최우선)
Studio(또는 씨앗심기) 안에 진짜 대화창을 넣어, 그 안에서 Gemini와
직접 대화하며 이미지를 생성·수정한다("자연광 카페 대리석 배경으로
바꿔줘" 같은 자연어 피드백).

- 프론트: 채팅 메시지 리스트 + 입력창 + 이미지 프리뷰 그리드(생성된
  후보 여러 장을 한 화면에 비교)
- 백엔드: `/api/ai/studio-chat`(신규) — 대화 히스토리를 유지하며
  Gemini에 프롬프트+이전 이미지(멀티턴 이미지 편집)를 전달

### 1-B. Gemini 2키 라운드로빈 이미지 생성 (신규, 1-A의 전제)
- 현재 `src/lib/ai/gemini.ts`는 OCR/Vision(이미지를 "읽기")만 지원 —
  이미지를 "생성"하는 기능이 없음. 신규 함수 필요(`generateImage` 또는
  유사).
- 이미 존재하는 `hasGeminiKey()`/`GEMINI_API_KEY`+`GEMINI_API_KEY_2`
  라운드로빈 인프라(`callGeminiRoundRobin`)를 그대로 재사용 — #295
  단일권위, 새 키 관리 로직 중복 금지.
- 429 발생 시 자동으로 두 번째 키로 failover(기존 `callGeminiRoundRobin`
  패턴 확인 필요, section-copy.ts의 Groq 패턴과 유사할 가능성 높음 —
  구현 전 재확인).

### 1-C. Adobe Firefly 폴백 (신규, 정밀가공용)
- 이미 Adobe MCP가 연결돼 있음(도구 목록에 `mcp__Adobe_for_creativity__*`
  다수 확인됨 — image_remove_background, image_generative_expand 등).
- Gemini 토큰 한도 초과 또는 누끼/배경확장처럼 Gemini가 약한 작업일
  때 Adobe Firefly/Express로 자동 라우팅.
- **주의**: 이건 Claude 세션의 MCP 도구이지, 우리 앱(Next.js 서버)이
  직접 호출하는 API가 아님 — 프로덕션 앱에서 Adobe Firefly를 쓰려면
  별도로 Adobe Firefly Services REST API 키가 필요한지 확인 필요
  (project_knowledge의 Research_Report.md에 "경로 B는 OAuth
  Server-to-Server + Adobe enterprise 계약 필요, 1인 사업자는 접근
  어려움"이라는 기존 리서치 결론이 있었음 — 이미 답이 나와있을 수
  있으니 구현 전 재확인).

### 1-D. Canva 연동 — 현실화된 범위
- Gemini API의 @Canva 자동 호출은 불가능(위 0번 경위 참조).
- 대신: 채팅으로 확정한 이미지를 **"Canva에서 편집하기"** 버튼으로
  Canva 웹에 넘기는 수동 핸드오프 방식(이미지 다운로드 또는 Canva
  업로드 딥링크). 이건 Canva MCP의 `search-designs`/`create-design-
  from-brand-template` 등 "presentation" 전용 도구와도 다른, 훨씬
  단순한 "이미지를 Canva로 넘기는" 최소 연동.

### 1-E. 스킬 프리셋 DB (신규, 마지막 단계)
- `prisma/schema.prisma`에 새 테이블 필요(0건 확인, 완전 신규):
  ```prisma
  model SkillPreset {
    id          String   @id @default(cuid())
    userId      String
    name        String   // "성수동 앤틱 옥반지 감성 스킬"
    promptStructure String @db.Text  // 확정된 이미지 생성 프롬프트
    copyToneHook     String? @db.Text // Aesthetic Wit Hook 톤
    copyToneDetail   String? @db.Text
    copyToneAttitude String? @db.Text
    referenceImageUrl String?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }
  ```
  (정확한 필드는 1-A/1-B 구현 후, 실제로 "확정본"이 어떤 데이터
  구조인지 확정된 뒤 재설계 — 지금은 최소 스케치)
- UI: 채팅에서 "이 스타일 저장" 버튼 → 프리셋 칩으로 저장 → 다음
  상품 작업 시 칩 클릭으로 프롬프트 구조 재사용.

## 2. 정확한 구현 순서(의존성)

1. **1-B(Gemini 이미지생성 API)** — 모든 것의 전제, 가장 먼저.
   `callGeminiRoundRobin` 재사용 여부부터 확인.
2. **1-A(채팅 UI)** — 1-B를 감싸는 대화형 껍데기.
3. **1-C(Adobe Firefly 폴백)** — 선택적 고도화, 프로덕션 API 키
   확보 가능 여부 확인 후 착수(project_knowledge 리서치 재확인 필요).
4. **1-D(Canva 핸드오프)** — 가벼운 추가, 1-A 완료 후 아무때나.
5. **1-E(스킬 프리셋 DB)** — 1-A/1-B의 산출물 구조가 확정된 뒤 마지막.

## 3. 기존 인프라와의 관계 (재사용 — #295 단일권위)

- 8단계 HTML/PNG 콘텐츠 조립 파이프라인(rev201 근본수정 완료)은
  그대로 유지 — 채팅으로 만든 이미지가 이 파이프라인의 입력(썸네일/
  상세이미지)으로 들어가는 구조. 파이프라인 자체를 새로 만들지 않음.
- `generate-detail` API(#47 재조사에서 발견, 이미 PNG+HTML 완전
  반환)는 여전히 유효 — 채팅 이미지 생성은 이 API가 쓰는 "재료
  이미지"를 준비하는 상류 단계.

## 4. 다음 세션 착수 지점

**1-B부터.** `src/lib/ai/gemini.ts`에서 `callGeminiRoundRobin`의
정확한 시그니처를 재확인하고, Gemini 이미지 생성 모델(Imagen 계열
또는 Gemini 2.5 Flash Image/"Nano Banana")의 정확한 API 엔드포인트를
공식 문서로 확인한 뒤 근본수정 착수.
