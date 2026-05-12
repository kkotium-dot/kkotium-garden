# 작업원칙 — 절대 작업 원칙 #1~#25 + UI/세션/보고

> **이 파일의 역할**: 코드 작성 / UI / 세션 관리 / 보고 절대 원칙. PROGRESS.md에서 분리됨 (작업원칙 #31 (b)).
> **학습된 원칙 (#26~#36)**: `docs/plan/PRINCIPLES_LEARNED.md`
> **분할 시점**: 2026-05-12 Session E-2 Phase 2 (HEAD `5892c42`)

---

## 절대 작업 원칙

### 코드 작성 규칙

```
1.  JSX 이모지 완전 금지 → Lucide React SVG 아이콘만
2.  주석 영어만 작성, 한글 리터럴 타입 금지
3.  new PrismaClient() 금지 → src/lib/prisma.ts 싱글톤
4.  카테고리 → NAVER_CATEGORIES_FULL 로컬 상수만 (API 호출 금지)
5.  수정 후 npx tsc --noEmit → 0 errors 확인
6.  600줄+ TSX는 write_file 전체 교체 (edit_file 소규모만)
7.  Python 패치: write_file → execute → rm (heredoc 금지)
8.  prisma migrate dev 금지 → Supabase SQL Editor 사용
9.  framer-motion 사용 금지 → CSS animations
10. bcrypt 금지 → bcryptjs (Vercel Linux 호환)
11. API route에 export const dynamic = 'force-dynamic' 필수
12. useSearchParams() 사용 페이지 → Suspense로 감싸기
13. Next.js route 파일: GET/POST/PUT/DELETE/dynamic 외 export 금지
14. PROGRESS.md + ROADMAP.md 항상 함께 업데이트
15. 카카오 채널 정보 하드코딩 금지 → store_settings에서 읽기
16. \uXXXX 유니코드 이스케이프 JSX에서 사용 금지
17. git commit 여러 줄 메시지 금지 → -F 옵션 또는 한 줄 압축
18. Python -c 안 multi-line string 금지 → write_file 사용
19. AI 자동 채우기 결과는 DB 직접 적용 절대 금지 → POST(미리보기) + PATCH(셀러 승인 적용) 2단계
20. AI 추천 카테고리는 NAVER_CATEGORIES_FULL 로컬 검색만
21. 새 채팅 시작 시 git rev-parse HEAD origin/main 교차 확인 의무
22. AI 라이브러리 검증과 PATCH 검증 일치시키기
23. 새 채팅 메시지의 "현재 HEAD/commits 가정"을 의심하라
24. Block 단위 작업 시 commit + push를 한 묶음으로 한 turn 안에 끝내기
25. 한글 NFC/NFD 정규화 트랩 — Python 수동 정규화 절대 금지, raw 검증 우선
26. (위 작업원칙 #26 섹션 참조 — IA 점검 의무화 + 고아 라우트 처리)
27. 근본 원인 분석 — 한 케이스가 아닌 동일 패턴 일반화
28. 배포 운영 — npm run dev 의존 절대 금지, Vercel 배포가 source of truth.
    Naver IP 화이트리스트 등 home-proxy 필요 시 별도 standalone 스크립트
    (Cloudflare Tunnel + tiny Node.js relay 또는 Naver Cloud Compact)
29. (위 작업원칙 #29 섹션 참조 — 한글 처리 절대 규칙 5가지)
30. 환경 확인 — MCP 미연결 시 즉시 정직 보고 후 종료
31. (위 작업원칙 #31 섹션 참조 — MD 의미 단위 자동 분할 + 인계 무결성)
```

### UI 작성 원칙 (2026-04-13 확정)

```
- 이모지 금지: Lucide React SVG 아이콘 100% 교체
- 전문 용어: 한글 + (영문) 병기  예) 상품코드 (SKU)
- 기능 버튼: 순한글  예) 한 번에 임시등록, 건너뜀
- 상태 라벨 통일:
    DRAFT = 임시저장
    ACTIVE (naverProductId 있음) = 네이버 판매중
    ACTIVE (naverProductId 없음) = 네이버 등록 대기
    OUT_OF_STOCK = 품절
    INACTIVE/HIDDEN = 재활성화 필요
```

### 세션 관리

```
- iterm-mcp list_all_sessions 후 사용 (primary tty: /dev/ttys000)
- Chrome MCP: tabs_context_mcp → navigate (JS 도구는 hang 패턴 주의)
- heredoc 절대 금지 (터미널 hang 유발)
- dev 서버 재시작 필요 시 꽃졔님에게 요청 (또는 fresh build 명령 한 줄로 전달)
- 브라우저 테스트 필수: API 200 ≠ 브라우저 완료
```

### 보고 원칙

```
- 직접 실행 불가 시 거짓말 금지, 즉시 상황 설명
- Filesystem:edit_file 실패 후 Python 패치로 대체
- API 테스트 성공 후 반드시 브라우저 테스트로 재확인
- Vercel 환경변수 변경 후 재배포 트리거 (git commit --allow-empty + push)
- "진행해줘요" = end-to-end 완료 후 통합 브리핑 (중간 보고 없이)
- 꽃졔님 결정 필요한 사항은 *개별 Y/N 승인* — Claude 단독 판단 금지
```

---
