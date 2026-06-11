# 새 채팅 인계 — 꽃틔움 가든 (2026-06-11 · C-9 DONE 확정)

> 정독: 이 파일 + docs/plan/PARALLEL_WORK_TRACKER.md (rev10·권위) + C9_INTERVENTION_CARDS_BUILD_SPEC.md (참고).
> 작성: Desktop 직접(#49). 상태=실측 교차검증(#45). 앱 작업이라 리서치도구 미사용.

Target Session: image-pipeline (명화) + 다음 빌드청크
Branch: main 단일 (HEAD 6bbc2a4)

## 0. 한 줄
직전 EOD 핸드오프(48e6926 기준)보다 production이 앞섰음. C-9 개입카드는 이미 빌드·배포·라이브검증 완료(6bbc2a4 READY). 로컬=remote=production 완전 동기. 남은 것 = (1) Firefly 트랙2 무드합성(대표 파일드롭) (2) 다음 빌드 C-3 또는 C-5(Code) (3) 잔여 MD 정합(Code Python).

## 1. production 실측 (2026-06-11, Desktop 3중 교차검증)
- HEAD 6bbc2a4 READY = P1 수정(d594d85) + C-9(7ed81a6) 누적 반영.
- 라이브 /assets: 명화 cutout=3·total 13 · 달항아리 9 · 아이스트레이 1 — 3상품 API=Storage 일치(무회귀, 전상품 #55).
- C-9 스키마 검증완: asset_jobs.intervention_type(text)·intervention_payload(jsonb) 둘 다 nullable.
- C-9 헬퍼 실재: src/lib/jobs/intervention.ts. 엔진 분기 firefly_drop=AUTH / hero_crop·source=INPUT_DECISION / 없으면 기존 AUTH 폴백(no regression).

## 2. 즉시 할 일
[A] Firefly 트랙2 (대표 단일 개입 #52) — 드롭킷 ~/Downloads/kkotium_dropkit_myeonghwa_hero/ (01_cutout_B_leather_REAL.png + PROMPT.txt). C-9가 라이브이므로, 명화 composite 잡을 세팅하면 개입대기열에 firefly_drop 카드(드롭킷 경로+프롬프트)가 뜸. 대표가 카드 안내대로 Firefly 드롭+Nano Banana Pro 4:3 생성 → Claude가 후보선택·폴링·composite/ 적재·extra_images 적용·브라우저 실무 테스트.
[B] 다음 빌드 (Code) — C-3(finish-image 통합 라우터) 또는 C-5(스튜디오 마무리 카드). C-9 카드들이 /products/{id}/studio로 deeplink하므로 C-5가 착지점을 실체화(체감가치 큼). 순서는 대표 결정 1건.
[C] 잔여 MD 정합 (Code Python #29b) — PROGRESS·SESSION_LOG에 C-9 DONE 회고 + 트래커 적용현황 production HEAD 982f856 -> 6bbc2a4 갱신. (트래커 C-9 DONE 행은 Desktop이 rev10에 이미 기록)

## 3. 불변 규칙
- 비가역0(#46): 네이버 PUT·발행·삭제·크레덴셜 = 대표 GO 전 금지.
- 실측우선(#45): 화면/요약/핸드오프 불신, Vercel+Supabase+라이브 교차검증.
- 정직(#46): 못하면 솔직히 요청. 가짜완료 금지.
- 전상품범용(#55): 명화=검증1호. C-9 카드 로직 명화 하드코딩 0.
- 도구분담(#41): Desktop=MCP/검증/DB/문서, Code=파일/git/빌드, 대표=드롭·비가역GO.
- 한글MD 손상주의(#29b): 이번 세션 C-9 행에서 edit_file 한글 손상 실발생·복구. 대용량 한글MD = Code Python 전체덮어쓰기.
- 신규 #60(제안): 새 세션 진입 시 Vercel HEAD vs 로컬 HEAD 먼저 대조 — 다르면 편집 전 git pull. (오늘 EOD 핸드오프가 production보다 뒤처진 걸 #45가 잡음)

## 4. 다음 채팅 진입 문구
```
[꽃틔움 가든 / Desktop / 이어서: Firefly 트랙2 + 다음 빌드청크]
정독: docs/handoff/NEW_CHAT_STARTER_2026-06-11_C9DONE.md + docs/plan/PARALLEL_WORK_TRACKER.md (rev10)
상태: C-9 개입카드 DONE·라이브. production HEAD 6bbc2a4. 명화 cutout=3.
1) Firefly 트랙2: 명화 composite 잡 세팅 -> firefly_drop 카드 -> 대표 드롭+Nano Banana Pro 4:3 -> Claude 후보선택/폴링/적재/extra_images.
2) 다음 빌드 = C-3 or C-5 (대표 순서결정) -> Code paste.
규칙: 비가역0·실측우선·정직·전상품범용·앱작업이라 리서치도구 미사용.
```
