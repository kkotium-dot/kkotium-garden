# Firefly 품질 업그레이드 + Gemini 그라운딩 + 모드 가드 정정
> 2026-06-13 (Desktop) · 운영자 5컷 시각확인 + 편집상태 질문 + Gemini 구글검색 제안 + april/cotton 이질감 지적 반영
> 본 문서는 FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md §8 의 정정·확장이다. 전상품 공통.

---

## 0. 운영자 5컷 시각 판정 (2026-06-13)
| 컷 | 파일 | 판정 |
|---|---|---|
| hero | hero_lifestyle-1781340521187.png | OK — 베이지 가죽 차량 내부·노을·콘솔 여백, 실사감 양호 |
| lemon | fresh_lifestyle-1781340629947.png | OK — 유칼립투스·이슬·석판 포디움, 제품 안착면 명확 |
| blackcherry | lifestyle-1781340722748.png | OK — 체리 과수원 골든아워·보케, 실사감 양호 |
| april | lifestyle-1781340662604.png | REWORK — 꽃 배치 균일·반복패턴·깊이 평면적(AI 이질감) |
| cotton | lifestyle-1781340695146.png | REWORK — 린넨 드레이프 부유·구도 공허·얇은 끈 어색(AI 이질감) |

3컷 채택, 2컷 재작업. 재작업도 컨셉(향별 무드)은 유지.

---

## 1. 모드 가드 정정 [#77 보정 — PLAYBOOK §8.3 supersede]
### 1.1 발견된 갭 (라이브 편집상태 실측)
운영자가 편집상태 창을 유지한 상태에서 §8.3 원본 가드를 돌리니 `'ambiguous'` 반환 = 편집 미포착(가드 실패). 원인:
- `genBtn` 정규식이 `/^생성$/` 앵커라 실제 라벨 `"생성 생성"`(중복)과 불일치 → genBtn=false.
- 편집 신호(`새로 편집`·`마크업`·`디테일 조절`·`업스케일`·대형 단일 표시이미지)를 판별자에 미포함.

### 1.2 철학 정정 (운영자 통찰 반영 — 핵심)
**`view=edit` 워크스페이스 자체는 위험이 아니다.** 진짜 위험 = **ACTIVE MASK / 선택영역 / 참조 잠금(부분 인페인)**. 마스크가 없고 전체 캔버스가 생성 타겟이면 `생성` 클릭은 새 풀생성으로 작동한다.
- 실측 근거: 이번 5컷 배치 `maskActive=false` + 6컷 perceptual hash minHamming 19/64(전부 distinct) = 정상 풀생성. 시각 확인으로도 5컷 모두 프롬프트와 일치하는 별개 씬.
- 따라서 가드는 **마스크/선택영역/참조잠금 활성일 때만 ABORT**, 단순 편집 워크스페이스 진입은 허용(풀생성 가능).

