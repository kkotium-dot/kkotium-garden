# HANDOFF — 명화 누끼/합성 정정 + Firefly 3-plane 레시피 (2026-06-10)

Target Session: image-pipeline
Branch: (none — 이미지 작업, 코드 미접촉) / 병렬: feat/asset-storage-visibility (머지 대기)
작성: Desktop (Filesystem MCP 직접 작성, 원칙 #49)

---

## 0. 이번 세션 정정 요약 (근본 원인 + 수정)

| 문제 (대표 지적) | 근본 원인 | 수정 |
|---|---|---|
| 결과물 제품이 "명화 제품"으로 안 보임 | 누끼(`cutout.png` 253×776)는 맞는 제품이었으나 합성에서 **너무 작게** 넣어 라벨의 그림(=명화, 핵심가치)이 뭉개짐 | 1000² 고해상 누끼 신규 추출 + 합성에서 제품/라벨을 주인공으로 |
| 배경이 어색 | Pillow **기계적 겹침** — 빛/재질/원근 미통합 | **Firefly 생성 합성**으로 전환 (코드 합성 폐기) |

## 1. 제품 정체 정정 (중요 — 전 문서 전파 필요)

- **명화 디퓨저 = 인상주의 회화 라벨이 붙은 리드 디퓨저** (유리병 + 우드캡 + 리드 스틱). 라벨의 그림이 핵심 셀링포인트.
- **CRITICAL 불일치:** `myeonghwa_detail_v2.html` / `v3.html` 카피가 "차량 송풍구 거치형 디퓨저"로 기술됨 → **실제 제품 이미지(리드 디퓨저)와 불일치.** 상세 카피를 리드/홈 디퓨저 기준으로 정정 필요(공급사 detail-source 재확인 후 확정). 대표 확인 대기.
- 검증 근거(#45/#46): Supabase `myeonghwa-main-1000.jpg` = `myeonghwa-cutout.png` = 동일 리드 디퓨저, Desktop 육안 확인.

## 2. 누끼 (FOUND + 업그레이드)

- 이전 누끼 = Supabase `cmpnooli40001f0gveaxr8iim/myeonghwa-cutout.png` (= `cutout.png`, 253×776, 정확한 제품이나 저해상).
- **신규 고해상 누끼:** `myeonghwa-main-1000.jpg`(1000²) -> Adobe MCP `image_remove_background` -> 1000×1000 RGBA, 라벨 선명, 깨끗한 엣지.
- **적재 완료:** `assets/generated/cmpnooli40001f0gveaxr8iim/cutout/myeonghwa_cutout_hires_1000.png`
- 드롭킷 갱신: `~/Downloads/kkotium_dropkit_myeonghwa_hero/01_product_cutout_HIRES.png` (잘못된 소형 누끼 제거됨)
- Supabase Storage `cutout/` 업로드 = Code 1스텝 (MCP는 Storage 업로드 불가).

## 3. Firefly 3-plane 합성 레시피 (확정)

- **모델:** Nano Banana Pro (제품 사실성 + 레퍼런스 충실도 최강). 대안 FLUX. (Firefly web 모델 전부 무료)
- **비율:** 히어로 4:3, 썸네일용 1:1 각 1회.
- **레퍼런스 업로드:** `01_product_cutout_HIRES.png` (제품/라벨 보존).
- **프롬프트(영문, PROMPT.txt 박제):** Premium studio still-life of a reed diffuser glass bottle with wooden cap and thin reed sticks, impressionist oil-painting floral label clearly visible and in sharp focus as the hero; bottle upright filling central frame on warm light-oak surface; softly blurred impressionist water-lily painting backdrop in cream and sage-green; soft key light upper-left; gentle contact shadow + faint reflection; shallow DOF; warm editorial grade; photorealistic; high detail on the painted label; no text, no watermark.
- **3-plane:** 후경 페인터리 회화 디포커스 / 중경 원목 상판 / 전경 제품+라벨(주인공)+접지그림자+키라이트.
- **개입점(#52):** 대표가 Firefly 탭에서 HIRES 누끼 드롭 + 프롬프트 붙여넣기 + 생성 1회. 이후 후보 확인/선택/다운로드/`composite/` 적재 = Desktop 자동.
- 기존 배경 플레이트 자산(대표가 이전 생성, `~/Downloads/Firefly_*357044*.png`: 원목 데스크/한옥 갤러리 등) 재사용 가능.

## 4. 반자동화 정책 (정정)

- 누끼+배경 **자연 합성 = Firefly 생성** (코드 Pillow 합성은 기계적 겹침 → 폐기). 
- 단순 크롭/리사이즈/틴트 등 결정적 변환만 코드(Pillow) 보조.
- 앱 "생성 큐"(Operator Action Queue): 슬롯별 드롭 대상 표면화 = Code (storage-visibility 머지 후).

## 5. 병렬 작업 현황 (누락 0)

| 작업 | 상태 |
|---|---|
| feat/asset-storage-visibility 머지 | **대기** (Code GO paste 미전달) |
| 명화 상세 v3 — 제품 카피 정정(리드 diffuser) | **대기** (대표 확인 후) |
| 히어로 Firefly 합성 -> composite/ | 드롭킷 준비 완료, 대표 드롭 대기 |
| 썸네일 (전환형=히어로 1:1 크롭 / 정보형=thumb-clean) | 합성 후 |
| 향 4종 연출컷 (Firefly 씬) | 대기 |
| 모네 원작 (Met CC0 fetch) -> detail/ | 대기 |
| 생성 큐 in-app (Code) | storage-visibility 머지 후 |
| 명화 발행 (SUSPENSION 해제) | **미진행** — 슬롯 충족 + 대표 GO (비가역0) |

## 6. MD 전파 필요 (Code, #29b Python 전체덮어쓰기 — Filesystem edit는 한글 손상)

- `docs/plan/PROGRESS.md` · `ROADMAP.md` · `SESSION_LOG.md` · `PARALLEL_WORK_TRACKER.md` · `TASK_BRIDGE.md` · `CLAUDE.md`
- `docs/playbook/IMAGE_SEO_PIPELINE_PLAYBOOK.md` (Firefly-우선 합성 정책 + HIRES 누끼 추출 절차 추가)
- 반영 내용: 제품정체 정정(리드 diffuser) · 고해상 누끼 추출 절차(Adobe upload->remove_bg) · Firefly 3-plane 레시피 · Pillow 합성 폐기 · 병렬 현황.

## 7. 정직 메모

- 제품 home/car 성격(리드 vs 차량용)은 공급사 detail-source(`detail-source-1780913179302.png`, 1000×18291) 재확인으로 확정 권장 — 현재 이미지는 리드 디퓨저.
- Adobe MCP는 Supabase 도메인 미허용 → 파일 업로드 후 처리해야 함(이번에 적용).
- 발행 미진행.
