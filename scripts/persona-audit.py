import json, os, re, glob

ROOT = "/Users/jyekkot/Desktop/kkotium-garden/src"
PERSONA = re.compile(r"까꿍|빵야|이랴|어유|에유|해유")
# 페르소나가 붙어야 마땅한 키(빈 상태·에러·안내·성공) — 라벨/버튼은 대상 아님
TARGET_KEY = re.compile(r"empty|error|success|toast|hint|guide|desc|notice|help|fail|warn", re.I)

rows = []
for path in glob.glob(f"{ROOT}/**/*ko.json", recursive=True):
    try:
        d = json.load(open(path, encoding="utf-8"))
    except Exception:
        continue

    hits, targets = [], []

    def walk(o, p=""):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, f"{p}.{k}" if p else k)
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, f"{p}[{i}]")
        elif isinstance(o, str):
            if PERSONA.search(o):
                hits.append(p)
            if TARGET_KEY.search(p) and len(o) > 8:
                targets.append(p)

    walk(d)
    rel = path.replace(ROOT + "/", "")
    if targets:
        rows.append((rel, len(targets), len(hits)))

rows.sort(key=lambda r: (r[2], -r[1]))
print(f"{'파일':52} {'대상문구':>6} {'페르소나':>7}")
print("-" * 70)
for rel, t, h in rows[:18]:
    mark = "  ← 0건" if h == 0 else ""
    print(f"{rel:52} {t:6} {h:7}{mark}")

zero = [r for r in rows if r[2] == 0]
print(f"\n대상 파일 {len(rows)}개 중 페르소나 0건: {len(zero)}개")