### 1.3 검증된 kkAssertGenerateMode (정정판)
```js
function kkAssertGenerateMode(){
  const seen=new Set();
  let genBtn=false, newEditBtn=false, markupTools=0, refLoaded=0, maskActive=false, dom=null;
  (function w(root,d){ if(!root||d>14)return; let ns; try{ns=root.querySelectorAll('*');}catch(e){return;}
    ns.forEach(el=>{ if(seen.has(el))return; seen.add(el);
      const tag=el.tagName?el.tagName.toLowerCase():'';
      const lab=((el.innerText||'')+' '+((el.getAttribute&&el.getAttribute('aria-label'))||'')).trim();
      const cls=(typeof el.className==='string'?el.className:'')||'';
      if((tag==='button'||(el.getAttribute&&el.getAttribute('role')==='button'))&&(el.offsetWidth||el.offsetHeight)){
        if(/생성|generate/i.test(lab)) genBtn=true;                          // FIX: no ^$ anchor
        if(/새로 편집|new edit/i.test(lab)) newEditBtn=true;
        if(/마크업|markup|디테일 조절|detail adjust|업스케일|upscale/i.test(lab)) markupTools++;
      }
      if(tag==='img'&&el.naturalWidth>200&&(el.offsetWidth||el.offsetHeight)){
        const r=el.getBoundingClientRect();
        if(!dom||r.width*r.height>dom.dw*dom.dh) dom={dw:Math.round(r.width),dh:Math.round(r.height)};
        if(/reference|참조|composition|구도|base/i.test(cls+lab)) refLoaded++;
      }
      if(/mask|마스크|선택 영역|brush|브러시|selection/i.test(cls+lab)&&(el.offsetWidth||el.offsetHeight)) maskActive=true;
      if(el.shadowRoot) w(el.shadowRoot,d+1);
    });
  })(document,0);
  const dominantOpen = !!(dom && dom.dw>=500);
  // SAFE to generate even in edit workspace IF no mask/region/reference lock:
  const partialEditLock = maskActive || refLoaded>0;
  const editSession = newEditBtn || (dominantOpen && markupTools>=2);
  const mode = partialEditLock ? 'edit-locked-ABORT'
             : genBtn ? (editSession ? 'generate-in-edit-OK' : 'generate')
             : 'ambiguous';
  return { mode, genBtn, newEditBtn, markupTools, dominantOpen, refLoaded, maskActive };
}
```
- 실측 검증: 라이브 편집상태에서 `newEditBtn=true·markupTools=3·dominantOpen=true·maskActive=false` → `generate-in-edit-OK`(풀생성 안전). 마스크 활성 시 `edit-locked-ABORT`.

### 1.4 통합 규칙(정정)
생성 직전 `kkAssertGenerateMode()` 호출. `edit-locked-ABORT`(마스크/선택영역/참조잠금)만 중단+개입알림. `generate`·`generate-in-edit-OK`는 진행. 사후 perceptual hash(minHamming<10=오염) 보강 유지.

---

## 2. Gemini 구글검색 그라운딩 — 구조 사실감 업그레이드 [채택 · 운영자 통찰]
### 2.1 통찰
현 모델 `Gemini 3.1 (w/ Nano Banana 2)` 에 구글검색 토글 존재. 활성 시 실세계 시각지식을 그라운딩 → 차량 통풍구처럼 **구조 정확성이 필요한 기물**을 별도 참조이미지 첨부 없이 사실적으로 렌더 가능.

### 2.2 채택 규칙
- 씬에 실세계 구조 정확성이 필요할 때(차량 통풍구 클립부·특정 기물 컨텍스트·실제 가전/소품) → **구글검색 그라운딩 ON**.
- 자연·추상 씬(꽃밭·린넨·과수원)은 그라운딩 선택적(질감 레퍼런스로는 도움).

