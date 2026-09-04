# SESSION_HANDOFF_2026-09-04_v3 — 새 채팅 시작 시 필독

> v2(UCE-10 발견+1군5개)의 후속. 이 세션에서 UCE-10 A/B/C 전체 완료,
> 발행게이트 중복구현 정리, §3 체크리스트 전항목 종결. origin/main=6745d3a.

---

## 1. 완료 사항 (전부 실측·프로덕션 검증됨)

### UCE-10 (카테고리 매처 결함) — 완전 종결
- 결함C: `isLeafItself` → `branchBreadthBonus`(형제d4개수 기반). 실측
  9/11 정답전환. "우산"(골프우산리프 실재)·"넥타이"(토크나이저 별개결함)
  는 알려진 예외로 테스트에 명시 고정.
- 결함B: "용" 삽입 정규화. 결함A: 소싱-API 검증경로 통일.
- 검증: tsc0, test:category-match 27/27, test:category-integrity 29/29.
- **프로덕션 API 직접실측**: 소파/조명/히터/귀걸이 정답전환 확인.
- 커밋: `cf2a635`(구현+병합), `c028fb2`(문서최종화)

### 발행게이트 정합성검사 — 중복구현 발견·정리
미병합 브랜치(`b077cbe`) 병합 시도 중 conflict → **같은날 다른세션이
동일문제(#355/#356)를 이미 다른구현(`274bbf2`)으로 main 배포완료**한
것 발견. 실측비교 후 `274bbf2` 채택(더 관대한 기준+#356 이원필드 대응+
테스트9/9), `b077cbe` 폐기. main 기존구현을 결함C 이후 마스터로 재검증
— 정상 작동(가습기↔조명, 아이스트레이↔홍합 재현 차단).

### §3 체크리스트(카테고리개편 전상품 재체크) — 5항목 전부 완료
1. 소싱 라벨 신마스터 검증 → 결함A로 해결
2. 발행게이트 정합성검사 → 274bbf2로 이미 해결 확인
3. **naver-settings 구마스터 잔존** → 이번 세션 실측: `FLOWER_CATEGORY_
   CODES` 13/13건 라벨불일치 확인. DB실측(`naverDefaults` 컬럼 자체
   미존재)으로 저장 자체가 안 되는 죽은 UI임을 확인 — 데이터오염 위험은
   낮으나 UX결함(저장버튼이 거짓 성공 응답). **브라우저 실측은 Chrome
   확장 연결끊김으로 미완**(정직보고, 다음 세션 재시도 필요).
4. test:category-match/integrity 회귀 → 통과 확인
5. 워크트리/문서 위생 → 완료(6→1개, main만 남음)

### 새 원칙 2건
- #360: `resize_window`가 OS창만 바꾸고 실제 뷰포트 미반영 가능 → 
  innerWidth/matchMedia로 반영확인 후 재검증
- #361: 병합직후 검증스크립트 "OK"도 도구결과일뿐(배포 QUEUED 구간
  존재) + 오래된 미병합 브랜치 병합 전 git log --all로 중복구현 확인

---

## 2. 🔴 미완 — 새 세션 우선순위

| # | 항목 | 상태 |
|---|---|---|
| 1 | naver-settings "기본 카테고리" Field 제거(FLOWER_CATEGORY_CODES 죽은데이터) | 제안됨, 승인 필요 |
| 2 | §3-항목3 브라우저 실측(Chrome 확장 재연결 후) | Chrome 확장 연결 필요 |
| 3 | UCE-11 후보 3건: "넥타이"(토크나이저 트레일링"이" 스트리핑)·"우산"(골프리프충돌)·"토마토고블렛"(식품오분류) | 미착수, 별도 티켓 |
| 4 | 1군 미완료: B3(꽃 한 송이 담기) 실사용 브라우저 검증 | 실 도매매URL 필요 |

---

## 3. 핵심 인계 메시지 (다음 세션용)

