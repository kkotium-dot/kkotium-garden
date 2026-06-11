# 새 채팅 인계 — 꽃틔움 가든 (2026-06-11 EOD 마감)

> 이 파일 + `HANDOFF_2026-06-10_PRODUCT-IDENTITY-RECOVERY.md`(권위본) 정독으로 끊김 없이 이어갈 것.
> 작성: Desktop 직접(#49). 모든 상태는 실측 교차검증(#45) 기반. 앱 작업이라 리서치도구 미사용.

Target Session: image-pipeline (명화) + 다음 빌드청크
Branch: main 단일

---

## 0. 한 줄 요약
**P1 버그(/assets cutout=0)는 배포·라이브 검증 완결.** Desktop이 독립적으로 3중 교차검증 + 전상품 범용성(#55)까지 재검증 통과. production `48e6926` READY. 남은 것 = ①Firefly 트랙2 무드합성(대표 파일드롭 단일개입) ②다음 빌드청크(C-9 권고 / C-3) ③MD 전파(Code).

## 1. production 실측 상태 (2026-06-11 EOD, Desktop 독립 검증)

| 검증 축 | 결과 | 판정 |
|---|---|---|
| production HEAD | `48e6926` READY (P1 수정 `d594d85` 포함, target=production) | ✅ |
| 라이브 `/assets`(명화) | `cutout=3`·root=10·total=13 | ✅ |
| Supabase Storage 원본(명화) | `cutout/` 3건·865KB + root 10건 | ✅ |
| **전상품 범용(#55)** | 달항아리 API=9/Storage=9 · 아이스트레이 API=1/Storage=1 · 명화 13/13 — **3상품 API=Storage 완벽일치, 무회귀** | ✅ |

→ **P1 종결.** Code 보고(d594d85/48e6926, cutout=3)가 Desktop 실측과 100% 부합. 거짓완료 0.

## 2. 즉시 할 일 (순서)

### [A] Firefly 트랙2 무드합성 — 대표 파일드롭 단일개입(#52)
- 드롭킷 `~/Downloads/kkotium_dropkit_myeonghwa_hero/` 무결 확인됨: `01_cutout_B_leather_REAL.png`(메인) + `PROMPT.txt`(트랙2 영문 준비완).
- **대표 액션**: Firefly(`/generate/image`) 탭 오픈 → `01_cutout_B_leather_REAL.png` 드롭 → PROMPT.txt 트랙2(감성·차량무드) 붙여넣기 → **Nano Banana Pro · 4:3** → 생성 클릭.
- **이후 Claude(Desktop)**: 후보선택·폴링·다운로드 → `assets/generated/{pid}/composite/` 적재 → Supabase `{pid}/composite/` 영구화(Code 경로전달) → `apply-composite`(recovery 모드)로 extra_images 적용 → 브라우저 실무 테스트.

### [B] Chrome 자산카드 시각 실측 — 대표 로그인 탭 필요
- 현재 대표 Chrome에 열린 탭 0 + 앱은 인증필요 → Claude가 크레덴셜 입력 불가(금지행위·정직 #46).
- 단 카드 데이터소스(`/assets` API)는 이미 3중검증 → 카드 정확성은 데이터레이어에서 확정. 시각확인은 폴리시(블로커 아님).
- **대표 액션(선택)**: 로그인된 `/products/cmpnooli40001f0gveaxr8iim` 탭 열어두면 Desktop이 "생성 에셋 위치" 카드 cutout 3컷 썸네일 실측.

### [C] 다음 빌드청크 — Code (★대표 순서 결정 1건, §4 참고)
- 기존 고정순서: C-3 finish-image 라우터 → C-9 개입카드.
- **Desktop 제안: C-9를 C-3보다 먼저.** 근거 = 현재 모든 가시검증 병목(Firefly 드롭·스튜디오 적용·로그인 실측)이 전부 "대표 개입점"인데, C-9가 바로 그것을 앱 내 자연카드로 흡수(#56). C-3은 내부 배관이라 대표 병목을 못 풀어줌.

## 3. 정직 — 현재 막힌 지점(대표 개입 필요)
1. **Firefly 합성**: 대표 파일드롭+생성클릭(#52). 그 후 전부 Desktop 자동.
2. **스튜디오 적용 1회(FT 단계폴더 실생성 검증·C-6)**: Claude service key 미보유 → 대표 스튜디오 실행 or 브라우저 구동.
3. **자산카드 시각 실측**: 로그인된 탭(대표).
- 위 3건 외 모든 검증·DB·Storage조회·문서는 Desktop 자동 완결됨.

## 4. C-9 우선 제안 근거 (대표 결정용)
- C-9 = 개입카드 3종(source_request / hero_crop_request / firefly_drop) + Operator Action Queue 노출.
- `firefly_drop` 카드 = 지금 [A]의 out-of-band 핸드오프를 **앱 내 자연카드**로 전환 → 대표가 핸드오프 문서 안 읽고도 앱에서 드롭 안내 받음.
- 스키마: `asset_jobs`에 `intervention_type text` + `intervention_payload jsonb` additive(가역).
- C-3은 그 다음. C-9 먼저면 [A]·[2]·[3] 병목이 구조적으로 해소.

## 5. 불변 규칙 (상시)
- 비가역0(#46): 네이버 PUT/발행·Supabase 삭제·Adobe 폴더삭제·크레덴셜입력 = 대표 GO 전 금지.
- 실측우선(#45): 화면/요약/파일명 불신, 육안+DB+production 교차검증.
- 정직(#46): 못하면 솔직히 요청. 가짜완료 금지.
- 전상품범용(#55): 명화=검증1호. #57/#58/#59 영구구조.
- 도구분담(#41): Desktop=MCP/검증/DB/Storage/이미지/문서, Code=파일/git/빌드, 대표=중재·드롭·비가역GO.
- 한글 손상주의: 대용량 한글MD=Code Python 전체덮어쓰기(#29b). Filesystem edit_file 후 grep.

## 6. 다음 채팅 진입 문구 (분할 — 컨텍스트 안전)
```
[꽃틔움 가든 / Desktop / 이어서: Firefly 트랙2 무드합성 + 다음 빌드청크]
정독(필수): docs/handoff/NEW_CHAT_STARTER_2026-06-11_EOD.md + HANDOFF_2026-06-10_PRODUCT-IDENTITY-RECOVERY.md
상태: P1 버그 배포·3중+전상품 검증 완결. production 48e6926 READY. cutout=3 라이브.
1) Firefly 트랙2: 대표 B누끼 드롭+PROMPT 트랙2+Nano Banana Pro 4:3 생성 → Claude 후보선택/폴링/composite 적재/extra_images.
2) (대표 순서결정) 다음 빌드 = C-9 개입카드(권고) 또는 C-3 finish-image 라우터 → Code paste.
규칙: 비가역0·실측우선·정직·전상품범용·앱작업이라 리서치도구 미사용.
```
