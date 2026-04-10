// src/lib/naver/excel-generator.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Naver SmartStore Excel export (XLSX legacy generator)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { KKOTIUM_DEFAULTS } from './codes';
import { NAVER_EXCEL_COLUMNS, NAVER_EXCEL_GROUP_ROW } from './columns';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

function arr(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [v];
  } catch {
    return String(v).split(',').map((s: string) => s.trim()).filter(Boolean);
  }
}

function str(v: any): string {
  if (!v) return '';
  if (Array.isArray(v)) return v.join(',');
  return String(v);
}

function loadSettings(): typeof KKOTIUM_DEFAULTS {
  try {
    const p = path.join(process.cwd(), 'naver-settings.json');
    if (fs.existsSync(p)) {
      const saved = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return { ...KKOTIUM_DEFAULTS, ...saved };
    }
  } catch {}
  return { ...KKOTIUM_DEFAULTS };
}

function sanitizeOriginCode(code: string | null | undefined, fallback: string): string {
  if (!code) return fallback;
  const c = String(code).trim();
  if (c === '0001' || c === '00' || c === '0' || c.length < 4) return fallback;
  return c;
}

function toRow(product: any): Record<string, any> {
  const S = loadSettings();
  const images = arr(product.images);
  const colorStr = str(product.naver_color);
  const sizeStr = str(product.naver_size);

  let optionType = '';
  let optionName = '';
  let optionValue = '';
  let optionPrice = '';
  let optionStock = '';

  // Naver Excel option format (image spec verified 2026-03-19):
  //   COMBINATION optionName : 'color\nsize'  (newline per option group)
  //   COMBINATION optionValue: 'red,yellow\nS,M,L'  (comma within group, newline between groups)
  //   COMBINATION optionPrice: '0,100'  (comma-separated, first option group only)
  //   COMBINATION optionStock: '10,20'  (comma-separated, first option group only)
  //   SINGLE      optionName : 'color'  (single group name only)
  //   SINGLE      optionValue: 'red,yellow'  (comma-separated values)
  //   SINGLE      optionPrice: '0,0'    (comma-separated, one per value)
  //   SINGLE      optionStock: '10,10'  (comma-separated, one per value)
  if (colorStr && sizeStr) {
    // COMBINATION: color x size
    optionType  = '조합형';
    optionName  = '색상\n사이즈';
    optionValue = `${colorStr}\n${sizeStr}`;
    // Prices per first-group value (one per color), stocks per first-group value
    const colorVals = colorStr.split(',').map((v: string) => v.trim()).filter(Boolean);
    optionPrice = colorVals.map(() => '0').join(',');
    optionStock = colorVals.map(() => '10').join(',');
  } else if (colorStr) {
    // SINGLE: color only
    optionType  = '단독형';
    optionName  = '색상';
    const vals  = colorStr.split(',').map((v: string) => v.trim()).filter(Boolean);
    optionValue = vals.join(',');
    optionPrice = vals.map(() => '0').join(',');
    optionStock = vals.map(() => '10').join(',');
  } else if (sizeStr) {
    // SINGLE: size only
    optionType  = '단독형';
    optionName  = '사이즈';
    const vals  = sizeStr.split(',').map((v: string) => v.trim()).filter(Boolean);
    optionValue = vals.join(',');
    optionPrice = vals.map(() => '0').join(',');
    optionStock = vals.map(() => '10').join(',');
  }

  // Additional images: newline-separated per Naver spec
  const additionalImagesStr = images.slice(1).join('\n');

  // Immediate discount — PC and mobile must be identical (Naver policy)
  const discVal  = product.discountValue  ?? '';
  const discUnit = product.discountUnit   ?? '';

  return {
    '판매자 상품코드': product.sku || '',
    '카테고리코드': product.naverCategoryCode || S.categoryCode,
    '상품명': product.naver_title || product.name || '',
    '상품상태': S.productStatus,
    '판매가': product.salePrice || 0,
    // New cols 6-9: unit pricing (leave empty — not applicable for general products)
    '단위가격 사용여부': '',
    '표시용량': '',
    '표시단위': '',
    '총용량': '',
    '부가세': S.taxType,
    '관부가세': '',
    '재고수량': 10,
    '옵션형태': optionType,
    '옵션명': optionName,
    '옵션값': optionValue,
    '옵션가': optionPrice,
    '옵션 재고수량': optionStock,
    '직접입력 옵션': '',
    '추가상품명': '',
    '추가상품값': '',
    '추가상품가': '',
    '추가상품 재고수량': '',
    '대표이미지': product.mainImage || images[0] || '',
    '추가이미지': additionalImagesStr,  // newline-separated per spec
    '상세설명': product.naver_description || product.description || '',
    '브랜드': S.brand,
    '제조사': S.brand,
    '제조일자': '',
    '유효일자': '',
    '원산지코드': sanitizeOriginCode(product.originCode, S.originCode),
    '수입사': '',
    '복수원산지여부': 'N',
    '원산지 직접입력': '',
    '미성년자 구매': S.minorPurchase,
    '배송비 템플릿코드': '',
    '배송방법': S.shippingMethod,
    '택배사코드': S.courierCode,
    '배송비유형': S.shippingFeeType,
    '기본배송비': S.shippingFee,
    '배송비 결제방식': S.shippingPayType,
    '조건부무료-\n상품판매가 합계': S.freeShippingMin,
    '수량별부과-수량': '',
    '구간별-\n2구간수량': '',
    '구간별-\n3구간수량': '',
    '구간별-\n3구간배송비': '',
    '구간별-\n추가배송비': '',
    '반품배송비': S.returnShippingFee,
    '교환배송비': S.exchangeShippingFee,
    '지역별 차등 배송비': '',
    '별도설치비': '',
    '상품정보제공고시 템플릿코드': '',
    '상품정보제공고시\n품명': product.naver_title || product.name || '',
    '상품정보제공고시\n모델명': product.sku || '',
    '상품정보제공고시\n인증허가사항': '',
    '상품정보제공고시\n제조자': S.brand,
    'A/S 템플릿코드': '',
    'A/S 전화번호': S.asPhone,
    'A/S 안내': S.asGuide,
    '판매자특이사항': '',  // intentionally empty — keyword tags removed
    // Immediate discount: PC value and mobile must be identical (Naver policy)
    '즉시할인 값\n(기본할인)': discVal,
    '즉시할인 단위\n(기본할인)': discUnit,
    '모바일\n즉시할인 값': discVal,   // same as PC
    '모바일\n즉시할인 단위': discUnit, // same as PC
    '복수구매할인\n조건 값': '',
    '복수구매할인\n조건 단위': '',
    '복수구매할인\n값': '',
    '복수구매할인\n단위': '',
    '상품구매시 포인트\n지급 값': '',
    '상품구매시 포인트\n지급 단위': '',
    '텍스트리뷰 작성시\n지급 포인트': '',
    '포토/동영상 리뷰 작성시\n지급 포인트': '',
    '한달사용 텍스트리뷰\n작성시 지급 포인트': '',
    '한달사용\n포토/동영상리뷰 작성시 지급 포인트': '',
    '알림받기동의 고객 리뷰 작성 시 지급 포인트': '',
    '무이자\n할부 개월': '',
    '사은품': '',
    '판매자바코드': '',
    '구매평 노출여부': 'Y',
    '구매평\n비노출사유': '',
    '알림받기 동의 고객 전용 여부': 'N',
    'ISBN': '',
    'ISSN': '',
    '독립출판': '',
    '출간일': '',
    '출판사': '',
    '글작가': '',
    '그림작가': '',
    '번역자명': '',
    '문화비 소득공제': '',
    '사이즈\n상품군': '',
    '사이즈\n사이즈명': '',
    '사이즈\n상세 사이즈': '',
    '사이즈 \n모델명': '',
  };
}

