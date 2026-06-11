# NEW CHAT STARTER — S2 Firefly 이미지 + 다음 작업 분할 (2026-06-10)

> 작성: 2026-06-10 Desktop | 성격: 다음 채팅 단일 진입점 (S2 실행 + C-3 코드 + MD 핑퐁)
> production HEAD: 5e2cce2 (READY, #45 실측 검증) | 이전 진입점들 대체
> 짝 문서: docs/design/{aroma_L3_detail_reference, myeonghwa_detail_v2}.html
>          docs/design/{ADAPTIVE_IMAGE_SEO_ENGINE(§9), DETAIL_PAGE_PLAYBOOK, CONCEPT_PRESET_SYSTEM}.md
>          docs/handoff/HANDOFF_myeonghwa_composite_recipe_2026-06-09.md (합성 레시피)

---

## 0. 지금까지 (확정·검증)
- 발행 비행전 GREEN: 원산지=국산(정보고시 제조국 대한민국)·옵션 4종 확정. 발행 게이트=대표 GO(비가역)뿐.
- 이미지·상세 통합 체계 박제(ENGINE §9): 저장경로 5폴더(cutout/composite/thumb/detail/archive)·단계->폴더->개입점·도구세션 이어가기·전상품 동일. PLAYBOOK §1 교차참조.
- 상세 S3 v2 시안 빌드 완료: myeonghwa_detail_v2.html (aroma L3·7섹션·향4종·하루의시간 아크·정보고시 실팩트·코튼어라운드 일시품절 포함). 범용 레퍼런스(aroma_L3)는 3향 틀로 보존.
- detail/ 적재 = end-to-end 배선 완료(runDetail->runSave->save-assets, writer=save-assets kind='detail'). 가동은 스튜디오 저장 흐름 랜딩 시.

## 1. 다음 작업 분할 (각 = 새 채팅 1개, 중복작업 방지)
| 채팅 | 작업 | 환경(필수 도구) | 선행 | 비가역 |
|---|---|---|---|---|
| **S2** | 명화 상세 Firefly 이미지 생성·합성 | **Claude in Chrome 커넥터 ON** (Firefly 로그인 브라우저) | 본 프롬프트셋(§2) | 다운로드=대표 개입 |
| **C-3** | finish-image 단일 라우터 + keepAsExtra | Claude Code | 없음(컬럼 기반속 완료) | Code register 금지 |
| **APP-1** | 스튜디오 상세 흐름에 슬롯별 Firefly 프롬프트 노출(반자동화 앱화) | Claude Code | S2 패턴 검증 권장 | 비가역 0 |
| **발행** | 명화 SUSPENSION 해제 PUT | 대표 GO 세션 | 위 무관, 독립 | **대표 GO 필수** |

권고 순서: S2(이미지) 와 C-3(코드)는 **독립 병행 가능**. APP-1은 S2 패턴 확정 후. 발행은 대표 결심 시 독립 진행.

## 2. S2 Firefly 프롬프트셋 (실행 직전 — 슬롯별)
> 모델: **Firefly Image 5**(Adobe IP 면책·10크레딧) 우선. 모델 전환 시 비율 리셋되니 매번 비율 재선택.
> IP 규칙(플레이북 §5): 실존 브랜드/유명인/캐릭터 금지. 텍스트 삽입 금지(no text). 인상주의 "스타일"은 OK(특정 작품 복제 아님). 스토리 슬롯만 Met CC0 실원작 사용.
> 저장(§9): 생성물 -> product-assets/{pid}/composite/ (배경·연출컷) | 누끼 -> cutout/ | 합성 대표후보 -> composite/.

### 2-A. 히어로 배경 (A 레이어 — 16:9)
`impressionist water-lily pond in Monet style, soft sage green and warm-cream palette, painterly brushwork, serene, calm, no text, no signature, 16:9`

### 2-B. 향별 연출컷 4종 (A 인상주의 배경 + C 정물 — 각 4:5)
- 레몬유칼립투스(아침): `impressionist morning garden, dewy green leaves and citrus, soft sage and pale-yellow light, fresh, painterly, no text, 4:5`
- 에이프릴후레쉬(한낮): `impressionist flower field after rain, soft pink and cream florals, clean fresh light, painterly, no text, 4:5`
- 코튼어라운드(오후): `impressionist sun-dried white linen on a line, warm cream and soft beige tones, cozy afternoon light, painterly, no text, 4:5`
- 블랙체리(늦은오후): `impressionist orchard at golden hour, ripe dark cherries, warm terracotta and deep red, painterly, no text, 4:5`

### 2-C. 제품 합성 (히어로 제품 자리)
- 누끼 제품컷(대표 v2 큐레이션본) -> 2-A 배경에 합성. 톤/그림자/스케일 = HANDOFF_myeonghwa_composite_recipe_2026-06-09.md 준수.

### 2-D. 아트 스토리 슬롯 (Firefly 아님 — Met CC0 실원작)
- The Met Open Access(CC0)에서 `Claude Monet, Water Lilies, 1906` 고해상 다운로드. 캡션 = 작가·작품·연도·"Public Domain" 표기(시안에 이미 반영).

### 2-E. 실행 흐름(개입점)
1) 대표: Firefly 로그인된 Chrome 열기 + Claude in Chrome 커넥터 ON
2) Claude: 슬롯별 프롬프트 입력·생성·후보 폴링·선택 제안
3) 대표: 최종 선택·다운로드(비가역 손길)
4) Claude: 누끼->composite 후 product-assets/{pid}/composite/ 적재(스튜디오) -> S4 860px -> detail/
5) 검수(seo-guard·publish-preview) -> 발행 GO 대기

