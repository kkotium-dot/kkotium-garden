---
paths:
  - "docs/plan/**"
  - "docs/research/**"
---

# MD 갱신 후 한글 깨짐 검증 (작업원칙 #29 b + #31)

> 이관 출처: CLAUDE.md §4-3 (grep 커맨드 블록만). 규칙 문장 1줄은 CLAUDE.md §4-3에 그대로 잔류.
> 이관 근거: `docs/design/CLAUDE_MD_REDUCTION_CANDIDATES_2026-07-28.md` 후보#10.

`docs/plan/`·`docs/research/` 아래 한글 다량 포함 MD를 갱신한 뒤에는 아래 패턴이 0건인지 반드시 확인한다(알려진 오타 변종 sentinel):

```bash
grep -nE "혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두" docs/plan/*.md docs/research/*.md
```

0건이 아니면 해당 파일을 `Read` + `Write`(전체 덮어쓰기)로 재작성해 교정한다. `Edit`는 oldText/newText가 영어/구두점만일 때만 허용된다(원본 규칙, 한글 삽입 오염 방지).
