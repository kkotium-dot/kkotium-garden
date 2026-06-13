# Firefly 반자동 → 근사 완전자동 파이프라인 (실측 확정 플레이북)
> 2026-06-13 (Desktop turn) · 브라우저 실측 기반 · 원칙 #74 SUPERSEDE
> 대상: Control Chrome 커넥터 + firefly.adobe.com/generate/image
> 본 문서는 "Scene-first 3-Layer 합성"의 Layer A(배경/씬) 생성 자동화 표준이다. 전상품 공통.

---

## 0. 핵심 정정 (#74 SUPERSEDE — 프로젝트 차원)
**구 #74**: "Firefly SPA는 Spectrum 웹컴포넌트라 프롬프트 programmatic 주입 시 재렌더로 폐기 → 운영자가 프롬프트 입력+생성 클릭 필수."
**신 실측(2026-06-13)**: Firefly UI는 353개 Shadow DOM 호스트로 캡슐화되어 있어 top-level `querySelector`는 0을 반환하지만, **shadow root를 재귀 관통(walk)** 하면 prompt textarea·생성 버튼·다운로드 버튼·결과 이미지가 전부 잡힌다. 그리고 **네이티브 프로토타입 setter + InputEvent** 조합으로 프롬프트를 주입하면 값이 유지된다(`stuck: true` 실측). 구 #74가 실패한 원인은 단순 `el.value =` 방식이 React/Spectrum 내부 상태에 반영되지 않았기 때문. 정정 방식 사용 시 자동 주입 성립.

### 실측 증거 (verbatim)
- `blobExtract: { ok:true, type:"image/png", bytes:2454140, sig8:"89 50 4e 47 0d 0a 1a 0a" }` → 생성물 블롭을 fetch→arrayBuffer로 추출 가능, 유효 PNG.
- `promptInject: { ok:true, stuck:true, placeholder:"만들거나 편집하려는 내용을 설명하세요." }` → 프롬프트 주입 유지.
- shadow hosts 353 / deepNodes 2245 / 결과 이미지 4컷 1376×768(16:9) + 정적 PNG 2종.

---

## 1. 자동화 가능 표면 (역할 분담 재정의)

| 단계 | 주체 | 방식 | 검증 상태 |
|---|---|---|---|
| 프롬프트 주입 | **Claude(자동)** | shadow-walk로 textarea 포착 → native setter + InputEvent | ✅ 실측(stuck) |
| 생성 트리거 | **Claude(자동)** | shadow-walk로 "생성" 버튼 포착 → `.click()` | ⏳ 미실행(크레딧 소비, 다음 세션 1컷 실측) |
| 완료 폴링 | **Claude(자동)** | blob 결과 set 변화 감지(baseline 대비 신규 blob) | ⏳ 1컷 실측 시 동시 확정 |
| 결과 추출 | **Claude(자동)** | blob URL → fetch → arrayBuffer → base64 | ✅ 실측(2.45MB PNG) |
| 적재(Supabase) | **앱 엔드포인트** | base64 → POST kkotium ingest → uploadAutomationAsset → `{pid}/{stage}/` | ⏳ Code 빌드 필요(§3) |
| 모델 선택 | 운영자 1회 | Firefly 좌측 패널서 Nano Banana Pro 등 선택(컷 성격별) | 수동(세션당 1회) |

**결론**: 프롬프트 입력·생성·폴링·추출이 전부 자동화 가능. 운영자 개입은 (a) 세션 시작 시 Firefly 탭 열어두기 (b) 모델 선택 1회 — 이 둘로 축소. "Firefly 열어두면 모든 장수 누락없이 생성"이 성립.

---

