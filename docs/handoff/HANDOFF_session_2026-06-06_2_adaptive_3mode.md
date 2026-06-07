# HANDOFF — 세션 인계 (2026-06-06 #2, 적응형 3모드 + 명화 간편모드 실전)

> **세션 성격**: Desktop (MCP·검증·DB·브라우저·Adobe·docs write)
> **이어갈 것**: 트랙 A(명화 간편모드 SEO 발행) + 트랙 B(앱 내장 코드, Code 위임) 병행
> **권위 문서**:
>   - docs/research/KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md (3모드 분류기 + SEO 전범위, 본 세션 핵심)
>   - docs/research/KKOTIUM_PRODUCT_SWAP_LOOP_DESIGN_2026-06-06.md (B안 제품교체 = 모드3)
>   - docs/research/KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md (asset_jobs 체계)
>   - docs/handoff/HANDOFF_phase2_product_swap_app_2026-06-06.md (Code 작업 지시서)

---

## 1. 이번 세션 한 일 (COMPLETED)

- **적응형 3모드 시스템 연구 완료** → docs 박제. 핵심: 상품 품질 점수(0~100)로 간편(70↑)/보강(40~70)/주력신규(40↓) 자동 분기. 분류기 = OpenCV 정량(라플라시안 선명도·해상도·배경단색도·피사체비중) 1차 + VLM 2차(경계만, detail:low 85토큰). SEO 전범위 ROI 우선순위(카테고리→속성→상품명50자→태그10→이미지). 씨앗심기(저관여·실용)/온실아틀리에(고관여·감성) 라인 차별화.
- **명화 디퓨저 자동 채점 실증**: 73점 → 간편 모드 확정(해상도1396 OK·배경 edge_std19 깔끔·밝기207·정사각근접 / 선명도 lap25 낮음). 대표 감 = 시스템 검증 일치.
- **명화 누끼 확보**: 업로드 사진(1396x1194) → Adobe image_remove_background → 고해상 누끼(투명 PNG, 발행가능 품질). 기존 cutout 253x776 저해상 대체.
- **명화 대표이미지 완성**: 크롭 3회 시행착오(접시 걸침+해상도 하락) → 근본해법 전환. 누끼본에서 디퓨저 본품만(왼쪽 646x726) 흰배경 1000x1000 단독 합성. 산출: /mnt/user-data/outputs/myeonghwa_main_1000.jpg (JPEG q88 66KB, 제품비중82%, 접시0·텍스트0·워터마크0 = 네이버 2024.10.28 정책 충족).

## 2. 명화 간편모드 실전 명세서 (앱 기능으로 박을 검증된 절차)

간편모드 썸네일 생성 = 다음 절차로 확정(Code가 앱에 자동화):
1. 원본/상세 사진 → image_remove_background(누끼).
2. 누끼본에서 피사체 bbox 탐지 → 주력 제품만 분리(복수 제품 시 메인만).
3. 흰배경 1000x1000 캔버스에 제품 단독 합성, 제품비중 ~82% 중앙.
4. JPEG q88 sRGB 저장. OCR 가드(텍스트 검출 시 재처리).
★ 교훈: 상세 연출컷에서 단순 1:1 크롭은 소품(접시 등) 걸림+해상도 하락. 누끼→단독합성이 정석.

## 3. 두 트랙 다음 액션 (우선순위)

