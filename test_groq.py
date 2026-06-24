import os, urllib.request, json

# SECRETS-GUARD (#156): the API key MUST come from the environment — never
# hardcode it. Run with:  GROQ_API_KEY=... python3 test_groq.py
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    raise SystemExit("Set GROQ_API_KEY in the environment (do not hardcode keys).")

body = json.dumps({
    "model": "llama-3.1-8b-instant",
    "messages": [
        {"role": "system", "content": "Output ONLY raw JSON. No markdown. No explanation."},
        {"role": "user", "content": 'Naver SEO for: 리본 포인트 홈웨어 잠옷세트. Return: {"naver_title":"25-35char Korean","naver_keywords":"kw1,kw2,kw3,kw4,kw5","naver_description":"80-200char","seo_title":"short","seo_description":"short"}'}
    ],
    "max_tokens": 500,
    "temperature": 0.2
}).encode()

req = urllib.request.Request(
    "https://api.groq.com/openai/v1/chat/completions",
    data=body,
    headers={
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
)
with urllib.request.urlopen(req) as r:
    d = json.loads(r.read())

txt = d["choices"][0]["message"]["content"].strip()
s = txt.find("{"); e = txt.rfind("}")
result = json.loads(txt[s:e+1])
print("Groq SEO OK")
print("title:", result.get("naver_title", "EMPTY"))
print("kw:   ", result.get("naver_keywords", "EMPTY"))
print("desc: ", result.get("naver_description", "EMPTY")[:50])
