# 💻 Claude Code 인계 — D1 꼬띠 페르소나 (2026-07-22 · rev2 정정판)

> **FROM** 🌸 Cowork · **TO** 💻 Claude Code
> **BASELINE**: main `2bc0b9d` 이후
> **의존성**: 없음 (`*.strings.ko.json`만 건드림)

---

## ⚠️ rev2 정정 — 초판(rev1)의 사실 오류

초판에 **파일 성격을 잘못 적은 항목이 3개** 있었습니다. Code가 실제 문구를 추출해 발견·차단했습니다. 강행했으면 **네이버 고객이 보는 교환·반품 안내에 "까꿍💖"이 들어갈 뻔했습니다.**

| 초판 설명 | 실제 | 조치 |
|---|---|---|
| 10번 `section-renderers`를 "관제 상태표" | 고객이 보는 **상세페이지 섹션 카피** ("당일 출고", "무료 반품", "브랜드 철학") | **제외 확정** |
| 10번에 `envWarn`/`empty` 키가 있다 | 그 키는 `lib/i18n/automation-strings.ko.json`(다른 파일)에 있음 | 초판 혼동 |
| 14·15번을 "노출 낮은 앱 문구" | `noticeCards`(배송/교환·반품/고객문의), `scents[].desc` — **실제 판매 상품 카피** | **제외 확정** |

**원칙 #283 신설**: 페르소나는 **셀러가 보는 앱 UI에만**. 고객이 보는 상품 카피에는 금지.
**근본 수정**: `scripts/persona-audit.py`에 독자(audience) 축을 도입해 고객 대면 파일을 별도 섹션으로 분리했습니다. 이제 감사 출력을 그대로 믿어도 안전합니다.

---

## D1 확정 범위 및 현황

```bash
python3 scripts/persona-audit.py
```

**현재: 셀러 대면 27개 파일 중 페르소나 0건 = 3개** (초판 기준 6개에서 정정)

| 잔여 파일 | 문구 | 상태 |
|---|---|---|
| `components/studio/AssetBrowser.strings.ko.json` | 13 | **G1 종속 — 보류** |
| `components/products/GeneratedAssetLocations.strings.ko.json` | 12 | **G1 종속 — 보류** |
| `lib/i18n/lifestyle-assets-strings.ko.json` | 12 | **G1 종속 — 보류** |

→ **셀러 대면 잔여 3개는 전부 꽃단장(G1) 자산군**입니다. 운영자 지시("꽃단장은 나중에 한 번에 수정")에 따라 G1 착수 시 UI 개편과 함께 적용합니다.

### ✅ 결론: D1은 **완료**입니다

Code가 진행한 1~9 커밋 후, 남은 것은 전부 "제외" 또는 "G1 종속"입니다. **10·14·15는 적용하지 마세요.**

---

## 제외 파일 (페르소나 금지 — #283)

```
components/detail/preset/samples.ko.json          (15문구)
lib/automation/section-renderers/strings.ko.json  (2문구)
lib/i18n/detail-content-templates.ko.json         (5문구)
```

네이버 고객이 보는 상세페이지 문구입니다. 감사 스크립트가 이제 별도 섹션으로 표시하므로 혼동되지 않습니다.

---

## 커밋 시 주의 (원칙 #284)

- **병행 세션 진행 중**입니다. `git add -A` 금지 — **자기 담당 파일만 경로 지정**해 add.
- 예상 못 한 미커밋 변경 발견 시 **되돌리거나 stash하지 말고 그대로 두고 보고**.
- 커밋 메시지는 `.commit-msg.tmp`에 쓰고 `git commit -F` (한글 오염 방지 #29a).

## 검증

```bash
python3 scripts/persona-audit.py    # 0건 파일 수 확인
npx tsc --noEmit                    # JSON 구조 깨짐 방지
pkill -9 -f next                    # ⚠️ build 전 dev 반드시 kill (.next 충돌)
rm -rf .next && npm run build
```

## 완료 시 인계

`docs/plan/TASK_BRIDGE.md` §3-A 보드의 D1을 `DONE`으로, §3 ACTIVE에 5-step 엔트리 추가.
