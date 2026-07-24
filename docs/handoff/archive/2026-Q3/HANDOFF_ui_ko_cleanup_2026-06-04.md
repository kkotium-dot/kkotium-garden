# HANDOFF — UI/UX 한글화 + 템플릿 잔재 제거 (전수 점검 결과)

> 작성: 2026-06-04 (Desktop) | Target Session: code-cli | Branch: 신규 feature/ui-ko-cleanup 권장
> baseline: production HEAD a6ea482 (빌더 머지 후)
> 성격: 가산식·저위험(문구·삭제 위주). 비가역 0(발행 미접촉). 단, 라우트 삭제 1건은 신중.
> 권위: 본 문서 + docs/research/TOOL_ECOSYSTEM_MANUAL_2026-06-04.md
> ★ 대원칙: 코드 한글 하드코딩 금지(#35) — 사용자 문구는 i18n로. 이모지 금지·Lucide 아이콘(#코드원칙).

---

## 0. 전수 점검 결과 — 28개 화면, 두 부류

Desktop가 28개 page.tsx + studio i18n을 점검. 문제는 두 종류로 명확히 분리됨.

### A. 템플릿 잔재 (삭제/교정 — 대표 승인 완료)
| 대상 | 문제 | 조치 |
|---|---|---|
| src/app/portfolio/page.tsx | "John의 파이썬 포트폴리오" 가짜 화면 통째 (우리 앱과 무관) | **삭제** |
| src/app/page.tsx | 첫 진입점이 /portfolio로 redirect + "Loading Portfolio..." 영어 | **/dashboard로 redirect 교정** + 로딩문구 한글 |
| src/app/upload/page.tsx | "Excel 대량 업로드" 영어 제목 + 이모지(📋📁⏳🚀) 다수 | 한글 제목 + Lucide 아이콘. ★단 studio 워크벤치 업로드와 기능 중복 여부 먼저 확인 — 중복이면 통합/삭제 검토, 살릴 거면 한글화 |

★ 라우트 삭제 주의: portfolio 삭제 전 (1) 다른 곳에서 link/import 참조 없는지 grep (2) 삭제 후 / → /dashboard redirect 정상인지 build 확인.

### B. 진짜 운영 화면 — 문구 한글화 (구조는 양호, 문구만)
- 대시보드(/dashboard)는 이미 완성도 높음(정원 일지/씨앗심기 등) — 손대지 말 것.
- 핵심 수정처는 **src/lib/i18n/studio-strings.ko.json** (온실 아틀리에 문구가 여기 집중).
- crawl/orders 등은 사용자 노출 영어 라벨만 점진 한글화(주석 영어는 유지 — 코드원칙).

---

## 1. ★ 브랜드 용어 사전 (대표 승인 완료) — 앱 전체 일관 적용

| 개발용어(현재) | 확정 한글 | 비고 |
|---|---|---|
| 누끼 PNG / cutout | 배경 제거 이미지 | 단, 디자이너 내부용 툴팁엔 "누끼" 병기 가능 |
| 골격 / skeleton | 페이지 구성(레이아웃) | 기술용어 제거 |
| 에셋 저장 (Supabase Storage) | 이미지 저장 | 내부 시스템명(Supabase) 숨김 |
| public URL 발급됨 | 저장 완료 (공유 링크 생성) | |
| Clean / Price / Badge / Lifestyle | 깔끔형 / 가격강조형 / 뱃지형 / 감성형 | 기존 한글 보강 활용 |
| fallback 사용 ({n}/{total}) | 기본 템플릿 적용 ({n}/{total}) | |
| L1/L2/L3/L4 | 자동/보강/검수/디자이너 단계 | 라벨에도 단어 반영(툴팁은 유지) |
| matchScore / ms 소요 | 적합도 점수 / 처리 시간 | "ms" 단위표기 제거 또는 "초"로 |
| dropzone / stepper / HITL | 업로드 영역 / 진행 단계 / (삭제) | 내부 전문어 제거 |

★ 적용처: studio-strings.ko.json의 thumbnail.variants, detail.skeleton*, actions.*,
   diagnosis.grade*, kftc.fallbackNote, workbench.* 등. 의미 보존하며 위 사전대로 치환.

---

## 2. ★★ #47 인물 정책 잔재 교체 (중요 — 정책 불일치)

studio-strings.ko.json > workbench.firefly.faceFreeNote 현재값:
  "★얼굴 없는 인체 일부 전략 — 프롬프트에 얼굴 생성 금지 문구 포함됨 (손/부분 토르소만, IP 안전)"
→ 이는 **폐기된 구 정책(#47 이전)**. 신정책(익명 일반 모델 허용 / 특정 실존인물·유명인만 금지 /
   미성년 부적절 묘사 금지)과 불일치.
교체안(예):
  "★인물 정책 — 익명 일반 모델은 허용, 특정 실존인물·유명인은 생성 금지(IP·초상권 안전).
   프롬프트가 자동으로 이 가드를 포함합니다."
★ 코드 측(category-tone-mapper / backdrop-vlm-gate)은 이미 #47 정합 완료. 문자열만 잔존 → 문구 교체로 일치.

---

## 3. 작업 순서 (저위험부터)
1. studio-strings.ko.json 용어 사전 치환 + faceFreeNote 교체 (문구만, 회귀 0).
2. src/app/page.tsx redirect /portfolio → /dashboard + 로딩문구 한글.
3. portfolio 참조 grep 0 확인 → src/app/portfolio 삭제.
4. /upload 기능 중복 확인 → 한글화 또는 통합.
5. crawl/orders 등 잔여 영어 라벨 점진 한글화(별도 커밋 가능).

## 검증 (각 단계)
- npx tsc --noEmit 0 / npm run build OK (특히 portfolio 삭제 후 / redirect)
- 코드 한글 하드코딩 0(#35) — 신규 문구는 i18n 경유 / 주석 영어
- 이모지 0 — Lucide 아이콘 교체
- sentinel grep 0 / 비가역 0(발행·DB mutate 0)
- 단계별 commit 분리(.commit-msg.tmp + git commit -F #17, heredoc 금지 #26), 5 MD 핑퐁

## 다음 (Desktop)
- 한글화 후 production에서 온실 아틀리에/대시보드/첫 화면 노출 문구 육안 점검(대표 확인용).
- 이후 발행 관제탑(publish-readiness 신호등 대시보드) 신설 — 본 한글화 용어 사전 위에 구축.
