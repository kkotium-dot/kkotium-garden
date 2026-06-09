# 꽃틔움 가든 — 병행작업 트래커 (누락 0 원칙) · 최종 업데이트 2026-06-09 (rev5)

> 대표 상시 지시: 요청 개선사항·병행작업 항상 누락 없이 추적. 매 세션 갱신. Desktop 상시 유지. #54·#55·#56 준수.

## 상태 (실측 기준)
| # | 항목 | 상태 | 다음 |
|---|---|---|---|
| 1 | 명화 대표 v2 → curated | ✅ DONE·검증완 | — |
| 2 | 풀해상 상세 캡처(전상품) | ✅ DONE — 명화·달항아리(860x2294)·아이스트레이(860x2480) 전부 확보 | — |
| 3 | 인제스트 supplier_product_code 항상 캡처 | ✅ DONE(parse-dome-no 폴백) | — |
| 4 | 2갈래 실품질 라우팅(A/A_EXTRACT/MIXED/B) | ✅ DONE·검증완 | — |
| 5 | 명화 상세 Branch A(공급사 그대로 채택) | ✅ DONE·검증완(detail=curated) | — |
| 6 | **상세 생성 엔진 Track 2 (Branch B)** | ☐ Code 착수(경로 A) | **상품정체성 기준** 7섹션 생성. 레퍼런스=docs/design/aroma_L3_detail_reference.html + ADAPTIVE_IMAGE_SEO_ENGINE.md |
| 6b | **상세 1차 틀 (aroma L3 정식 레퍼런스)** | ✅ 개선완 (주석버그·모바일16px·리뷰슬롯·sticky CTA + §7.2 전프리셋 토큰) | 대표 컨펌 → S2/S4 빌드업(Firefly/Met CC0 → Canva/Figma 860px) |
| 6c | (폐기) 브랜드-프론트 시안들(TEST_branchB / 1차틀_productID) | 폐기 | aroma_L3_detail_reference가 정식 대체 |
| 6d | **적응형 이미지·SEO·ROI 카피 엔진 문서화** | ✅ DONE(docs/design/ADAPTIVE_IMAGE_SEO_ENGINE.md) | — |
| 6e | **프리셋 시스템 앱 구현 (Phase A/B)** | ✅ DONE·실측완 (A·B-1·B-2·B-3) | 전부 배포·라이브검증. B-2 seo-guard(orthogonal true·이름 warn/S·카테고리 pass·대표 white-bg fail)·B-3 generate(aroma/l3·추천일치·7섹션 scents3/specRows5/values3·grounded·슬롯/잠금 정확) |
| 6g | **앱 전역 title + 브랜드 오타 교정** | ✅ DONE·검증완 | title="꽃틔움 가든" 정상(reload 후 실측). 브랜드 오타 8곳/7파일 교정(eef3ce1·9f90faf·aa7e5b9) + layout.rtf 제거 |
| 6h | **명화 대표이미지 정책 결정(가죽 유지)** | 결정완 — override 1호 사례 | 대표님 결정: 가죽 라이프스타일컷 대표 유지(전환율 우선). seo-guard white_bg fail은 차단 아닌 권고 → main_image_policy=lifestyle_intended로 info 강등 예정(C-4). 누끼는 명화 단건이 아니라 전상품 기능으로 분리(아래 누끼/크롭 시스템) |
| 6f | **전상품 프리셋 배정 정합** | ✅ DONE·실측 | 명화=aroma/L3 · 달항아리=tradition/L3(기본값에서 교정) · 아이스트레이=kitchen/L1. item3 컬럼 존재 교차검증 완 |
| 7 | 아틀리에 2단계 — 우측 스크롤 교정 | ✅ DONE·검증완(max-h 1005·overscroll contain·클립0·바닥도달) | — |
| 8 | 아틀리에 2단계 — job 생명주기(취소/재시도/되돌아가) | ✅ DONE·검증완(reopen→cancel 루프 200) | — |
| 9 | 아틀리에 2단계 — P4 공유카드 배지·전 /studio 토큰정렬·헤더 applyStatus 미러 | ☐ 후속 | Code |
| 10 | 개입대기열 2차(deepLink 정합)·3차(외부인증 Chrome MCP 반자동 #52) | ☐ 후속 | Code |
| 11 | applyStatus 정확성 · nextAction↔큐 정합 | ✅ DONE·검증완 | — |
| 12 | 명화 발행(SUSPENSION→큐레이션 완료, 발행 GO) | ⏸ GO 대기(비가역 #46) | 대표 "GO" 시 PUT. 안전번호 2종 실측 확보: HB19-12-1462 / HB21-12-2572(상세 r2) |
| 13 | Branch A SEO/ROI 보강 자동화 | ☐ 후속 | Code(공급사 상세 + 미달요소 보강) |

## 누끼 + 크롭 마무리 시스템 (신규, 2026-06-09)
권한 = docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md · 빌드 = docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md. 각 청크 = 새 채팅 1개.
| ID | 작업 | 상태 | 비고 |
|---|---|---|---|
| F-진단 | 코드 실측(크롭 완성·누끼 갭) | ✅ DONE(데스크톱) | thumb-crop=완성 / bg_clean=seed만·executor 없음 / seo-guard fail 미연결 |
| C-1 | 인앱 SIMPLE 누끼(sharp 흰배경 평탄화) + /white-bg 라우트 | ✅ DONE (feat/white-bg-simple 2ff4a77) · Desktop 코드검증완 · ⏸ production 미반영(병합대기) | bg-difficulty/white-bg/route 3파일+CropWarning 확장 read — 로직 정합·공유가드·BACKGROUND_NOT_WHITE 정직플래그(#46)·가역. composite-pipeline에 흡수됨. 라이브 smoke=머지 후 C-6 |
| C-2 | 어도비 누끼 적용 executor /apply-cutout | ✅ DONE (feat/composite-pipeline cdbb423, tsc0/build) | cutoutUrl→흰배경 합성·가드·적용, bg_clean done 전이. 병렬 가능 |
| C-3 | finish-image 단일 라우터 + 스키마(extra_images·main_image_policy) | ☐ Code(C-1·C-2 후) | 난이도 분기·이전대표 추가이미지 보관 |
| C-4 | seo-guard→개입대기열 연결 + override 강등 | ✅ DONE (feat/composite-pipeline 0b7d291, tsc0/build)(병렬) | finish_representative 항목·deepLink·lifestyle_intended info 강등 |
| C-5 | 스튜디오 '대표이미지 마무리' 통합 카드 + 컨트롤타워 배치 | ☐ Code(C-3·C-4 후) | 자동다듬기/크롭/추가이미지, dry-run before→after, 재가드 |
| C-6 | 브라우저 실무 테스트(3상품 전 흐름) | ☐ 데스크톱(C-5 후, 병합 후) | 무오류 확인 후 다음 본작업 |
| F-규격 | 대표이미지 규격 표준(§9) 박제 | ✅ DONE(데스크톱) | 첨부 레퍼런스(흰배경 본품샷)→ 1:1 1000·순백·본품 70~85%·텍스트0·OCR0. 전상품 적용. REPRESENTATIVE_IMAGE_FINISHING §9 |
| F-합성 | 명화 무드 합성(추가이미지/상세 히어로) | 🟢 누끼 3종 재작업완 + 새배경 합성(트랙1)완 · Firefly 무드(트랙2) 탭구동 대기(#52) | ★세션2 재작업: 1차 170px 카드컷 폐기 → 대표 올린 실촬영 히어로컷 3종(들판소녀 A·차량가죽범선 B·흰배경들판마을 C)에서 image_remove_background→투명PNG 완전포함 산출. 투-트랙 전략 확정(#57): 정보형 새배경(C)·감성형 Firefly 무드(B). track1_C 새배경 합성(우드+린넷+식물그림자·접지섬자) 산출완. Firefly는 탭 SPA 렌더 미완→대표 파일드롭 후 Claude 구동(키트=Firefly_무드합성_실행키트.md). 레시피=HANDOFF_myeonghwa_composite_recipe §3/§4 |
| C-7 | 합성 파이프라인(누끼→무드) = Branch B 앱 기능 | ✅ DONE (feat/composite-pipeline a28946e) · Desktop 검증완+마이그레이션 적용 · ⏸ production 미반영(병합대기) | apply-composite executor(harmonize·추가이미지 적용, 가역). 검증: 라우팅·CHECK제약(product_composite/harmonize 존재)·P2022 가드 정합. extra_images jsonb(기본 []·NOT NULL) Desktop 적용완 → confirm 끝까지 동작. Vercel preview READY(빌드 정상) |
| C-8 | 추가이미지 멀티슬롯 매니저 | ☐ Code(C-3 후) | 대표(1)+추가(2~9) 순서·교체·소스라벨·네이버 매핑. 첨부 레퍼런스 비율 적용 |
| 병합 | feat/composite-pipeline → main (C-1+C-7 production 반영) | ⏸ 대표 GO 대기(권고함) | additive·UI 미연결→blast 0·충돌 0. 병합해야 /white-bg·/apply-composite production 실측 + 명화 합성 회수 가능. 명령=NEW_CHAT_STARTER_2026-06-09_2 §6 |

## 이미지 자산 폴더 자동분류 시스템 (신규, 2026-06-09 세션2)
대표 지시: 생성물(누끼/합성/썬네일/상세) 단계별 자동분류·반자동업로드 · 전상품 영구구조. 권한/빌드 = docs/plan/ASSET_FOLDER_TAXONOMY_BUILD.md.
| ID | 작업 | 상태 | 비고 |
|---|---|---|---|
| FT-설계 | 폴더 택소노미 설계 + 스펙 작성 | ✅ DONE(데스크톱) | 단계우선 추천 확정: cutout/composite/thumb/detail/archive. 현 automation-storage 실측(thumb|detail 2종, 단계=variant에만) → 개선 설계 문서화 |
| FT-코드 | AssetKind 단계확장 + 경로 {pid}/{kind}/{variant} + list 재귀(하위호환) + asset-taxonomy.ts + 생산자 정합 | ✅ DONE (feat/composite-pipeline b73f526, tsc0/build/§5) | 하위호환 필수(기존 flat URL 보존). grep 전수. §5 체크리스트 |
| FT-검증 | 신규업로드 단계폴더 생성·기존 URL 유효·전상품 동작 | 🟡 부분(하위호환 확인완) · 단계폴더 실생성=병합후 C-6 | storage.objects 조회: 명화13·달항아리9·아이스트레이1 전부 root_flat(기존 23 무손상). 단계폴더는 신규업로드 발생 시 생성(병합→스튜디오 적용 1회→실측). Claude service key 미보유로 직접 트리거 불가(정직) → 대표 실행 or 브라우저 구동 |
| FT-Adobe | Adobe CC 입구 정리(KKOTIUM_GARDEN 루트 + 중복 kkotium 6개 통합) | ✅ 루트·6폴더 생성완(승인받음) · 중복삭제=대표 | KKOTIUM_GARDEN/00_inbox·01_cutout·02_composite·03_thumbnail·04_detail·99_archive 생성완(STAGE_FOLDER 1:1 미러). 중복 kkotium~(5) 6개=내용 Supabase/산출물 백업됨 → 삭제는 비가역이라 대표 Adobe 웹 직접 권장. 앞으로 업로드=00_inbox 고정→재발 0 |

## 앱 적용 현황 (명화 · 실측 2026-06-09 세션2)
- production(target=production) = `e0c7f19`(main). C-1/C-7 코드는 **preview 빌드만 READY · production 미반영**(병합 대기).
- 대표 = curated(가죽 v2) ✅ / 상세 = curated(Branch A 공급사 그대로) ✅ / 2갈래 = A / 발행 = SUSPENSION(drift 정확) / extra_images = [] (합성 슬롯 비어있음)
- 명화 본품 누끼 = 산출완(투명 PNG, Firefly 합성 입력 대기) / 무드 합성본 = 미생성(Firefly 실행 대기)
- 전상품 시스템 + 아틀리에 2단계(스크롤·임시저장·job 생명주기) = LIVE
- 안전번호 2종 = 실측 확보(HB19-12-1462 / HB21-12-2572) — SUSPENSION 해제 입력값(대표 GO 후 비가역)

## 운영 메모
- 비가역(네이버 PUT) = 대표 "GO" 전 절대 미실행(#46). 현재까지 전부 가역.
- DB 백필/캡처/적용/생명주기 전이 = 가역 → Desktop 직접 실행(#41).
- 명화 대표 = 가죽 라이프스타일 확정(대표님, 재변경 없음). 누끼·합성은 추가이미지·전상품 기능으로.
- ✅ Adobe 이미지 백엔드 **2026-06-09 세션2에서 복구 확인**(image_remove_background 200·누끼 정상). 단 photo compositing / generative fill / prompt 배경교체는 **Adobe MCP 영구 미지원**(라우팅 문서) → 무드 합성 자체는 Firefly 웹 UI(브라우저 #52). 누끼만 MCP 가능.
- extra_images jsonb 마이그레이션 2026-06-09 Desktop 적용완(additive·가역·production 무해). C-7 confirm 경로 unblocked.
- Firefly 탭 준비됨(Chrome id 1396049947, 로그인·생성홈 확인) + Adobe Express(1396049445) — 명화 합성 브라우저 구동 대기. 업로드/다운로드/credit 클릭 = 대표 담당(#52).
