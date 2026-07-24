# HANDOFF — 공통 이미지 슬롯 설계 + 발행 payload 누락 통합 (2026-06-02 Desktop)

> 권위 문서. 달항아리 발행 완주를 위한 마지막 통합 작업 명세.
> 결론: API 발행 payload에 4건 누락(정보고시·AS전화·상품명·공통이미지슬롯) — 한 Code 세션에서 묶어 처리.
> 비가역 0 / 허위 0 (#46). 코드 변경 0 (Desktop 설계 turn).

---

## 1. 배경 — 발행 시도에서 드러난 누락 누적

대표 명시 승인 하에 register 실호출(2026-06-02) → HTTP 400. dryRun payload 전수대조로 원인 단정:

| # | 누락 | 상태 | 담당 |
|---|---|---|---|
| 1 | productInfoProvidedNotice (상품정보제공고시) | payload에 객체 자체 부재 — 400 직접원인 | Code |
| 2 | afterServiceTelephoneNumber = "고객센터 문의"(텍스트) | 전화번호 형식 필요 — 400 의심 | Code |
| 3 | originProduct.name = 원본 product.name | naver_title 우선이어야(SEO) | Code |
| 4 | 공통 이미지 슬롯 (상단/하단 B2B 공지) | buildDetailContent에 구조 부재 | Code |

카테고리(50000963)·주소(106914714/106914715)·반품비(7500)·원산지(0200037)·옵션·태그·과세는 정상.

## 2. 대표 운영구조 확정 (위탁배송)

- 출고/반품 전부 각 공급사 자체처리, 셀러는 상태 중계만.
- 자동수거지시 예외처리 = 대표 신청 완료.
- 상단 B2B 공지(개인정보+교환반품) = "상품 공지사항" 기능으로도 등록 예정 +
  상세페이지 상단 이미지로도 삽입 (현재 방식 유지 = 상단+하단 둘 다).
- 하단 푸터(CS+Thanks) = 상세페이지 하단 이미지.
- 공지 텍스트 템플릿은 docs/research/STORE_NOTICE_TEMPLATE 참조(별도).

## 3. 공통 이미지 슬롯 설계 (교체 가능 구조)

### 문제
- 현재 src/lib/supabase-storage.ts uploadMultipleImages는 product-images/uploads/에
  랜덤 파일명(timestamp_random.jpg) 저장 → 상품 이미지용. 공통 이미지엔 부적합
  (코드가 고정 주소로 못 찾음).
- buildDetailContent(product-builder.ts)는 hookPhrase → detail_image_url → description
  → AEO 순서만 조립. 공통 상단/하단 슬롯 없음.

### 설계 (고정 주소 + DB URL + 교체는 덮어쓰기)
- 공통 이미지를 고정 경로에 저장:
  product-assets/common/notice-top.jpg (상단: 개인정보+교환반품)
  product-assets/common/notice-bottom.jpg (하단: CS+Thanks 푸터)
  ※ 원본: docs/research/assets/b2b_notice_top_privacy_return.jpg (640x1134)
          docs/research/assets/b2b_notice_bottom_cs_footer.jpg (640x941)
- store_settings에 컬럼 신설: noticeTopImageUrl / noticeBottomImageUrl (String?, nullable).
  값 없으면 코드 기본 상수(고정 public URL) fallback.
- buildDetailContent 조립 순서 변경:
  [상단 공통이미지] → hookPhrase → detail_image_url → description → AEO → [하단 공통이미지]
- 교체 흐름: 디자인 변경 시 같은 고정 경로에 덮어쓰기(upsert:true) → 전 상품 즉시 반영.
  코드 수정 0, 개발자 호출 0. (대표가 향후 셀프 교체 가능)

### 이미지 업로드 — Desktop 불가, Code 담당
- Supabase MCP는 SQL 전용, Storage 파일 업로드 미지원. Desktop 컨테이너는 Supabase 직결 아님.
- Code가 docs/research/assets/ 의 2개 파일을 supabase-storage로 product-assets/common/에
  upsert 업로드 → public URL 확보 → store_settings 저장.

## 4. SCOPE (한 Code 세션, dryRun 1회로 통합 검증)

작업1 [400직접] productInfoProvidedNotice 구현:
  - product-builder detailAttribute에 productInfoProvidedNotice 객체 신설.
  - 가구/인테리어(50000963) 카테고리 정보고시 항목 매핑.
  - productInfoName/Manufacturer/Model NULL → "상세설명 참조"(대표 승인 문구) 충진. 허위 0 #46.
  - 네이버 v2 productInfoProvidedNotice 카테고리별 필수 항목 스펙 확인 후 정합.

작업2 [형식] afterServiceTelephoneNumber:
  - asPhone "고객센터 문의"(텍스트) → 010-3227-4805 (주소록 등록번호 동일). 형식 010-XXXX-XXXX.

작업3 [SEO] payload name:
  - originProduct.name = naver_title ?? seoTitle ?? name (현재 product.name 직접).

작업4 [공통이미지슬롯] §3 설계 구현:
  - schema: store_settings.noticeTopImageUrl / noticeBottomImageUrl (String?, nullable). migrate.
  - Code가 docs/research/assets/ 2파일 → product-assets/common/ upsert 업로드 → URL을 store_settings 저장.
  - buildDetailContent: 상단/하단 공통이미지 슬롯 삽입 (DB URL ?? 코드 기본 상수 fallback).
  - 슬롯 이미지 <img max-width:860px width:100%> (현 detail 이미지와 동일 스타일).

작업5 [검증] dryRun 재호출:
  - detailContent에 notice-top/bottom URL 포함 + productInfoProvidedNotice 존재
    + asPhone 형식 + name=naver_title 단정.
  - TSC 0 + build 0.

작업6 [MD] Python safe-insert(#29b):
  - PROGRESS/ROADMAP/TASK_BRIDGE/TECH_DEBT 갱신. DEBT-07(공통이미지슬롯) 등재.
  - 한글 sentinel grep 0건.

## 5. 절대준수
비가역 0 (Code register 호출 금지 — Desktop 권한 #41) / 허위 0 #46 (정보고시 "상세설명 참조" 표준문구만)
legalApproval 보호 #39 (stash@{0} apply 금지) / Prisma 싱글톤 / heredoc 금지 #26
한글 MD = Python safe-insert #29b / commit 한글 = .commit-msg.tmp #17 / push 후 verify-vercel #36
Production = Vercel only #28 / SD-01 footer 미접촉

## 6. 마무리
dryRun 4건 충진 단정 보고 → Desktop 새 세션에서 대표 승인 하에 실 register.
여전히 400/502 시 응답 diagnostic.bodyHead로 추가 사유 확정.
공지 텍스트 2종(배송/반품 + 개인정보)은 대표가 네이버 공지사항 기능에 등록 + 공지번호 확보(병행).
