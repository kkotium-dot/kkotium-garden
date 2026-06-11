# HANDOFF — 2026-06-10 · 명화 히어로 다운로드 + 저장소 컨벤션 확정

> **세션 환경**: Desktop Claude (Control Chrome / osascript / Adobe / Filesystem / Supabase / Vercel MCP)
> **다음 챗 시작 시 먼저 읽을 것**: 이 파일 → `docs/playbook/IMAGE_SEO_PIPELINE_PLAYBOOK.md` → `docs/plan/PROGRESS.md`

---

## 1. 이번 세션에서 완료한 것 ✅

| # | 작업 | 결과 |
|---|---|---|
| 1 | Firefly 모델 풀목록 확인 + 정책 확정 | **작업별 최선 모델 / 기본 = Gemini 3.1 (Nano Banana 2)**. "Image 5 우선" 폐기 |
| 2 | 명화 상세 히어로 배경 생성 (S2 슬롯) | 수련 연못 임프레셔니즘, 16:9, 4컷 후보 |
| 3 | base64 브리지로 Claude가 후보 직접 검토 | 좌상(wide[0]) = 풀블리드·에어리·온팔레트 → 추천 |
| 4 | 대표 승인 → 다운로드(옵션 A) | blob `452e4ba3`, 2048×1143 풀해상도 |
| 5 | 로컬 정해진 폴더 적재 | `assets/generated/cmpnooli40001f0gveaxr8iim/source/hero__waterlily__2048x1143__gemini-nb2.webp` (426KB, WebP, sips 검증) |
| 6 | **저장소 컨벤션 확정** | 3계층(로컬 스테이징 / Supabase 캐논 / Adobe CC) + 네이밍 규칙 → 플레이북 §2 |
| 7 | **재사용 플레이북 작성** | `docs/playbook/IMAGE_SEO_PIPELINE_PLAYBOOK.md` (187줄, 전상품 범용) |

---

## 2. 저장소 컨벤션 (확정본 — 캐논 요약)

```
로컬 스테이징 (Desktop, dev/핸드오프):  assets/generated/{pid}/{stage}/
캐논 (production 앱이 읽음):            Supabase Storage  product-assets/{pid}/{stage}/
편집 작업장:                           Adobe CC  KKOTIUM_GARDEN/00_inbox
stage = source | cutout | composite | thumb | detail | archive
파일명 = {slot}__{descriptor}__{WxH}__{model}.{ext}
```
- `source` = Firefly 생성 raw(합성 전). **STAGE_FOLDER 상수에 미존재 → Code 추가 필요.**
- ⚠️ **로컬 ≠ production 가시.** 앱 표시는 Supabase Storage 경로를 UI에 노출하는 코드 필요(아래 §4 paste).
- Firefly blob = **WebP**(확장자 .png로 떨어져도 실제 webp; 검증 후 .webp 정정).

---

## 3. 명화 디퓨저 현재 상태 (pid `cmpnooli40001f0gveaxr8iim`)

