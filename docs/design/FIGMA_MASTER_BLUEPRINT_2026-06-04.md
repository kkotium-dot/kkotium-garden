# 꽃틔움 KKOTIUM — Figma 마스터 템플릿 + 토큰 동기화 설계도 (FIGMA_MASTER_BLUEPRINT)

> 저장: 2026-06-04 (Desktop turn) | 권위 문서: S4 양산 2단계(Figma 마스터) 빌드 명세
> 짝 문서: CONCEPT_PRESET_SYSTEM.md(컨셉 엔진) · concept-presets.ts(코드 단일 소스) · section-variants.ts(7섹션 구조) · globals.css(런타임 토큰)
> production baseline: 7a640b6 (Vercel READY 실측)
> Figma 마스터 파일: https://www.figma.com/design/8yuNcO8J9Pitt7glfr49Uw (꽃틔움 KKOTIUM — Concept Preset Master)
> 목적: "코드와 디자인이 같은 토큰을 공유하는 단일 소스(single source of truth)" 확립.
> ★ STEP 1 빌드 완료 상태 (2026-06-04): Variables 69개 생성. 아래 §2-실측 반영.

---

## 0. 한 문장 요약
**코드의 `[data-preset]` 토큰 = Figma Variables.** 둘이 같은 이름·같은 값·같은 5프리셋을 공유해, 코드를 고치면 디자인이, 디자인을 고치면 코드가 따라오는 단일 소스 체계.

핵심 인사이트: 코드의 `<article data-preset="aroma">` 컨셉 전환이 Figma 변수 그룹(`preset/aroma/*`)과 1:1 대응한다. 이 대응이 동기화의 열쇠다.

---

## 1. 영구 디자인 원칙 (반드시 준수 — 일반화 금지)

| 원칙 | 적용 |
|---|---|
| **하이브리드(영구)** | 상품 디자인은 한 방향 금지. 여러 컨셉을 어우러지게 해 감도 제고. **상품별 컨셉 조합은 매번 다르게 잡는다.** |
| **A+C 일반화 금지** | "모네 배경(A) + 정물 오브제(C)" 3겹 레이어는 **명화 디퓨저 한 상품 전용 시안 기록**일 뿐. 전체 상세페이지 고정 템플릿으로 일반화하지 말 것. |
| **마스터 = 가변 구조** | 마스터는 "컨셉 조합을 상품마다 바꿀 수 있는" 구조여야 함. 특정 조합(A+C) 하드코딩 금지. → 변수 그룹 전환으로 해결. |
| **Figma 우선** | Figma 마스터 = 양산 기본. Canva = 시즌 이벤트·단발성 배너 보조. |
| **고정 코어 불변** | 브랜드 레드 #E62310 / 핑크 #FFCCEA / Pretendard 본문 / 꼬띠 마스코트는 전 프리셋 고정. |
| **SD-01** | Arabic footer 영구 보존 (전 작업 미접촉). |
| **SEO 직교** | 상품명 50자·대표이미지 1:1 화이트배경·카테고리 정확도는 프리셋 무관(globals.css `--color-*`와 `--preset-*` 격리와 동형). |

---

## 2. Figma Variables 3-Collection 구조 (실측 — STEP 1 빌드 완료)

코드의 3계층 토큰(primitive → semantic → component)을 Figma Collection으로 직역.

### ★ starter 플랜 모드 제약 보정 (중요)
Figma **starter 플랜은 컬렉션당 모드 1개**로 제한된다(Professional 4 / Org 40+). 원안의 "프리셋 = 모드 5개" 방식은 starter에서 막힌다.
**보정안(실제 빌드 채택)**: 프리셋을 **모드가 아니라 변수 이름 그룹**으로 표현. `preset/aroma/surface`, `preset/gift/surface` … 단일 모드 안에서 프리셋별 변수를 그룹화.
- 코드 정합: `[data-preset="aroma"]` 블록 ↔ `preset/aroma/*` 그룹 = 1:1 동일. 단일 소스 추적 유지.
- 무손실 이전: 유료 전환 시 `preset/{name}/*` 그룹을 모드 5개 방식으로 재구성 가능(코드 신택스 보존됨).