```
Target Session: 무관(Desktop 또는 Code 둘 다 가능)
Branch: main (origin/main=6745d3a)

[선행 확정] UCE-10(A/B/C) 완전종결·프로덕션반영. 발행게이트(274bbf2)
 확인완료. §3 체크리스트 5항목 전부 완료. 워크트리 main만 남음.

[다음 최우선 — 낮은 리스크] naver-settings 페이지 "기본 카테고리"
 필드(FLOWER_CATEGORY_CODES) 제거:
 - src/app/naver-settings/page.tsx L203의 <Field label="기본 카테고리"
   keyName="categoryCode" options={FLOWER_CATEGORY_CODES} /> 삭제
 - src/lib/naver/codes.ts의 FLOWER_CATEGORY_CODES export + import 정리
 - 근거: 13/13건 라벨불일치(2026-09-04 실측) + naverDefaults 컬럼
   자체가 DB에 없어 저장도 안 됨(silent no-op) — 완전한 죽은 UI
 - 삭제 전 브라우저로 실제 화면 재확인 권장(Chrome확장 연결 필요)

[UCE-11 후보 — 별도 티켓, 이번 스코프 밖 기록만]
 - "넥타이": extractNouns가 트레일링 "이"를 조사로 스트리핑 (별개 토크나이저버그)
 - "우산": 골프필드용품>우산 d4가 마스터에 실재(정당한 동음이의 충돌)
 - "토마토고블렛": 식품>토마토로 오분류

[1군 미완] B3(꽃 한 송이 담기) 실사용 브라우저 검증 — 실 도매매 URL
 필요, awaitfetch 코드 자체는 확인됨(안전).

[완료조건] naver-settings 삭제는 코드변경이라 tsc0+브라우저확인 후
 push. 그 외 전부 문서화만 필요하면 즉시 커밋.
```

---

## [v3 추가 — 2026-09-04 후속 세션] Chrome 재연결 후 브라우저 검증 + UCE-11 정리

### 완료 (origin/main=4f94b31)
- **naver-settings "기본 카테고리" 필드 제거 — 브라우저 실렌더 확인 완료**.
  "상품 기본" 섹션에 브랜드/원산지/부가세/상품상태/미성년자만 남고 죽은
  필드 사라짐. (rev132 #356 오염코드 3경로 차단의 UI 부분 최종 검증)
- **UCE-11 후보 문서화**: docs/design/UCE11_TOKENIZER_LONGNAME_CANDIDATES_
  2026-09-04.md. 프로덕션 API 실측으로 넥타이(오분류)·목걸이(정답,
  추정 정정)·얼음트레이→전기밥솥·토마토고블렛→토마토·우산(동음이의) +
  롱네임 복합신호(아이스트레이+보관함→주얼리보관함) 정리.

### ⚠️ 미해결 — B3(꽃 한 송이 담기) 자동이동 (다음 세션 Code 확인 필요)
- **담기 저장 자체는 성공 확인**(DB에 SOURCED crawl_log 생성 실측).
- **history 탭 자동이동은 첫 관찰에서 안 됨**(담기 클릭 후 URL이 여전히
  ?tab=single). 단 브라우저 자동화 스크롤/타이밍 요인 개입 가능성 있어
  단정 못 함(2차 재현은 form_input↔React state 미반영으로 크롤 자체 실패).
- 코드는 정확(handleSaveOnly L440 setTab('history') → router.replace('/crawl')
  존재, main 반영 확인). **Code CLI가 실제 로직 정밀 검토 권장** —
  router.replace가 프로덕션에서 실제 URL 전환하는지, setTimeout/state
  race 없는지. 브라우저 자동화보다 코드 검토가 정확·효율적(핑퐁).

### 학습화 점검
- 원칙 #357~#361 정상 축적. 클러스터 인덱스 #360/#361 반영 확인.
- ⚠️ **PRINCIPLES_LEARNED.md 1,437줄 — 1,500줄 분할 임계(#31) 근접.
  다음 세션에서 분할 필요.**