## 2. 브라우저 드라이버 스크립트 (shadow-walk 공통 유틸)
```js
// 전 자동화 호출의 공통 헤드: shadow root 재귀 관통으로 핵심 노드 포착
function kkWalk() {
  const seen = new Set();
  let ta = null, genBtn = null, dlBtn = null;
  const blobs = new Set();
  (function w(root, d){ if(!root||d>12) return; let ns;
    try{ ns = root.querySelectorAll('*'); }catch(e){ return; }
    ns.forEach(el=>{ if(seen.has(el))return; seen.add(el);
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      const label = ((el.innerText||'')+' '+((el.getAttribute&&el.getAttribute('aria-label'))||'')).trim();
      if(tag==='textarea' && !ta && (el.offsetWidth||el.offsetHeight)) ta = el;
      if((tag==='button'||(el.getAttribute&&el.getAttribute('role')==='button'))){
        if(/생성|generate/i.test(label) && !genBtn) genBtn = el;
        if(/다운로드|download/i.test(label) && !dlBtn) dlBtn = el;
      }
      if(tag==='img' && /^blob:/.test(el.src||'') && el.naturalWidth>500) blobs.add(el.src);
      if(el.shadowRoot) w(el.shadowRoot, d+1);
    });
  })(document, 0);
  return { ta, genBtn, dlBtn, blobs:[...blobs] };
}

// 프롬프트 주입(유지됨)
function kkSetPrompt(ta, text){
  const proto = Object.getPrototypeOf(ta);
  const desc = Object.getOwnPropertyDescriptor(proto,'value')
            || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
  desc.set.call(ta, text);
  ta.dispatchEvent(new InputEvent('input',{bubbles:true,data:text,inputType:'insertText'}));
  ta.dispatchEvent(new Event('change',{bubbles:true}));
}

// 결과 추출 → base64 (window에 저장, 동기 read-back)
async function kkExtract(blobUrl){
  const r = await fetch(blobUrl); const b = await r.blob();
  const buf = new Uint8Array(await b.arrayBuffer());
  let bin=''; for(let i=0;i<buf.length;i++) bin+=String.fromCharCode(buf[i]);
  return { type:b.type, bytes:b.size, base64: btoa(bin) };
}
```
> ⚠️ execute_javascript는 Promise를 await하지 않음 → async 작업은 `window.__kk = {...}` 저장 후 2차 동기 호출로 read-back(실측 확인 패턴).

---

## 3. 앱 개입점 (Code 빌드 — 적재 catch-basin)
**신규 엔드포인트** `POST /api/products/[id]/ingest-firefly` (전상품 공통):
- body: `{ stage: 'composite'|'source'|'detail'|..., filename: string, base64: string, contentType: 'image/png' }`
- 동작: base64 디코드 → `uploadAutomationAsset(pid, stage, filename, bytes, contentType)` → Supabase `product-assets/{pid}/{stage}/{filename}` → asset_registry 인테이크 → public URL 반환.
- 가드: 소유 product 검증, 비가역 0(Storage upsert만, 네이버 무접촉), 멱등.
- ★ 이 엔드포인트가 "Firefly 생성물 → 폴더 적재"의 catch-basin. 이게 있어야 "누락없이 적재" 성립 → **생성 루프보다 먼저 빌드해야 함**(두 번 측정 한 번 자른다).
- 개입카드 연동: 기존 `firefly_drop` 개입카드(C-9)를 `firefly_auto`로 확장 — 운영자는 Firefly 탭만 열어두면 카드가 "자동 생성 가능" 상태로 표시.

---

## 4. 5컷 일괄 루프 (ingest 엔드포인트 완성 후 실행)
```
for each of [hero16:9, lemon, april, cotton, blackcherry]:
  1) kkSetPrompt(ta, PROMPT[i])         # 자동
  2) genBtn.click()                      # 자동 (크레딧 소비)
  3) poll: kkWalk().blobs 가 baseline 대비 신규 4컷 출현까지 (timeout ~90s)  # 자동
  4) best 후보 선택(기본 1번 또는 운영자 1클릭)  # 자동/반자동
  5) kkExtract(blobUrl) → base64                                          # 자동
  6) POST /api/products/{pid}/ingest-firefly {stage:'composite', ...}     # 자동 → Supabase
  7) 다음 컷으로
```
폴링은 baseline blob set을 찍어두고 변화를 감지. 5컷 누락 방지 = 각 컷 적재 성공(200) 확인 후 다음 진행, 실패 시 재시도 1회 후 운영자 알림.

