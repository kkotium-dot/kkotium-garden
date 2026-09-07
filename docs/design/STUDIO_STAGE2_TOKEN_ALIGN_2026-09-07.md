# /studio 2단계 토큰 정렬 — 미완 UX 과제 실측 (2026-09-07, Desktop)

> 근거: STUDIO_ATELIER_UX_REDESIGN.md §5 "2단계(후속): /studio 전체
> (ProductListPane·ActionsCard·DetailPageCard·DiagnosisCard)를 동일 토큰·
> 섹션헤더·카드 규격으로 정렬" = 명시적 미완 과제(운영자 주관 아님).
> #363 전상품 확장체크로 라이브 DOM 실측 → 미완 확증.

## 스펙(1단계 규격, KKOTIUM_DESIGN_SYSTEM)
- 카드: 화이트 + 보더 1px #E5E5E5(뉴트럴) + radius 16 + 그림자
  0 4px 20px rgba(0,0,0,0.06). 상태는 보더색 아닌 좌측 4px 액센트바+칩.
- 레드 = 메인지정 CTA 1곳만(75/15/10).

## 라이브 DOM 실측 (프로덕션 /studio, 2026-09-07)
카드 6개 측정:
- radius: 12px×5, 14px×1 → **16 하나도 없음**(스펙 위반)
- 보더색: 핑크만(255,179,206 / 255,224,236) → **뉴트럴 #E5E5E5 미적용**
- 그림자: 6개중 5개 none → **표준 그림자 미적용**

## 코드 실측 (근본원인)
- **StudioCardShell.tsx 자체가 스펙 불일치**: radius **17**(≠16),
  그림자 `0 2px 6px rgba(0,0,0,0.08)`(≠`0 4px 20px ...0.06`). L73/79.
  → 이 shell을 쓰는 카드 전부가 스펙에서 벗어남(공통 뿌리 #62).
- StudioCardShell 사용: ActionsCard✅ DetailPageCard✅ DiagnosisCard✅
- **AssetBrowser: shell 미사용(0)** — 자체 카드 스타일(에셋 브라우저 =
  구 ProductListPane 계열).
- DetailPageCard.tsx:220 내부 `borderRadius: 12` 하드코딩(shell 밖 잔존).

## Code 인계 (2단계 토큰 정렬)
```
목표: /studio 카드들을 1단계 스펙(radius16·뉴트럴보더·표준그림자)으로 통일.
전상품공통(#62): 개별 카드가 아니라 StudioCardShell을 SoT로 수렴.

1) StudioCardShell.tsx: radius 17→16, boxShadow 0 2px 6px/0.08 →
   0 4px 20px/0.06, 기본 보더 뉴트럴 #E5E5E5(상태색은 좌측 4px 액센트바로).
   → 이걸 쓰는 ActionsCard/DetailPageCard/DiagnosisCard 자동 정렬.
2) AssetBrowser.tsx: 자체 카드 스타일 → StudioCardShell 사용으로 전환
   (또는 동일 토큰 직접 적용). 에셋 카드 규격 통일.
3) DetailPageCard.tsx:220 등 하드코딩 borderRadius 12 → shell/토큰으로.
4) 잔여 하드코딩 스캔: grep "borderRadius: 1[0-4]" src/components/studio/
   전부 16 or shell로.
수용기준: 라이브 DOM 재측정 시 카드 radius 16 통일·뉴트럴 보더·표준
그림자. 레드=CTA 1곳. tsc0/build/이모지0/한글리터럴0. Desktop 프로덕션
DOM 재측정으로 검증(현재 radius 12/14/17 혼재 → 16 통일 확인).
```

## 의존성
독립(디자인 토큰 정렬, 기능 무관). supplier-code 즉시폴링·개선2/3/4와 무관.
1단계(워크벤치 P1~P6)는 이미 완료. 이건 그 나머지 영역 마감.

## 우선순위
중. 기능 결함 아닌 시각 일관성이나, "유료 프로그램처럼 깔끔한 UI"
목표의 직접 항목이고 미완 과제로 명시돼 있어 마감 가치 있음. 저위험
(토큰 값 조정, 로직 무관).