function buildExcel(rows: Record<string, any>[]): Buffer {
  const wsData: any[][] = [
    NAVER_EXCEL_GROUP_ROW,
    NAVER_EXCEL_COLUMNS,
    ...rows.map((r) => NAVER_EXCEL_COLUMNS.map((col) => r[col] ?? '')),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = NAVER_EXCEL_COLUMNS.map((col) => {
    if (['상세설명', '대표이미지', '추가이미지'].includes(col)) return { wch: 60 };
    if (['상품명', 'A/S 안내', '판매자특이사항'].includes(col)) return { wch: 35 };
    return { wch: 16 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '일괄등록');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function generateNaverExcel(productId: string): Promise<Buffer> {
  const p = await prisma.product.findUnique({ where: { id: productId } });
  if (!p) throw new Error('상품을 찾을 수 없습니다.');
  return buildExcel([toRow(p)]);
}

export async function generateBatchNaverExcel(productIds: string[]): Promise<Buffer> {
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (!products.length) throw new Error('상품을 찾을 수 없습니다.');
  return buildExcel(products.map(toRow));
}

export async function generateAllActiveExcel(): Promise<Buffer> {
  const products = await prisma.product.findMany({ where: { status: 'ACTIVE' } });
  return buildExcel(products.map(toRow));
}

interface ExcelFilterOptions {
  status?: string;
  minScore?: number;
  supplierId?: string;
  categoryCode?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function generateFilteredNaverExcel(filters: ExcelFilterOptions): Promise<Buffer> {
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.minScore) where.aiScore = { gte: filters.minScore };
  if (filters.supplierId) where.supplierId = filters.supplierId;
  if (filters.categoryCode) where.naverCategoryCode = filters.categoryCode;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
    if (filters.dateTo) where.createdAt.lte = filters.dateTo;
  }
  const products = await prisma.product.findMany({ where, orderBy: { createdAt: 'desc' } });
  if (!products.length) throw new Error('조건에 맞는 상품이 없습니다.');
  return buildExcel(products.map(toRow));
}

export function generateEmptyTemplate(): Buffer {
  const empty: Record<string, any> = {};
  NAVER_EXCEL_COLUMNS.forEach((c) => (empty[c] = ''));
  return buildExcel([empty]);
}
