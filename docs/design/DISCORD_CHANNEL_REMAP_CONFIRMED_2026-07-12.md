# 디스코드 채널 재활용 — 확정 매핑 (스샷 기준) (2026-07-12)

Authoring: DESKTOP(운영자 스샷 실측). 권위: KKOTTI_ALERT_SYSTEM_SPEC. 상태: 확정·운영자 rename + Code 라벨/라우팅 조정.

## 0. 현재 채널 (스샷·🔊꽃틔움 알림)
1. #🌸꼬띠-오늘추천 (KKOTTI_RECOMMEND)
2. #📦재고-알림 (STOCK_ALERT)
3. #💰가격-변동 (PRICE_CHANGE)
4. #📉꼬띠-점수급락 (KKOTTI_SCORE)
5. #📊운영-리포트 (OPS_REPORT)
+ 음성: 일반

## 1. ★확정 재활용 매핑 (env·webhook URL 불변 — 이름만 변경)
| # | 기존 | 운영자 변경(rename) | 새 용도 | env(그대로) |
|---|---|---|---|---|
| 1 | 🌸꼬띠-오늘추천 | **유지** | 아침 추천(황금🏆/니치💎/시즌🗓️) + 발행준비 완료 | KKOTTI_RECOMMEND |
| 2 | 📦재고-알림 | **유지** | 실시간 재고(🔴10/🟠30/🟡100/품절) | STOCK_ALERT |
| 3 | 💰가격-변동 | **💸마진-가격** | 공급가 변동 + 마진 하락 경고 | PRICE_CHANGE |
| 4 | 📉꼬띠-점수급락 | **🧟꼬띠-부활알림** | 리셋/튜닝 필요·부활 후보·좀비 전환 | KKOTTI_SCORE |
| 5 | 📊운영-리포트 | **유지** | 주간 다이제스트 + 🟢정보성 묶음 | OPS_REPORT |
- ★운영자: 채널 3·4만 이름 변경(우클릭→채널 편집→이름). webhook 삭제/재생성 금지(URL 유지). env 변경 불필요.
- ★Code: discord.ts 채널 주석/라벨을 새 용도로 갱신 + 새 알림(발행준비·부활·마진)을 위 기존 webhook로 라우팅. 키 이름(KKOTTI_SCORE 등)은 코드 내부명이라 유지(라벨만 한글 용도 갱신).

## 2. Code 변경 범위
- `discord.ts`: 채널 JSDoc/라벨을 새 용도로(오타 username '\uAF2C\uB6F2'→'꼬띠' 포함·#250).
- 알림 라우팅:
  · 발행준비 완료 → KKOTTI_RECOMMEND(오늘추천).
  · 부활 후보/리셋튜닝/좀비 → KKOTTI_SCORE(부활알림).
  · 마진 경고 → PRICE_CHANGE(마진-가격).
  · 재고 → STOCK_ALERT(기존).
- `discord-builder.ts`: ADHD 문구 포맷(1행동·우선순위 이모지·딥링크·꼬띠 한 줄) 적용.
- 기존 dome-inventory-poller(재고)·daily-slots(추천)·revival-score(부활) 재사용·신규 최소.

## 작업 유의사항/원칙 (재확인)
- **#252(보강)** 디스코드 채널 재활용 = 운영자가 채널명만 변경(webhook URL·env 불변)·Code는 라벨/라우팅만 조정. 내부 env 키명은 유지(라벨만 한글 용도 갱신)해 배포 중단 방지.
