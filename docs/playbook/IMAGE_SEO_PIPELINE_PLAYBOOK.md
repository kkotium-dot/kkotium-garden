# 꽃틔움 가든 — 이미지·SEO 통합 파이프라인 플레이북 (전상품 범용)

> **목적**: 상품 1개를 등록할 때마다 "이미지 생성 → 누끼 → 합성 → 상세 → 검수 → 발행" 전 과정을 **상품 특성에 맞게 적응적으로** 적용하기 위한 단일 작업 기준서.
> **원칙**: 전상품 범용(#55). 명화 디퓨저는 검증 1호일 뿐, 특수 경로가 아니다. 모든 단계는 시스템 레벨로 설계하고, 상품별 컨셉만 개별 결정한다.
> **최종 수정**: 2026-06-10 (Desktop 세션 — 히어로 다운로드/적재 + 저장소 컨벤션 확정 시점)

---

## 0. 환경 분리 (핑퐁) — 어느 환경이 무엇을 하는가

| 환경 | 역할 | 이 플레이북에서의 담당 |
|---|---|---|
| **Desktop Claude** (MCP) | 브라우저 조종·검증·DB·문서·이미지 조율 | Firefly 생성 조종, base64 검토, 다운로드 트리거, 로컬 적재, 누끼(Adobe MCP), MD 작성 |
| **Claude Code** (CLI) | 파일 편집·git·빌드·마이그레이션 | Storage 업로드 라우트, 앱 UI(저장위치 표시), finish-image 라우터, 스튜디오 카드 |
| **대표(운영자)** | 비가역 GO·붙여넣기 중재·손길 | 다운로드 승인, 발행 GO, Save As 대화상자 처리, Firefly 파일드롭(필요 시) |

> **정직 가드(#46)**: Desktop이 **할 수 없는 것**(예: Supabase Storage 객체 업로드, 앱 UI 변경)은 거짓 완료 보고 금지. 솔직히 코드/대표에게 요청한다.

---

## 신규상품 합성 체크리스트 (전상품 표준 — 권위 docs/design/ADAPTIVE_COMPOSITE_ENGINE.md)

> 상품 1개 등록 시 합성 표준 7단계. 권위 = ADAPTIVE_COMPOSITE_ENGINE.md(6원칙·상품현실시트·명화 정정 2무드). 작업원칙 #61.

- [ ] 1. **상품현실시트** 작성 — 실측 비율·용량·형태·소재·라벨/핵심셀링(과대 차단 앵커).
- [ ] 2. **누끼 소스** = 공급사 실촬영 단품 히어로컷(완전포함) → image_remove_background → 투명 PNG. 실비율 일치 확인(#57·누끼진실성).
- [ ] 3. **대표 마무리** = finish-image(C-3) bg-difficulty → SIMPLE 인앱 white-bg / COMPLEX Adobe cutout → 흰배경 §9(1:1 1000·본품 70~85%·텍스트0).
- [ ] 4. **무드 설계** = ≥2(사용맥락 + 스튜디오 정물). 상품현실시트 비율 앵커·카테고리 톤.
- [ ] 5. **합성 생성** = Firefly Nano Banana Pro 3-plane(레퍼런스=누끼·과대금지). harmonize/접지/normalize는 코드(sharp).
- [ ] 6. **적재·적용** = composite/ → apply-composite(C-7) → extra_images(가역) + seo-guard 재검 + 개입대기열(C-9).
- [ ] 7. **검수·발행** = 브라우저 실측(C-6) → 대표 GO → 네이버 발행(비가역 #46).

---

## 1. 적응형 전략 엔진 — 상품별 컨셉을 어떻게 결정하는가

> "고정 템플릿 일반화 금지." 각 상품의 컨셉 조합은 **개별 결정**한다. 아래는 *결정 프레임*이지 정답표가 아니다.

### 1-1. 컨셉 결정 5단계
1. **본질 추출** — 이 제품의 핵심 가치/사용 맥락은? (예: 명화 디퓨저 = "예술적·차분한 홈 프래그런스")
2. **무드/팔레트 정의** — 본질에서 1개 무드, 2~3색 팔레트 도출 (예: 웜크림 + 세이지, 임프레셔니즘)
3. **슬롯 구성 설계** — 대표/연출/상세에 각각 어떤 컷이 필요한가 (아래 1-2)
4. **SEO 매핑** — 무드/본질 → 상품명(키워드 배치)·태그·카테고리 정합 (아래 1-3)
5. **개입점 표시(#56)** — 대표 결정/입력/GO가 필요한 지점을 흐름에 자연스럽게 노출

### 1-2. 슬롯 구성 (상품마다 가감)
| 슬롯 | 역할 | 비율 권장 | 비고 |
|---|---|---|---|
| 대표(정보형) | 깨끗한 정보 베이스 (흰배경/단순) | 1:1 | 검색 노출·정보 전달 |
| 대표(전환형) | 라이프스타일/무드 전환 드라이버 | 1:1 또는 4:5 | 클릭·전환 견인 |
| 연출컷 | 사용 맥락/옵션별 분위기 | 4:5 | 옵션·시간 아크 등 서사 가능 |
| 상세 히어로 | 상세페이지 상단 풀블리드 배경 | 16:9 → 크롭 | 합성 배경으로 활용 |
| 정보고시/스펙 | 규격·인증·성분 | 자유 | 컴플라이언스 |

### 1-3. SEO 전략 (네이버 쇼핑 알고리즘 정합)
- **상품명**: 핵심키워드 앞배치 + 속성어 + 브랜드. 중복·금칙어 회피. 길이 규정 준수.
- **태그**: 검색 수요 기반(데이터랩/검색광고) 10개 내외, 상품명과 비중복 보완.
- **카테고리**: 정확 매칭(오분류 시 노출 페널티).
- **이미지 SEO**: 대표이미지 = 흰배경 단순(정보형)이 검색 친화. 전환형은 별도 슬롯.
> 적응 규칙: 신상품/저경쟁 키워드는 **롱테일 선점**, 경쟁 키워드는 **세부 속성 차별화**로 우회.

---

## 2. 저장소 컨벤션 (정해진 폴더) — ★ 핵심 ★

> "만들어진 파일이 어디에 저장되는지"를 **① 폴더 규칙으로 고정 ② 앱 UI에 표시(코드) ③ 이 MD에 박제**.

### 2-1. 3계층 저장소
| 계층 | 위치 | 용도 | 누가 쓰나 | 앱 가시 |
|---|---|---|---|---|
| **로컬 스테이징** | `assets/generated/{pid}/{stage}/` | dev/핸드오프 raw·중간물 | Desktop (다운로드 후 적재) | ✗ (개발용) |
| **캐논(앱 표준)** | Supabase Storage `product-assets/{pid}/{stage}/` | production 앱이 읽는 표준 저장소 | 앱 업로드 라우트 (Code) | ✓ |
| **편집 작업장** | Adobe CC `KKOTIUM_GARDEN/00_inbox` | Adobe MCP 업로드 고정 목적지 | Adobe MCP | — |

- `{pid}` = 내부 product id (예: `cmpnooli40001f0gveaxr8iim`)
- `{stage}` ∈ `source` | `cutout` | `composite` | `thumb` | `detail` | `archive`
  - **source** = Firefly 생성 raw(합성 전 배경/소재) ← *신규 스테이지. STAGE_FOLDER 상수에 추가 필요(Code)*
  - cutout = 누끼 결과 / composite = 합성 결과 / thumb = 썸네일 / detail = 상세 860px / archive = 백업·폐기 후보

### 2-2. 파일 네이밍 규칙
```
{slot}__{descriptor}__{WxH}__{model}.{ext}
예) hero__waterlily__2048x1143__gemini-nb2.webp
    cutout__diffuser-front__1080x1440__adobe.png
    composite__hero+diffuser__2048x1143__firefly.webp
```
- 더블언더스코어(`__`)로 필드 구분 → 파싱·정렬 용이.
- stage는 폴더로 표현하므로 파일명에 중복하지 않음.

### 2-3. 포맷 메모
- Firefly 다운로드 blob = **WebP**(확장자 .png로 떨어져도 실제는 webp; `file`/`sips`로 검증 후 .webp 정정).
- 누끼·합성 입력은 webp/png OK. **네이버 최종 발행본만 JPG/PNG로 export**.

### 2-4. 앱 가시화 (코드 의존 — 정직)
- production 앱은 로컬 폴더를 못 본다. **앱에서 저장위치를 표시하려면** Supabase Storage 경로를 DB/UI에 노출하는 코드가 필요 → §Claude Code 작업으로 분리.
- 목표 UX: 상품 상세 패널에 *"생성 에셋 위치"* 표시(상품별·스테이지별), Operator Action Queue(#56)·적용현황 지표(속성/대표/상세/발행)와 정합.

---

## 3. 표준 작업 흐름 (단계 · 도구 · 환경 · 개입점 · 산출 폴더)

| # | 단계 | 도구/환경 | 개입점(대표) | 산출 → 폴더 |
|---|---|---|---|---|
| S1 | 소싱(상세 원본 확보) | 도매매 우선/도매꾹 fallback (브라우저·API) | — | 원본 참조 |
| S2 | 모델·비율 셋업 | Firefly web (Gemini 3.1 NB2 기본) | — | — |
| S3 | 슬롯별 프롬프트 생성 | Firefly "생성" | — | blob(페이지 내) |
| S4 | **결과 검토** | base64 브리지(§5)로 Claude가 직접 봄 | — | 몽타주 .jpg(검토용) |
| S5 | **후보 선택** | Claude 디렉터 평가 → 대표 확정 | ✅ **선택** | — |
| S6 | **다운로드** | Control Chrome `<a download>` → ~/Downloads | ✅ **명시 GO / Save As 처리** | — |
| S7 | 로컬 적재 | osascript `mv` → `assets/generated/{pid}/source/` | — | **source/** |
| S8 | 누끼(#57) | Adobe MCP `image_remove_background` | — | **cutout/** |
| S9 | 합성 | Firefly web (Gemini 3.1, 파일드롭) | (필요 시 파일드롭) | **composite/** |
| S10 | 상세 조립 860px | 이미지 도구 | — | **detail/** |
| S11 | 검수 | dryRun + 컴플라이언스 + 실측(#45) | — | — |
| S12 | **발행** | 네이버 Commerce API PUT/POST | ✅ **GO (비가역0)** | — |

> **개입점 철학(#56)**: 결정/입력/인증/비가역 GO는 강제 순서가 아니라 **Operator Action Queue**에 자연스럽게 떠야 한다. 흐름 중간에 막지 말고, 큐로 모아 대표가 편할 때 처리.

---

## 4. Firefly 브라우저 조종 레시피 (재사용)

- 탭: `/generate/images?view=generate` (SPA = Spectrum Web Components).
- 일반 셀렉터 안 잡힘 → **shadow DOM 재귀 `deepAll(sel, root, out)`** 로 textarea / `sp-menu-item` / button 접근.
- `execute_javascript`는 **동기 반환만 신뢰**(Promise await 불가; 필요 시 `window.__x` 저장 후 후속 콜에서 동기 읽기. 단 이미 로드된 img의 `drawImage`+`toDataURL`은 동기 가능).
- **모델 선택**: 모델버튼 클릭 → 메뉴 → `sp-menu-item` 텍스트 매칭 클릭(이미 선택 항목 재클릭 = idempotent). 비율 동일. **비율은 모델 전환 시 리셋될 수 있어 슬롯 전환 때 재확인**.
- **폴링**: 생성버튼 라벨이 "생성"으로 복귀 = 완료. blob img `naturalWidth/ar`로 결과 판별(≈1.78=16:9, 1.25=4:5).
- **다운로드**: wide 후보 배열에서 인덱스 선택 → `<a download>` blob href 클릭. **몽타주 배치 순서 = wide[0]=좌상, [1]=우상, [2]=좌하, [3]=우하** (cols=2 기준).

---

## 5. base64 이미지 검토 브리지 — Claude가 브라우저 결과를 직접 본다

> Control Chrome엔 스크린샷 도구가 없고 blob은 외부 fetch 불가. 그러나 **같은 출처 blob → canvas → base64 → Claude FS → view** 경로로 우회한다.

1. 페이지 내 blob `<img>` → `canvas.drawImage` → `canvas.toDataURL('image/jpeg', q)` (같은 출처라 taint 없음). **검토용은 다운스케일·저품질**(전송손실↓).
2. base64 문자열을 `create_file`로 `/home/claude/*.txt` 저장.
3. `bash_tool` python `base64.b64decode` → `.jpg` (SOI `ffd8`/EOI `ffd9` 검증).
4. `view`로 확인. **`view`는 `description` 파라미터 필수**(누락 시 에러).
- 정직 한계: 다운스케일이라 **톤·구도만 판단, 픽셀 선명도는 화면 풀해상도가 진실**.
- **풀해상도를 사용자 폴더로**: Filesystem write_file는 텍스트만(바이너리 디코드 불가), claude→user 복사 도구 없음 → **유일 신뢰 경로 = 브라우저 다운로드 + osascript `mv`**.

---

## 6. 모델 선택 정책

- Firefly generate UI엔 파트너 모델 다수(Adobe Firefly 5/4/3, Google Gemini 3.1·3·2.5(Nano Banana 2/Pro/NB), OpenAI GPT Image 2/1.5/1, FLUX 2/1.1/Kontext, Imagen 4/3, Runway Gen-4). **크레딧 무관**.
- **정책: 작업별 최선 모델 선택.** 기본 = **Gemini 3.1 (Nano Banana 2)** — 최신 세대, 프롬프트 충실도+편집/합성 최강, 생성+편집 한 계열 통일로 톤 일관.
- ❌ "Image 5 우선" 기본값-lock 폐기. ⚠️ Gemini 계열은 Adobe IP 면책 없음 — 품질 우선 트레이드오프로 채택(상업 사용 시 자체 검토).

---

## 7. 누끼·합성 규칙 (#57)

- **누끼 소스 = 공급사 상세페이지의 실사 단일제품 히어로컷만.** 풀 서브젝트 포함 필수. 합성은 3D 질감 보존.
- Adobe MCP `image_remove_background` = **누끼 전용**(합성/생성/프롬프트 배경교체 불가). 실사 단일제품 ≥838×1154에 신뢰. 소형 카드컷/그래픽 실패.
- OCR 블록 가드: 글자 박힌 소스 컷 금지.
- **합성(무드 배경 + 제품 누끼) = Firefly web(Gemini 3.1)** — 파일드롭 후 생성. Claude는 후보 선택·폴링 담당.

---

## 8. 비가역0 / 정직 / 실측 가드

- **비가역0**: 네이버 PUT/발행·영구삭제·권한변경·결제·다운로드는 **대표 GO/손길**.
- **실측 우선(#45)**: Code 세션 보고만 신뢰 금지. Vercel + Supabase MCP로 교차검증. 화면/낡은 에러는 코드+MD 증거와 페어링.
- **정직(#46)**: 가짜 결과·가짜 완료보고 금지. 못하면 솔직히 코드/대표에 요청.
- **컨텍스트 분할**: 작업량을 나눠 새 챗에서 이어가 중복작업 방지. 세션 종료 시 핸드오프 + MD 갱신.

---

## 9. 도구 제약 실측표 (할 수 있는 것 / 없는 것)

| 작업 | Desktop MCP로 가능? | 비고 |
|---|---|---|
| Firefly 생성·조종 | ✅ | Control Chrome + shadow DOM |
| 브라우저 결과 보기 | ✅ | base64 브리지(§5) |
| 파일 다운로드 | △ | `<a download>`→~/Downloads. Save As 뜨면 대표 손길 |
| 로컬 폴더 적재 | ✅ | osascript `mv` / Filesystem(허용 경로) |
| 누끼 | ✅ | Adobe MCP(실사 히어로컷) |
| 합성/생성형 배경 | ✅(Firefly) ❌(Adobe MCP) | 합성은 Firefly web |
| **Supabase Storage 객체 업로드** | ❌ | MCP에 업로드 도구 없음 → **앱 라우트(Code)** |
| 앱 UI 변경 | ❌ | **Code** |
| DB 조회/마이그레이션 | ✅ | Supabase MCP |
| 모바일 뷰포트 검증 | ❌ | `resize_window` 비신뢰 |

---

## 10. 상품 1개 등록 체크리스트 (복붙용)

- [ ] 컨셉 결정(본질→무드→슬롯→SEO) — §1
- [ ] 모델/비율 셋업(Gemini 3.1 NB2) — §6
- [ ] 슬롯별 프롬프트 생성 — §3 S3
- [ ] base64로 후보 검토 → 대표 선택 — §5, S5
- [ ] 다운로드(대표 GO) → `source/` 적재 — S6~S7
- [ ] 누끼(#57) → `cutout/` — S8
- [ ] 합성(Firefly) → `composite/` — S9
- [ ] 상세 860px → `detail/` — S10
- [ ] 검수(dryRun+컴플라이언스+실측) — S11
- [ ] **발행 GO(비가역0)** — S12
- [ ] Supabase Storage 업로드 + 앱 가시화 확인(Code 배포 후) — §2-4
- [ ] MD 갱신 + 핸드오프 — §8
