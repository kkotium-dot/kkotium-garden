// src/lib/naver/excel-generator.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 스마트스토어 엑셀 생성 (88개 필드) - 타입 안전성 강화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 헬퍼 함수: 배열 처리 (타입 안전)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ensureArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
  }
  return [];
}

function ensureString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 엑셀 템플릿 컬럼 정의 (88개)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NAVER_EXCEL_COLUMNS = [
  // 필수 20개
  '상품명', '판매가', '재고수량',
  '대표이미지URL', '추가이미지URL1', '추가이미지URL2', '추가이미지URL3', '추가이미지URL4', '추가이미지URL5',
  '브랜드', '제조사', '원산지코드', '카테고리코드', '상세설명',
  '배송방법', '배송비', '택배사코드', 'AS연락처', '과세여부', '상품상태',

  // 배송 관련 (15개)
  '무료배송최소금액', '반품배송비', '교환배송비', '배송비결제방식', '배송기간',
  '출고지', '반품지', '교환지', '도서산간배송비', '제주배송비',
  '묶음배송여부', '배송비타입', '구매수량제한', '최소구매수량', '최대구매수량',

  // 상품 정보 (20개)
  '상품코드', '모델명', '인증정보', '색상', '크기',
  '소재', '중량', '제조일자', '유효기간', '수입여부',
  '병행수입여부', '성인인증', '미성년자구매', '사용연령', '주의사항',
  '품질보증기준', 'KC인증정보', '상품상세이미지', '상품태그', 'SEO키워드',

  // 옵션 관련 (10개)
  '옵션사용여부', '옵션타입', '옵션명1', '옵션값1', '옵션명2',
  '옵션값2', '옵션명3', '옵션값3', '옵션별가격', '옵션별재고',

  // 할인/프로모션 (8개)
  '할인가', '할인율', '할인기간시작', '할인기간종료',
  '적립금', '포인트적립률', '쿠폰발행여부', '쿠폰할인금액',

  // AS/교환/반품 (8개)
  'AS안내', 'AS가능기간', '반품가능기간', '교환가능기간',
  '반품불가사유', '교환불가사유', '환불방법', '고객센터',

  // 기타 (7개)
  '선물포장', '구매후기이벤트', '네이버페이포인트', '네이버페이적립',
  '스마트스토어전용', '판매자코드', '공급사코드',
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 단일 상품 엑셀 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateNaverExcel(productId: string): Promise<Buffer> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { supplier: true },
  });

  if (!product) {
    throw new Error('상품을 찾을 수 없습니다.');
  }

  const row = await convertProductToExcelRow(product);
  return createExcelFile([row]);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 여러 상품 일괄 엑셀 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateBatchNaverExcel(productIds: string[]): Promise<Buffer> {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { supplier: true },
  });

  if (products.length === 0) {
    throw new Error('상품을 찾을 수 없습니다.');
  }

  const rows = await Promise.all(
    products.map(product => convertProductToExcelRow(product))
  );

  return createExcelFile(rows);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 조건별 상품 엑셀 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ExcelFilterOptions {
  status?: string;
  minScore?: number;
  supplierId?: string;
  categoryCode?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function generateFilteredNaverExcel(
  filters: ExcelFilterOptions
): Promise<Buffer> {
  const whereClause: any = {};

  if (filters.status) whereClause.status = filters.status;
  if (filters.minScore) whereClause.aiScore = { gte: filters.minScore };
  if (filters.supplierId) whereClause.supplierId = filters.supplierId;
  if (filters.categoryCode) whereClause.naverCategoryCode = filters.categoryCode;

  if (filters.dateFrom || filters.dateTo) {
    whereClause.createdAt = {};
    if (filters.dateFrom) whereClause.createdAt.gte = filters.dateFrom;
    if (filters.dateTo) whereClause.createdAt.lte = filters.dateTo;
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    include: { supplier: true },
    orderBy: { createdAt: 'desc' },
  });

  if (products.length === 0) {
    throw new Error('조건에 맞는 상품이 없습니다.');
  }

  const rows = await Promise.all(
    products.map(product => convertProductToExcelRow(product))
  );

  return createExcelFile(rows);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 상품 데이터를 엑셀 행으로 변환 (타입 안전)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function convertProductToExcelRow(product: any): Promise<Record<string, any>> {
  const baseData = product.naverExcelData || {};

  // 이미지 처리 (타입 안전)
  const images = ensureArray(product.images);
  const imageUrls: Record<string, string> = {
    '대표이미지URL': product.mainImage || '',
  };

  images.slice(0, 5).forEach((img: string, idx: number) => {
    imageUrls[`추가이미지URL${idx + 1}`] = img || '';
  });

  // 키워드 처리 (타입 안전)
  const keywords = ensureArray(product.keywords);
  const keywordsString = keywords.join(',');

  // 태그 처리 (타입 안전)
  const tags = ensureArray(product.tags);
  const tagsString = tags.join(',');

  // 88개 필드 매핑
  const row: Record<string, any> = {
    // 필수 20개
    '상품명': product.name || '',
    '판매가': product.salePrice || 0,
    '재고수량': baseData.재고수량 || 10,
    ...imageUrls,
    '브랜드': product.brand || '꽃틔움',
    '제조사': product.manufacturer || product.brand || '도매매 공급사',
    '원산지코드': product.originCode || '0',
    '카테고리코드': product.naverCategoryCode || '50003307',
    '상세설명': product.description || '',
    '배송방법': product.shippingMethod || '택배배송',
    '배송비': product.shippingFee || 3000,
    '택배사코드': product.courierCode || 'CJGLS',
    'AS연락처': product.asPhone || '고객센터 문의',
    '과세여부': product.taxType || '과세',
    '상품상태': product.productStatus || '신상품',

    // 배송 관련 (15개)
    '무료배송최소금액': product.freeShippingMinPrice || 30000,
    '반품배송비': product.returnShippingFee || 6000,
    '교환배송비': product.exchangeShippingFee || 6000,
    '배송비결제방식': product.shippingPayType || '선결제',
    '배송기간': '2-3일',
    '출고지': baseData.출고지 || '서울특별시',
    '반품지': baseData.반품지 || '서울특별시',
    '교환지': baseData.교환지 || '서울특별시',
    '도서산간배송비': baseData.도서산간배송비 || 5000,
    '제주배송비': baseData.제주배송비 || 5000,
    '묶음배송여부': 'Y',
    '배송비타입': product.shippingStrategy || '무료배송',
    '구매수량제한': 'N',
    '최소구매수량': 1,
    '최대구매수량': 999,

    // 상품 정보 (20개)
    '상품코드': product.sku || product.id,
    '모델명': product.productInfoModel || '',
    '인증정보': baseData.인증정보 || '',
    '색상': product.naver_color || '',
    '크기': product.naver_size || '',
    '소재': product.naver_material || '',
    '중량': product.naver_weight || '',
    '제조일자': '',
    '유효기간': '',
    '수입여부': 'N',
    '병행수입여부': product.naver_parallel_import ? 'Y' : 'N',
    '성인인증': product.naver_adult_only ? 'Y' : 'N',
    '미성년자구매': product.minorPurchase || 'Y',
    '사용연령': '',
    '주의사항': '',
    '품질보증기준': product.naver_warranty || '',
    'KC인증정보': product.naver_certification || '',
    '상품상세이미지': images.slice(5).join(','),
    '상품태그': tagsString,
    'SEO키워드': keywordsString,

    // 옵션 관련 (10개)
    '옵션사용여부': product.hasOptions ? 'Y' : 'N',
    '옵션타입': product.optionType || '',
    '옵션명1': '', '옵션값1': '',
    '옵션명2': '', '옵션값2': '',
    '옵션명3': '', '옵션값3': '',
    '옵션별가격': '', '옵션별재고': '',

    // 할인/프로모션 (8개)
    '할인가': '', '할인율': '',
    '할인기간시작': '', '할인기간종료': '',
    '적립금': '', '포인트적립률': '1',
    '쿠폰발행여부': 'N', '쿠폰할인금액': '',

    // AS/교환/반품 (8개)
    'AS안내': product.asInfo || '평일 10:00~18:00',
    'AS가능기간': '1년',
    '반품가능기간': '7일',
    '교환가능기간': '7일',
    '반품불가사유': '포장 훼손 시',
    '교환불가사유': '포장 훼손 시',
    '환불방법': '카드취소/계좌이체',
    '고객센터': product.asPhone || '고객센터 문의',

    // 기타 (7개)
    '선물포장': product.naver_gift_wrapping ? 'Y' : 'N',
    '구매후기이벤트': 'N',
    '네이버페이포인트': '',
    '네이버페이적립': '',
    '스마트스토어전용': 'Y',
    '판매자코드': product.sellerCode || '',
    '공급사코드': product.supplier?.code || '',
  };

  return row;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 엑셀 파일 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createExcelFile(rows: Record<string, any>[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: NAVER_EXCEL_COLUMNS,
  });

  const columnWidths = NAVER_EXCEL_COLUMNS.map(col => {
    if (col.includes('URL') || col.includes('설명')) return { wch: 50 };
    if (col.includes('이미지') || col === '상품명') return { wch: 30 };
    return { wch: 15 };
  });

  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '상품목록');

  const excelBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  return excelBuffer;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 엑셀 템플릿 다운로드 (빈 양식)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function generateEmptyTemplate(): Buffer {
  const emptyRow: Record<string, string> = {};
  NAVER_EXCEL_COLUMNS.forEach(col => { emptyRow[col] = ''; });
  return createExcelFile([emptyRow]);
}