## 3. APP-1 — 반자동화 앱화 스펙 (Code)
목표: ENGINE §1-B 프리셋별 Firefly 프롬프트를 **앱 데이터로** 보유 -> 스튜디오 상세 생성 개입점에서 슬롯별 프롬프트 카드 노출(복사/구동). "지시를 외부 문서가 아니라 앱이 제시" = 1인 셀러 반복작업 제거.
- 데이터: concept-presets.ts 에 preset별 imageDirections[] (slot, prompt, ratio) 추가(ENGINE §1-B verbatim).
- UI: 스튜디오 상세 카드에 슬롯별 프롬프트 + 복사 버튼 + 저장경로(composite/) 안내. (Operator Action Queue 원칙 #56과 정합)
- 비가역 0(데이터·UI만). register/PUT 금지.

## 4. Code 붙여넣기 문구 (이 채팅 마감 기록 — 누락 보완)
```
Target Session: Code CLI
1. PROGRESS/SESSION_LOG 갱신(#29b Python): 
   - S2 Firefly 프롬프트셋 준비 완료(NEW_CHAT_STARTER_2026-06-10_S2_firefly.md)
   - 정직 기록: 본 Desktop 세션에 브라우저/Firefly 도구 미연결 -> S2 실행은 browser 세션으로 이관
   - 새 채팅 분할(S2/C-3/APP-1/발행) 확정
2. PARALLEL_WORK_TRACKER rev8->rev9:
   - S2 행: "명화 상세 Firefly 이미지 — 프롬프트셋 준비완, 실행 대기(browser 세션)"
   - APP-1 행 신규: "스튜디오 슬롯별 Firefly 프롬프트 노출(반자동화 앱화) — 스펙 작성"
3. (선택) C-3 착수 시 진입문구 = docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md "붙여넣기 — C-3"
```

## 5. 작업 유의사항 (영구 — 대표 강조사항·중요사항)
- **비가역 0**: 네이버 PUT/발행·영구삭제·권한변경·결제는 대표 GO 전 금지(#46). 나머지는 가역이라 선진행+사후보고.
- **실측 우선(#45)**: Code 보고를 그대로 믿지 말고 production은 Vercel MCP, DB는 Supabase MCP, 파일은 직독으로 교차검증. 허위 기록 금지.
- **정직(#46)**: 못 하는 작업(도구 미연결 등)은 지어내지 말고 즉시 대표께 요청. 가짜 결과 보고 절대 금지.
- **전상품 범용(#55)**: 파이프라인·저장경로·개입점은 전상품 동일. 명화는 검증 1호일 뿐. 단 컨셉 조합(모네+정물 등)은 상품별 개별 결정·일반화 금지.
- **저장경로(ENGINE §9)**: product-assets/{pid}/{cutout|composite|thumb|detail|archive}/ 통자 금지.
- **개입점 = 자연스러운 손길**(승인·선택·디렉팅), 막는 벽 아님. 비가역만 GO.
- **핑퐁(#41)**: Desktop(MCP검증·DB·문서·이미지조율) / Code(파일·git·빌드·마이그레이션). 핸드오프에 Target Session + Branch 명시(#36).
- **한글 MD 안전(#29b)**: 대용량 한글 MD(PROGRESS/SESSION_LOG/트래커)는 Code Python 전체덮어쓰기. Desktop edit_file은 소규모 정밀편집만, 항상 dryRun 선행. 유니코드 이스케이프 금지·한글 직접입력.
- **컨텍스트 분할**: 작업량 많으면 새 채팅으로 분할(중복작업 방지). 마감 시 본 스타터 같은 단일 진입점 작성.
- **코드 원칙**: 이모지 0·주석 영어·한글 리터럴 영어상수 분리·수정 후 tsc 0 확인.
- **문서 위치**: 새 MD는 docs/ 하위(plan/design/handoff)에 정리.
- **SD-01**: /studio footer 아랍어 텍스트 영구 보존(수정/조사 금지).
