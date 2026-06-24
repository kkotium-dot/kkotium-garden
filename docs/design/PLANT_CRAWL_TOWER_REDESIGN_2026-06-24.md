# DESIGN BRIEF 2026-06-24 (rev6) - Studio S2-B.1 VERIFIED + S2-B.2 LOCKED

Authoring: DESKTOP (design authority) -> CODE-CLI implements. SD-01 untouched. #132 (UI/structure only). #135. #147. #148.
Baseline: main / prod 00b53df.

================================================================
## STATUS
================================================================
- P1-a/c/d/e + P1-a refine (③ 통일형) : all prod Desktop PASS. (#137 platform/supplier item-kebab = honest gap, operator spot-check pending.)
- S2-B.1 center cleansing (559a284) : prod Desktop e2e PASS (below).

================================================================
## S2-B.1 - VERIFIED on prod 00b53df (Desktop live DOM, region-scoped per #148)
================================================================
PASS:
- Heavy form cards relocated to LEFT 배양실 panel: the thumbnail variation card (깔끔형/가격강조형/뱃지형/감성형 + 무드 카메라) renders INSIDE the 384px left aside (left~436, visible). Not a center sibling.
- CENTER = calm preview/assembly surface: 미리보기 preview (left~1149) + assembly slot stubs (대표/추가/상세, 추가 at left~973) + stepper overview. The 썸네일/진단/카메라 words in center are STEPPER LABELS + intro text (not the actual form cards) - #148 false-positive avoided.
- STEP-SYNC works: clicking stepper "상세 캔버스" switched the left panel card from "썸네일 4 변형..." -> "5섹션 상세페이지..." (changed=true). Relocated forms are step-gated; panel reflects active step.
- 500/overflow 0.

MINOR honest notes (for Code, non-blocking):
1. A non-aside element containing "깔끔형" exists at w:0/left:0 (hidden, no layout box) - NOT a visible center leak, but a possible stray hidden duplicate (responsive/SSR copy?). Code: confirm it is intentional (hidden mobile copy) and not a double-render.
2. 꼬띠 guide bubble: center preview/slots/stepper confirmed, but the literal "꼬띠" text was not detected in the center region. Likely image/icon-based or microcopy without the word. Code: confirm the bubble actually renders (not silently dropped).

================================================================
## ★ NEXT - Studio S2-B.2 : LOCKED scope (parallel, /studio, #132/#147)
================================================================
Builds on S2-B.1 (relocation + inherent step-gating already live).
- REVEAL refine: ensure 배양실 surfaces ONLY the active step's form (hide non-active cleanly; step-sync already changes content - polish the transition/empty handling).
- TRAFFIC-LIGHT StatusCards: per-step completion status (e.g. 미작업/진행/완료) as the existing neutral->semantic StatusBadge tones (reuse common/StatusBadge from S2-A.2; product-agnostic #55). NO new scoring logic - reflect existing step/engine state only.
- 꼬띠 MICROCOPY pass: friendly active-step guidance text in the center bubble (confirm bubble renders first per note 2).
- FONT decision (brand display font Cafe24 Ssurround vs Gmarket Sans): OPERATOR pending, NON-BLOCKING. Proceed with current font; swap is a token change later.
GUARDRAILS: reuse shared components (StatusBadge, OverflowMenu portal); no backend wiring; slot-FILLING stays out (that is S2-D/Phase 3). SD-01 footer untouched. Verifiable stage commits (#138).

================================================================
## CARRY / BACKLOG / LATER
================================================================
- #137 platform/supplier item-kebab: operator 10-sec spot-check (기본정보 -> 플랫폼 선택 -> 도매매 -> row kebab -> 수정/삭제 not clipped) OR Desktop retry. Child-component rows (대체상품/옵션/asset) = follow-up lane (same portal OverflowMenu).
- CR-1: 예상마진율 ~13% cluster -> market-price basis (operator approval).
- #146: ProductLifecycle/LowStockAlert inline #e5e7eb borders -> tokenize.
- Narrow 1024/375: still gated - Control Chrome cannot resize OS window; do NOT fabricate. (Claude-in-Chrome resize is a separate browser context; offer to attempt if operator wants a dedicated narrow pass.)
- Myeonghwa backfill (operator) -> unblocks publish #124. Publish PUT <- backfill+reconcile+GO (#46/#124).

================================================================
## PRINCIPLES
================================================================
- #148 (enshrined): region-scope DOM verification (exclude global nav/aside nesting); a child panel nested inside <main> contaminates a main.innerText scan - check aside-containment of the actual feature markers, not flat text. Isolate build from running dev (.next). Distinguish hidden(w:0) nodes from visible leaks.
- #147 anti-over-build. SD-01 footer never touch.