### Collection 1: `Brand Core` (고정 — 1 mode "default") — 3 vars
| Variable | Type | 값 | scope | WEB code syntax |
|---|---|---|---|---|
| `brand/signature-red` | COLOR | `#E62310` | ALL_FILLS, STROKE_COLOR | `var(--kk-red)` |
| `brand/signature-pink` | COLOR | `#FFCCEA` | ALL_FILLS, STROKE_COLOR | `var(--gp-pink-200)` |
| `brand/font-body` | STRING | `Pretendard` | FONT_FAMILY | `Pretendard` |

### Collection 2: `Concept Preset` (1 mode "value") — 60 vars (5프리셋 × 12)
색상 25개 (`preset/{preset}/{token}`, globals.css `[data-preset]` --preset-* 와 1:1):

| token | WEB syntax | aroma | gift | tradition | kitchen | pet |
|---|---|---|---|---|---|---|
| `surface` | `var(--preset-surface)` | `#F3EFE7` | `#FDF4EC` | `#F4ECE0` | `#FFFFFF` | `#FBF3EC` |
| `surface-subtle` | `var(--preset-surface-subtle)` | `#FAF7F0` | `#FFFAF4` | `#FBF6EE` | `#F2F7FB` | `#FFF8F3` |
| `accent` | `var(--preset-accent)` | `#76864C` | `#C9912F` | `#9B2D30` | `#2F6FB0` | `#E08A4B` |
| `text` | `var(--preset-text)` | `#3A352E` | `#3B3127` | `#1C1C1C` | `#1A1A1A` | `#2C2620` |
| `text-muted` | `var(--preset-text-muted)` | `#7A7468` | `#86796A` | `#6F645A` | `#5C6770` | `#7E7468` |

> scope: surface/surface-subtle/accent = ALL_FILLS+STROKE_COLOR / text·text-muted = TEXT_FILL.

비-색상 35개 (`preset/{preset}/{element}`, concept-presets.ts ConceptPresetDefinition 미러):

| element | type | WEB syntax | aroma | gift | tradition | kitchen | pet |
|---|---|---|---|---|---|---|---|
| `heading-font` | STRING(FONT_FAMILY) | `--preset-heading-font` | `Noto Serif KR` | `Noto Serif KR` | `Noto Serif KR` | `Pretendard` | `Pretendard` |
| `font-pairing` | STRING | `fontPairing` | `serif-display` | `serif-display` | `serif-display` | `sans` | `sans` |
| `density` | STRING | `density` | `airy` | `airy` | `airy` | `compact` | `cozy` |
| `image-style` | STRING | `imageStyle` | `styled-mood` | `unboxing` | `hanji-texture` | `clean-cutout` | `lifestyle` |
| `copy-tone` | STRING | `copyTone` | `narrative` | `warm` | `heritage` | `functional` | `friendly` |
| `default-intensity` | STRING | `defaultIntensity` | `l3` | `l3` | `l3` | `l1` | `l2` |
| `layout-variation` | BOOLEAN | `layoutVariation` | `true` | `true` | `true` | `false` | `false` |

### Collection 3: `Intensity` (1 mode "value") — 6 vars
여백 밀도. section-variants.ts `detailRootVariants` + `detailSectionVariants` 직역.

| Variable | type | WEB syntax | l1 | l2 | l3 |
|---|---|---|---|---|---|
| `intensity/{lv}/root-gap` | FLOAT(GAP) | `space-y ({lv})` | `24` | `40` | `64` |
| `intensity/{lv}/section-pad-y` | FLOAT(GAP) | `section py ({lv})` | `24` | `40` | `56` |

> 단위 px. globals.css `--space-*` 8px 리듬과 정합.

**빌드 합계: 3 + 60 + 6 = 69개 변수 (STEP 1 완료).**