### 트랙 A — 명화 간편모드 마무리 (Desktop + 대표 승인)
- 대표이미지 myeonghwa_main_1000.jpg 확보 완료. 대표 검수 → 승인 시 네이버 반영 PUT(비가역 #46).
- 텍스트 SEO 초안 작성 필요: 상품명(50자, 명화=온실아틀리에 라인 감성 키워드), 카테고리(50003356 아로마방향제/디퓨저), 속성 전항목, 태그10(태그사전). → 대표 승인 후 발행.
- 추가이미지: 누끼본의 리필 액상 포함컷, 차량 장착 연출컷 등 상세페이지에서 추출 가능.

### 트랙 B — 앱 내장 (Code 환경)
- HANDOFF_phase2_product_swap_app + 본 세션 3모드 연구를 통합. Code가 시공.
- 신규 작업: ①품질 분류기(sharp+OpenCV 정량 게이트 + 모드 추천) ②3모드 분기 워크플로우 UI ③간편모드 썸네일 자동화(누끼→단독합성→1000px, 위 §2 절차) ④SEO 전범위 입력 UI(라인별 템플릿) ⑤Product에 brand_line/quality_score/recommended_mode 필드 ⑥asset_jobs job_type 확장(QUALITY_ASSESS/THUMB_CROP/SEO_TEXT/SEO_IMAGE/BG_SWAP).
- 기존 Phase2 6작업(product_swap 스키마·상태머신·관제탑·Sharp규격화·MD)과 병합.

## 4. 영구 원칙 (재확인)

- **3모드 원칙**: 모든 상품 동일작업 금지. 품질점수로 간편/보강/신규 분기. 과잉작업 방지 = 1인셀러 ROI 핵심.
- **간편모드 우선**: 상세페이지 양호하면 누끼→단독합성 썸네일 + 텍스트SEO로 끝. 명화가 대표사례(73점).
- **대표이미지 = 흰배경 단품, 텍스트0**(네이버 2024.10.28). 크롭만으로 소품 못 빼면 누끼→단독합성.
- **SEO 전범위**: 텍스트(카테고리·속성·상품명·태그) 전상품 일괄 + 이미지 모드차등. 씨앗심기/온실아틀리에 분기.
- **이미지 생성 = 최고품질 모델**(면책/크레딧 불문). **B안**: 모드3은 실제제품 누끼고정+배경만AI.
- **브라우저 반자동**: 대표 로그인 환경 열면 AI 이어받기(업로드/CAPTCHA/비가역=사람). 도매매 화보=로그인 필요 실측됨.
- **비가역 0(#46)**: 네이버 PUT/POST 대표 승인 없이 0.
- **환경 분담(#41)**: Desktop=MCP·검증·DB·브라우저·Adobe·docs / Code=코드파일·git·tsc/build. Desktop 코드작성 불가=정직보고.
- **각 프로그램 적재적소**: Firefly=생성 / Photoshop·Adobe MCP=누끼·크롭·합성 / Express=마감·Bulk / Sharp=규격화 / Claude Design=시안·관제탑.

## 5. 잔여 병행 트랙 (누락 방지)

- 명화 텍스트 SEO 초안 → 발행(비가역, 대표 승인).
- 명화 대표이미지 네이버 반영 PUT(비가역, 대표 승인).
- 명화 SALE 전환(대표 의도적 보류).
- asset_jobs 명화 B안 큐 6단계 = 모드3용으로 보존(명화는 간편모드 확정이라 실사용 안 함, 다른 주력상품용 템플릿).
- 채널상품 회선(/v1) ECONNRESET → 고정IP 이전.
- 5종 추적 MD 갱신(Code 위임).
- `* 2.*` macOS 중복본 정리(#34).

## 6. 산출물 위치

- 명화 대표이미지: /mnt/user-data/outputs/myeonghwa_main_1000.jpg (다음 세션에서 재생성 가능: 누끼본 → 본품 크롭 → 흰배경 1000 합성)
- 누끼 원본: Adobe presigned (만료성) → 필요시 업로드 사진에서 image_remove_background 재실행.
- 연구 3종 + 핸드오프: docs/research/, docs/handoff/.

## 7. 현재 시스템 건강도

- Phase 1 누락방지 골격: production live. asset_jobs/transitions/published_assets 정합. 관제탑 매트릭스 migrationPending=false.
- 명화 asset_jobs: B안 6단계 등록 + 의존 게이트(blocked 체인). 단 명화는 간편모드 확정 → B안 큐는 모드3 템플릿으로 보존.
