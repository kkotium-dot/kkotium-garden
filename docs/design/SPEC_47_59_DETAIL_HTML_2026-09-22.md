# #47+#59 통합설계 — 반응형 HTML 상세페이지 생성기 + 세로형 슬롯 배치

작성: 2026-09-22 (설계 확정, 구현 전 문서화)
관련: #47(신규-9/17 원본메모+제미나이), #59(대표님 9/22 신규지시)
업계 벤치마크: Converta(대화형 상세페이지 AI), 카페24 스토어(9개 채널 전송),
미리캔버스/캔바(템플릿), 스마트스토어 자체 규격 가이드(2026)

## 1. 핵심 발견 — 이미 있는 걸 재사용한다(#295 단일권위)

코드 실측 결과, 이 앱에는 이미 **PNG 렌더링용 완전한 8단계 콘텐츠 조립
엔진**이 존재한다(src/lib/automation/, 6,677줄):
- 12종 레이아웃 스켈레톤(S1~S12, 가격대×상황×상품유형별)
- 20개 이상 섹션별 AI 카피 생성 함수(problem/spec/reviews/cta/benefits/
  warranty/comparison/attitude 등, section-copy.ts)
- buildDetailPage()가 스켈레톤 매칭→섹션별 카피 생성→PNG 합성까지 전부
  수행하고, 결과의 sectionsMeta[]에 {sectionId, copy, role}을 이미
  담고 있음

반면 detail-html-serializer.ts(#47이 다루는 대상, 스마트에디터 붙여넣기용
HTML)는 이 엔진과 완전히 분리된 얇은 별도 경로였고, section-copy.ts의
함수들을 전혀 호출하지 않았음(grep 0건 확인) — "미착수"가 아니라
"파이프라인이 두 개로 쪼개져 있었다"가 정확한 진단.

**SerializeSection{sectionId, copy, role}과 buildDetailPage()의
sectionsMeta 항목이 필드 shape이 정확히 동일함을 확인** — 즉 새 로직을
만들 필요 없이, PNG 파이프라인의 산출물을 그대로 HTML 시리얼라이저에
넘기기만 하면 두 출력물(이미지/HTML)이 동일한 8단계 콘텐츠를 완전히
공유하게 된다.

## 2. 업계 표준 대조(Converta 2026 가이드 기준)

