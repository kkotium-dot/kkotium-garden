# ASSET INTEGRITY RECONCILIATION — storage ↔ asset_registry 대조 (2026-06-30)

Authoring: DESKTOP. 권위: 본 문서. 실측: Supabase MCP(project doxfizicftgtqktmtftf, bucket product-assets). 원칙 #62/#82/#93/#180.

================================================================
## 결론 요약
================================================================
- **스토리지 81 물리파일 vs asset_registry(정정 전 20행 = 19 valid + 1 dangling).**
- ★**미등록 62개는 "쓰레기 고아"가 아니라 전부 정상 자산** — 소속 상품 3개(명화·달항아리·아이스트레이) 모두 Product에 실재(DRAFT). common/·lifestyle/ 4개는 앱 공용 이미지(상품자산 아님).
- **삭제 대상 파일 0건.** 파괴적 정리 불필요·부적절.
- ★**유일 실질 결함 = 단글링 레지스트리 1행 → ✅정정 완료**: `cmpnooli4.../composite/botanical-1781410335495.png`(id cmqd9pwpl0000v1j5p0tmhd1v) 실파일 없어 행 삭제. 정정 후 재대조 = **19행·dangling 0**.

================================================================
## 전수 대조표 (storage 기준, LEFT JOIN asset_registry ON path=name)
================================================================
| product | stage | files | in_registry | 미등록 |
|---|---|---|---|---|
| 달항아리 cmp3afb45 | archive | 9 | 0 | 9 |
| 달항아리 | cutout | 1 | 0 | 1 |
| 달항아리 | detail | 5 | 0 | 5 |
| 달항아리 | plate | 1 | 0 | 1 |
| 달항아리 | thumbnail | 2 | 0 | 2 |
| 명화 cmpnooli4 | archive | 14 | 4 | 10 |
| 명화 | composite | 23 | 14(정정 후) | 9 |
| 명화 | cutout | 3 | 0 | 3 |
| 명화 | detail | 3 | 0 | 3 |
| 명화 | plate | 3 | 0 | 3 |
| 명화 | thumbnail | 11 | 1 | 10 |
| 아이스트레이 cmpp62yje | archive | 1 | 0 | 1 |
| 아이스트레이 | detail | 1 | 0 | 1 |
| common | notice-top/bottom.jpg | 2 | — | (공용) |
| lifestyle | la-*.png | 2 | — | (공용) |

- registry는 전부 명화(reg_products=1). 달항아리·아이스트레이는 레지스트리 0.

================================================================
## 진단
================================================================
1. asset_registry는 **중도 도입**되어 명화 일부 생성분만 색인. 그 이전/타 상품 파일은 미등록 — **결손이 아니라 미백필**.
2. registry는 풍부한 생성 메타(mood/angle/slot/variant/width/height/source_tag) 보유 → path만으로 역산 불가. 단순 백필 시 이 메타는 null.
3. "완전색인 백필" 여부는 **registry 소비 방식**에 달림:
   - studio/AssetBrowser가 asset_registry로 이미지 목록을 그린다면 → 미등록 자산(달항아리 등)이 화면에서 안 보임(기능 갭) → 백필 필요.
   - storage 직접 리스팅으로 그리고 registry는 보조 메타라면 → 부분 색인 허용(설계대로).

================================================================
## 조치 상태
================================================================
### ✅ 완료 — 단글링 1행 정정 (Desktop, Supabase)
- `DELETE FROM public.asset_registry WHERE id='cmqd9pwpl0000v1j5p0tmhd1v'` (NOT EXISTS 실파일 가드). 정정 후 19행·dangling 0 재대조 확인. 파일 미변경.

### ✅ 완료 — registry 소비 감사 [Code, 2026-06-30]
- **감사 결과 = STORAGE 직접 리스팅** (registry 아님). 표시 경로:
  studio `AssetBrowser` → `GET /api/products/{id}/assets` → `listProductAssets(id)`
  (`src/lib/storage/automation-storage.ts`, 내부적으로 `product_asset_objects` RPC =
  storage.objects 직독). composite/finish-image 파이프라인도 동일 storage 경로 소비.
- **판정 = 부분-by-design.** asset_registry는 **신규 생성 파이프라인(mood/camera/slot
  메타) 전용 보조 색인**이며, 표시 소스가 아님. 따라서 미등록 62개는 AssetBrowser에서
  **이미 정상 표시**(storage 직독) → **화면 갭 없음** → **storage→registry 백필 불요**.
- **명문화**: `src/app/api/products/[id]/assets/route.ts` 헤더에 "registry=보조 색인,
  표시=storage-direct, 부분색인 by-design" 주석 추가(#180).

### ✅ 완료 — 단글링 재발 방지 가드 (이미 구현됨, 감사로 확인) [Code]
- 운영자 파일 삭제 경로 `POST /api/products/{id}/assets/action` (`action:'delete'`)는
  storage 삭제(`deleteAutomationAsset`) **직전에** `prisma.assetRegistry.deleteMany({
  productId, path })`로 registry 행을 동반 삭제 — 단글링(레지스트리 行 without 파일)
  재발 차단됨(route.ts L261~268).
- 타 삭제 경로 감사: `supabase-storage.ts deleteImage`=다른 버킷(`product-images`)
  → registry 무관. `upload-backdrop-server`=backdrop는 registry 미등록 → 단글링 위험
  없음. `asset-integrity.ts`=정합 도구 자체(registry 정리 내장). → **추가 가드 불요**.

================================================================
## 작업 유의사항/원칙 (신규)
================================================================
- #180: 스토리지↔색인 드리프트는 "고아=삭제"로 단정 금지. 먼저 소속 product 실재 여부(Product 조인)로 **정상 자산 vs 진짜 고아**를 가른다. 본 케이스는 81개 전부 실상품/공용 → 삭제 0, 진짜 결함은 단글링 색인 1행뿐. 파괴적 조치 전 무결성의 방향(파일→색인 vs 색인→파일)을 양방향 LEFT JOIN으로 분리. DB 뮤테이션은 NOT EXISTS 등 조건 가드로 안전하게.
- #93 storage·registry 양쪽 대조. #82 미등록≠불필요.
