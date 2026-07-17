import re, glob, os

ROOT = "/Users/jyekkot/Desktop/kkotium-garden/src"

# 화면에 노출되는 "정원 창고"를 전수 조사한다.
# 확정 스펙(PRODUCT_IA_REDESIGN_V2_CONFIRMED)·#256에 따라 /products의 이름은
# "꽃밭 돌보기". 메뉴(garden-nav)는 이미 꽃밭 돌보기인데 페이지 h1이 옛 이름이라
# 클릭한 곳과 도착한 곳의 이름이 달랐음(2026-07-17 운영자 스크린샷으로 발견).
hits = []
for path in glob.glob(f"{ROOT}/**/*.*", recursive=True):
    if not path.endswith((".tsx", ".ts", ".json")):
        continue
    try:
        txt = open(path, encoding="utf-8").read()
    except Exception:
        continue
    for i, line in enumerate(txt.split("\n"), 1):
        if "정원 창고" in line:
            stripped = line.strip()
            is_comment = stripped.startswith(("//", "*", "/*"))
            hits.append((path.replace(ROOT + "/", ""), i, is_comment, stripped[:88]))

print(f"{'파일':44} {'줄':>5}  {'주석?':<6} 내용")
print("-" * 110)
for f, i, c, s in hits:
    print(f"{f:44} {i:5}  {'주석' if c else '★화면':<6} {s}")

visible = [h for h in hits if not h[2]]
print(f"\n총 {len(hits)}건 · 화면 노출 {len(visible)}건 · 주석 {len(hits)-len(visible)}건")
