const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw`SELECT domeggook_api_key FROM store_settings WHERE id='default'`.then(async r => {
  const key = r[0]?.domeggook_api_key;
  const url = `https://domeggook.com/ssl/api/?ver=4.5&mode=getItemView&aid=${key}&no=62007435&om=json`;
  const res = await fetch(url);
  const raw = await res.json();
  // Show top-level keys
  console.log('TOP KEYS:', Object.keys(raw));
  const dg = raw.domeggook;
  if (dg) {
    console.log('DOMEGGOOK KEYS:', Object.keys(dg));
    const item = dg.item;
    if (item) {
      console.log('ITEM KEYS:', Object.keys(item));
      console.log('seller:', JSON.stringify(item.seller));
      console.log('member:', JSON.stringify(item.member));
      console.log('shop:', JSON.stringify(item.shop));
    } else {
      console.log('ITEM is null/undefined');
      // Show first 500 chars of domeggook
      console.log('DOMEGGOOK SAMPLE:', JSON.stringify(dg).slice(0, 500));
    }
  } else {
    console.log('RAW SAMPLE:', JSON.stringify(raw).slice(0, 500));
  }
  p.$disconnect();
}).catch(e => { console.log('ERR:', e.message); p.$disconnect(); });
