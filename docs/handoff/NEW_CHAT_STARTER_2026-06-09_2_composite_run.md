# 다음 채팅 인계 — 폴더 자동분류 후속 + 명화 합성 + 병합 (2026-06-09 세션2 마감)

이 문서 = 새 채팅 붙여넣기 진입 권위본. 정독 순서: 본 문서 -> PARALLEL_WORK_TRACKER.md -> TASK_BRIDGE §3 -> ASSET_FOLDER_TAXONOMY_BUILD.md -> HANDOFF_myeonghwa_composite_recipe(§3/§4) -> PRINCIPLES_LEARNED #57.

## 1. 이번 세션(2) 완료 (실측·구현·검증, 추측 0)

### 1-1. 명화 누끼 재작업 (대표 반려 -> 재작업 완료)
- 1차 170px 카드컷 = 평면·잘림 -> **폐기**.
- 대표 업로드 실촬영 히어로컷 3장 -> image_remove_background -> **투명 PNG 3종 완전포함 산출**: A(들판소녀)·B(차량가죽 범선·올리브)·C(흰배경 들판마을).
- 투-트랙 합성 확정(#57): 정보형=새배경(C)·감성형=Firefly 무드(B).
- track1_C 새배경 합성(우드+린넨+식물그림자·접지섀도) 산출완(앱 sharp).
- Firefly 무드(트랙2): 탭 SPA 렌더 미완 -> 대표 파일드롭 후 Claude 구동(키트=Firefly_무드합성_실행키트.md).

### 1-2. C-2 코드 검증 (Code push, Desktop 실측 통과)
- HEAD `1c3095c` -> 폴더작업 후 `39c8072`. apply-cutout: whiteBgFinish 재사용·bg_clean done 전이·#57 sourceGuidance·OCR block 가드·비가역 0. 정합 확인.

### 1-3. 자산 폴더 자동분류 (FT) 구현·검증
- **FT-코드 (Code, HEAD `39c8072`)**: AssetKind 2->5종(cutout/composite/thumb/detail/archive)·경로 `{pid}/{kind}/{variant}-{ts}`·listProductAssets 재귀(root+5단계, stage 필드, placeholder 스킵)·findCachedAsset root우선+하위폴더 fallback·asset-taxonomy.ts(STAGE_FOLDER/kindForSource/safeVariant)·apply-cutout(원본 누끼 cutout/ 저장)·apply-composite(kind composite). 검증: tsc0/build OK/8생산자 컴파일/이모지0/한글0/비가역0/기존 flat 미이동.
- **FT-검증 (Desktop, Storage 실측)**: storage.objects 조회 -> 명화 13·달항아리 9·아이스트레이 1 전부 root_flat, 단계 하위폴더 아직 0(정상, 신규 코드 production 미배포). 하위호환 보장 확인(기존 23 flat URL 무손상). ★단계폴더 실생성 확인은 **병합 후 신규 업로드 발생 시**(C-6 실무 테스트와 합쳐짐) -- Claude가 서버 service key 미보유로 직접 트리거 불가(정직 #46), 대표 스튜디오 실행 or 브라우저 구동 필요.
- **FT-Adobe (Desktop, 승인받음)**: Adobe CC `KKOTIUM_GARDEN/` 루트 + 6폴더(00_inbox·01_cutout·02_composite·03_thumbnail·04_detail·99_archive) 생성완. 앱 STAGE_FOLDER와 1:1 미러.
  - 중복 kkotium~(5) 6개: 내용 Supabase/산출물로 백업됨. **삭제는 비가역 -> 대표가 Adobe 웹에서 직접** 권장(Claude 임의 삭제 안 함). 앞으로 Adobe 업로드는 00_inbox로 고정 -> 재발 0.

## 2. 미반영(병합 대기) -- 핵심
- production(target=production READY) = `e0c7f19`(main). **feat/composite-pipeline(`39c8072`, C-1+C-7+C-2+FT)는 preview 빌드만 READY·production 미반영.**
- 병합해야: /white-bg·/apply-cutout·/apply-composite production 동작 + 단계폴더 실생성(신규 업로드) + 명화 합성 회수 + C-6 실무 테스트.

## 3. 다음 작업 (우선순위·새 채팅 분할)
1. **[대표 GO] 병합** `feat/composite-pipeline -> main` (additive·blast 0). 명령 §6.
2. **[Desktop, 병합 후] C-6 실무 테스트** = 명화 누끼/합성 실제 적용 1회 -> 단계폴더(`{pid}/cutout/`·`composite/`) 실생성 확인 + 기존 URL 유효 + 3상품 동작 (FT-검증 마무리와 합침).
3. **[대표 개입] 명화 Firefly 무드(트랙2)**: 누끼 B/C 드롭 -> 키트 프롬프트 -> Claude 후보선택·폴링 -> apply-composite 회수.
4. **[Code 병렬] PROGRESS.md 갱신**(이번 세션 줄 추가, Python 전체덮어쓰기 #29b) + C-4(seo-guard->개입대기열)·C-3->C-5->C-8(#57 반영).
5. **[후속] 명화 SUSPENSION 해제**: 안전번호 HB19-12-1462/HB21-12-2572 + 재질/색상 -> update PUT. 대표 GO 후 비가역(#46).
6. **[후속] 아이스트레이**: 도매번호 operator 제공 -> 풀해상 캡처 unblock.

## 4. 유의사항 (하드 룰 -- 대표 상시 강조)
- 비가역 0: 네이버 PUT/발행·Adobe 폴더 삭제는 대표 "GO" 전 절대 미실행(#46). 누끼·합성·DB·폴더생성·병합은 전부 가역.
- 전상품 범용(#55): 명화는 검증 1호. 폴더 자동분류·#57도 전상품 영구구조.
- 한글 편집 = 직접 타이핑(유니코드 이스케이프 금지). 한글 대용량 MD(PROGRESS/SESSION_LOG) = Code Python 전체덮어쓰기(#29b).
- 실측 우선(#45): Code 보고는 production/DB/Storage 직접 교차검증.
- 이미지: 누끼=Adobe MCP(복구됨)·새배경=앱 sharp·무드합성=Firefly 웹UI(브라우저 #52). compositing/gen-bg는 Adobe MCP 영구 미지원.
- 도구 분담(#41): Desktop=MCP검증·DB·Storage·브라우저·문서·핸드오프 / Code=파일편집·git·빌드·마이그레이션. 사용자=붙여넣기 중재. git push=동기화.
- 크레덴셜·파일업로드(Firefly)·다운로드·비가역 클릭 = 대표 담당(#52 + 안전 규칙).

## 5. 붙여넣기 -- 다음 채팅 (Desktop, 병합 후 C-6)
```
[꽃틔움 가든 / Desktop / 이어서: 병합 후 C-6 실무 테스트 + 폴더 단계생성 검증 + 명화 합성]
정독: docs/handoff/NEW_CHAT_STARTER_2026-06-09_2_composite_run.md -> PARALLEL_WORK_TRACKER -> TASK_BRIDGE §3 -> ASSET_FOLDER_TAXONOMY_BUILD.
1) 병합 GO 시 production HEAD SHA + READY 교차검증.
2) 스튜디오에서 명화 누끼/합성 실제 적용 1회 -> Supabase storage.objects 조회로 {pid}/cutout/·composite/ 단계폴더 실생성 + 기존 flat URL 유효 확인(FT-검증 마무리).
3) Firefly 무드(트랙2): 누끼 드롭(대표) -> 키트 프롬프트 구동 -> apply-composite 회수.
규칙: 비가역0·한글 직접입력·실측우선·전상품 범용. 앱 작업이라 리서치 도구 미사용.
```

## 6. 터미널 명령 (대표 실행 -- Claude git 불가)
### 병합 (C-1+C-7+C-2+FT production 반영)
```
cd /Users/jyekkot/Desktop/kkotium-garden && git checkout main && git merge feat/composite-pipeline --no-ff -m "merge: C-1 누끼 + C-7 합성 + C-2 어도비누끼적용 + FT 폴더자동분류 (additive·blast 0)" && git push
```
### 문서 push (이번 세션 핸드오프 보존)
```
cd /Users/jyekkot/Desktop/kkotium-garden && git add docs/ && git commit -m "docs(#41): 폴더 자동분류 검증 + Adobe CC 폴더 생성 + 세션2 마감 인계 (71)" && git push
```
> 병합 후 Vercel production 자동 배포 -> Desktop HEAD SHA + READY 교차검증 -> C-6 실무 테스트(단계폴더 실생성 포함).
