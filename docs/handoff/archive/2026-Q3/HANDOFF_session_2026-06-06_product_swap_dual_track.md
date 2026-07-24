# HANDOFF — 세션 인계 (2026-06-06 Desktop, 제품교체 B안 + 두 트랙 병행)

> **세션 성격**: Desktop (MCP·검증·DB·브라우저·docs write)
> **다음 세션이 이어갈 것**: 트랙 A(명화 실전) + 트랙 B(앱 내장 코드) 병행
> **권위 문서**:
>   - docs/research/KKOTIUM_PRODUCT_SWAP_LOOP_DESIGN_2026-06-06.md (B안 전체 근거)
>   - docs/research/KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md (상위 체계)
>   - docs/handoff/HANDOFF_phase2_product_swap_app_2026-06-06.md (Code 작업 지시서)

---

## 1. 이번 세션 한 일 (COMPLETED)

- **제품교체 루프 연구 완료** → docs 박제. 핵심 결론: A안(제품 AI 재생성) 폐기, **B안(실제 제품 누끼 고정 + 배경만 AI + 합성 + 빛 정합) 확정**. 근거: Adobe/Google 공식 문서가 재생성 시 라벨 보존 미보장 + 전자상거래 AI사진 업계 일치 + 소비자 71% 실물불일치 반품(Salsify).
- **Firefly 무드배경 1장 생성 실증** (Nano Banana Pro, 1:1, 우드톤+화이트+차안). 단 제품은 "상상의 원통형 디퓨저"라 B안에서 배경 템플릿으로만 활용, 제품은 버림.
- **asset_jobs 큐 B안 6단계 박제 + 의존관계 자동 게이트 보정** (Supabase live). 명화 product_id=cmpnooli40001f0gveaxr8iim.
- **Code 핸드오프 박제** (Phase 2 앱 내장 작업 1~6).
- **기존 누끼 실측**: 253x776 RGBA, 투명 61.4% → 배경제거는 됐으나 저해상 = 발행 부적합(테스트용만).
- **도매매 화보 실측**: 고해상 상품 이미지는 사업자 로그인 뒤에만 표시 = AI 직접 확보 불가, 대표 손 필요.

## 2. asset_jobs 명화 B안 큐 현재 상태 (Supabase live)

| job_id | step | job_type | tool | status | 다음 트리거 |
|---|---|---|---|---|---|
| aj_mh_b_cut | 1 누끼 | remove_bg | adobe_express | **ready** | 고해상 누끼 확보 시 진행 |
| aj_mh_b_bg | 2 배경 | firefly_generate | firefly | **awaiting_approval** | 대표 Firefly 1-click |
| aj_mh_b_cmp | 3 합성 | sharp_composite | figma | blocked | 1+2 done 시 자동 해제 |
| aj_mh_b_harm | 4 빛정합 | color_correct | adobe_express | blocked | 3 done 시 |
| aj_mh_b_norm | 5 규격화 | resize | sharp | blocked | 4 done 시 |
| aj_mh_b_pub | 6 발행 | naver_image_upload | naver_api | blocked | 5 done + **비가역 대표 승인** |

(구 A안 job 4개 = cancelled, 감사기록 보존). 전부 ip_safe=true.

## 3. 두 트랙 다음 액션 (우선순위)

### 트랙 B — 앱 내장 (Code 환경)
- 대표가 핸드오프 문구를 **Claude Code 앱/새 채팅에 붙여넣기** → Phase 2 작업 1~6 시공 시작.
- Target Session: phase2-product-swap-app / Branch: main.
- 작업: ①스키마확장(job_type 6종+status awaiting_human/review/rejected+asset_references) ②상태머신 전이확장 ③워크플로우 API+UI(컨셉카드→타임라인→awaiting_human CTA→before/after슬라이더) ④관제탑 product_swap 집계 ⑤Sharp 규격화(대표=흰배경누끼/상세=860px) ⑥5종 MD갱신.
- Code push 후 → Desktop이 Supabase apply_migration + Chrome UI 실측 + 명화 B안 end-to-end.

### 트랙 A — 명화 실전 (대표 손 + Desktop)
- **대표**: 도매매 로그인 → Adobe Express로 명화 제품 고해상 누끼 제작·다운로드 (반자동 분담: 로그인·업로드·다운로드 = 사람).
- **확보 후 Desktop(AI)**: Firefly로 배경만 재생성(제품 없이, 우드톤/화이트/차안 + ratio main 1:1 / sub 4:5 / detail 16:9) → Photoshop/Sharp 합성 → 빛정합 → 검수.
- 대안(대표 부담 줄이기): Desktop이 기존 저해상 누끼로 B안 합성 **리허설** 먼저 → 파이프라인 검증 후 고해상으로 실전 전환.

## 4. 영구 원칙 (이번 세션 확정/재확인)

- **B안 절대 원칙**: 실제 제품 누끼 고정, AI는 배경만. 라벨·형태 왜곡 0. 제품 재생성(채우기 swap) 금지.
- **대표이미지 = 흰배경 누끼만**(네이버 2024-10-28 정책). 라이프스타일 합성컷은 상세/추가만.
- **이미지 생성 = 최고 품질 모델**(면책/크레딧 불문, 대표 확정). 단 판매물 상업 사용권 발행 전 확인.
- **브라우저 반자동(대표 표준)**: 대표가 로그인 Chrome 열어두면 AI 이어받기. 업로드/CAPTCHA/비가역 클릭=사람, 프롬프트·생성·선택·폴링=AI. detect→deliver(앱 알림)→resume.
- **각 프로그램 장점 최대 활용**: Firefly=생성 / Photoshop=정밀합성·빛정합 / Express=마감·Bulk Create 대량 / Claude Design=시안·관제탑 / Sharp=규격화.
- **비가역 0(#46)**: 네이버 PUT/POST 대표 명시 승인 없이 0.
- **명화 의도적 SUSPENSION**: 대표가 미완성 노출 방지로 설정. 결함 아님. AUTOSUSPEND off 유지.
- **환경 분담(#41)**: Desktop=MCP·검증·DB·브라우저·docs write / Code=파일작성·git·tsc/build. Desktop은 코드파일/커밋 불가 = 정직 보고.

## 5. 잔여 병행 트랙 (누락 방지 추적)

- 채널상품 회선(/v1) ECONNRESET → 고정IP 이전(Cloudflare Tunnel 또는 유료 egress).
- 명화 mainImage 승격 → 네이버 반영 PUT(비가역, 대표 승인).
- 명화 SALE 전환(대표 의도적 보류 — 준비 완료 후 대표 결정).
- 5종 추적 MD 갱신(Code 위임, Phase 2 작업 6).
- `* 2.*` macOS 중복본 정리(대표 결정 대기, #34).

## 6. 현재 시스템 건강도 (이번 세션 라이브 검증)

- Phase 1 누락방지 골격: production live. /dashboard 200, 관제탑 매트릭스 migrationPending=false, 명화 행 image=in_progress/publish=pending/overall=caution 정상.
- asset_jobs/asset_job_transitions/published_assets 3테이블 정합(20/8/7 컬럼).
