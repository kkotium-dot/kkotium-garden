# ★ 누끼 히어로 표준 v2 (#57 개정) — 전상품 영구 표준 + 앱 통합 설계

> 2026-06-11 대표 확정. 명화 1호 검증 완료. **모든 상품 등록 시 이 문서대로.**
> 권위 체인: 본 문서 → `HANDOFF_2026-06-10_PRODUCT-IDENTITY-RECOVERY.md` → `IMAGE_SEO_PIPELINE_PLAYBOOK.md` / `ADAPTIVE_IMAGE_SEO_ENGINE.md §9`

---

## 1. 원칙 (#57 v2 — 대표 상시 강조)

1. **제품 정체 우선(#58)**: 이미지 작업 전 공급사 실상세로 진짜 제품 육안 확정. 기존 폴더/Storage 이미지를 제품으로 가정 금지(AI목업 혼입 함정 — 명화 리드목업 사고).
2. **누끼 소스 = 실사 단품 히어로컷**: 공급사 상세의 크고 선명한 실촬영컷. 본품 완전포함(캡·병·라벨 잘림 0). 작은 카드컷·텍스트컷·저해상·그래픽 목업 금지.
3. **★ 소스 확보 우선순위 (v2 신설)**:
   - 1순위: **대표가 상세에서 직접 크롭해 제공한 히어로컷** (가장 빠르고 정확 — 명화 v2 방식)
   - 2순위: Desktop이 detail-source 밴드스캔 → 좌표 크롭 (대표 부재 시)
   - 어느 쪽이든 좌표/소스를 MD에 박제해 재현 가능하게.
4. **자연스러운 컷 우선**: `cutout_B_leather_olive_512x560.png`급 — 빛·그림자·재질 반사가 살아있는 컷. 연출소품(올리브 등)은 무드컷에선 허용.
5. **산출물 영구화(#59)**: 누끼/합성 산출 즉시 ①프로젝트 `assets/generated/{pid}/cutout|composite/` ②Supabase `{pid}/cutout|composite/` 양쪽 적재. Claude환경/다운로드만으로 두면 유실(끊김 원인).
6. **육안검증 의무(#45)**: 산출 직후 회색바탕 체크시트로 엣지·완전포함 확인 후 적재. 검증 없는 적재 금지.

## 2. 표준 파이프라인 (상황별 융통 분기)

```
[등록/이미지 단계 진입]
 ├─ detail-source 확보됨? ─ NO → 공급사 크롤/대표 제공 요청 (개입카드: source_request)
 ├─ 진짜 제품 육안확정 (#58) → MD에 제품정체 1줄 박제
 ├─ 히어로 소스 분기:
 │   ├─ 대표 크롭 제공 → 즉시 누끼 (1순위)
 │   ├─ detail-source에 양질 히어로 존재 → 좌표 크롭 → 누끼 (2순위)
 │   └─ 양질 소스 부재 → 개입카드: hero_crop_request (대표에게 크롭 요청 — 자연 노출)
 ├─ 누끼: Adobe MCP remove_bg (업로드 후 처리: init→PUT→finalize→presigned→remove_bg)
 ├─ 육안검증 GREEN → 영구화(#59) 양쪽 적재
 ├─ 합성 분기 (2-트랙, 상품 컨셉별 개별 결정 — 고정 템플릿 금지):
 │   ├─ 트랙1 정보형: 클린 배경(우드/린넨 등 컨셉 호응) — 추가이미지 상단
 │   └─ 트랙2 감성형: Firefly 무드(Nano Banana Pro, 3-plane 프롬프트) — 전환 히어로
 │       └─ 개입카드: firefly_drop (파일드롭+생성클릭 = 대표 #52) → 이후 후보선택/폴링/적재 자동
 └─ 대표/추가이미지 적용 → 검수 → 발행 (대표 GO, 비가역0)
```

## 3. 앱 통합 설계 — C-9 "히어로 소스 개입카드" (Code 신규 청크)

- **목적**: 개입점이 자연스럽게(대표 강조 #56) — 숨기지도, 순서 강제도 않음. Operator Action Queue(OPERATOR_SYSTEM_BLUEPRINT)에 타입 추가.
- **개입카드 타입 3종**:
  | type | 트리거 | 카드 내용 | 대표 액션 | 후속 자동 |
  |---|---|---|---|---|
  | `source_request` | detail-source 부재 | "상세 원본이 필요해요" | URL/파일 제공 | 크롤→source/ 적재 |
  | `hero_crop_request` | cutout 잡 시 양질 히어로 소스 부재(판정: 소스 최장변<300px 또는 텍스트 OCR 검출) | "누끼용 히어로컷을 잘라 올려주세요" + 가이드(완전포함·실사) | 크롭 이미지 업로드 | remove_bg→검증→cutout/ 적재 |
  | `firefly_drop` | composite 잡 진입 | 드롭킷 경로+프롬프트 표시 | Firefly 드롭+생성 | 후보선택→composite/ 적재 |
- **스키마**: `asset_jobs`에 `intervention_type text null`, `intervention_payload jsonb null` 추가(additive). 업로드 수신 = 기존 업로드 경로 재사용, kind='source' 명시(SOURCE_KIND_RULES에 source 규칙 없음 주의).
- **UI**: 상품 상세 스튜디오 카드 + 대기열 목록 양쪽 노출. 강제 모달 금지.
- 구현 순서: storage-visibility 커밋(6-2) → C-3 finish-image 라우터 → **C-9** → C-5/C-6/C-8.

## 4. 명화 v2 확정 자산 (검증 1호 레퍼런스)

| 누끼 | 파일 | 용도 |
|---|---|---|
| B 가죽+올리브(범선) 512×560 | `cutout_B_leather_olive_512x560.png` | 무드/전환 — mainImage 계열(현 thumb-cropmain 동일소스 ✅) |
| A 세트(리필+클립) 330×326 | `cutout_A_set_refill_clip_330x326.png` | 구성 정보컷 |
| C 단독 정면(실사) 371×460 | `cutout_C_single_frontal_371x460.png` | 정보형 베이스(그래픽목업 C 대체) |
- 위치: 프로젝트 `assets/generated/cmpnooli40001f0gveaxr8iim/cutout/` (Supabase 영구화 = Code 6-3 대기)
- v1·목업 → `{pid}/archive/`. 드롭킷 `~/Downloads/kkotium_dropkit_myeonghwa_hero/` 동기화 완료.

## 5. 달항아리·아이스트레이 적용 시 (즉시 재사용 절차)

1. detail-source 확보 → 제품정체 육안 1줄 박제(#58)
2. 대표 크롭 요청(1순위) or 밴드스캔(2순위) → 누끼 → 검증 → 영구화
3. 상품 컨셉별 2-트랙 개별 설계(명화 템플릿 복붙 금지 — 컨셉 조합 개별 결정 원칙)
