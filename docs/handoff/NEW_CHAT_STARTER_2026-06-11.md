# 새 채팅 인계 — 꽃틔움 가든 (2026-06-11 마감)

> 이 파일 + `HANDOFF_2026-06-10_PRODUCT-IDENTITY-RECOVERY.md`(권위본) 정독으로 끊김 없이 이어갈 것.
> 작성: Desktop 직접(#49). 모든 상태는 실측 교차검증(#45) 기반.

Target Session: image-pipeline (명화) + storage P1
Branch: main 단일 (병렬 브랜치 없음 — feat/asset-storage-visibility 삭제 완료)

---

## 0. 한 줄 요약
명화 진짜 누끼 v2 3종 산출·영구화·storage-visibility 커밋까지 LIVE 완료. **단 한 가지 P1 버그(/assets가 cutout=0 반환)를 Desktop이 수정해 working tree에 적용 완료 → Code 빌드·배포·라이브 재검증만 남음.** 그 다음이 Firefly 트랙2 무드합성.

## 1. production 실측 상태 (2026-06-11 마감 시점)
- production HEAD = `873f194` READY (storage-visibility `c79749c` → 누끼 영구화 `873f194`).
- Supabase `product-assets/cmpnooli40001f0gveaxr8iim/`: 총 13객체, **cutout/ 3건(865KB) 실재** + root 10건.
- **⚠️ 미배포 변경분**: `src/lib/storage/automation-storage.ts` 1곳 수정(P1 버그) — working tree에만 있음, 커밋·푸시 전.

## 2. 즉시 할 일 (순서 고정)

### [1순위] P1 버그 배포 (Code) — RECOVERY §10 / §6-4 paste
- Desktop이 `listProductAssets().collect()`의 `sortBy: created_at → name` + 에러 묵살 제거를 **이미 적용**.
- Code: tsc 0 → build 0 → 커밋·푸시 → **라이브 재검증 필수**:
  ```
  curl -s https://kkotium-garden.vercel.app/api/products/cmpnooli40001f0gveaxr8iim/assets \
   | python3 -c "import sys,json;d=json.load(sys.stdin);print({s['stage']:s['count'] for s in d['stages']})"
  ```
  → **cutout이 0이 아니어야 통과**(기대 cutout=3). 0이면 quirk 가설 외 다른 원인 → production 함수 로그(이제 console.error 찍힘) 확인.
- Desktop: 배포 후 Vercel MCP로 HEAD READY 재확인 + Chrome `/products/{pid}` "생성 에셋 위치" 카드 실측.

### [2순위] Firefly 트랙2 무드합성 (#52)
- 드롭킷 `~/Downloads/kkotium_dropkit_myeonghwa_hero/`:
  `01_cutout_B_leather_REAL.png`(메인) + `PROMPT.txt`(트랙2 차량 무드 영문).
- 대표: Firefly(Chrome 탭 `1396049947`)에 B누끼 드롭 + PROMPT 트랙2 + **Nano Banana Pro · 4:3** 생성 클릭.
- 이후 Claude: 후보 선택·폴링·다운로드 → `assets/generated/{pid}/composite/` 적재 → Supabase `{pid}/composite/` 영구화(Code) → extra_images 적용(apply-composite recovery 모드) → 브라우저 실무 테스트.

### [3순위] 트랙1 정보형 합성 → 추가이미지 상단
- 소스: C 단독 누끼 + `myeonghwa-backdrop-860.jpg`(우드/린넨 배경, 재사용 확정) 또는 Firefly 트랙1 프롬프트.

### [이후] mainImage 결정 / 상세 이미지 교체 / 발행
- mainImage = 현 `thumb-cropmain`(진짜 제품 ✅) 유지 가능. composite B가 더 좋으면 교체 — 대표 결정.
- 상세 v2/v3: 차량용 카피는 정확하니 유지, 목업 이미지 슬롯만 진짜 누끼/합성으로 교체.
- 명화 SUSPENSION 해제: 안전번호+재질/색상 PUT + 슬롯 충족 + **대표 GO(비가역0)**.

## 3. 전상품 체계 (이번에 박제 — 명화는 검증 1호)
- **`docs/playbook/CUTOUT_HERO_STANDARD.md`** = #57 v2 전상품 누끼 표준.
  - 소스 우선순위: **1순위 대표 제공 크롭**(명화 v2 방식, 가장 빠름) / 2순위 detail-source 밴드스캔.
  - 상황별 융통 분기 파이프라인 + **C-9 개입카드 3종**(source_request/hero_crop_request/firefly_drop) 앱 통합 설계.
- 달항아리·아이스트레이 등 후속 상품 = 이 표준 그대로 재사용(명화 템플릿 복붙 금지, 컨셉 조합은 상품별 개별 결정).

## 4. C-9 개입카드 (다음 구현 청크 — Code)
- `asset_jobs`에 `intervention_type text`, `intervention_payload jsonb` additive 추가.
- Operator Action Queue(OPERATOR_SYSTEM_BLUEPRINT)에 타입 노출 — 강제 모달 금지, 자연 노출(#56).
- 구현 순서: P1 배포 → C-3 finish-image 라우터 → **C-9** → C-5/C-6/C-8.

## 5. MD 전파 (Code, #29b Python 전체덮어쓰기)
- 대용량 한글 MD(PROGRESS/ROADMAP/SESSION_LOG/PARALLEL_WORK_TRACKER/CLAUDE.md): 본 세션 결과(누끼 v2·storage-visibility·P1버그·CUTOUT_HERO_STANDARD 신설) 반영.
- 핵심 내용은 RECOVERY §5/§10 + CUTOUT_HERO_STANDARD에 이미 박제 — 유실 0. 전파는 정합성용.

## 6. 불변 규칙 (상시)
- 비가역0(#46) · 실측우선(#45) · 정직(#46) · 전상품범용(#55) · #57/#58/#59.
- 도구분담(#41): Desktop=MCP/검증/DB/Storage/이미지/문서, Code=파일/git/빌드. 대표=중재·드롭·비가역GO.
- 한글 손상 주의: edit_file 후 grep, 대용량 한글=Code Python.
- **앱 작업이라 launch_extended_search(리서치도구) 미사용** — 매 응답 첫머리 1줄로 이유 언급.

## 7. 다음 채팅 진입 문구 (분할 — 컨텍스트 안전)
```
[꽃틔움 가든 / Desktop / 이어서: P1 버그 배포검증 + Firefly 트랙2]
정독(필수): docs/handoff/NEW_CHAT_STARTER_2026-06-11.md + HANDOFF_2026-06-10_PRODUCT-IDENTITY-RECOVERY.md(§10 P1버그)
상태: 누끼 v2 3종 LIVE 영구화 완료(SQL cutout/ 3건). production 873f194 READY.
미배포: automation-storage.ts P1 수정(sortBy created_at→name + 에러로깅)이 working tree에 적용됨 → Code 커밋·푸시·라이브검증만 남음.
1) Code paste(RECOVERY §6-4)로 P1 배포 → curl로 cutout=3 확인 → Desktop Chrome 카드 실측.
2) Firefly 트랙2: 드롭킷 B누끼 드롭+Nano Banana Pro 4:3 → 후보선택/composite 적재/extra_images.
규칙: 비가역0·실측우선·정직·전상품범용·앱작업이라 리서치도구 미사용.
```
