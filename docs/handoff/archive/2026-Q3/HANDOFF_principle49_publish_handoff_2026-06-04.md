# HANDOFF — 작업원칙 #49 등재 + P0 발행 트랙 인계 + 세션 MD 갱신

> 작성: 2026-06-04 Desktop (Filesystem:write_file 직접 인계 — 작업원칙 #49 첫 적용)
> FROM: Desktop  →  TO: Code
> 성격: 작업원칙 등재 + MD 갱신 + 발행 트랙 현황. 비가역 0(발행 미접촉).

---

## §0 ★ 작업원칙 #49 신설 — Desktop write_file 직접 인계 (손품 제거)

### 배경
기존 핑퐁은 Desktop이 핸드오프를 작성 → present_files로 대표가 다운로드 → Claude Code에
업로드(첨부)하는 사이클이었다. 대표 수작업(다운/업로드)이 매 핑퐁마다 발생.

### 실증 (2026-06-04 Desktop)
Filesystem:write_file로 docs/handoff/에 한글 핸드오프 직접 작성 → read 재검증 결과
**한글·특수문자(·, ★, →)·따옴표 깨짐 0** 확인. 다운/업로드 사이클 불필요 입증.

### 작업원칙 #49 (PRINCIPLES_LEARNED.md에 정식 등재 요청)
**Desktop → Code 인계 시, Desktop은 핸드오프 MD를 docs/handoff/에 Filesystem:write_file로
직접 작성한다.** 대표는 Code에 "docs/handoff/{파일명} 정독" 한 줄만 전달(다운/업로드 0).
- 적용 범위: **핸드오프/인계 문서**(일회성). Desktop write_file = 전체 작성(overwrite)이라 안전.
- 제약(불변): 큰 추적 MD 5종(PROGRESS/ROADMAP/SESSION_LOG/TASK_BRIDGE/CLAUDE) 및
  PRINCIPLES_LEARNED 등 **누적형 한글 MD의 부분 편집은 여전히 Code의 Python full-overwrite**
  (#29b 불변 — Desktop이 큰 파일 전체 덮어쓰면 기존 내용 유실 위험).
- git: Desktop write 파일은 git 미추적 → Code가 작업 turn에 git add/commit으로 보존.
- 즉 역할 분담: **Desktop=핸드오프 직접 쓰기 / Code=큰 추적 MD 반영 + git 보존.**

→ Code 할 일: PRINCIPLES_LEARNED.md에 #49 등재 + TASK_BRIDGE §1 역할표/§8에 반영.

---

## §1 P0 발행 트랙 현황 — 3축 검증 GREEN (발행 준비 완료)

| 검증축 | 결과 | 근거 |
|---|---|---|
| STEP 1 회선 | HTTP 200 | GET /api/naver/addressbooks (Code 실측) |
| STEP 2 L2 이미지 변환 | allShopPhinf=true | imageProbe: Cloudinary main + Supabase detail + 공지 → shop-phinf |
| STEP 3 발행 페이로드 | canRegister=true | dryRun 17필드 + 옵션3 COMBINATION + ETC 9키 |

- production HEAD f689625 (Desktop Vercel MCP 교차검증: READY, Code 보고 일치 #45).
- 명화(cmpnooli40001f0gveaxr8iim) status=DRAFT / naverProductId=null (미발행 안전).
- ★ 이미지 도메인 진실(확정): 발행 대표이미지=mainImage(Cloudinary 실사용),
  main_image_url(Supabase)=미사용 레거시, detail=Supabase. imageProbe로 변환 실증.
- 잔여 경고(비차단): dryRun 필수속성 재질·색상 누락 → attributeGrade 개선용(발행 가능).

### 발행은 별도 새 채팅 + 대표 명시 승인 (비가역 하드룰)
register/POST는 대표 명시 승인 없이 호출 0. §4 시작 문구로 새 채팅 진행.

---

## §2 디자인 파이프라인 현황 (대표 문의 답)

| 구분 | 항목 | 상태 |
|---|---|---|
| 완성 | 상세페이지 자동 합성 엔진(빌더 STEP1~5, production a6ea482) | 썸네일 4변형 + 무드배경 + HTML |
| 완성 | 명화 디자인 풀세트(Adobe 가공 + aroma + v2 시안) | 발행 가능 |
| 완성 | 도구 라우팅 #48(생성 Firefly / 가공 Adobe / 합성 빌더+Figma) | — |
| 이월 | Figma 마스터 양산 STEP2(7섹션 컴포넌트) | STEP1 Variables 69개만 완료 |
| 미활용 | Claude Design | 활용 이력 0 — 발행 후 검토 제안 |

→ **첫 발행(명화)은 디자인 완성 = 발행 무관. 양산 체계(Figma STEP2)는 발행 후 둘째 상품부터.**

---

## §3 Code 할 일 (이번 인계)
1. PRINCIPLES_LEARNED.md에 **작업원칙 #49** 등재(§0 본문).
2. TASK_BRIDGE §1 역할표에 "Desktop 핸드오프 직접 write" 반영 + §8 또는 §4 STANDING 보강.
3. 5종 MD §3/헤더 갱신: 이번 Desktop 세션(imageProbe 교차검증 #45 + 작업원칙 #49 + 디자인 현황).
   - 한글 MD = Python full-overwrite(#29b).
4. 테스트 잔재 정리: `docs/handoff/_DESKTOP_WRITE_TEST_2026-06-04.md` 삭제(git rm) — 실증용 임시.
5. 본 핸드오프 docs/handoff/ 유지(이미 Desktop이 직접 작성).

---

## §4 새 채팅 P0 발행 시작 문구 (대표 명시 승인 게이트)
```
꽃틔움 가든 Desktop 진입. P0 명화 첫 발행 — 비가역, 신중.
[STEP 0] PROGRESS.md 헤더 + TASK_BRIDGE §3 + docs/handoff/HANDOFF_principle49_publish_handoff_2026-06-04.md 정독.
[베이스라인] production f689625. 3축 검증 GREEN(회선 200·L2 allShopPhinf=true·dryRun canRegister=true).
[발행 대상] 명화 cmpnooli40001f0gveaxr8iim (마진 50.7%, DRAFT, naverProductId null).
[발행 직전 최종 실측] (1) Supabase로 status DRAFT·naverProductId null 재확인
  (2) production register {dryRun:true} 재호출로 페이로드 17필드 최종 점검
  (3) 회선 health 재확인.
[★ 발행] 위 전부 통과 + 대표 명시 승인 후에만 POST register(dryRun/imageProbe 없이). 비가역.
  성공 시 naverProductId 발급 → status ACTIVE → 발행 완주.
[발행 후] DEBT-12 L1 위젯 배지(P-3) + 둘째 상품 + Figma 양산 STEP2.
[하드룰] register/POST 대표 명시 승인 없이 호출 0. 변환 실패=중단+정직 보고(#46).
```

## §5 비가역 하드룰 (불변)
- register/POST 대표 명시 승인 없이 호출 0. 라이브 production 우선 권위(#45). 가짜 "등록 완료" 금지(#46).
