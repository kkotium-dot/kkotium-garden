# 씨앗심기 폼 개편 + 검증 (MCP 복구 후 문서화) (2026-07-12)

Authoring: DESKTOP(MCP 복구 후·Supabase+filesystem 검증). 계기: 운영자 씨앗심기 폼 7건 요청→Code f1c0e8e 구현→Desktop 재검증. 원칙 #62/#233/#251. 상태: 구현 완료·DB/배선 검증·운영자 수용테스트 대기.

## 0. 요청 7건 (운영자)
1. A/S 설정칸 → A/S 템플릿코드화(제공고시 패턴 미러).
2. 제공고시+A/S 둘 다 템플릿코드명+저장목록 관리(운영자 코드 직접입력·추가/수정/삭제·선택).
3. 배송정책: 배송설정 맨 위 고정·아래 재배치.
4. 템플릿코드 네이버 엑셀 적용.
5. 단위가격 옆 "(2026-04-29 시행)" 삭제.
6. 업데이트 카테고리(5021) 추천 기능 적용 확인.
7. 언급 외 구식 고지/오라벨 점검.

## 1. Code 구현 (prod f1c0e8e)
- **TemplateCodePicker.tsx**(공통·#62): 드롭다운(저장 목록)+관리모드(코드 직접입력·추가/수정/삭제). 제공고시·A/S 공용.
- 영속: StoreSettings JSON `notice_templates`·`as_templates`({code,name}[])·localStorage 금지. 선택코드는 Product `noticeTemplateCode`·`asTemplateCode`.
- 배송정책 순서: 배송설정→제공고시→A/S→반품케어→리뷰→구매평.
- 엑셀: naverExcelJS가 p.noticeTemplateCode(col51)·p.asTemplateCode(col56) 출력(레거시 excel-generator도 동기화).
- "(2026-04-29 시행)" 제거(page.tsx 하드코딩).
- A/S 전화/안내는 fallback 유지.

## 2. Desktop 재검증 (MCP 복구 후·실측)
| 항목 | 결과 |
|---|---|
| Product 컬럼 | noticeTemplateCode·asTemplateCode 생성(Supabase) ✓ |
| store_settings | notice_templates·as_templates 생성 ✓ |
| 테스트 데이터 원복 | products_with_codes=0(Code 원복) ✓ |
| 카테고리 5021 배선(#6) | suggest가 NAVER_CATEGORIES_FULL(5021)+computeCategoryScore(#249) import·구소스 없음 ✓ |

## 3. 남은 확인 (운영자 수용테스트)
- 실제 네이버 제공고시/AS 템플릿 코드 등록→상품 선택→엑셀 다운로드 시 해당 컬럼 채워지는지 최종 확인(운영자 실코드 필요·Desktop 임의입력 안 함).

## 4. 결정 위임 (#7)
- 반품안심케어 '(2025.08.01 개편)' 라벨: 과거 개편일·현행 유효(더 최신 개편 없음)라 정보성으로 유지. 제거 원하면 운영자 지시.

## 작업 유의사항/원칙 (신규)
- **#253** 운영자가 관리하는 코드/설정 목록(제공고시·A/S 템플릿 등)은 재사용 단일 컴포넌트+DB 영속(localStorage 금지)로 구현·CRUD 제공(#62). 선택값이 산출물(엑셀 등)에 반영되려면 상품 레코드에 영속화 필수(payload에만 있고 컬럼 없으면 드롭됨). 로컬 MCP 행(#26) 시 Supabase(원격)로 가능한 DB 검증은 수행하고 파일 검증/문서화는 복구 후 재개·정직 보고(#82).
