# HANDOFF — G8-ENGINE 명화송풍구 배경 적재 실증 (Track B real-win 1건)

> **작성**: 2026-05-30 (Desktop turn, 코드 0)
> **FROM**: 🖥 Desktop (적재 사양 확정 + 프롬프트 자산화 + 검증 동선 작성)
> **TO**: 🧑 대표님(Firefly 수동 1스텝) → 💻 Code(Storage 적재 + production 검증)
> **BASELINE**: f6ce373 (origin/main, Vercel READY) — Q1~Q4 [코드 완료] 위
> **표본**: 명화송풍구 `cmpnooli40001f0gveaxr8iim` (legalApproval=master_pd_verified)

---

## 0. 왜 이 작업인가 (1줄)

G8-ENGINE 엔진(Q1~Q4)은 코드 레벨로 완성됐으나, 아직 **실제 Firefly 자산이 0건**이라 모든 썸네일이 `assetSource=fallback`이다.
이 핸드오프는 그 엔진에 **첫 실탄(lifestyle 배경 1장)을 장전**해 `fallback → auto-cache` 전환을 production에서 증명하는 real-win 1건이다.

---

## 1. Desktop 실측으로 확정된 값 (추측 0)

| 변수 | 실측값 | 출처 | 적재에 미치는 영향 |
|---|---|---|---|
| productId | `cmpnooli40001f0gveaxr8iim` | Supabase Product | upload 1번 인자 |
| **skeletonId** | **`S6`** (matchScore 62.5, 비모호) | production POST /api/thumbnail | upload 2번 인자 = `backdrop-S6.png` 캐시키 |
| baseTone | `foreign-cinematic-sunlit` | category-tone-mapper 실측 | Firefly 프롬프트 = 자연광 햇살 |
| modelPolicy | `no-human` | GROUP_ROWS automotive-fragrance | 프롬프트에 사람/얼굴/손 금지 명시 |
| naturalLight | `true` | 동일 | 다크 시네마틱 금지 |
| assetSource.backdrop | `fallback` (적재 전) | production 실측 | 적재 후 `auto-cache`로 전환되어야 성공 |
| cutoutStrategy.source | `product-additional` | production 실측 | 누끼는 추가이미지 기반 자동 처리 |
| legalGate | clean (master_pd 우회 passed) | production 실측 | 명화 차단 통과 확인 |

> 진입 메시지의 STEP 6 예시는 `S1`이었으나, production 실측 결과 명화송풍구의 실제 매칭은 **`S6`**.
> `S1`로 적재하면 엔진이 못 찾는 빈 캐시키에 적재되어 검증이 거짓 실패한다. **반드시 `S6`.**

---

## 2. 자산화 루프 시작 (Desktop turn 완료분)

`art_director_prompts`에 명화송풍구 lifestyle 배경 프롬프트 1건 시드 완료:

- id: `adp_myeonghwa_lifestyle_s6_001`
- product_id: `cmpnooli40001f0gveaxr8iim`
- intent_tag: `lifestyle-backdrop-s6`
- model: `firefly` / model_version: `image-5`
- **seed: `760042026`** (결정론 — 4변형 일관성)
- aspect_ratio: `1:1` / resolution: `1024x1024`
- legal_flags: masterPdVerified + masterworkBlockBypass + aiDisclosureSelfUse
- status: `active`

이 레코드가 30일 CTR/CVR 피드백 루프의 lineage 시작점이다.

---

## 3. 🧑 대표님 수동 1스텝 (Firefly — 디렉팅이 필요한 유일 지점)

> 하이브리드 원칙: 누끼/합성/적재는 엔진과 Code가 전담. 대표님은 **"배경 1장 생성"만** 하면 된다.

**[STEP A] Firefly Image 5 진입**
- URL: https://firefly.adobe.com/generate/image
- 모델: **Firefly Image 5** (Adobe 상업 사용 면책)

**[STEP B] 프롬프트 입력 (아래 그대로 복사)**
```
A warm natural-light lifestyle scene for a car-vent fragrance diffuser.
Soft morning sunlight streams across a light oak wood desk near a window,
gentle impressionist-painting mood, airy and calm fragrance atmosphere
reminiscent of a premium Korean home diffuser. Shallow depth of field,
soft shadows, warm golden tone, empty composition center reserved for
product placement. No people, no faces, no hands. Editorial product-
photography background, 1:1.
```

**[STEP C] 설정**
- Aspect ratio: **1:1** (Square)
- Seed: **760042026** (고급 설정 > Seed 입력 — 일관성용. UI에 없으면 생략 가능)
- 사람/얼굴/손 절대 미포함 확인 (no-human 정책)

**[STEP D] 다운로드**
- 1장 다운로드 → `~/Downloads/myeonghwa_backdrop_S6.jpg` 로 저장
- (선택) 변형 2~3장 더 받고 싶으면 같은 seed로 variation → `_S6_v2.jpg` 등

> 누끼(STEP 1~4)는 하지 않는다. 엔진이 추가이미지로 자동 누끼한다(cutoutStrategy.source=product-additional).

---

## 4. 💻 Code 적재 + 검증 (대표님이 D 완료 후 Code 세션에 붙여넣기)

> §5의 paste-ready 메시지 참조. 핵심 명령어만 미리:

```bash
# 1) 배경 적재 (productId / skeletonId=S6 / 로컬경로)
node scripts/upload-backdrop.js cmpnooli40001f0gveaxr8iim S6 ~/Downloads/myeonghwa_backdrop_S6.jpg
# 기대: UPLOAD_STATUS=200 + PUBLIC_URL=.../product-assets/cmpnooli40001f0gveaxr8iim/backdrop-S6.png

# 2) production 재호출로 전환 검증
curl -s -X POST https://kkotium-garden.vercel.app/api/thumbnail/cmpnooli40001f0gveaxr8iim \
  -H "Content-Type: application/json" -d '{}' \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('backdrop=',d['assetSource']['backdrop'],'skeleton=',d['skeletonId'])"
# 기대: backdrop= auto-cache  skeleton= S6   (fallback이 아니면 성공)
```

**누끼도 적재하려면 (선택, 차별화 극대화):**
```bash
node scripts/upload-cutout.js cmpnooli40001f0gveaxr8iim ~/Downloads/myeonghwa_cutout.png
# 기대: assetSource.cutout= auto-cache
```

---

## 5. 검증 게이트 (#46 거짓 라벨 금지 — 모두 충족해야 [CLOSED])

- [ ] upload-backdrop.js UPLOAD_STATUS=200
- [ ] production assetSource.backdrop = `auto-cache` (이전 fallback에서 전환)
- [ ] skeletonId 여전히 `S6` 유지
- [ ] lifestyle 변형 outputs[3] 배경이 브랜드색 → Firefly 씬으로 육안 변화 (Desktop Chrome 또는 이미지 확인)
- [ ] legalGate.passed 여전히 true (master_pd 우회 유지)
- [ ] 비가역 0 — 네이버 미발행, DRAFT 유지

---

## 6. 비가역/안전 (절대 준수)

- 네이버 실발행 금지 — DRAFT까지만. 이번 turn은 자산 적재 + 썸네일 생성 검증까지가 전부.
- SD-01 아랍어 footer 영구 보존 (studio).
- upload-backdrop.js / upload-cutout.js 는 **Code 환경 전용** (.env.local service role). Desktop은 Storage 쓰기 불가 — 반드시 Code가 실행.
- 외부 이미지 API 런타임 호출 0 (#38) — production은 Storage 캐시만 소비.
