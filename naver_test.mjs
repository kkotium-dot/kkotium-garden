// Naver API connection test
async function test() {
  console.log('[1] API 연결 테스트...');
  const r = await fetch('http://localhost:3000/api/naver/products?check=1');
  const d = await r.json();
  console.log('결과:', JSON.stringify(d, null, 2));

  console.log('\n[2] Sync 상태 확인...');
  const r2 = await fetch('http://localhost:3000/api/naver/sync');
  const d2 = await r2.json();
  console.log('결과:', JSON.stringify(d2, null, 2));
}
test().catch(e => console.error('ERROR:', e.message));
