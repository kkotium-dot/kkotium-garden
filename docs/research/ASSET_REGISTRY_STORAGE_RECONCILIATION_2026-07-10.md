# 자산 레지스트리-스토리지 정합 감사 + 백필 스펙 (systemic #93) (2026-07-10)

Authoring: DESKTOP(Supabase MCP 실측). 계기: v6 대기 중 독립 병행(발행/디자인 무관). 권위: 실측 데이터. 원칙 #55/#93/#241. 상태: 감사 완료·백필 스펙·Code 구현 대기(독립). ★비파괴(삭제 금지).

## 0. 감사 결과 (실측)
- asset_registry 19행 · storage(product-assets) 81파일.
- **고아(스토리지 有·레지스트리 無): 62** · 댕글링(레지스트리 有·파일 無): **0** · 매칭: 19.
- → 레지스트리는 전부 유효(댕글링 0)하나, **스토리지의 완전한 인벤토리가 아님**(62 미추적).

## 1. 고아 62개 분류 (경로 seg1/seg2 기준)
| 분류 | 파일 | 상세 |
|---|---|---|
| **archive/** | 20 | 명화10(5/27~6/8)·달항아리10(5/15~6/8)·아이스1. 의도적 구버전 아카이브 |
| **활성 스테이지** | 38 | 명화: thumbnail10·composite9·cutout3·plate3·detail3 / 달항아리: detail5·thumbnail2·cutout1·plate1 / 아이스: detail1 |
| **공유(비상품)** | 4 | common/notice-top.jpg·notice-bottom.jpg(6/3)·lifestyle/la-*.png×2(5/17) |

## 2. 원인
- 레지스트리 시스템이 자산 파이프라인 도입 후에 추가됨 → 이전 생성분·일부 경로(직접 업로드·common/lifestyle 공유)는 레지스트리 write를 안 거침.
- archive는 의도적 보관(구버전)이라 미등록이 자연스러움.

## 3. 정합 방침 (비파괴·백필 중심)
1. **활성 스테이지 38개 → 레지스트리 백필**: 경로에서 product_id(seg1)·stage(seg2)·file_name 파싱해 asset_registry 행 생성(id·path·width/height는 스토리지 메타/이미지 probe). source_tag='backfill-2026-07'. → 레지스트리=완전 인벤토리.
2. **archive 20개 → 정책 택1**: (a)미등록 유지(콜드 보관·레지스트리는 활성만) or (b)stage='archive'로 등록해 추적. 권장 (a)+메모(아카이브는 레지스트리 제외가 정상)로 향후 오탐 방지.
3. **공유 4개 → 공유 스코프 등록**: product_id=null(or 'common')·stage='shared'/'notice'/'lifestyle'로 등록. 레지스트리 스키마가 product_id null 허용하는지 확인 필요(안 되면 nullable 마이그레이션).
4. **삭제 없음**: 어떤 파일도 삭제하지 않음(비가역·실 자산). 정합=등록 보정만.

## 4. 재발 방지 (systemic)
- 자산 업로드 경로(썸네일/합성/컷아웃/상세 등) 전부가 **업로드 직후 asset_registry write**를 거치도록 파이프라인 강제(단일 헬퍼 경유). 직접 스토리지 업로드 금지.
- 주기적 드리프트 감사 쿼리(고아·댕글링)를 관제탑 or 크론에 편입(선택).

## 5. 구현 절차 (Code·독립)
1. 백필 스크립트: storage.objects(고아) 조회 → 경로 파싱 → width/height는 이미지 헤더 probe(or 0 후 lazy) → asset_registry insert(중복 방지 path unique). archive/공유 방침 반영.
2. 업로드 헬퍼에 registry write 누락 지점 점검·보강(재발 방지).
3. 재감사 쿼리로 고아=archive+정책분만 남는지 확인. Desktop 재검증.

## 검증 쿼리 (재사용)
```sql
WITH s AS (SELECT name FROM storage.objects WHERE bucket_id='product-assets'), r AS (SELECT path FROM asset_registry)
SELECT (SELECT COUNT(*) FROM s WHERE name NOT IN (SELECT path FROM r)) AS orphan,
       (SELECT COUNT(*) FROM r WHERE path NOT IN (SELECT name FROM s)) AS dangling;
```

## 작업 유의사항/원칙 (신규)
- **#241** 자산(스토리지)과 메타(레지스트리/DB)는 반드시 정합 유지 — 업로드 경로 전부가 단일 헬퍼로 레지스트리 write 강제·직접 업로드 금지. 드리프트 발견 시 **삭제가 아니라 백필(등록 보정)**로 해소(실 자산 비가역 보호). 감사는 고아(파일有메타無)·댕글링(메타有파일無) 양방향·주기 점검. archive 등 의도적 미등록은 방침으로 명문화해 오탐 방지.