---

## 3. 7섹션 마스터 컴포넌트 (STEP 2 — 다음 turn)

순서 불변(전환율 검증 시퀀스, DETAIL_PAGE_PLAYBOOK §2): `hook → value → spec → usage → trust → cta → notice`

각 섹션 = Figma 컴포넌트. 색상은 `Concept Preset` 변수 참조, 여백은 `Intensity` 변수 참조.

### emphasis 변형 로직 (section-variants.ts `emphasisFor`)
| 조건 | hook | value | trust | 나머지(spec/usage/cta/notice) |
|---|---|---|---|---|
| `l3` + layoutVariation=true (aroma/gift/tradition) | **hero** | **card** | **card** | flat |
| `l2` (pet) | flat | **card** | **card** | flat |
| `l1` (kitchen) | flat | flat | flat | flat |

- `hero`: `rounded-3xl bg-[surface-subtle] text-center`
- `card`: `rounded-2xl bg-[surface-subtle]`
- `flat`: 배경 없음

→ Figma 컴포넌트 속성(Component Properties)으로 `emphasis = flat|card|hero` variant 노출.

### 마스터 프레임 루트
- `detailRootVariants`: `max-w-[860px]` → Figma 프레임 width **860px** 고정 (무드는 가로 860px 안에서만).
- 섹션 padding-y = `intensity/{lv}/section-pad-y` 바인딩, 루트 gap = `intensity/{lv}/root-gap`.
- 프리셋 전환 = 섹션 fill/accent를 `preset/{선택프리셋}/*` 변수로 교체(또는 유료 전환 후 모드 스위치).

---

## 4. 커스터마이징 슬롯 (CONCEPT_PRESET_SYSTEM §5 — 천편일률 방지)
프리셋당 자유 변수 2~3개만 허용. Figma에선 컴포넌트 인스턴스 오버라이드로 노출.
- 허용: accent 색 1개 오버라이드 / 히어로 카피 자유입력 / 대표 무드이미지 교체
- 잠금: 로고, 시그니처색, 가격·CTA 블록, SEO 필드 (= 메인 컴포넌트에서 lock)
- 코드 대응: Product.preset_overrides (jsonb) `{accent, hero_copy}`

---

## 5. STEP 1 빌드 실제 코드 (use_figma — 실행 완료본)

> 실행 환경: figma-use 스킬 선로딩 + fileKey 8yuNcO8J9Pitt7glfr49Uw.
> COLOR 변수 값은 {r,g,b,a} 0~1 범위. STRING/BOOLEAN은 FONT_FAMILY 외 scope 미설정(빈 배열 거부됨).

### Collection 1 — Brand Core
```js
const HEXA = (h) => { const n=h.replace('#',''); return { r:parseInt(n.slice(0,2),16)/255, g:parseInt(n.slice(2,4),16)/255, b:parseInt(n.slice(4,6),16)/255, a:1 }; };
const core = figma.variables.createVariableCollection('Brand Core');
const m = core.modes[0].modeId; core.renameMode(m, 'default');
const red = figma.variables.createVariable('brand/signature-red', core, 'COLOR');
red.setValueForMode(m, HEXA('#E62310')); red.scopes=['ALL_FILLS','STROKE_COLOR']; red.setVariableCodeSyntax('WEB','var(--kk-red)');
const pink = figma.variables.createVariable('brand/signature-pink', core, 'COLOR');
pink.setValueForMode(m, HEXA('#FFCCEA')); pink.scopes=['ALL_FILLS','STROKE_COLOR']; pink.setVariableCodeSyntax('WEB','var(--gp-pink-200)');
const fontBody = figma.variables.createVariable('brand/font-body', core, 'STRING');
fontBody.setValueForMode(m, 'Pretendard'); fontBody.scopes=['FONT_FAMILY']; fontBody.setVariableCodeSyntax('WEB','Pretendard');
```

