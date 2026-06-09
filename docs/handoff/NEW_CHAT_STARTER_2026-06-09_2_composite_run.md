# 다음 채팅 인계 — 명화 무드 합성 실행 + 병합 (2026-06-09 세션2 마감)

이 문서 = 새 채팅 붙여넣기 진입 권위본. 정독 순서: 본 문서 -> PARALLEL_WORK_TRACKER.md -> TASK_BRIDGE §3 -> HANDOFF_myeonghwa_composite_recipe_2026-06-09.md(§3 프롬프트) -> CUTOUT_CROP_FEATURE_BUILD_PLAN.md.

## 1. 이번 세션(2) 실측·산출 (검증 완료, 추측 0)

### 1-1. 상태 교차검증 (#45)
- production(target=production, READY) = `e0c7f19` (main). 즉 **C-1/C-7 코드는 아직 production 미반영** — 문서/셋업 커밋만 라이브.
- `feat/composite-pipeline` = `a28946e` (C-1+C-7 포함, base=dbbb04d). Vercel **preview 빌드 READY** = 코드 정상 빌드 확인.
- `feat/white-bg-simple` = `dbbb04d` (C-1 단독, composite-pipeline에 흡수).
- 드리프트 0. 직전 세션(69) 종료 지점 그대로 이어받음.

