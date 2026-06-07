# HANDOFF — adobe-tool-router lifestyle 모델 격상 (Firefly Image 5 → Nano Banana Pro)

> **작성**: 2026-05-30 (Desktop turn, 코드 0)
> **FROM**: 🖥 Desktop (브라우저 MCP로 모델 우위 실증 + lineage 기록 + 변경 사양 확정)
> **TO**: 💻 Code (adobe-tool-router.ts 1-point 변경 + TSC/build/push)
> **BASELINE**: f6ce373 (origin/main, Vercel READY)

---

## 0. 배경 (1줄)

브라우저 MCP로 Firefly Image 5 vs Gemini 3 Nano Banana Pro를 동일 프롬프트로 실측 비교한 결과,
lifestyle 배경에서 **Nano Banana Pro의 자연광·우드 질감·합성 자연스러움이 명백히 우위**.
앱의 추천 모델 라우팅을 이 실증에 맞춰 격상한다. **런타임 호출 0(#38) 구조는 그대로 — 추천 spec만 변경.**

---

## 1. 실증 근거 (Desktop, 브라우저 MCP)

- 도구: Firefly 웹 UI 내 파트너 모델 드롭다운 (Firefly Image 5 / GPT Image / Gemini 3 Nano Banana Pro 등 선택 가능 확인)
- 표본: 명화송풍구 cmpnooli40001f0gveaxr8iim (baseTone=foreign-cinematic-sunlit, skeletonId=S6)
- 동일 프롬프트 3회 비교: Firefly Image 5(평이) → Gemini 3.1 Nano Banana 2(우수) → Gemini 3 Nano Banana **Pro**(정점)
- 결론: 배경(중간 합성자산)은 IP 리스크 0 → 미감 최우선이 ROI 정답. 메인컷(clean/badge)은 면책 유지.
- lineage 기록: art_director_prompts adp_myeonghwa_lifestyle_s6_001 → model=gemini, model_version=gemini-3-nano-banana-pro, credits=40 기록 완료.

---

## 2. 변경 사양 (Code — 단일 commit)

**파일**: `src/lib/automation/adobe-tool-router.ts`
**함수**: `pickLifestyleModel(baseTone)`
**대상 case**: `'foreign-cinematic' | 'foreign-cinematic-sunlit' | 'modern-minimal'`

현재 (실측):
```ts
case 'foreign-cinematic':
case 'foreign-cinematic-sunlit':
case 'modern-minimal':
  return {
    model: 'firefly-image-5',
    commercialSafety: 'adobe-indemnified',
    rationale: 'Firefly Image 5 background generation under Adobe IP indemnity.',
  };
```

변경안 (foreign-cinematic-sunlit만 분리 — modern-minimal은 면책 유지):
```ts
case 'foreign-cinematic-sunlit':
  // Desktop MCP A/B (2026-05-30): Nano Banana Pro clearly beats Firefly on
  // natural-light fragrance backdrops. Backdrop is a composited intermediate
  // asset (no IP-bearing subject), so partner-model creator-liability is an
  // acceptable trade for the aesthetic lift. clean/badge main cuts stay
  // Firefly-indemnified (unchanged).
  return {
    model: 'gemini-3-nano-banana-pro',
    commercialSafety: 'creator-liable',
    rationale:
      'Nano Banana Pro leads on natural-light fragrance backdrops (Desktop MCP A/B 2026-05-30); backdrop is an IP-free composited intermediate, so aesthetics prioritized. Main cuts (clean/badge) remain Firefly-indemnified.',
  };
case 'foreign-cinematic':
case 'modern-minimal':
  return {
    model: 'firefly-image-5',
    commercialSafety: 'adobe-indemnified',
    rationale: 'Firefly Image 5 background generation under Adobe IP indemnity.',
  };
```

**불변 (절대 변경 금지)**:
- `clean` / `badge` / `price` variant 플랜 — 메인 노출컷 면책 유지
- 런타임 외부 이미지 API 호출 0 (#38) — 이 모듈은 순수 spec 반환, 네트워크 호출 추가 절대 금지
- `GEMINI_API_KEY` 등 키 추가 금지 (앱은 생성 안 함, 추천만)

---

## 3. 검증 게이트 (#46 — 전부 충족해야 [CLOSED])

- [ ] TSC --noEmit 0 errors
- [ ] npm run build 0
- [ ] 단위: planAdobeWorkflow('lifestyle', {baseTone:'foreign-cinematic-sunlit'}) → model='gemini-3-nano-banana-pro', commercialSafety='creator-liable'
- [ ] 단위: planAdobeWorkflow('lifestyle', {baseTone:'modern-minimal'}) → model='firefly-image-5' (회귀 0)
- [ ] 단위: planAdobeWorkflow('clean', ...) → 'firefly-image-5' / 'adobe-indemnified' (불변 확인)
- [ ] production: POST /api/thumbnail/cmpnooli4 → adobeWorkflow[3](lifestyle).model = gemini-3-nano-banana-pro
- [ ] verify-vercel-deploy.sh --wait exit 0
- [ ] 비가역 0

---

## 4. 이번 turn에 이미 완료된 것 (Desktop)

- 명화송풍구 lifestyle 배경 Nano Banana Pro로 생성 → ~/Downloads 다운로드 완료(Firefly 기본 파일명)
- art_director_prompts 모델 lineage 갱신 완료
- 다음: 위 라우터 변경(이 핸드오프) + 별도 핸드오프 HANDOFF_g8_myeonghwa_backdrop_load_2026-05-30.md의 S6 배경 적재
