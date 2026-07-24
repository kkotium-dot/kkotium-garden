# MASTER 세션 인계 — 2026-06-07 이미지·SEO 전략 엔진 + 크롭/편집 워크플로우

> 다음 새 채팅이 **이 문서 1개만 읽어도** 누락 없이 이어갈 수 있도록 작성한 마스터 인계.
> 환경분담(#41): Desktop=MCP·검증·DB·표준기록 / Code=코드·git·빌드·스키마 migration.
> 비가역0(#46): 네이버 PUT은 대표 명시 GO. 실측우선(#45): Code 보고 불신, production 직접 단정.
> 호칭은 본문에서 닉네임 금지(#29) — "대표/운영자"로 표기.

---

## 0. 이번 세션 한 줄 요약
명화 디퓨저를 발행 직전(A/84)까지 완성했고, 이미지·SEO 전략 엔진(분류기·게이트·프리뷰)을 production 검증했으나, **"이미지를 실제로 생산·편집하는 손"이 누락**됨을 확인. 운영자 지시로 **썸네일 크롭·편집 표준을 박제**하고 **2라인 워크플로우 + 창작도구 라우팅 체계**를 설계·문서화. 실제 이미지 생산/편집/적용은 **창작 도구가 활성화된 세션에서 즉시 실행되도록 staged**.

---

## 1. 대상 상품 (전상품 체계 — 단일 아님)
| 상품 | product_id | 상태 |
|---|---|---|
| 명화 차량용 송풍구 디퓨저 | cmpnooli40001f0gveaxr8iim | naverProductId 13564133057, SUSPENSION. 발행준비 A/84. 이미지만 잔여 |
| 달항아리 도어벨 | cmp3afb450001gng5468w0qpc | 발행준비 A/84, image done, next=publish |
| 64구 아이스트레이 | cmpp62yje00015xup5h8pgwx0 | C/52, 재질 속성 필요, next=fill_attributes |

명화: naverCategoryCode 50003356, salePrice 29000, supplierPrice 14300, 향 4종(레몬유칼립·에이프릴후레쉬·블랙체리·코튼어라운드), origin 00 국산.

---

## 2. 명화 발행 준비 — 전부 검증 완료 (가역 DB, PUT만 잔여)
update dryRun 실측(confirm:false, read-only)으로 단정:
- statusType SALE / origin 00 국산 / 재질 유리·색상 투명 (missingRequired []) / 향 4종
- 정보고시 ETC: `qualityAssuranceStandard = "안전기준 적합확인 신고번호 HB21-12-2572, HB19-12-1462 (상품상세참조)"` ← 생활화학제품 표시(SUSPENSION 유력원인) 해소 확인
- customerServicePhoneNumber 010-3227-4805 (운영자 확인 권장)
- readiness **A/84 · errors 0 · warnings 0 · missingRequired 0**
- 상품명 "명화 차량용방향제 송풍구 디퓨저 자동차 에어컨냄새제거 선물"(32자) + sellerTags 10
→ **남은 단계: 대표/상세 이미지 확정·적용 → 발행전 프리뷰 canPublish=true → 운영자 발행 GO → update confirm:true PUT(비가역) → inspect 3중검증.**

---

## 3. 명화 이미지 결정 (운영자 확정)
- **대표 = 가죽 도어 단품 장착컷(기준컷 #3)** 확정. 추가컷: 흰접시 단품(#4)·대시보드(#1)·기프트박스(#5).
- **상세 = 라인 A** (공급사 양질 상세 그대로 + SEO 보강). 현재 hosted 상세(detail-S6)는 빈 스켈레톤이라 교체 대상.
- 적용(staged, 도구 활성 세션 실행): #3 컷 1:1 영역확장 → 업로드 → mainImage / 공급사 양질 상세 hosting → detail_image_url 교체.

### 명화 이미지 자산 위치
- mainImage(현행): Cloudinary `main-hwabo-4set.jpg`(1000², 4종 라인업, 캡션텍스트 有 → 대표 부적합)
- detail_image_url(현행): Supabase `detail-S6-...png`(860×5980, 빈 스켈레톤 → 교체대상)
- 기타 storage: myeonghwa-main-1000.jpg, cutout.png(253×776 단품누끼·소스작음)
- 운영자 기준컷 5종: /mnt/user-data/uploads/스크린샷_2026-06-07_오후_11_02_*.png
- 상세 원본 화보: /mnt/user-data/uploads/this_is_air_freshener_detail.jpg (437×8000, 저해상 업로드본)
- v2 썸네일(생산됨, Claude컴퓨터): /mnt/user-data/outputs/v2_thumb_{dashboard,flatlay,leather_single,whitedish_single,giftbox}.jpg

---

## 4. ★ 썸네일 크롭·편집 표준 (운영자 강한 지시 — 영구 기준)
**문서: docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md** (이번 세션 박제)

핵심:
- 썸네일 = 상세페이지 속 잘 찍힌 제품컷을 **제품 중심·1:1·≥1000px**로 타이트 크롭. 배경·책글씨·잡요소 배제.
- 반려: 임의 배경, 부분 잘림, 드로퍼팁 매크로, 캡션밴드, 다물체 어수선.
- 3가지 작업 모드: ① 자동 크롭 ② **운영자 지정영역 크롭** ③ **이미지 편집**(글씨제거 inpaint / 1:1 영역확장 outpaint / 배경정리).
- 편집은 Firefly 단독 아님 — Adobe Express·Adobe MCP·Canva·Figma·Claude Design 중 상황별 선택. 운영자 요청 시 해당 커넥터 호출.

---

## 5. 2라인 워크플로우 (전상품)
| | 라인 A — 양질 자산(명화) | 라인 B — 저품질/고상품성 |
|---|---|---|
| 썸네일 | 상세페이지 직접 크롭 + 필요시 편집 | 누끼+무드배경 / Firefly 생성·업스케일 |
| 상세 | 그대로 + SEO 보강 | Canva·Figma·Claude Design 빌드 |
| 도구 | 내장 크롭(sharp) + Firefly/Express(편집) | Firefly·Express·Canva·Figma·Claude Design |
| 개입점 | 프리뷰 갤러리 크롭 택1 / 영역지정 / 편집승인 | 생성 후보 택1 + 디자인 승인 |

---

## 6. 데이터 레벨 현황 (실측) — 체계 뼈대 이미 존재
`asset_jobs` 보유: `lane`(generate/process/compose/review/publish), `tool`(firefly/adobe_express/figma/canva/claude_design/sharp/naver_api), `input_refs`/`output_refs`(jsonb·크롭좌표/편집파라미터 저장), `blocked_reason`.
→ 도구 라우팅·운영자 지정좌표 저장공간 이미 완비. **편집 job_type 4종만 누락**.

job_type CHECK 현재 21종: firefly_generate, remove_bg, color_correct, resize, vectorize, figma_compose, sharp_composite, mockup, naver_image_upload, naver_publish, product_cutout, mood_bg_generate, product_composite, harmonize, express_finalize, naver_normalize, quality_assess, thumb_crop, seo_text, seo_image, bg_swap.
**Code 추가 필요**: region_crop, text_remove, canvas_expand, bg_clean.

---

## 7. production 검증 완료 (이번 세션, #45)
- 관제탑 matrix(`/api/products/asset-jobs-matrix`): readiness는 `row.publish.readinessGrade/Score`. 3상품 정확 surfacing. counts risk0/caution2/ok1.
- 명화 stale B안 asset_jobs 6건(aj_mh_b_*) → cancelled. overall risk→ok.
- assess-quality 대표소스 버그 수정 검증: `sources.representative.url == mainImage`(Cloudinary). 단 명화 tier=T3(4종합성 "단품아님" 보수판정, 발행 무관).
- thumb-crop confirm 가드: <1000px → applied:false + LOW_RESOLUTION (블러 대표 차단). ★라인A 흐름 위해 경고화 필요.
- detail-strategy(`/api/products/[id]/detail-strategy`): AS_IS/BUILD + SEO갭. nextAction 키와 정합.
- publish-preview(`/products/[id]/preview` + `GET /publish-preview`): 명화 canPublish=false(이미지경고3). loader SoT(load-update-context.ts)로 preview=PUT 동일 payload.

---

## 8. Code 진행 커밋 (production, Desktop 교차검증됨)
096e5b2/b59b44f(관제탑SoT+nextAction) → 4063dc0/25e126f/a1d8c90/c14c474(작업3·4·5 tier/crop-apply/detail-strategy) → 3d3a3a6/37cefde/63053f8(assess대표소스 교정 + dryRun 정보고시 노출). 최신 production = 63053f8.

---

## 9. 병행 작업 — PENDING (누락 0)
### 즉시 (도구 활성 세션 = Firefly/Adobe/Canva 커넥터 또는 이미지실행 환경)
1. 명화 대표 #3 컷 **1:1 영역확장(outpaint)** → 업로드 → mainImage 적용(가역).
2. 명화 상세 **공급사 양질 상세 hosting → detail_image_url 교체**(가역).
3. 발행전 프리뷰 재검수 canPublish=true 확인.
4. **운영자 발행 GO → update confirm:true PUT(비가역) → SUSPENSION 해제 → inspect 3중검증.**

### Code 트랙 (병행)
**핸드오프: docs/handoff/HANDOFF_session_2026-06-07_5_crop_edit_workflow_apply.md**
- T1 발행전 프리뷰에 **크롭 스튜디오**(영역 드래그 지정 + 자동 후보 갤러리 + "글씨제거/1:1확장/배경정리" 버튼).
- T2 thumb-crop 게이트 완화(라인A <1000px 경고화).
- T3 job_type 4종 추가(region_crop/text_remove/canvas_expand/bg_clean) + 도구 라우팅.
- T4 라인 자동판정 → 모드 라우팅 → 관제탑 nextAction 라인별.
- T5 전상품 적용(달항아리·아이스트레이 동일 파이프라인).

### 전상품
- 달항아리(A/84) 발행 흐름 / 아이스트레이 재질 입력.

---

## 10. 이번 세션 작성 문서
- docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md (썸네일 크롭·편집 표준)
- docs/decisions/2026-06-07-myeonghwa-images-edit-toolchain.md (명화 이미지 결정)
- docs/handoff/IMAGE_SEO_STRATEGY_ENGINE_2026-06-07.md (전체 엔진 설계)
- docs/handoff/HANDOFF_session_2026-06-07_3_matrix_verify_cleanup.md
- docs/handoff/HANDOFF_session_2026-06-07_4_image_engine_verify_source_bug.md
- docs/handoff/HANDOFF_session_2026-06-07_5_crop_edit_workflow_apply.md
- docs/handoff/MASTER_HANDOFF_2026-06-07_image_seo_crop_edit.md (본 문서)

---

## 11. 정직 메모 (반복 금지 — 1회만)
- 이번 Desktop 세션엔 이미지 생성/편집 실행 도구·업로드·미리보기·창작 MCP가 노출 안 됨 → 결정·표준·체계까지 완결, 실제 생산/편집/적용은 staged. 없는 작업 보고 금지(#46).
- SESSION_LOG.md(45KB)·PROGRESS.md 등 대형 한글 MD 전체덮어쓰기는 Code Python으로(#29b, 토큰 손상 위험). Desktop은 신규 인계 문서로 연속성 보장.

---

## 12. 다음 채팅 첫 행동
1. 본 MASTER 문서 + TASK_BRIDGE.md §3 최신 + docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md 읽기.
2. 도구 활성 환경이면: 명화 대표 #3 영역확장 → 적용 → 상세 교체 → 프리뷰 → 발행 GO 대기.
3. Code 환경이면: 크롭 스튜디오 T1~T5 시공 + SESSION_LOG/PROGRESS/TASK_BRIDGE에 본 세션 반영(Python 전체덮어쓰기).
4. 항상 세션 종료 시 새 채팅 인계 메시지 생성(운영자 상시 지시).
