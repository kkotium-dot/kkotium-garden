# HANDOFF — 무드-카메라 6축 이미지 시스템 앱 빌드 (Code 레인)
> 2026-06-16 세션8 · FROM 🖥 Desktop · TO 💻 Code
> Target Session: Claude Code CLI · Branch: feat/mood-camera-system (신규)
> 권위 = docs/design/MOOD_CAMERA_SPEC_SYSTEM.md · 근거 = docs/research/MOOD_TO_CAMERA_SPEC_RESEARCH_2026-06-16.md · 편집모드 = docs/playbook/FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md §9 · 원칙 = PRINCIPLES_LEARNED #82~#86

---

## 0. 목표 (한 줄)
상품별 하드코딩 0(#55). 무드 6축 채점 → 카메라 스펙 조회 → 프롬프트 조립 → 가드 → 생성 → 평점/즐겨찾기 학습. 운영 UX는 3단계(무드 선택 → 조립 → 생성) 유지.

## 1. 마이그레이션 (Prisma + Supabase, additive·비가역0)
신규 테이블 5종 (snake_case 테이블, 권위 문서 §5와 1:1):
```
mood_axis(id, code 'M1'..'M6' UNIQUE, name_ko, conversion_job, benchmark_dna text[])
camera_spec(id, mood_axis_id FK, camera_archetype, lens, aperture,
            lighting, color_grade, realism_cues, resolution, aspect_ratio)
prompt_block(id, type 'subject'|'surface'|'light'|'camera'|'finish'|'exclusion',
             mood_axis_id FK NULL, body_en, is_fixed bool)
prompt_library_entry(id, mood_axis_id FK, benchmark_dna text,
             assembled_prompt, camera_spec_id FK, product_category_tags text[],
             example_output_url, rating int CHECK 1..5, is_favorite bool,
             version int, parent_id FK self NULL, created_at, updated_at)
generation(id, entry_id FK, product_name, output_url,
           model, rating int, naver_ctr float NULL, created_at)
```
- 시드: mood_axis 6행(M1~M6) + camera_spec 6행(권위 §2 표 그대로) + prompt_block 고정 블록(공통 그레이드·긍정형 제외, is_fixed=true) + 무드별 subject/light 템플릿(§3).
- 규율: prompt_library_entry 발행분 불변 — 수정 = version++ 새 행 + parent_id(롤백). (무드,카테고리)별 최고평점 = 자동 추천 디폴트.
- prisma/schema.prisma 모델 추가 → `npx prisma migrate dev` 또는 Supabase apply_migration. src/lib/prisma.ts 싱글톤만(신규 PrismaClient 금지).

## 2. Layer 1·2·3 (라이브러리)
- **src/lib/mood/decision-table.ts** — 입력(6축 0~2점 + 카테고리 태그) → camera_spec 행 조회. 순수 룩업(상품 디커플).
- **src/lib/mood/prompt-assembler.ts** — `[가변 subject/팔레트/광] + [Layer1 조회 camera/realism] + [고정 그레이드/제외]` → 영어 프롬프트. 순서 Subject→Surface→Light→Lens/Camera→Finish. **제외는 긍정형만**(Gemini negativePrompt 필드 전송 금지·#86).
- **src/lib/mood/guards.ts** — 5종 반환: cameraVarietyApplied(배치 내 카메라 무드별 상이·단일디폴트 false)·referenceCleared·settingsVerified·exclusionsPresent·benchmarkDnaSet.

## 3. UI (3단계, 음차 금지·한글 표면 #73)
- 워크벤치 이미지 탭에 '무드 선택 → 조립 미리보기 → 생성' 3스텝. 무드 픽커 = (무드,카테고리)별 최고평점 라이브러리 항목 상단 노출(학습 반영). 결과물 즐겨찾기/평점 1클릭(수동 포착).
- Lucide 아이콘만(JSX 이모지 0)·영어 주석·한글 타입 리터럴 0.

## 4. firefly_auto 카드 subcheck (additive·#56 자연개입)
intervention.ts FireflyDropPayload + control-tower-engine ActionQueueItem에 5종 파생(기존 generateModeConfirmed·settingsVerified 동형 패턴):
`cameraVarietyApplied`·`referenceCleared`·`settingsVerified`·`exclusionsPresent`·`benchmarkDnaSet`. ko.json 라벨 추가. 위젯 체크리스트 1줄(Check/Clock·강제모달0). 전부 true일 때만 summary true.

## 5. 검증 게이트 (커밋 전 필수)
- `npx tsc --noEmit` 0 errors · `npm run build` 0 · 이모지 0 · 한글 타입 리터럴 0 · prisma 싱글톤 · 외부 image API 0 · 네이버 무접촉 · 비가역 0.
- 마이그레이션 후 Supabase 시드 6+6행 존재 확인. 프롬프트 조립기 단위테스트(6축 각 1건, 제외 긍정형·negativePrompt 부재).

## 6. 다음 (빌드 후)
[Desktop] cut-3(April/Canon)·cut-4(Black Cherry/Leica) 새 6축 프롬프트로 재개(트러스티드 클릭 새 이미지(+) 클리어 경로 §9) → ingest-firefly ×4 → 실앱 테스트. item3 명화 SUSPENSION→발행(대표 GO·비가역).
