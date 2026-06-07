# 명화 발행 준비도 — GO 직전 (2026-06-07 최종 갱신)

> Naver update dryRun 단정 + 상세페이지 전 정보 반영 완료. naverProductId 13564133057.

## 발행 준비도 = ALL GREEN
- readinessGrade **A / 84** · attributeGrade **A / 78**
- errors [] · warnings [] · **missingRequired []**
- statusType **SALE** (PUT 시 판매중지 해제)

## 상세페이지 근거 → 반영 완료 (전부 가역 DB)
| 항목 | 값 | 근거 |
|---|---|---|
| 제조국 | 국산 (originCode 00) | 품명표 제조국 대한민국 |
| 재질 | 유리 | 전 제품컷 유리병 (enum exact) |
| 색상 | 투명 | 투명 유리 용기 (enum exact) |
| 향 | 4종(레몬유칼립·에이프릴 후레쉬·블랙체리·코튼어라운드) | 헤더·향정보 4종 → 옵션 추가 완료 |
| 안전확인 신고번호 | HB21-12-2572, HB19-12-1462 | 전 향종 표시사항(라인 2개) → naver_certification 설정 |
| 상품명 | 명화 차량용방향제 송풍구 디퓨저 자동차 에어컨냄새제거 선물 (32자) | seo-text 정제·중복0 |
| sellerTags | 10종 | seo-text draft.tags |

## ★ PUT 전 마지막 검증 1건 (#46)
- dryRun payloadPreview에 **안전 신고번호(HB)가 미표시** — preview가 핵심필드 부분집합이라 productInfoProvidedNotice(정보고시) 섹션이 빠진 것으로 추정. 단 **생활화학제품 표시가 SUSPENSION 유력 원인**이므로, PUT(비가역) 전 정보고시에 HB가 실제 실리는지 단정 필요.
- → Code: update dryRun payloadPreview에 productInfoProvidedNotice(qualityAssuranceStandard 등) 포함 → Desktop이 HB 표시 재단정 → 그 후 대표 GO.

## 발행 시퀀스 (남은 단계)
1. (Code) dryRun preview에 정보고시 노출 → (Desktop) HB 표시 단정.
2. (대표) 최종 GO.
3. (Desktop) update confirm:true → PUT(비가역) → statusType SALE 전환.
4. (Desktop) inspect 3중 검증: statusType SALE·정보고시 HB·origin 국산·옵션 4종.

## 비고
- 빌더는 구조화 카테고리 속성을 네이버 미전송(Code 확인) → 재질/색상은 내부 완성도 게이트. 단 productInfoProvidedNotice(정보고시)는 전송 대상 → HB 표시가 실 발행 핵심.
- seoTitle·keywords·brand_line 내부 비동기(P3) — 발행 빌더는 name=naver_title·sellerTags=tags 사용이라 발행 무관.
- NAVER_AUTOSUSPEND_ENABLED off 유지 권고.
