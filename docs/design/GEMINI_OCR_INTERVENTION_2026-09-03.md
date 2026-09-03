# GEMINI_OCR 개입점 설계 — 도매 상세이미지 → 속성 자동추출 (전 상품 공통)

> 레인: Desktop(설계) · 작성 2026-09-03 · 상태: 운영자 GO 대기
> 선행: Gemini 활성화 완료(f313ff4·gemini-3.6-flash GA·프로덕션 실키 작동 확인).
> 목적: Groq(텍스트)로 불가능한 Gemini 고유가치(멀티모달 OCR)를 씨앗심기에 개입점으로 녹임.

---

## 1. 배경 — 왜 OCR인가 (실측 근거)

- 몇 세션간 카테고리·상품명·속성 정확도에 씨름 → 근본은 "속성 정보가 텍스트로 없음". 도매 상품은 핵심 정보(재질·용량·크기·원산지)가 **상세페이지 이미지 안에 글자로 박혀** 있어, Groq(텍스트)로는 못 읽음.
- Gemini는 멀티모달(이미지 OCR) → **상세이미지에서 속성을 자동 추출** → 카테고리·상품명·SEO 정확도 근본 상승.
- 실측: `source_detail_url`(DB·도매 상세이미지 URL), 씨앗심기 `mainImage`/`detailImageUrl`/`ImageUploadDropzone` 존재. 입력 소스 확보됨.

## 2. 선행 필수 — callGemini 멀티모달 확장

**현재 `callGemini`는 텍스트 전용**(실측: `contents:[{parts:[{text}]}]`만). OCR엔 이미지 parts 필요:
- `callGeminiVision(prompt, systemPrompt, imageInput)` 신설 or callGemini에 옵셔널 image 파라미터.
- Gemini API 이미지 입력: `parts:[{text}, {inline_data:{mime_type, data:base64}}]` 또는 `{file_data:{file_uri}}`.
- **입력 방식 결정**: 도매 이미지는 URL(source_detail_url) → ①서버가 fetch→base64 inline_data(안전·URL 만료무관) or ②file_uri 직접(빠름·URL 접근가능해야). **권고: base64**(도매 URL 만료·CORS 회피, Vercel 4.5MB 제한 내 리사이즈).
- round-robin failover(GEMINI_API_KEY→_2) 그대로 상속.

## 3. 개입점 설계 (전 상품 공통)

### 3-1. 씨앗심기 "이미지에서 속성 추출" 액션
- 씨앗심기 이미지 섹션(mainImage/detailImageUrl 있을 때)에 **"이미지에서 정보 읽기"** 버튼.
- 클릭 → 상세이미지를 Gemini OCR → 속성 JSON 추출: `{material, size, capacity, origin, features[], keywords[]}`.
- 결과를 **후보로 제시**(자동확정 금지·#353 반자동): 사람이 "적용" 눌러야 폼 반영. category·상품명 제안에 힌트로 연결.

### 3-2. 추출 속성의 흐름 (기존 엔진과 연결)
- OCR 속성 → ①category matcher 힌트(재질/용도로 정확도↑) ②상품명 SEO(속성 키워드) ③원산지 확인(이미지에 "made in" 있으면). 신규 판정엔진 X, 기존 UCE/SEO에 **입력 보강**만(#295 단일권위 유지).

### 3-3. 개입점 위치 (자연스럽게 녹임·#56)
- 씨앗심기 이미지 업로드 직후 자동 제안 or 수동 버튼. 강제 순서 X.
- OCR 실패/저신뢰 → "이미지에서 정보를 못 읽었어요, 직접 입력" 정직표시(#310).

## 4. 비용·안전 (비용0 원칙)
- Gemini 무료 250 RPD × 2키 = 500/일. OCR은 상품 등록시 1회라 새싹 단계 충분.
- 이미지 리사이즈(1456px·web-JPEG ~330KB) 후 전송 — Vercel 4.5MB·Gemini 토큰 절약.
- 키값 로그·응답 노출 금지. 실패 시 Groq 텍스트 폴백 아님(OCR은 Gemini 전용, 실패시 수동).

## 5. 완료 조건
- callGeminiVision 멀티모달 실호출 스모크(도매이미지 1장 → 속성JSON, 키값 미출력).
- 씨앗심기 "이미지에서 정보 읽기" → 후보제시 → 적용 브라우저 실측(자동확정 안 함 확인).
- 카탈로그 밖 임의 상품이미지 3종으로 속성추출 정확도 확인(#352 임의표본).
- COMPLETION_GATE + 브라우저 실측.

## 6. 의존성·범위
- 선행: callGemini 멀티모달 확장(2번) → OCR 개입점(3번). 순차.
- 독립: F 발행넛지·테스트잔재 정리와 무겹침(이미지 파이프라인만).
- Gemini 활성화(완료)에 의존. 프로덕션 env 키 반영됨(실측 확인).

## 7. 3자 AI 역할분담 (확정)
| AI | 역할 | 근거 |
|---|---|---|
| Groq | 고빈도 텍스트(카테고리·SEO·코멘트) | 14,400/일·초고속 |
| **Gemini** | **멀티모달 OCR·속성추출**(본 문서) + Groq 폴백 | 무료 250×2·멀티모달 고유 |
| NotebookLM | 수동 팩트체크(원칙문서 업로드·환각검증) | 소비자 API 없음·출처기반 강점 |