### 1-2. Adobe 백엔드 복구 확인 (직전 400 블로커 해소)
- `adobe_mandatory_init` 200. `image_remove_background` **정상 작동** 확인.
- 단, 라우팅 문서 재확인: photo compositing / prompt 배경교체 / generative fill = **Adobe MCP 미지원**(영구). 누끼·아웃페인팅만 가능.
- 결론: 누끼는 MCP로 가능 / **무드 합성 자체는 Firefly 웹 UI(브라우저 #52)** = 직전 세션 구조와 동일(정상).

### 1-3. 명화 누끼 산출 (이번 세션 실제 완료)
- 풀해상 상세(`source_detail_url`, 1000x18291) 밴드 스캔 + 육안 검증 결과: **클린 단독 본품샷 부재**가 실측 사실. 본품은 항상 4종 변형 카드에 작게·텍스트·연출배경과 함께 등장(레시피 §4 경고와 일치).
- 그 중 본품(정사각 유리병 + 우드 볼캡 + 명화 라벨)을 최적 크롭(full 좌표 x222-392, y7655-8085, 170x430) -> Adobe `image_remove_background` -> **투명 PNG 누끼 성공**(텍스트·이웃캡 정상 제거, 유리 경계 깨끗).
- 한계(정직): 누끼 170x430(소형). **Firefly 합성 레퍼런스로는 충분**(Firefly가 고해상 재생성), **§9 대표(1000px) 단독으론 작음**. 대표는 가죽 확정이라 무관 — 누끼는 추가이미지 합성 입력 전용.
- 산출 파일(대표님 다운로드 제공됨): `myeonghwa_bottle_cutout.png`(투명), `..._preview.png`(흰배경 미리보기), `..._source_crop.png`(소스 크롭).

### 1-4. 부수 확정 — 명화 안전번호 2종 (SUSPENSION 해제 관련)
- 풀해상 상세 r2(환경부 안전확인) 밴드에서 실측: **HB19-12-1462 / HB21-12-2572**.
- SUSPENSION 근본원인(필수속성 재질/색상 + 안전기준 신고번호 ETC)의 신고번호 입력값으로 사용 가능. (입력·PUT은 대표 GO 후 비가역.)

## 2. 명화 DB 실측 (cmpnooli40001f0gveaxr8iim)
- 대표 mainImage = curated thumb-crop(가죽, 확정) / detail = Branch A 공급사 그대로 / source_detail_url = 1000x18291 확보.
- supplier_product_code = 65322245 / naver_status_type = SUSPENSION(drift 정확) / **extra_images = [] (합성 결과 들어갈 슬롯 비어있음)**.

## 3. 다음 작업 (우선순위)
1. **명화 Firefly 무드 합성 (브라우저 반자동 #52)** — Firefly 탭(Chrome **1396049947**, 로그인·생성홈 확인됨)에서:
   - 대표님: 누끼 PNG(`myeonghwa_bottle_cutout.png`)를 Firefly 레퍼런스 칸에 드롭(업로드는 대표 — #52).
   - Claude: `/generate/image` 또는 보드에서 레시피 §3 영문 프롬프트 입력 -> 생성·후보 선택·폴링 구동. (credit 소모 generate 클릭·다운로드는 대표.)
   - 회수: 결과 URL -> `POST /api/products/[id]/apply-composite { compositeUrl }`(recovery 모드) -> extra_images 슬롯 적용(추가이미지·가역). ★ 단 apply-composite는 production 미배포 -> **병합 선행 필요**(아래 4).
2. **병합 (권고)** — `feat/composite-pipeline -> main`. 두 라우트(/white-bg·/apply-composite)는 순수 additive·UI 미연결 -> production blast 0. 병합해야 apply-composite·white-bg를 production에서 실측 + 합성 회수 가능. 터미널 1줄(아래 6).
3. **병렬 Code 청크** — C-2(어도비 누끼 적용)·C-4(가드->대기열) 병렬 / C-3->C-5->C-8 직렬. 진입 문구 = CUTOUT_CROP_FEATURE_BUILD_PLAN.md.

## 4. 유의사항 (하드 룰)
- 비가역 0: 네이버 PUT/발행은 대표 "GO" 전 절대 미실행(#46). 누끼·합성·DB·병합은 전부 가역.
- 전상품 범용(#55): 명화는 검증 1호 사례. 단건 아닌 체계.
- 한글 편집 = 직접 타이핑(유니코드 이스케이프 금지).
- 실측 우선(#45): Code 보고는 production/DB 직접 교차검증, 화면은 reload 후 신뢰.
- 이미지 산출: 누끼 = Adobe MCP(복구됨) / 무드 합성 = Firefly 웹 UI(브라우저) — MCP는 compositing 영구 미지원.
- 크레덴셜(Supabase secret 등)·파일 업로드(Firefly)·다운로드·비가역 클릭 = 대표 담당(#52 + 안전 규칙).

## 5. 붙여넣기 — 다음 채팅(Desktop, 명화 합성 실행)
```
[꽃틔움 가든 / Desktop 세션 / 이어서: 명화 Firefly 합성 실행 + 병합]
정독: docs/handoff/NEW_CHAT_STARTER_2026-06-09_2_composite_run.md -> PARALLEL_WORK_TRACKER -> TASK_BRIDGE §3.
1) Firefly 탭(1396049947) 생성홈 확인 -> 누끼 PNG(myeonghwa_bottle_cutout) 레퍼런스 드롭(대표) -> 레시피 §3 프롬프트로 /generate/image 구동 -> 후보 선택 -> 결과 URL을 apply-composite로 extra_images 적용.
2) 병합 GO 시 feat/composite-pipeline -> main(터미널 1줄) -> production /white-bg·/apply-composite 라이브 실측.
3) 병렬 Code 청크 C-2·C-4·C-3->C-5->C-8 진입 문구는 CUTOUT_CROP_FEATURE_BUILD_PLAN.md.
규칙: 비가역0·한글 직접입력·실측우선·전상품 범용. 리서치 도구 미사용(앱 작업).
```

## 6. 터미널 명령 (대표 실행 — Claude git 불가)
### 문서 push (이번 세션 핸드오프 보존)
```
cd /Users/jyekkot/Desktop/kkotium-garden && git add docs/ && git commit -m "docs(#41): 명화 누끼 산출 + Adobe 백엔드 복구 확인 + 합성 실행 인계 (70)" && git push
```
### 병합 GO 시 (C-1+C-7 production 반영)
```
cd /Users/jyekkot/Desktop/kkotium-garden && git checkout main && git merge feat/composite-pipeline --no-ff -m "merge: C-1 인앱 누끼 + C-7 합성 파이프라인 (additive·blast 0)" && git push
```
> 병합 후 Vercel production 자동 배포 -> Desktop이 HEAD SHA + READY 교차검증 -> /white-bg·/apply-composite 라이브 smoke(C-6).