| 업계표준 8단계 | 기존 코드 섹션ID | 커버리지 |
|---|---|---|
| 1. 첫화면(히어로) | hero | 이미 있음(전 스켈레톤 공통) |
| 2. 문제공감 | problem | 이미 있음(#48 rev202에서 Hook으로 확인) |
| 3. 핵심강점 3가지 | benefits, corePerformance | 이미 있음 |
| 4. 상세컷(재질·디테일) | material, styledShot | 이미 있음 |
| 5. 스펙/성분/사이즈(표) | spec, specTable, specifications | 이미 있음(#47 rev201에서 모바일반응형 처리 완료) |
| 6. 후기·증거 | reviews | 이미 있음(S10에서만 사용 중) |
| 7. 배송·교환 안내 | shipping | 이미 있음 |
| 8. CTA(지금 사야 할 이유) | cta, attitude | cta는 절제된 신뢰문구, attitude(#48 rev202 신설)는 시크한 클로징 — 업계표준의 "혜택·한정 어필" CTA와는 톤이 다름. 다크패턴필터로 허위긴급성은 계속 차단하되, attitude를 CTA 슬롯 마지막에 배치하는 것으로 충족 |

**결론: 8단계 전부 이미 존재한다.** 부족한 건 ①HTML 경로가 이 8단계를
안 쓰는 배선 문제 ②스켈레톤마다 8단계 중 일부만 쓰는 조합 문제(S1은
3단계뿐) — 새 카피로직이 아니라 "배선 + 조합 확장" 문제.

## 3. 근본수정 설계

### 3-A. 배선(HTML↔PNG 파이프라인 통합) — **정정: 이미 완료돼 있었음**
**재조사 결과(2026-09-22, IDIOM-9 발견)**: `buildDetailPage()`의 결과를
`serializeDetailHtml()`에 넘기는 배선은 이미 `generate-detail/route.ts`
(#47 rev201 이전부터 존재)에 정확히 구현돼 있었다 — 코드 주석에
"STEP 3 — Parallel HTML output — additive" 명시. 처음엔 이 배선이
없다고 판단해 별도 브릿지 함수(detail-page-to-html.ts)를 새로
작성했으나, 배포 직전 `grep -rln "buildDetailPage" src/app/api/ |
xargs grep -l "serializeDetailHtml"`로 소비처를 확인해 이미 존재함을
발견 — 만든 파일 삭제, 설계 정정(원칙#388/IDIOM-9로 재발방지 기록).
**결론: 3-A는 신규 작업 불필요, API가 이미 8단계 콘텐츠를 HTML로
정확히 내보내고 있음.**

### 3-B. 세로형 슬롯 배치(#59, 대표님 9/22 지시) — 이미 구조적으로 충족
- 대표님 요구: "모바일 세로 스크롤 환경에 맞춰 세로로 길게 이어지는
  슬롯 구조", "모바일/PC 비율 차이 고려", 썸네일(1000x1000)은 그대로
  유지.
- rev201에서 이미 clamp() 반응형 폰트+섹션간 구분선(세로 슬롯 시각
  강조)을 detail-html-serializer.ts에 근본수정 완료. 3-A로 8단계
  콘텐츠가 채워지면, 각 섹션(hero/problem/benefits/material/spec/
  reviews/shipping/cta)이 정확히 "세로로 길게 이어지는 슬롯"이 되어
  #59 요구사항을 자연스럽게 충족.
- 업계표준 규격(가로860px·세로~5000px)과 코드의 CANONICAL_WIDTH=860이
  이미 일치 — 추가 규격 변경 불필요.

### 3-C. 스펙 테이블 모바일 대응(rev201 남겨둔 갭) — 3-A로 자동 해결
rev201에서 "HTML 경로에 구조화 스펙테이블이 없다"고 기록했던 갭은,
section-copy.ts의 generateSpecRows()가 이미 {label, value}[] 구조를
반환하므로(section-copy.ts 확인됨) 3-A 배선만 완료하면 자동으로
채워짐 — 별도 신규 테이블 렌더러 불필요.

### 3-D. 씨앗심기 통합 UI — 유일하게 남은 진짜 작업
`POST /api/products/[id]/generate-detail`(PNG+HTML 둘 다 이미 완전히
반환하는 기존 API, 3-A/3-B 전부 그 안에 이미 구현됨)를 호출하는
화면이 씨앗심기에 없음. 현재 유일한 소비처는 `studio/preset-preview`
인데 코드 주석에 "Internal verify tool"(내부 검증 도구)로 명시돼
있어 셀러용이 아님(grep으로 확인). 신규: 씨앗심기 "상세페이지
이미지" 섹션(products/new/page.tsx 4100줄 근처) 옆에 "[상세페이지
자동생성]" 버튼 → 기존 generate-detail API 그대로 호출 → 응답의
HTML을 스마트에디터 ONE 복사용 코드블럭으로(이미 #33/#48에서 검증된
"복사" 버튼 UX 패턴 재사용), PNG는 미리보기 이미지로 표시.

## 4. 구현 순서(의존성)
1. 3-D(씨앗심기 UI 버튼) — **유일하게 남은 작업**, 3-A/3-B는 이미
   완료돼 있어 의존성 없이 바로 착수 가능
2. 실측 검증(브라우저로 실제 상품에 버튼 클릭 → API 응답 → 화면
   렌더링 확인)
3. #59는 3-A/3-B로 이미 자연히 충족되므로 별도 구현 불필요, 3-D
   완료 후 검증만 수행

## 5. 명시적으로 하지 않는 것(범위 밖, 다음 스프린트)
- 스켈레톤별 섹션 조합 확장(S1에 problem/benefits 추가 등) — 이건
  PNG 결과물의 시각 디자인을 바꾸는 것이라 더 신중한 별도 작업
- Canva 연동(#50) — #47 이후 착수 권장으로 기존에 이미 순서 확정됨
- 스킬 프리셋 저장(#49) — 별도 스프린트
