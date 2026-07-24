# 💻 Claude Code 인계 — G1-A 꽃단장 문구 정비 (2026-07-22)

> **FROM** 🌸 Cowork · **TO** 💻 Claude Code
> **BASELINE**: main `17bf310` 이후
> **의존성**: **없음.** `*.strings.ko.json`만 건드림 → Cowork의 C5-b(컴포넌트/페이지)와 파일 겹침 0.

---

## 왜 지금 하는가 (보류 해제 근거)

D1에서 이 3파일은 *"꽃단장은 나중에 한 번에 수정"* 지시로 보류했었습니다. 그런데 실제 문구를 추출해보니 **페르소나 미적용만의 문제가 아니었습니다.**

**개발 은어 9건이 셀러 화면에 그대로 노출 중** — `#262`(화면 문구는 셀러 실무 용어로, 개발자 은어 금지) 위반입니다.

운영자의 "나중에 한 번에"는 **UI 구조 변경**을 뜻했고, 문구 정비는 구조와 독립적입니다(로딩·에러·빈상태 문구는 구조가 바뀌어도 살아남음). → **지금 해도 이중 작업이 아닙니다.**

`G1-B`(UI 구조 개편)는 스펙 미정의 상태로 `WAIT-OP` 유지입니다.

---

## SCOPE — 3파일

| 파일 | 페르소나 대상 | 은어 |
|---|---|---|
| `components/studio/AssetBrowser.strings.ko.json` | 13 | 2 |
| `components/products/GeneratedAssetLocations.strings.ko.json` | 12 | 1 |
| `lib/i18n/lifestyle-assets-strings.ko.json` | 12 | 6 |

### ① 개발 은어 제거 (#262) — 우선

| 현재 | 문제 | 방향 |
|---|---|---|
| `상품별·단계별 자산 관리 (저장소: Supabase Storage)...` | 인프라 이름 노출 | "저장소:" 이하 삭제 또는 "꽃틔움 보관함" |
| `Supabase 폴더 열기` (shortcut) | 동상 | "자산 폴더 열기" |
| `상품별·단계별 저장 위치 (저장소: Supabase Storage)` | 동상 | 동상 |
| `썸네일 lifestyle 변형의 배경 자산 풀. ConceptTone 태그 매칭 + 30일 cooldown으로 picker가...` | 완전한 개발 설명 | "썸네일 배경으로 쓸 사진 모음. 같은 사진이 30일 안에 다시 안 쓰이게 자동으로 돌려가며 골라요." |
| `cooldown 중 {n}개` | 셀러 용어 아님 | "쉬는 중 {n}개" |
| `ConceptTone 매칭 태그 (예: 30-40s, gift, premium, single)` | 내부 타입명 | "분위기 태그" + 예시는 유지 |
| `이 자산을 삭제할까요? Storage 파일 + DB row가 모두 제거됩니다.` | **"DB row"** | "이 사진을 삭제할까요? 파일과 기록이 함께 지워지고 되돌릴 수 없어요." |
| `라이선스 URL (선택)` | URL은 통용어라 유지 가능 | 판단 재량 |

### ② 페르sona 적용 (#283 경계 준수)

이 3파일은 **셀러 대면 앱 UI**이므로 페르소나 대상이 맞습니다(고객 대면 아님).
- 정원사 모드(까꿍/해유) 기본 — 자산 관리는 일상 작업
- 에러·삭제 확인은 카우걸(이랴/빵야)로 긴장감

**⚠️ 이모지 확인 필수**: 기존 문구에 `🌱` 이모지가 있습니다(`emptyAll`). 렌더 컴포넌트에 `// No emoji` 규율이 있는지 `grep -n "No emoji" <컴포넌트>.tsx`로 먼저 확인하고, 있으면 텍스트 마커만 사용하세요.

---

## 원칙

- **#29a** JSON은 `json.load` / `json.dump(ensure_ascii=False, indent=2)`로만. `edit_file` 한글 오염 실증됨
- **#262** 셀러 실무 용어. 개발자 은어 금지
- **#283** 이 3파일은 셀러 대면이므로 페르소나 적용 OK (고객 대면 상품 카피는 금지)
- **#284** `git add -A` 금지 — 자기 파일만 경로 지정. 남의 미커밋은 stash 금지·보고
- **#35** 문구는 `.ko.json` 단일 출처

## 검증

```bash
python3 scripts/persona-audit.py          # 0건 파일 3 → 0 목표
npx tsc --noEmit                          # JSON 구조 깨짐 방지
pkill -9 -f next                          # ⚠️ build 전 dev 반드시 kill (.next 충돌)
rm -rf .next && npm run build
```

**은어 재검사**(직접 확인 — 인계 문서는 증거가 아님 #283):
```bash
python3 -c "
import json,io,re
J=re.compile(r'Supabase|Storage|ConceptTone|cooldown|Sprint|DB row|endpoint|fallback|cache')
for f in ['src/components/studio/AssetBrowser.strings.ko.json','src/components/products/GeneratedAssetLocations.strings.ko.json','src/lib/i18n/lifestyle-assets-strings.ko.json']:
    d=json.load(io.open(f,encoding='utf-8'))
    def w(o,p=''):
        if isinstance(o,dict):
            for k,v in o.items(): yield from w(v,f'{p}.{k}' if p else k)
        elif isinstance(o,list):
            for i,v in enumerate(o): yield from w(v,f'{p}[{i}]')
        elif isinstance(o,str): yield (p,o)
    print(f, [k for k,v in w(d) if J.search(v) and not k.startswith('_meta')])
"
```

## 완료 시 인계

`docs/plan/TASK_BRIDGE.md` §3-A 보드의 `G1-A`를 `DONE`으로, §3 ACTIVE에 5-step 엔트리 추가. 최종 0건 파일 수 + 은어 잔여 수 기록.
