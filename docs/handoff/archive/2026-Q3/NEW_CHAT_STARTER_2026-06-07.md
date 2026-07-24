# 새 채팅 시작 메시지 (복붙용) — 2026-06-07 이미지·SEO·크롭/편집

아래 블록을 새 채팅에 그대로 붙여넣어 이어가세요.

---

```
[꽃틔움 가든 — 세션 이어가기]
환경: (Desktop=MCP/검증/DB/표준 · Code=코드/git/빌드/스키마)
원칙: 비가역0(#46 네이버 PUT은 명시 GO) · 실측우선(#45 Code보고 불신, production 직접 단정) · 환경분담(#41) · 닉네임 본문금지(#29) · 세션종료시 새채팅 인계메시지 항상 생성.

[필독 — 이 순서로]
1) docs/handoff/MASTER_HANDOFF_2026-06-07_image_seo_crop_edit.md  ← 누락0 마스터 인계
2) docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md  ← 썸네일 크롭·편집 표준(영구 기준)
3) docs/decisions/2026-06-07-myeonghwa-images-edit-toolchain.md  ← 명화 이미지 결정
4) docs/plan/TASK_BRIDGE.md §3 최신

[현재 상태 한 줄]
명화 디퓨저 발행준비 A/84 완료(origin 국산·재질/색상·향4·정보고시 HB21-12-2572/HB19-12-1462 전부 검증). 남은 건 대표/상세 이미지 적용 → 발행전 프리뷰 → 발행 GO → PUT(비가역).

[명화 이미지 결정(확정)]
- 대표 = 가죽 도어 단품 장착컷(기준컷 #3). 추가컷 #4 흰접시단품/#1 대시보드/#5 기프트박스.
- 상세 = 라인A(공급사 양질 상세 그대로 + SEO보강). 현 detail-S6(빈 스켈레톤) 교체대상.
- 기준컷 5종: /mnt/user-data/uploads/스크린샷_2026-06-07_오후_11_02_*.png
- v2 썸네일 생산본: /mnt/user-data/outputs/v2_thumb_*.jpg

[다음 행동 — 환경별]
A) 도구 활성(Firefly/Adobe/Canva 커넥터 or 이미지실행) 세션:
   1. 대표 #3 컷 1:1 영역확장(outpaint) → 업로드 → mainImage 적용(가역)
   2. 공급사 양질 상세 hosting → detail_image_url 교체(가역)
   3. 발행전 프리뷰 canPublish=true 확인
   4. 운영자 발행 GO → update confirm:true PUT(비가역) → inspect 3중검증
B) Code 세션 (핸드오프: docs/handoff/HANDOFF_session_2026-06-07_5_crop_edit_workflow_apply.md):
   T1 발행전 프리뷰 크롭 스튜디오(영역 드래그지정 + 자동후보 갤러리 + 글씨제거/1:1확장/배경정리 버튼)
   T2 thumb-crop 게이트 완화(라인A <1000px 경고화)
   T3 job_type 4종 추가(region_crop/text_remove/canvas_expand/bg_clean) + 도구 라우팅
   T4 라인 자동판정 → 관제탑 nextAction 라인별
   T5 전상품 적용(달항아리 A/84 발행 / 아이스트레이 재질)
   + SESSION_LOG/PROGRESS/TASK_BRIDGE에 2026-06-07 세션 반영(Python 전체덮어쓰기)

[검증] tsc0/build/이모지0/한글코드0/비가역0. push→Desktop이 production 3중 단정.
[데이터 기반] asset_jobs에 lane·tool(firefly/adobe_express/figma/canva/claude_design/sharp/naver_api)·input_refs/output_refs(jsonb) 이미 존재 — 도구 라우팅·지정좌표 저장 완비, 편집 job_type 4종만 추가하면 됨.
```

---

## 인계 체크리스트 (확인용)
- [x] 마스터 인계 문서 작성 (MASTER_HANDOFF_2026-06-07)
- [x] 썸네일 크롭·편집 표준 박제 (THUMBNAIL_CROP_EDIT_STANDARD)
- [x] 명화 이미지 결정 기록 (decisions)
- [x] Code 시공 핸드오프 (HANDOFF...5_crop_edit_workflow_apply)
- [x] 새 채팅 복붙 메시지 (본 문서)
- [ ] SESSION_LOG/PROGRESS/TASK_BRIDGE 본문 반영 → Code Python 전체덮어쓰기 위임(대형 한글 MD 손상방지)