### 2.3 경계 [#75 불변]
- 그라운딩은 **LAYER A(배경/씬 컨텍스트)** 의 구조 사실감만 향상. **PRODUCT(디퓨저)는 여전히 실사 누끼(Layer C)** — AI가 제품 형태를 그리면 왜곡(#75).
- 그라운딩 결과도 환각 가능 → 시각 검증 필수.

### 2.4 강력 활용처 (전환 직결)
차량 통풍구 클립 장착 사용샷 = 그라운딩으로 렌더한 구조정확 통풍구 배경 + 실사 누끼 디퓨저 합성. "차 안에 명화를 건다" 핵심 메시지의 시각 증거.

### 2.5 토글 위치 (정직)
현재 DOM 스냅샷에 미노출 = 모델설정 플라이아웃 내부 추정. 다음 regen 시 플라이아웃 열어 활성(운영자 1클릭 또는 자동화로 셀렉터 확정 후).

---

## 3. april / cotton 품질 업그레이드 전략 (단순 프롬프트 수정 아님)
### 3.1 근본원인
- april: 꽃이 균일 크기·반복 패턴·전반 동일 초점(깊이 평면) → 합성느낌.
- cotton: 린넨이 물리적 무게 없이 부유·얇은 끈 비현실·주변 공허.

### 3.2 업그레이드 5축
1. 그라운딩 ON(실제 야생화 군락 / 실제 린넨 건조 장면 레퍼런스 자동참조)
2. 광학 구체화 + 비대칭·미세결(렌즈·조리개·필름 명시, 완벽대칭 회피)
3. 네거티브 강화: `repeated pattern, uniform spacing, symmetrical, plastic sheen, oversmooth, painterly, floating fabric, weightless, CGI`
4. 구도 정정:
   - april: 3-layer 깊이(전경 샤프 꽃 소수 + 중경 자연 블러 + 원경 나무/하늘), 꽃 크기·종·간격 자연 변주, 비어있는 하단 여백 유지(제품 안착)
   - cotton: 린넨이 실제 나무 선반/등받이/바구니에 물리적 무게로 접혀 안착(부유 금지), 창측 자연광 그림자 디테일, 좌하단 또는 중앙하단 여백
5. 후처리: 미세 필름 그레인 + 실사 컬러그레이드(하모나이즈 단계)

### 3.3 업그레이드 프롬프트
공통 네거티브: `Avoid: text, watermark, logo, cartoon, illustration, painting, 3d render, cgi, repeated pattern, uniform spacing, symmetrical, plastic sheen, oversmooth, painterly, floating, weightless, distorted.`
- april: `Photorealistic wild spring meadow after light rain, shot on Sony A7R IV 90mm macro f/2.8, three-layer depth: a few sharp dew-covered wildflowers in foreground (varied species, natural irregular spacing), softly blurred mid-field, distant trees and overcast sky bokeh, fine natural texture, true-to-life muted pastel tones, clean empty lower-center foreground for a small product, premium editorial product background.`
- cotton: `Photorealistic stack of natural washed linen fabric resting with real weight folded over a light oak wooden rack near a sunlit sheer-curtain window, soft directional morning light casting gentle realistic shadows, visible fabric weave texture and natural wrinkles, warm neutral beige tones, shallow depth of field, clean empty lower-center surface for a small product, premium editorial product background.`

### 3.4 실행
hero/lemon/blackcherry 유지. april/cotton만 재생성(그라운딩 ON + 위 프롬프트) → 추출 → ingest `{pid}/composite/` → 시각 재확인 → 통과 시 기존 2컷 아카이브.

---

## 4. 참고링크 → 상세 자동개선 시스템 [프레임워크 · 일반화 보류]
### 4.1 운영자 지시
참고링크 제공 시마다 상품 컨셉·톤앤매너·용도에 맞춰 상세개선 시스템을 선택/자동 적용하는 구조.

### 4.2 Reference Intake 루틴 (4차원 흡수)
링크 입력 → 4차원 추출:
1. 이미지 스타일(연출·구도·라이팅·색조)
2. 카피(후킹·정보 카피·CTA 톤)
3. 레이아웃(섹션 순서·그리드·여백 리듬)
4. 섹션/정보 위계(무엇을 먼저·신뢰요소 배치)
→ "상세개선 프로파일"로 정규화 → 상품 컨셉·톤·용도 기준 매핑·선택 → 해당 상품 상세에 적용.

### 4.3 현재 적용 (명화 한정)
- a-scent 17섹션 흡수 = docs/research/REFERENCE_DETAIL_TEARDOWN_ascent_2026-06-13.md 에 박제완 → 명화 상세 v3 재설계에 반영(4향 노트카드·"차 안에 명화를" 후킹).
- 일반화 보류 = 프레임워크만 박제, 자동선택 엔진화는 후속(전상품 확장 시 CONCEPT_PRESET_SYSTEM·DETAIL_PAGE_PLAYBOOK과 통합).

---

## 5. 다음 액션
1. [Desktop] april/cotton 재생성(그라운딩 ON + §3.3 프롬프트) → 추출 → ingest → 시각 재확인. 그라운딩 토글은 모델설정 플라이아웃서 활성(셀렉터 확정 후 자동화 또는 운영자 1클릭).
2. [Desktop] Layer C 누끼 합성(5컷 중 채택본) + Nano Banana form-locked 하모나이즈.
3. [Desktop] 명화 상세 v3 재설계(§4.3) — 병렬.
4. [Code] #77 정정판 가드 철학(마스크/선택영역만 ABORT, 편집워크스페이스 풀생성 허용) PRINCIPLES_LEARNED·CLAUDE.md 반영 + firefly_auto generateModeConfirmed 게이트.
5. 전상품 확장: 달항아리·아이스트레이 동일 루프(#76) + 그라운딩 규칙 공통 적용.
