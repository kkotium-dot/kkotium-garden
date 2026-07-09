# 마스터 트렌디 상태 색 시스템 — 앱 전체 택소노미 통일 (2026-07-08)

Authoring: DESKTOP(디자인 시스템). 구현=Code. 권위: 본 문서(전 택소노미 단일 언어) + TRENDY_STATUS_TAXONOMY_PALETTE(주문상태) + PHASE2C_SEMANTIC_REPAINT_POLICY. 원칙 #221/#224/#225/#226. 비게이트.
운영자 지시: "앱의 모든 구성 팔레트를 기능·상태에 맞게 통일". → 페이지별 즉흥 아닌 **단일 마스터 상태 색 시스템**으로 전 택소노미 매핑.

================================================================
## 1. 마스터 12색 (fg/bg/tx·WCAG AA 검증완)
================================================================
```
--m-amber-fg:#FFB020  --m-amber-bg:#FFF4E0  --m-amber-tx:#8A5A00
--m-sky-fg:#4DABF7    --m-sky-bg:#E7F5FF    --m-sky-tx:#0B5FA5
--m-violet-fg:#7C6BF0 --m-violet-bg:#EFECFE --m-violet-tx:#4B3BB5
--m-mint-fg:#12B886   --m-mint-bg:#E6FCF5   --m-mint-tx:#0B6E50
--m-teal-fg:#0CA678   --m-teal-bg:#E3FAF1   --m-teal-tx:#075E44
--m-cyan-fg:#22B8CF   --m-cyan-bg:#E3FAFC   --m-cyan-tx:#0B6B7C
--m-coral-fg:#FF4757  --m-coral-bg:#FFE9EC  --m-coral-tx:#B21F2C
--m-orange-fg:#FF922B --m-orange-bg:#FFF0E0 --m-orange-tx:#9A4E00
--m-grape-fg:#E64980  --m-grape-bg:#FFE8F0  --m-grape-tx:#A61E4D
--m-indigo-fg:#4263EB --m-indigo-bg:#E8ECFF --m-indigo-tx:#2B44B5
--m-lime-fg:#66A80F   --m-lime-bg:#F0FBE0   --m-lime-tx:#3F6600
--m-gray-fg:#868E96   --m-gray-bg:#F1F3F5   --m-gray-tx:#495057
```
- tx(텍스트) on bg = 5.44~7.35 · on white = 5.93~8.18 (전부 AA). fg=점/보더/솔리드(대형+흰텍스트만).

================================================================
## 2. 사용 규칙 (#226·Code 실측 확립)
================================================================
- **배지/칩**: 배경 = -bg 틴트 · 텍스트 = -tx(다크·AA) · 점/좌보더 = -fg.
- **보더 강조**: -fg. **아이콘**: -fg(대형) or -tx(소형 텍스트 옆).
- **솔리드 배경+흰 텍스트**: -fg 배경은 대형/볼드에만(소형 흰텍스트 대비 부족 → -tx 계열 배경 or 잉크).
- 일반 단일의미 시맨틱(#224 A)은 4토큰(--success/warning/danger/info) = mint/amber(or orange)/coral/sky의 별칭.

================================================================
## 3. 택소노미 → hue 매핑 (전 상태 통일)
================================================================
**주문상태(8)**: 결제대기 amber · 결제완료 sky · 배송중 violet · 배송완료 mint · 구매확정 teal · 교환 cyan · 취소 coral · 반품 orange.
**관제탑 STATUS(6)**: done mint · in_progress sky · pending amber · blocked coral · awaiting_human violet · none gray.
**관제탑 OVERALL(5)**: risk coral · attention orange · caution amber · ok mint · none gray.
**꿀통 등급(S~D)**: S grape · A mint · B sky · C amber · D coral(품질 하강 gradient).
**MODE(3)**: 단순 amber/sky/violet 배정(의미순). **LINE(2)**: sky/gray. **TIER(4)**: grape/violet/sky/gray(등급순). **CATEGORY(4)**: 임의 구분 hue(mint/sky/violet/orange).
**일반 시맨틱**: 성공 mint(--success) · 경고 amber/orange(--warning) · 위험 coral(--danger) · 정보 sky(--info).

================================================================
## 4. Code 적용 (페이지군별·검증)
================================================================
- 각 택소노미 STATUS 맵의 하드코딩 헥스 → 위 매핑의 --m-* 변수(fg/bg/tx 3값 규칙 #226).
- 상태 구분 보존(#224)·트렌디 통일·AA. 페이지군별 push → Desktop 검증(상태 구분·트렌디·대비·콘솔0).
- 순서: 일반 시맨틱(진행중 1a~) → 주문상태 → 관제탑 STATUS/OVERALL → 등급 → MODE/LINE/TIER/CATEGORY.

================================================================
## 작업 유의사항/원칙 (신규)
================================================================
- **#226** 상태 배지 색 규칙 = 배경 -bg틴트·텍스트 -tx다크(AA)·점/보더 -fg. 트렌디 토큰은 밝아 소형 텍스트/아이콘엔 -tx(다크) 사용(대비). 솔리드+흰텍스트는 대형/볼드만.
- **#227** 앱 전 택소노미(주문/관제탑/등급/MODE/LINE/TIER)는 **단일 마스터 상태 색 시스템(12 hue)**에서 배정 — 페이지별 즉흥 색 금지. 상태 구분(#224) 유지하며 하나의 트렌디 언어로 통일. 신규 상태 추가 시 마스터 12색에서 선택.
