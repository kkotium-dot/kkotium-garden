// scripts/verify-origin-code-integrity.ts
//
// dryRun 스캔(#352 전수검증) — Product.originCode/naver_origin이 "형식상
// 유효"한지가 아니라 "실제로 검증된 값인지"를 본다. 2026-09-03 브라우저
// 실측(read-only API, /api/products·/api/products/[id])으로 전 상품(16건)을
// 이미 1회 돌려 결과를 아래 스크립트 헤더에 기록해뒀다 — 이 파일은 그 스캔을
// 재현 가능하게 코드로 박제한 것(다음 상품 추가 시 재실행용).
//
// 핵심 발견(코드 조사로 확인, DB 값과 무관하게 항상 참):
// 1. src/app/api/products/route.ts POST가 naverCategoryCode 없을 때
//    KKOTIUM_DEFAULTS.categoryCode(='50004716')를 그대로 채운다. 이 상수는
//    codes.ts에 "꽃다발"이라고 주석돼 있지만 NAVER_CATEGORIES_FULL 조회 결과
//    실제로는 "식품>수산물>해산물/어패류>홍합"이다(꽃다발 리프 자체가 마스터에
//    없음). #356에서 반복 발견된 "홍합" 오염의 진짜 근본원인일 가능성이 높다
//    — 매처 버그가 아니라 주석이 틀린 하드코딩 기본값.
// 2. src/lib/naver/excel-generator.ts의 sanitizeOriginCode()가 originCode가
//    '0001'|'00'|'0'|4자 미만이면 "미설정"으로 간주해 KKOTIUM_DEFAULTS.
//    originCode(='0200037', 중국)로 덮어쓴다. 그런데 '00'(국산)과 '0001'
//    (강원도)은 naver-origin-codes.ts 기준 둘 다 정식 코드다 — 즉 사람이
//    정직하게 "국산(00)"으로 표기해도 **네이버 실제 업로드 엑셀에서 중국으로
//    둔갑**한다. 이게 원산지 오라벨의 진짜 배출구(export-time corruption).
//
// 이 스크립트는 (1)만 다룬다 — DB에 저장된 원산지 필드의 "검증 여부"를 스캔.
// (2)는 코드 로직 버그라 데이터 스캔 대상이 아니라 excel-generator.ts 자체
// 수정이 필요(범위 밖 — 별도 승인 후 착수).
//
// DRY-RUN by default (아무것도 쓰지 않음, 목록만 출력). 이 스크립트에는
// --apply가 없다 — "무엇이 진짜 원산지인지" 자동 판정 불가(상세페이지 확인
// 필요, naver-manufacturer-importer-policy 메모리와 동일한 이유). 사람 확인
// 대상 목록만 뽑는다.
//
// USAGE:
//   npx tsx scripts/verify-origin-code-integrity.ts

import fs from 'fs';
import path from 'path';

function loadEnvLocal(): void {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      const val = m[2].replace(/^["']|["']$/g, '').replace(/\\\$/g, '$');
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}
loadEnvLocal();

import { PrismaClient } from '@prisma/client';
import { KKOTIUM_DEFAULTS } from '../src/lib/naver/codes';
import { evaluateOriginTruth } from '../src/lib/naver/product-builder';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true, name: true, source: true, status: true,
      originCode: true, naver_origin: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`전체 상품: ${products.length}건\n`);

  const unverifiedDefault: typeof products = [];
  const truthMismatch: typeof products = [];
  const byCode = new Map<string, number>();

  for (const p of products) {
    byCode.set(p.originCode ?? '(null)', (byCode.get(p.originCode ?? '(null)') ?? 0) + 1);

    const verdict = evaluateOriginTruth(p.originCode, p.naver_origin);
    if (verdict.state === 'mismatch') truthMismatch.push(p);

    // "검증되지 않은 기본값" — originCode가 KKOTIUM_DEFAULTS 그대로이고
    // naver_origin(사람이 상세페이지 보고 채우는 자유텍스트)이 비어있으면,
    // 이 상품의 원산지는 한 번도 사람이 확인한 적 없이 생성 시 자동으로
    // 찍힌 기본값 그대로라는 뜻이다. evaluateOriginTruth는 이걸 "pass"로
    // 보지만(#82 반대편 — 코드 유효성만 봄), 실제 진실 여부는 미검증.
    const isDefaultCode = p.originCode === KKOTIUM_DEFAULTS.originCode || p.originCode === '0001';
    if (isDefaultCode && !p.naver_origin) unverifiedDefault.push(p);
  }

  console.log('originCode 분포:');
  for (const [code, count] of [...byCode.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}: ${count}건`);
  }

  console.log(`\n내부 모순(originCode ↔ naver_origin 텍스트 상충, evaluateOriginTruth 'mismatch'): ${truthMismatch.length}건`);
  for (const p of truthMismatch) console.log(`  - [${p.id}] ${p.name} — code=${p.originCode} naver_origin="${p.naver_origin}"`);

  console.log(`\n검증되지 않은 기본값(생성 시 자동 default 그대로, 사람이 원산지 확인한 적 없음): ${unverifiedDefault.length}건`);
  for (const p of unverifiedDefault) console.log(`  - [${p.id}] ${p.name} (source=${p.source}, status=${p.status}) — code=${p.originCode}`);

  console.log('\n이 목록은 자동 수정 대상이 아니다 — 상세페이지 확인 후 사람이 개별 판정할 것(#352).');
}

main().finally(() => prisma.$disconnect());
