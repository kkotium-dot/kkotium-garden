path = "/Users/jyekkot/Desktop/kkotium-garden/src/app/products/page.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 좀비 탭 라벨을 메뉴(꽃밭 돌보기 > 좀비꽃 발견)와 일치시킨다.
# dotLabel "부활 후보"도 좀비로 통일(#264 — 병렬 라벨 금지).
old = "  revival:      { label: '좀비발견',      dot: 'bg-purple-500', dotLabel: '부활 후보',     filter: isRevivalCandidate },"
new = "  revival:      { label: '좀비꽃 발견',   dot: 'bg-purple-500', dotLabel: '좀비꽃',        filter: isRevivalCandidate },"

if content.count(old) != 1:
    print(f"UNEXPECTED count={content.count(old)} — aborting")
    raise SystemExit(1)

content = content.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: revival tab label unified to 좀비꽃")