### Collection 2 — Concept Preset (색상 25)
```js
const col = figma.variables.createVariableCollection('Concept Preset');
const m = col.modes[0].modeId; col.renameMode(m, 'value');
const PRESETS = ['aroma','gift','tradition','kitchen','pet'];
const PALETTE = {
  'surface':        { aroma:'#F3EFE7', gift:'#FDF4EC', tradition:'#F4ECE0', kitchen:'#FFFFFF', pet:'#FBF3EC' },
  'surface-subtle': { aroma:'#FAF7F0', gift:'#FFFAF4', tradition:'#FBF6EE', kitchen:'#F2F7FB', pet:'#FFF8F3' },
  'accent':         { aroma:'#76864C', gift:'#C9912F', tradition:'#9B2D30', kitchen:'#2F6FB0', pet:'#E08A4B' },
  'text':           { aroma:'#3A352E', gift:'#3B3127', tradition:'#1C1C1C', kitchen:'#1A1A1A', pet:'#2C2620' },
  'text-muted':     { aroma:'#7A7468', gift:'#86796A', tradition:'#6F645A', kitchen:'#5C6770', pet:'#7E7468' },
};
const cssVar = { 'surface':'--preset-surface','surface-subtle':'--preset-surface-subtle','accent':'--preset-accent','text':'--preset-text','text-muted':'--preset-text-muted' };
const fillScopes = ['surface','surface-subtle','accent'];
for (const p of PRESETS) for (const key of Object.keys(PALETTE)) {
  const v = figma.variables.createVariable(`preset/${p}/${key}`, col, 'COLOR');
  v.setValueForMode(m, HEXA(PALETTE[key][p]));
  v.scopes = fillScopes.includes(key) ? ['ALL_FILLS','STROKE_COLOR'] : ['TEXT_FILL'];
  v.setVariableCodeSyntax('WEB', `var(${cssVar[key]})`);
}
```

### Collection 2 — Concept Preset (비색상 35)
```js
const NONCOLOR = {
  'heading-font': { aroma:'Noto Serif KR', gift:'Noto Serif KR', tradition:'Noto Serif KR', kitchen:'Pretendard', pet:'Pretendard' },
  'font-pairing': { aroma:'serif-display', gift:'serif-display', tradition:'serif-display', kitchen:'sans', pet:'sans' },
  'density':      { aroma:'airy', gift:'airy', tradition:'airy', kitchen:'compact', pet:'cozy' },
  'image-style':  { aroma:'styled-mood', gift:'unboxing', tradition:'hanji-texture', kitchen:'clean-cutout', pet:'lifestyle' },
  'copy-tone':    { aroma:'narrative', gift:'warm', tradition:'heritage', kitchen:'functional', pet:'friendly' },
  'default-intensity':{ aroma:'l3', gift:'l3', tradition:'l3', kitchen:'l1', pet:'l2' },
};
const LAYOUTVAR = { aroma:true, gift:true, tradition:true, kitchen:false, pet:false };
const cssField = { 'heading-font':'--preset-heading-font','font-pairing':'fontPairing','density':'density','image-style':'imageStyle','copy-tone':'copyTone','default-intensity':'defaultIntensity' };
for (const p of PRESETS) {
  for (const key of Object.keys(NONCOLOR)) {
    const v = figma.variables.createVariable(`preset/${p}/${key}`, col, 'STRING');
    v.setValueForMode(m, NONCOLOR[key][p]);
    if (key === 'heading-font') v.scopes = ['FONT_FAMILY'];   // 다른 STRING은 scope 미설정(빈 배열 거부됨)
    v.setVariableCodeSyntax('WEB', cssField[key]);
  }
  const lv = figma.variables.createVariable(`preset/${p}/layout-variation`, col, 'BOOLEAN');
  lv.setValueForMode(m, LAYOUTVAR[p]); lv.setVariableCodeSyntax('WEB', 'layoutVariation');
}
```

