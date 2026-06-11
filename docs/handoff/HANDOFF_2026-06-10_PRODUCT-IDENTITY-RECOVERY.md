# ★ 명화 제품 정체 확정 + 연속성 복구 (2026-06-10) — 권위본

> 이 문서는 "명화 디퓨저" 작업이 매 세션 끊기던 근본 원인을 잡는 **단일 진실 소스**다.
> 이미지 작업 전 반드시 이 문서를 먼저 읽는다. (#45 실측우선 / #46 정직 / #49 Desktop 직접작성)

Target Session: image-pipeline (명화)
Branch: 병렬 feat/asset-storage-visibility (머지 대기) / 이미지작업은 코드 미접촉

---

## 0. 끊김의 근본 원인 (확정)

1. **잘못된 제품을 써왔다.** Supabase/생성폴더에 보이던 "리드 디퓨저 + 명화 라벨" 이미지는 **전부 AI 컨셉 목업**이었고, 실제 판매 상품이 아니다. 매 세션 이 목업을 집어 헛돌았다.
2. **진짜 누끼(A/B/C)가 영구 저장 안 됨.** 과거 세션에서 실제 제품 누끼 3종을 만들었으나, Claude 환경 산출물을 대표님 다운로드로만 전달 → 디스크에 영구 저장(Supabase) 안 됨 → 매번 유실.

→ **구조적 해결**: ①real source/cutout은 반드시 Supabase Storage `{pid}/source/`·`{pid}/cutout/`에 영구 저장 ②목업은 폐기·표시.

---

## 1. 진짜 제품 (확정 — 공급사 실상세 육안검증)

- **제품명: 디스이즈(This Is) 명화 차량용 클립형 방향제 / CAR AIR FRESHENER 15ML**
- **형태: 차량 송풍구(에어벤트) 클립 거치형.** 작은 사각 유리병 + 우드캡(우드볼 스틱) + **명화 라벨**. 세트 구성 = **리필 드롭병(검은캡, "Pure Cotton" 등) + 명화라벨 클립병**.
- productId `cmpnooli40001f0gveaxr8iim` / naverProductId `13564133057` / SUSPENSION / 29,000원.
- **핵심 자산 = 명화 라벨(반 고흐풍).** "내 차를 갤러리로" 컨셉.
- **★ 상세 카피 "차량 송풍구 거치형 디퓨저" = 정확함.** (2026-06-10 직전 세션에서 Desktop이 "리드/홈으로 정정 필요"라 잘못 플래그한 것 → 무효. 차량용이 맞다.)

### 향 4종 + 명화 라벨 (실상세 확정)
| 향 | 계열 | 명화 라벨 | 비고 |
|---|---|---|---|
| Cotton Around (코튼어라운드) | Aqua&Cotton | 항구·범선 (고흐 풍) | Top Green/Lemon/Bergamot · Mid White Flowers · Base Musk / **일시품절** |
| Black Cherry (블랙체리) | Fruity&Floral | 들판·밀밭 | Top Citrus/Jasmine · Mid Fruity/Rose · Base Musk/Woody |
| April Fresh (에이프릴후레쉬) | (해안) | 해안 풍경 | |
| Lemon Eucalyptus (레몬유칼립투스) | | 봄나무 | |
- 안전번호: HB21-12-2572 (코튼어라운드) / HB19-12-1462 (그 외 3종).

---

## 2. 폐기 대상 — 잘못된 AI 목업 (절대 사용 금지)

| 위치 | 파일 | 상태 |
|---|---|---|
| Supabase product-assets | `cutout.png`·`myeonghwa-cutout.png`(253×776)·`myeonghwa-main-1000.jpg`(1000²) | 리드디퓨저 목업 = 폐기. **Supabase 삭제는 Code+대표 GO(비가역)** |
| 프로젝트 cutout/ | `_WRONG_reed-mockup_DO_NOT_USE.png` (rename 처리됨) | 폐기표시 완료 |
| 드롭킷 | `_WRONG_reed-mockup_DO_NOT_USE.png` (rename 처리됨) | 폐기표시 완료 |
| Downloads | `Firefly_A luxury car fragrance diffuser...impressionist...357044.png` 외 리드 합성 | 리드 목업 = 폐기 |
| 프로젝트 source/ | `hero__waterlily__2048x1143__gemini-nb2.webp` | **목업 의심** — 다음 세션 육안확인 후 처리 |

---

## 3. 진짜 누끼 소스 + 크롭 좌표 (재현 가능 — 영구 박제)

- **소스(영구저장 완료): `assets/generated/{pid}/source/detail-source-REAL-thisIs-carvent-1000x18291.jpg`** (= Supabase `detail-source-1780913179302.png`, 1000×18291 공급사 풀상세).
- 클린 단품 히어로(누끼 소스) 후보 — full 좌표(1000폭 기준, 다음 세션 view로 ±정밀화):
  | 영역 | 대략 좌표 | 용도 |
  |---|---|---|
  | 차량 인테리어 라이프스타일(병 2개 벤트거치) | y≈240–700 | 무드 레퍼런스 |
  | 4종 라인업 클린(흰배경, 각 병 ~150–210px) | y≈840–1050 | 소형, Firefly 레퍼런스용 |
  | 벤트클립 클로즈업(단품) | y≈1100–1550 | 단품 |
  | **흰배경 세트 (코튼어라운드)** refill+clip | **y≈7580–8085, clip병 x≈230–340** | ★ 가장 깨끗·큰 단품 누끼 소스 |
  | 흰배경 세트 (블랙체리) | y≈7940–8210 | 변형 누끼 |
- 추출: 위 영역 크롭 → Adobe MCP `image_remove_background`(Supabase 도메인 미허용 → **파일 업로드 후** 처리: init→PUT→finalize→presignedUrl→remove_bg) → 투명 PNG → **즉시 Supabase `{pid}/cutout/` 업로드(Code)로 영구화.**
- 과거 A/B/C(들판소녀/범선/흰배경)는 **진짜 제품 기반이었으나 파일 유실** → 위 소스에서 재추출.

### ★ 3-1. 재추출 완료 v2 (2026-06-11 — 대표 제공 히어로크롭 3장 기반, 육안검증 GREEN)
| 누끼 | 소스 | 산출 | 위치 (`assets/generated/{pid}/cutout/`) |
|---|---|---|---|
| **B 가죽+올리브 (범선)** | 대표 크롭 512×560 — **병 완전포함(잘림 해결)** | 512×560 RGBA, 가죽반사 보존 | `cutout_B_leather_olive_512x560.png` ★메인 |
| **A 세트 (리필+클립병)** | 대표 크롭 330×326 | 330×326 RGBA, 2병 깨끗 | `cutout_A_set_refill_clip_330x326.png` |
| **C 단독 정면 (실사)** | 대표 크롭 371×460 — 그래픽목업 C 대체 | 371×460 RGBA, 라벨 선명 | `cutout_C_single_frontal_371x460.png` |
- v1 소형 누끼(285×510·165×335)·리드목업 → `{pid}/archive/` 이동.
- 드롭킷 동기화: `01_cutout_A_set_REAL / B_leather_REAL / C_white_REAL` (PROMPT.txt v2 그대로).
- Adobe 보관: `KKOTIUM_GARDEN/00_inbox/myeonghwa_hero_{A_set,B_leather,C_single}_v2.jpg`.

### ★ 3-2. 자산 육안판정 추가 (2026-06-11, #45/#58)
| 자산 | 판정 |
|---|---|
| `thumb-cropmain-1780913225888.png` (**현재 mainImage**) | **✅ 진짜 제품** (가죽+클립병 실사) — 대표이미지 안전, 재선정 불필요 |
| `myeonghwa-backdrop-860.jpg` (Code 플래그) | **빈 우드/린넨 배경 플레이트** — 목업 아님, 트랙1 합성용 재사용 자산 → 보존 확정 |
| `thumb-clean-*` 3종 | 공급사 실사 4종 라인업 → 보존 |
| 리드목업 3건 삭제(Code 보고) | **실측 교차검증 완료** — 잔존 0·보존 10건 무사 ✅ |

---

## 4. 2-트랙 합성 전략 (진짜 제품으로 갱신)

- **트랙1 정보형**: 깨끗한 명화라벨 클립병 단독 → 따뜻한 우드+린넨+은은한 식물그림자 배경. 추가이미지 상단(명화 라벨 또렷).
- **트랙2 감성형(전환)**: **차량 송풍구 거치 무드** (실제 벤트 클립 장면 / 골든 차량 인테리어) → Firefly 생성. 전환 히어로.
- **mainImage 재검토 필요**: 과거 "B 가죽 thumb-crop 확정"은 리드목업 기반 → **무효.** 진짜 제품의 클린 클립병 컷 또는 벤트거치 라이프스타일로 재선정.
- 합성 = **Firefly 웹UI 생성**(Adobe MCP는 compositing/gen-bg 영구 미지원). Pillow 기계합성 폐기.
- 모델 = Nano Banana Pro (Firefly 파트너, A/B 우위). 개입점 #52: 대표 파일드롭+생성. 이후 후보선택·폴링·다운로드·`composite/` 적재 = Desktop.

---

## 5. 병렬 작업 현황 (누락 0 — 2026-06-11 갱신)

| 작업 | 상태 |
|---|---|
| feat/asset-storage-visibility 커밋 | **✅ 완료** (머지가 아니라 미커밋 작업분 `13002b1`+`c79749c` 커밋·푸시) |
| production HEAD `c79749c` READY 교차검증 | **✅ 확인** (Code 및 Desktop Vercel) |
| 진짜 제품 누끼 v2 3종 재추출 + Supabase 영구화(#59) | **✅ 완료** (`873f194`, SQL 실측 cutout/ 3건 865KB) |
| Firefly 무드 합성(트랙2) → composite/ | 누끼 완료 → 대표 드롭 대기 |
| 트랙1 새배경 합성(트랙1) → 추가이미지 | 합성 후 |
| **/assets API cutout=0 P1 버그** | **🔴 발견·Desktop 수정 완료 → Code 빌드/배포 대기** (§10) |
| C-9 히어로 소스 개입카드 | **설계 완료** (CUTOUT_HERO_STANDARD §3) → 구현 대기 |
| mainImage 재선정(진짜 제품) | **재검토→유지 가능** (thumb-cropmain=진짜 제품 ✅ §3-2) |
| 상세 v2/v3 — 차량용 카피 유지(목업 이미지만 교체) | 누끼/합성 후 |
| 명화 SUSPENSION 해제(안전번호+재질/색상 PUT) | **미진행** — 슬롯충족+대표 GO(비가역0) |
| 달항아리·아이스트레이 | 동일 파이프라인 |

---

## 6. Code 붙여넣기 (2026-06-11 갱신 — 실측 기반 재진단)

> ★ 진단: `feat/asset-storage-visibility` 코드는 **커밋된 적이 없음**(브랜치 tip=main tip → 머지 no-op). 실제 코드는 working tree 미커밋(M 4파일 + untracked route/컴포넌트). → 아래 6-2로 검증+커밋.

### 6-1. 리드목업 삭제 — ✅ 완료 (Code 실행·Desktop 실측 교차검증: 잔존 0, 보존 10건 무사)

### 6-2. storage-visibility 검증+커밋 (머지 아님! — 즉시 실행)
```
[꽃틔움 / Code / storage-visibility 미커밋 코드 검증+커밋]
진단: feat/asset-storage-visibility 작업분이 커밋된 적 없음 — 전부 working tree에 미커밋 상태.
대상: M(.gitignore, src/app/products/[id]/page.tsx, src/lib/storage/asset-taxonomy.ts, src/lib/storage/automation-storage.ts, docs/plan/TASK_BRIDGE.md) + untracked(src/app/api/products/[id]/assets/, src/components/products/GeneratedAssetLocations.tsx, .strings.ko.json, docs/handoff/HANDOFF_2026-06-10_* 3종, NEW_CHAT_STARTER_2026-06-10_S2_firefly.md, docs/playbook/, docs/design/myeonghwa_detail_v3.html)
순서: 1) npx tsc --noEmit → 0 확인 2) npm run build 성공 확인 3) 커밋 2건 분리:
   git add src/ .gitignore && git commit -m "feat(storage): 생성자산 위치 가시화 읽기전용 API+카드 (additive, blast 0)"
   git add docs/ && git commit -m "docs: 제품정체 복구(RECOVERY)·플레이북·핸드오프 + TASK_BRIDGE (74)(75)"
   git push
4) 푸시 후 Vercel production READY와 HEAD SHA 회신 (Desktop 교차검증용 #45)
브랜치 feat/asset-storage-visibility는 빈 껍데기 — main에서 직접 커밋 후 삭제 가능(git branch -d).
```

### 6-3. 진짜 누끼 v2 3종 Supabase 영구화 (#59 — 즉시 실행 가능)
```
[꽃틔움 / Code / 명화 진짜 누끼 v2 3종 Supabase 영구화 (#59)]
아래 3개를 product-assets 버킷 cmpnooli40001f0gveaxr8iim/cutout/ 경로로 업로드 (service key, upsert, contentType image/png):
 assets/generated/cmpnooli40001f0gveaxr8iim/cutout/cutout_B_leather_olive_512x560.png
 assets/generated/cmpnooli40001f0gveaxr8iim/cutout/cutout_A_set_refill_clip_330x326.png
 assets/generated/cmpnooli40001f0gveaxr8iim/cutout/cutout_C_single_frontal_371x460.png
업로드 후 public URL 3개 회신. (가역·additive. v2 = 대표 제공 실사 히어로크롭 기반. 권위: 본 문서 §3-1)
```

---

## 7. 대표님 상시 강조 + 이번 추가 유의사항

- **비가역 0**: 네이버 PUT/발행·Supabase 삭제·Adobe 폴더삭제 = 대표 "GO" 전 절대 미실행(#46).
- **실측 우선(#45)**: 화면/요약/파일명 믿지 말고 **육안+DB+production 교차검증.** (이번에 "car fragrance" 파일명이 실제론 리드목업이었던 함정.)
- **정직(#46)**: 못 하면 솔직히 대표께 요청. 가짜 완료 금지.
- **★ 신규 #58 — 제품 정체 우선 검증**: 이미지 작업 전 **공급사 실상세(detail-source)로 진짜 제품을 먼저 육안 확정.** Supabase/생성폴더의 기존 이미지를 제품으로 가정 금지(AI목업 혼입 가능).
- **★ 신규 #59 — 산출물 영구화**: real source/cutout/composite는 만든 즉시 Supabase Storage에 영구 저장. Claude-FS/다운로드만으로 두지 말 것(유실=끊김 원인).
- **전상품 범용(#55)**: 명화는 검증 1호. #57(누끼소스 표준)·#58·#59는 전상품 영구구조.
- 한글 직접입력 / 대용량 한글 MD = Code Python 전체덮어쓰기(#29b) / Filesystem edit 한글 손상 주의.
- 도구분담(#41): Desktop=MCP검증·DB·Storage·브라우저·이미지·문서 / Code=파일·git·빌드·마이그레이션. 사용자=중재.
- 파일업로드(Firefly)·다운로드·비가역클릭·크레덴셜 = 대표 담당(#52).

---

## 8. MD 전파 필요 (Code, #29b Python 전체덮어쓰기)

- `docs/handoff/HANDOFF_myeonghwa_composite_recipe_2026-06-09.md` → §1 제품정체를 **차량 클립형(This Is)**으로 정정, 리드 목업 폐기 명시.
- `docs/plan/PROGRESS.md`·`ROADMAP.md`·`SESSION_LOG.md`·`PARALLEL_WORK_TRACKER.md`·`TASK_BRIDGE.md`·`CLAUDE.md` → 제품정체 정정 + #58/#59 추가 + 본 문서 링크.
- 직전(2026-06-10) Desktop 핸드오프 `HANDOFF_2026-06-10_cutout-fix-firefly-recipe.md` → **리드디퓨저 전제가 틀림**, 본 문서로 대체(상위).

---

## 9. 다음 채팅 진입 문구 (분할 — 컨텍스트 안전)
```
[꽃틔움 가든 / Desktop / 이어서: 명화 진짜 제품 누끼 재추출 + Supabase 영구화]
정독(필수): docs/handoff/HANDOFF_2026-06-10_PRODUCT-IDENTITY-RECOVERY.md
요약: 진짜 제품 = 디스이즈 명화 차량용 클립형 방향제(송풍구 클립, 15ml, 명화라벨 4종). 리드디퓨저 이미지는 전부 AI목업=폐기.
소스: assets/generated/cmpnooli40001f0gveaxr8iim/source/detail-source-REAL-thisIs-carvent-1000x18291.jpg (영구저장됨).
1) detail-source를 view로 열어 §3 크롭좌표 정밀화(특히 y7580~8210 흰배경 세트).
2) 해당 영역 크롭 → Adobe(업로드후 remove_bg) → 투명 누끼 → 즉시 Supabase {pid}/cutout/ 업로드(Code 경로 전달).
3) 트랙2 Firefly 무드(차량 송풍구 거치) 드롭킷 갱신 → 대표 드롭 → 후보선택/폴링/composite 적재.
규칙: 비가역0·실측우선·정직·#57/#58/#59·앱작업이라 리서치도구 미사용.
```

---

## 10. ★ P1 버그 — /assets API가 stage 하위폴더를 0건으로 반환 (2026-06-11 발견·Desktop 수정)

### 증상 (실측 확정)
- SQL `storage.objects` 실측: `cmpnooli40001f0gveaxr8iim/cutout/` **3건 실재**(865KB).
- 라이브 `GET /api/products/{pid}/assets` (production `c79749c`, x-vercel-cache MISS): `cutout.count=0`, 10건 **전부 root로** 반환. 모든 stage 하위폴더(cutout/composite/...)=0.
- Code의 6-2 배포 직후 smoke(`total=10`)는 누끼 업로드 **전** 시점이라 이 버그를 정상으로 오인. cutout 영구화(6-3) 후에야 SQL≠API 불일치로 노출.

### 근본 원인 (코드 직독)
`src/lib/storage/automation-storage.ts` `listProductAssets().collect()`:
- `.list(prefix, { sortBy: { column: 'created_at', order: 'desc' } })` — Supabase Storage `list()`는 정렬을 **`name`만 신뢰성 있게 지원.** 중첩 prefix(`{pid}/cutout`)에서 `created_at` 정렬 지정 시 **빈 배열 반환**(root `{pid}`는 통과, 중첩만 깨짐).
- `if (error || !data) return;` — **에러 묵살**이 이 실패를 한 세션 내내 가렸음.

### Desktop 수정 (적용 완료 — Code 빌드/배포만 위임)
- `sortBy` → `{ column: 'name', order: 'asc' }` (quirk 회피).
- 에러 묵살 제거 → `console.error('[listProductAssets] list(prefix) failed: ...')` 로깅 후 return. (만약 quirk가 아닌 다른 원인이라도 production 함수 로그에 진짜 에러가 드러남.)
- 변경 파일: `src/lib/storage/automation-storage.ts` 1곳(`collect` 내부). additive·읽기전용·네이버 무접촉.

### Code 붙여넣기 (§6-4)
```
[꽃틔움 / Code / /assets cutout=0 P1 버그 수정 빌드·배포]
Desktop이 src/lib/storage/automation-storage.ts의 listProductAssets().collect()를 수정 완료:
  - .list() sortBy를 {column:'created_at'} → {column:'name', order:'asc'}로 변경(중첩 prefix가 빈 배열 반환되던 Supabase quirk 회피)
  - 'if(error||!data) return' 에러 묵살 제거 → console.error 로깅 후 return
순서: 1) git diff로 위 변경 확인 2) npx tsc --noEmit → 0 3) npm run build → exit 0
  4) git add src/lib/storage/automation-storage.ts && git commit -m "fix(storage): listProductAssets 중첩 prefix 0건 버그 수정(sortBy name+에러 로깅)" && git push
  5) 배포 후 라이브 재검증(필수): curl -s https://kkotium-garden.vercel.app/api/products/cmpnooli40001f0gveaxr8iim/assets | python3 -c "import sys,json;d=json.load(sys.stdin);print({s['stage']:s['count'] for s in d['stages']})"
     → 기대: cutout=3, root=7 (또는 root=10·cutout=3 — 핵심은 cutout이 0이 아님). HEAD SHA 회신.
주의: TASK_BRIDGE에 엔트리 추가 시 (77) 사용. 가역·additive.
```

### Desktop 재검증 (배포 후)
- 라이브 `/assets`에서 `cutout=3` 확인 → Chrome `/products/{pid}` "생성 에셋 위치" 카드에 cutout 3건 노출 실측.

→ 2026-06-11 EOD: Desktop 독립 3중+전상품 재검증 통과. P1 종결.