---

## 5. Scene-first 3-Layer 정합 (왜 Firefly가 배경만 만드는가)
Firefly는 **제품 없는 photoreal 배경/씬**만 생성한다(Layer A). 실제 제품은 form-accurate 누끼(Layer C)로 Sharp가 결정론 배치 → Nano Banana Pro가 form-locked 하모나이즈(광·색만). 이유: AI가 제품을 그리면 형태가 왜곡되고, AI가 회화를 그리면 저급 AI아트가 됨(#75). **진짜 예술은 진짜로(실제 명화 라벨 reproduction + 퍼블릭도메인 모네 스토리), 나머지는 전부 실사 카메라 품질.**

### 5컷 photoreal 배경 프롬프트 (제품-free, clean foreground)
모두 공통 접미: `Avoid: text, watermark, logo, people unless specified, cartoon, illustration, painting, 3d render, cgi, distorted, oversaturated.`
1. **hero 16:9** (Sony A7R V 35mm f/2.0): warm morning interior car scene, sunlight through windshield, soft bokeh dashboard, beige/cream tones, shallow DOF, empty clean lower-center foreground for product, premium minimal editorial.
2. **lemon** (Canon EOS R5 50mm f/1.8): dewy fresh garden morning, eucalyptus/lemon leaves, water droplets, bright airy, clean lower-center space.
3. **april** : flower field after spring rain, soft pastel petals, fresh linen mood, diffused light, clean foreground.
4. **cotton** : white linen drying in sun breeze, soft cotton textures, warm neutral, clean lower-center.
5. **blackcherry** : orchard golden hour, ripe cherries bokeh, warm amber light, cozy, clean foreground.

---

## 6. 다음 실행 순서 (누락 방지)
1. **[Code]** `POST /api/products/[id]/ingest-firefly` 빌드 + `firefly_drop`→`firefly_auto` 개입카드 확장 (§3).
2. **[Desktop]** ingest 배포 확인 후 1컷 end-to-end 실측: hero 주입→생성→폴링→추출→ingest→Supabase `{pid}/composite/` 200 확인.
3. **[Desktop]** 1컷 통과 시 5컷 일괄 루프 실행(§4), 각 컷 적재 200 확인.
4. **[Desktop]** Sharp 배치(Layer C 누끼 합성) + Nano Banana 하모나이즈 → 썸네일/상세 활용.
5. 전상품 확장: 달항아리·아이스트레이 동일 루프.

## 7. Caveats
- 생성 트리거(`genBtn.click()`)·폴링은 다음 세션 1컷서 확정(이번엔 크레딧 소비 회피로 미실행).
- 모델 선택(Nano Banana Pro 등)은 Firefly 좌측 패널 — 컷 성격별 운영자 1회 선택(편집/합성=Nano Banana Pro, 신뢰=Image 5 Adobe 면책).
- 4향 노트·페어링은 권고안(공급사 확인 필요 #46).

---

## 8. 모드 가드 — 생성(generate) vs 편집(edit) 사전검증 [필수 · #77]

### 8.1 왜 위험한가 (운영자 실측 제기 2026-06-13)
Firefly `firefly.adobe.com/generate/image?view=edit` 는 **생성·편집 겸용 워크스페이스**다. 프롬프트 placeholder 가 "만들거나 편집하려는 내용을 설명하세요" 인 것이 증거. 결과 이미지를 한 번 클릭하면 그 이미지가 **편집 베이스로 물려**, 같은 프롬프트 입력 + "생성" 클릭이 새 생성이 아니라 **해당 이미지의 편집(인페인/리컴포지션)** 으로 작동한다. 가드 없이 진행하면 5컷이 한 베이스의 편집본으로 오염될 수 있다.

### 8.2 판별자 (중요 — 오탐 주의)
- **편집 도구 버튼(채우기/제거/확장/배경 제거)의 존재는 신호가 아니다.** `view=edit` 툴바에 상시 노출되므로 이를 edit-mode 근거로 쓰면 항상 오탐(false positive). (1차 휴리스틱 실패 원인.)
- **진짜 edit-mode 신호 (하나라도 참이면 ABORT):**
  1. `referenceLoaded > 0` — 편집 베이스/참조 이미지가 컴포지션 캔버스에 로드됨
  2. 활성 마스크/선택 영역 오버레이 존재
  3. 기본 액션 버튼 라벨이 `편집`/`적용`/`Apply`/`Edit` (= `생성`/`Generate` 아님)
  4. 결과 이미지가 `aria-selected=true` + 편집 도크 부착
- **generate-mode 확정 (전부 참이어야 안전):** `referenceLoaded == 0` && 마스크 없음 && 기본 버튼 라벨에 `생성`/`Generate` 포함.

### 8.3 가드 유틸 (kkAssertGenerateMode)
```js
function kkAssertGenerateMode(){
  const seen=new Set(); let genBtn=false, refLoaded=0, editLabel=false, maskActive=false;
  (function w(root,d){ if(!root||d>13)return; let ns; try{ns=root.querySelectorAll('*');}catch(e){return;}
    ns.forEach(el=>{ if(seen.has(el))return; seen.add(el);
      const tag=el.tagName?el.tagName.toLowerCase():'';
      const lab=((el.innerText||'')+' '+((el.getAttribute&&el.getAttribute('aria-label'))||'')).trim();
      if((tag==='button'||(el.getAttribute&&el.getAttribute('role')==='button'))&&(el.offsetWidth||el.offsetHeight)){
        if(/^생성$|generate/i.test(lab.slice(0,12))) genBtn=true;
        if(/^편집$|^적용$|apply|^edit$/i.test(lab.slice(0,8))) editLabel=true;
      }
      // edit-base: large non-result img pinned as composition/reference (NOT a blob result thumbnail)
      if(tag==='img'&&el.naturalWidth>200&&/reference|참조|composition|구도|base/i.test((el.className||'')+lab)) refLoaded++;
      if(/mask|마스크|선택 영역/i.test((el.className||'')+lab)&&(el.offsetWidth||el.offsetHeight)) maskActive=true;
      if(el.shadowRoot) w(el.shadowRoot,d+1);
    });
  })(document,0);
  const mode = (refLoaded>0||maskActive||editLabel) ? 'edit' : (genBtn ? 'generate' : 'ambiguous');
  return { mode, refLoaded, editLabel, maskActive, genBtn };
}
```

### 8.4 통합 규칙 (전상품 공통)
1. **사전검증:** 단건 생성·5컷 루프의 매 iteration에서 `kkSetPrompt` 직전에 `kkAssertGenerateMode()` 호출. `mode !== 'generate'` 이면 그 컷을 **건너뛰고** `failed`에 `{key, reason:'not-generate-mode', signals}` 기록 + 운영자 개입 알림. 절대 편집 상태에서 생성 트리거 금지.
2. **사후검증(보강):** 생성 완료 후 결과 blob 들의 8x8 avg-hash pairwise hamming 계산. `minHamming < 10` 이면 편집본 오염 의심 → 해당 컷 재생성. (이번 세션 실측: minHamming=19 → 전부 distinct = 정상 생성 확정.)
3. **앱 개입점(Code, additive):** `firefly_auto` 개입카드 체크리스트에 `generateModeConfirmed` 게이트 추가 — 운영자/자동화가 generate-mode 확인 전에는 적재를 '검증대기'로 표시. 전상품 공통, 비가역 0.

### 8.5 적용 이력
- 2026-06-13: 5컷(hero+4향) 배치는 가드 없이 진행됐으나, 사후 perceptual hash(minHamming 19/64) + referenceLoaded 0 으로 **정상 생성 확정**. 가드는 이후 모든 Firefly 세션·전상품에 선적용.