### Collection 3 — Intensity
```js
const inten = figma.variables.createVariableCollection('Intensity');
const m = inten.modes[0].modeId; inten.renameMode(m, 'value');
const ROOTGAP = { l1:24, l2:40, l3:64 }; const SECPAD = { l1:24, l2:40, l3:56 };
for (const lv of ['l1','l2','l3']) {
  const g = figma.variables.createVariable(`intensity/${lv}/root-gap`, inten, 'FLOAT');
  g.setValueForMode(m, ROOTGAP[lv]); g.scopes=['GAP']; g.setVariableCodeSyntax('WEB', `space-y (${lv})`);
  const pad = figma.variables.createVariable(`intensity/${lv}/section-pad-y`, inten, 'FLOAT');
  pad.setValueForMode(m, SECPAD[lv]); pad.scopes=['GAP']; pad.setVariableCodeSyntax('WEB', `section py (${lv})`);
}
```

### 빌드 중 학습 (Figma API 함정)
- starter 플랜: 컬렉션당 모드 1개 한도 → 프리셋을 변수 이름 그룹으로.
- COLOR 변수 값은 `{r,g,b,a}` (alpha 포함). Paint 색상 `{r,g,b}`와 다름.
- STRING/BOOLEAN 변수에 빈 scope 배열 `[]` 설정 시 "Invalid scope" 에러 → FONT_FAMILY 외엔 scope 미설정(기본값 유지).
- `figma.notify()`는 use_figma에서 "not implemented" throw → 사용 금지(return으로 결과 회수).
- starter 플랜 MCP 호출 한도 존재 → 검증·생성을 최소 호출로 묶을 것.

---

## 6. 검증 체크리스트 (#45 3-tier)
- [x] Brand Core 3 vars 생성 (red/pink/Pretendard) — 반환값 확인
- [x] Concept Preset 60 vars 생성 (색상 25 + 비색상 35) — 반환값 확인
- [x] Intensity 6 vars 생성 (l1/l2/l3 × 2) — 반환값 확인
- [ ] **다음 turn(한도 리셋 후)**: get_variable_defs 또는 getLocalVariablesAsync로 저장된 hex 값 == 코드 값 최종 눈대조 (aroma/surface=#F3EFE7, aroma/accent=#76864C)
- [ ] 7섹션 순서 = hook/value/spec/usage/trust/cta/notice (STEP 2)
- [ ] aroma 적용 시 hook=hero, value/trust=card (layoutVariation=true)
- [ ] kitchen 적용 시 전 섹션 flat (layoutVariation=false)
- [ ] 특정 조합(A+C) 하드코딩 0건 — 변수 그룹 전환으로만 컨셉 변경
- [ ] SD-01 footer 미접촉 (Figma 무관, 코드 미수정)

---

## 7. 양방향 동기화 운영 규칙 (드리프트 방지)
- **코드 → Figma**: concept-presets.ts/globals.css 토큰 변경 시 → 본 문서 §2 표 갱신 → STEP 1 스크립트 재실행.
- **Figma → 코드**: 디자이너가 Figma 변수 값 변경 시 → 값 추출 → concept-presets.ts PRESET_DEFINITIONS + globals.css [data-preset] 양쪽 수정(Code turn).
- **단일 소스 우선순위**: 충돌 시 **코드(concept-presets.ts)가 권위**. Figma는 코드를 미러. (런타임 발행은 코드가 수행하므로.)
- 토큰 5개+ 또는 드리프트 빈발 → Style Dictionary 자동화 도입 (CONCEPT_PRESET_SYSTEM §6-D / §10 Phase C).

---

## 8. 다음 단계
1. (Desktop, 한도 리셋 후) §6 미완 체크 — 저장된 변수 값 최종 눈대조.
2. (Desktop) STEP 2 — 7섹션 컴포넌트 빌드 (호출 묶어 한 번에, 한도 관리).
3. (선택) 유료 전환 시 프리셋 변수 그룹 → 모드 5개 재구성(무손실).
4. (Code) 본 문서 저장 완료 후 README 인덱스 + 5 MD 핑퐁 갱신.