| 항목 | 상태 |
|---|---|
| naverProductId / 상태 | `13564133057` / **SUSPENSION** |
| 컴플라이언스 | 블로커 0, dryRun GREEN (이전 세션) |
| 상세 히어로 배경 | ✅ 생성·선택·적재(source/) |
| 누끼(cutout) | ⏳ 미진행 — 공급사 실사 디퓨저 히어로컷 필요(#57) |
| 합성(composite) | ⏳ 미진행 — 히어로 배경 + 디퓨저 누끼 (Firefly) |
| 상세 860px(detail) | ⏳ 미진행 |
| 향 4종 연출컷 | ⏳ 미진행 — 4:5, 하루시간 아크 |
| **발행** | ⏳ **대표 GO 대기 (비가역0)** — 이미지 슬롯 채운 후 |

---

## 4. ★ Claude Code 붙여넣기 문구 (즉시 작업) ★

> 아래를 Claude Code에 그대로 붙여넣으세요. (#36: Target Session + Branch 포함)

```
Target Session: storage-visibility
Branch: feat/asset-storage-visibility

[작업 목적]
생성/다운로드된 상품 에셋의 "저장 위치"를 앱에서 상품별·스테이지별로 확인할 수 있게 표시한다.
저장소 컨벤션은 docs/playbook/IMAGE_SEO_PIPELINE_PLAYBOOK.md §2 를 단일 기준으로 따른다.

[전제: 먼저 현재 코드 확인]
- STAGE_FOLDER 상수 정의 위치(FT 자동분류 코드) 확인
- product-assets 버킷 경로 생성 로직(apply-cutout / apply-composite 라우트) 확인
- 상품 상세 패널 컴포넌트(적용현황 지표가 있는 곳) 확인

[구현]
1. STAGE_FOLDER 상수에 `source` 스테이지 추가 (source|cutout|composite|thumb|detail|archive).
   - Supabase Storage 경로: product-assets/{productId}/{stage}/
   - Adobe CC 스테이지 폴더와 1:1 정합 유지.
2. 상품 상세 패널에 "생성 에셋 위치" 섹션 추가:
   - 스테이지별 Supabase Storage 경로 + 해당 스테이지에 존재하는 파일 개수/목록 표시.
   - 파일 없으면 "미적용" 배지, 있으면 경로 + 썸네일(가능 시).
   - Operator Action Queue / 적용현황(속성·대표·상세·발행) 지표와 시각적으로 정합.
3. (선택) 로컬 assets/generated/ 는 .gitignore 처리 여부 결정 — 캐논은 Supabase Storage이므로 로컬 raw는 gitignore 권장. 단 이번 1건(명화 히어로)은 핸드오프 참조용으로 유지 가능.

[검증]
- npm run build 통과 → Vercel 배포 → production에서 상품 상세 패널 저장위치 표시 실측.
- Supabase MCP로 product-assets/{pid}/ 경로 객체 존재 교차검증.

[주의]
- 비가역 금지: 발행/삭제/권한변경 없음. UI 표시·읽기 전용.
- 대용량 한글 MD는 Python 전체덮어쓰기(#29b). 한글 edit_file 후 grep 검증.
- 완료 후 PROGRESS/ROADMAP/PARALLEL_WORK_TRACKER/TASK_BRIDGE 갱신.
```

> **후속 로드맵 (별도 브랜치/세션)**: C-3 finish-image 단일 라우터 → C-5 스튜디오 UI 카드 → C-8 멀티슬롯 추가이미지 매니저 → C-6 브라우저 검증. APP-1 반자동화(슬롯별 Firefly 프롬프트 카드·복사버튼·저장경로; `concept-presets.ts`의 `imageDirections[]` 데이터화).

---

## 5. 대표 늘 강조 작업 유의사항 (항상 명심)

1. **비가역0** — 네이버 PUT/발행·영구삭제·권한변경·결제·다운로드는 **대표 GO/손길**. 멋대로 실행 금지.
2. **정직(#46)** — 못 하는 건 거짓 완료보고 대신 **솔직히 코드/대표에 요청**. 가짜 결과·가짜 라벨 금지.
3. **실측 우선(#45)** — Code 보고만 신뢰 금지. Vercel + Supabase MCP 교차검증. 작업 전 **현재 코드/MD 확인 후 진단**.
4. **전상품 범용(#55)** — 명화는 검증 1호일 뿐. 모든 설계는 시스템 레벨, 컨셉만 상품별 개별 결정.
5. **컨텍스트 분할** — 작업량 나눠 새 챗에서 이어가 **중복작업 방지**. 끊김 대비 핸드오프 필수.
6. **작업 완료 후 브라우저 테스트** — 실앱으로 실무 문제 없는지 확인 후 다음. (단 앱 신기능은 Code 배포 후 검증 — 그 전엔 정직히 대기.)
7. **모든 MD 누락없이 갱신 + doc 폴더 정리.** 핑퐁: Desktop=MCP/검증/문서, Code=코드/git/빌드.
8. **개입점 자연스럽게(#56)** — 결정/입력/인증/GO는 강제 순서 말고 Operator Action Queue로 모아 대표가 편할 때.
9. **최선 모델 작업별 선택** — 기본 Gemini 3.1 NB2. 기본값-lock 금지.
10. **도구 하드룰** — heredoc 금지(iterm), 대용량 한글 MD=Code Python 전체덮어쓰기(#29b), 한글 edit_file 손상 grep검증, SD-01 footer 아랍어 보존.

---

## 6. 다음 챗 체크리스트 — 전체 MD 스윕 (누락방지·중복방지)

> 이번 세션은 **물리작업(다운로드·적재) + 신규 MD 2종(플레이북·핸드오프)** 까지 완료. 아래는 **다음 챗에서** 순서대로(이미 한 것 제외).

| MD | 갱신 내용 | 방법 |
|---|---|---|
| `docs/plan/PROGRESS.md` | 이번 세션(히어로 생성·선택·다운로드·적재 / 컨벤션 / 플레이북) 추가 | 대용량 한글 → **Code Python 전체덮어쓰기(#29b)** |
| `docs/plan/ROADMAP.md` | 저장위치 가시화 코드(feat/asset-storage-visibility), 합성→연출컷→발행 순서 | Code Python |
| `docs/plan/SESSION_LOG.md` | 2026-06-10 세션 로그 | Code Python |
| `docs/plan/PARALLEL_WORK_TRACKER.md` | 신규: 저장소 컨벤션 코드화 / APP-1 / C-3·5·8 / 저장위치 표시 | Code Python |
| `docs/plan/TASK_BRIDGE.md` | Desktop↔Code 핑퐁 현황(이번 paste 반영) | Code Python |
| `CLAUDE.md` | 플레이북·컨벤션 포인터 1줄 추가 | Desktop write_file 또는 Code |
| ✅ `docs/playbook/IMAGE_SEO_PIPELINE_PLAYBOOK.md` | (완료) | — |
| ✅ `docs/handoff/HANDOFF_2026-06-10_*.md` | (완료, 이 파일) | — |

### 다음 챗 작업 분할 제안 (중복방지)
- **CHAT-A (Code)**: §4 paste 실행 = 저장위치 가시화 + source 스테이지 + 빌드/배포/실측.
- **CHAT-B (Code)**: 위 MD 스윕 6종 Python 전체덮어쓰기.
- **CHAT-C (Desktop)**: 명화 누끼(#57) → 합성(Firefly) → composite/ → detail 860px.
- **CHAT-D (Desktop)**: 향 4종 연출컷(4:5, 하루시간 아크) 생성·검토·다운로드.
- **CHAT-E (Desktop+대표)**: 발행 검수 + SUSPENSION 해제 GO(비가역0).

---

## 7. 열린 크롬 탭 (직전 실측, 변동 가능)
- Firefly `1396050211` (S2 작업) / Adobe Express `1396050208` / Claude Design `1396050207` / 도매매 `1396050209` / production `1396050210`
