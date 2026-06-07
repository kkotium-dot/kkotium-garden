// scripts/keyword-scorecard.js
//
// 일회성 진단 (2026-06-03) — 명화 방향제 seed로 Naver SearchAd 연관키워드를
// 수확하고, 검색량 + 경쟁도 + 구매의도 가중치로 "키워드 성적표"를 출력한다.
// searchad-volume.ts의 fetchRelatedKeywords와 동일한 인증/서명/수확 로직.
// DB 변경 없음 — 순수 조회. SEO 생성(POST) 전, 어떤 키워드가 후보가 되는지
// 대표와 함께 검토하기 위한 데이터.
//
// Usage:
//   node scripts/keyword-scorecard.js                 (기본 seed)
//   node scripts/keyword-scorecard.js 차량용방향제 송풍구방향제 차량용디퓨저
//
// 결과는 터미널 출력 + docs/research/keyword-scorecard-result.json 저장.

const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');

function readEnv() {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const map = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return map;
}

const SEARCHAD_BASE = 'https://api.searchad.naver.com';
const URI = '/keywordstool';

function sign(ts, method, uri, secret) {
  return crypto.createHmac('sha256', secret).update(`${ts}.${method}.${uri}`).digest('base64');
}

// "< 10" sentinel -> 5 (정직한 중간값, #46).
function parseCount(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw !== 'string') return 0;
  const s = raw.trim();
  if (s.startsWith('<')) return 5;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function mapComp(raw) {
  if (typeof raw !== 'string') return '?';
  if (raw.includes('낮')) return '낮음';
  if (raw.includes('중')) return '중간';
  if (raw.includes('높')) return '높음';
  return '?';
}

// 구매의도 가중치 (RESEARCH §6) + 경쟁도 가중치 (2단계 황금키워드 선반영).
const INTENT = ['선물', '집들이', '개업', '이사', '결혼', '신혼', '돌잔치', '환갑', '백일'];
const GENERIC = ['인테리어', '디자인', '장식', '소품', '제품', '상품', '아이템'];

function intentMult(kw) {
  const k = kw.replace(/\s+/g, '');
  for (const t of INTENT) if (k.includes(t)) return 2.0;
  if (GENERIC.includes(k)) return 0.3;
  return 1.0;
}
function compMult(comp) {
  if (comp === '낮음') return 1.3;
  if (comp === '높음') return 0.6;
  return 1.0;
}

async function main() {
  const argSeeds = process.argv.slice(2);
  const seeds = argSeeds.length > 0
    ? argSeeds
    : ['차량용방향제', '송풍구방향제', '차량용디퓨저'];

  const env = readEnv();
  const apiKey = env.NAVER_SEARCHAD_API_KEY;
  const secret = env.NAVER_SEARCHAD_SECRET_KEY;
  const customer = env.NAVER_SEARCHAD_CUSTOMER_ID;
  if (!apiKey || !secret || !customer) {
    console.log('MISSING_ENV apiKey=' + !!apiKey + ' secret=' + !!secret + ' customer=' + !!customer);
    process.exit(1);
  }

  const cleaned = seeds
    .map((k) => k.replace(/,/g, ' ').replace(/\s+/g, '').trim())
    .filter((k) => k.length >= 2 && k.length <= 15)
    .slice(0, 5);
  console.log('SEED 키워드:', cleaned.join(', '));

  const params = new URLSearchParams({ hintKeywords: cleaned.join(','), showDetail: '1' });
  const ts = String(Date.now());
  const sig = sign(ts, 'GET', URI, secret);

  const res = await fetch(`${SEARCHAD_BASE}${URI}?${params}`, {
    method: 'GET',
    headers: {
      'X-Timestamp': ts,
      'X-API-KEY': apiKey,
      'X-Customer': customer,
      'X-Signature': sig,
    },
  });
  if (!res.ok) {
    console.log('HTTP_' + res.status, (await res.text()).slice(0, 200));
    process.exit(1);
  }

  const data = await res.json();
  const list = Array.isArray(data.keywordList) ? data.keywordList : [];
  console.log('수확된 연관키워드 총 ' + list.length + '개\n');

  const seen = new Set();
  const rows = [];
  for (const row of list) {
    const rel = typeof row.relKeyword === 'string' ? row.relKeyword : '';
    if (!rel) continue;
    const n = rel.replace(/\s+/g, '').toLowerCase();
    if (seen.has(n)) continue;
    seen.add(n);
    const pc = parseCount(row.monthlyPcQcCnt);
    const mb = parseCount(row.monthlyMobileQcCnt);
    const total = pc + mb;
    const comp = mapComp(row.compIdx);
    const score = Math.round(total * intentMult(rel) * compMult(comp));
    rows.push({ keyword: rel, pc, mobile: mb, total, comp, intentX: intentMult(rel), score });
  }
  rows.sort((a, b) => b.score - a.score);

  // 터미널 요약 — 상위 25개.
  console.log('=== 키워드 성적표 (점수 = 검색량 x 구매의도 x 경쟁도) 상위 25 ===');
  console.log('순위 키워드 / 월검색량 / 경쟁도 / 점수');
  rows.slice(0, 25).forEach((r, i) => {
    console.log(
      (i + 1) + '. ' + r.keyword +
      ' / ' + r.total.toLocaleString() + ' (PC ' + r.pc + '+모바일 ' + r.mobile + ')' +
      ' / ' + r.comp +
      ' / ' + r.score.toLocaleString(),
    );
  });

  // 황금 키워드 — 낮은 경쟁 + 검색량 200+ (신규 셀러 진입점).
  const golden = rows.filter((r) => r.comp === '낮음' && r.total >= 200).slice(0, 12);
  console.log('\n=== 황금 키워드 (낮은 경쟁 + 월검색 200+) ===');
  if (golden.length === 0) console.log('(해당 없음)');
  golden.forEach((r, i) => console.log((i + 1) + '. ' + r.keyword + ' — ' + r.total.toLocaleString() + '/월, 경쟁 ' + r.comp));

  // JSON 저장 — Desktop이 읽어 성적표 정리.
  const outPath = path.join(process.cwd(), 'docs/research/keyword-scorecard-result.json');
  fs.writeFileSync(outPath, JSON.stringify({ seeds: cleaned, totalHarvested: list.length, rows }, null, 2));
  console.log('\nSAVED -> docs/research/keyword-scorecard-result.json (' + rows.length + ' rows)');
  console.log('이 파일을 데스크톱(MCP)이 읽어 성적표로 정리합니다.');
}

main().catch((e) => {
  console.log('ERROR=' + (e && e.message ? e.message : String(e)));
  process.exit(1);
});
