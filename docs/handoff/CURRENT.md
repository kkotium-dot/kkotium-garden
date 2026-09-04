# 현재 인계 (CURRENT) — 2026-09-04 세션 (UCE-11 결함A + 문서분할 + 크롤 UPSERT 3건 완료)

> 이 파일이 최신 인계입니다. 구 스냅샷은 `docs/handoff/SESSION_HANDOFF_2026-09-04_v3.md` 및 그 이전 파일들 — 필요시 참고용으로만.

- **status**: 이번 세션 인계 3건(UCE-11 결함A, PRINCIPLES_LEARNED 분할, 크롤 중복행 UPSERT) 전부 완료·커밋. 1군 5개 피드백(B1/B2/B3/B8/B10) 전부 완료·병합·브라우저 검증(직전 세션, bd1efe5).
- **branch**: `main` — 아래 4개 커밋 전부 main에 직접 커밋됨(feature 브랜치 없음, 저위험·즉시확인 가능 변경 기준).
- **배포 상태**: HEAD `4b3ca93`. **push·Vercel 배포·verify-vercel-deploy.sh 미실행** — 다음 세션 최우선 작업(아래 "다음 세션 시작 순서" 참조).

---

## 이번 세션 작업 3건 (전부 완료)

### 1. UCE-11 결함A(트레일링 "이" 스트리핑) 확정·수정 — 커밋 `4bbdfd9`

`extractNouns()`(morpheme-tokenizer.ts) 직접 실행으로 가설 확정: "넥타이"→"넥타"로 스트리핑되던 것을("목걸이"는 COMPOUND_NOUNS의 '걸이' 부분매치로 우연히 보호받아 정답이었을 뿐). 카탈로그 밖 "~이" 어미 20종 + "트레이/고블렛" 복합명사 20종 전수 dryRun(#352)으로 영향범위 측정 후, 표준어·고빈도 확신 있는 6종(**넥타이·손잡이·재떨이·손톱깎이·딸랑이·지팡이**)만 `identity-dictionary.ts` COMPOUND_NOUNS에 추가(#353 고신뢰만 자동).

- **손트레이스로 매처 결과를 예단하면 안 된다는 교훈**: headNounWeight의 부분포함 관용성 때문에 이 수정이 "넥타이" 자체의 오분류엔 영향 없을 것으로 예상했으나, 실측(test:category-match)은 반대 — 실제로 출산/육아>유아동잡화(오답)→패션잡화>패션소품(정답)으로 전환됨.
- **결함C(얼음트레이→전기밥솥 오분류)는 결함A와 무관함을 실측으로 반증**: 매처가 원본 name도 haystack으로 쓰기 때문에 트레일링-이 스트리핑과 무관하게 "트레이"가 부분매칭된다. 별도 후속 사안 — `docs/design/UCE11_TOKENIZER_LONGNAME_CANDIDATES_2026-09-04.md` "보류 후보" 참조.
- 검증: `test:category-match` 27/27, `test:category-integrity` 29/29(회귀 0). `CATEGORY_MATCH_LOGIC_VERSION` 2→3(#351 캐시 무효화).

### 2. PRINCIPLES_LEARNED.md 분할(#31) — 커밋 `d6fa5f0`

1437줄 → 512줄. #254~#331 구간(925줄, 원문 그대로)을 `docs/plan/archive/PRINCIPLES_LEARNED_archived-2026-09-04.md`로 이관. 재구성 diff(archive+kept == 원본)로 원문 손실 없음 확인, 한글 sentinel grep 0건.

### 3. 크롤 중복행 UPSERT(트리아지 A-3) — 커밋 `4b3ca93`

`domemae/route.ts`의 크롤시점 INSERT를 "같은 url의 SOURCED 행이 있으면 UPDATE, 없으면(최초 또는 이미 PENDING/REGISTERED로 진행됨) INSERT"로 변경. unique 제약 없이 SELECT-then-UPDATE 패턴(스키마 마이그레이션 불필요, `/api/crawler/logs` POST 핸들러와 동일 패턴).

로컬 dev + 실 DB로 실측(도매꾹 실 URL 2종): SOURCED 상태 URL 재크롤 2회 → 행 1개 유지·id 불변·crawled_at만 갱신. REGISTERED 상태 URL 재크롤 → 기존 이력 행 원문 그대로 보존, 새 SOURCED 행만 추가 생성(이력 안 덮어씀 확인). 테스트로 생성된 부가 행은 즉시 삭제로 정리.

**공통 검증 한계**: 세 건 모두 `tsc --noEmit` 0, 회귀테스트/실DB 실측으로 검증했으나 **브라우저 UI 조작 자체는 이번 세션에서 하지 않음**(API/DB 레벨 실측으로 대체). 다음 세션에서 기회 되면 `/crawl` 페이지 실렌더로 보강 확인 권장(필수는 아님 — 근본원인이 명확히 확정됐고 API 레벨 실측이 충분히 신뢰 가능).

---

## 다음 세션 시작 순서

```
1. [필수] 이번 세션 4개 커밋(4bbdfd9·d6fa5f0·4b3ca93 + 직전 세션 bd1efe5 이미 반영)
   push → verify-vercel-deploy.sh --wait 확인 (#361 절차 — get_deployment로 state:READY+
   프로덕션 alias 직접확인까지)
2. [선택] UCE-11 보류 후보 — docs/design/UCE11_TOKENIZER_LONGNAME_CANDIDATES_2026-09-04.md
   "보류 후보" 참조:
   - 결함C(트레이 promiscuity): "얼음/다용도/화장품/주방/서빙트레이"가 여전히
     디지털/가전>주방가전>전기밥솥으로 오분류. 정답 브랜치(생활/건강>주방용품>
     보관/밀폐용기)에 범용 "트레이" 리프가 없어 경쟁 후보가 없는 게 근본원인 —
     리프 커버리지 확장 또는 매처 promiscuity 완화 필요.
   - 결함B(우산 동음이의): 골프우산/패션우산 정당한 리프 충돌, 자동해결 난이도 높음
     — UCE-4 개입큐(사람확인) 후보로 유지.
3. [선택] 트리아지에 남은 2~4군 피드백(B4~B15) — 순차 진행 후보(직전 세션 인계 참조)
4. git stash `z3c-misdirected-changes-needs-redo` 처리 방향 — 여전히 운영자 결정 대기
5. category_20260904_084158.xls (repo root, untracked) — 정체 불명 파일, 운영자 확인 필요
   (의심 파일 자동 처리 금지 원칙 #34, 손대지 않고 기록만)
```

---

## 절대 잊지 말 것 (운영 원칙 재확인)
- 네이버 PUT/POST → 운영자 GO 없이 금지 · 자동발행 영구금지(#307)
- 디스코드 실발송 → 승인 없이 금지
- 테스트 데이터 방치 금지(이번 세션 크롤 UPSERT 테스트 행은 즉시 정리 완료)
- git stash `z3c-misdirected-changes-needs-redo` — 여전히 손대지 않음, 운영자 결정 대기
