// Naver SmartStore Excel generator using ExcelJS
// 93 columns — updated to ExcelSaveTemplate_20260309.xlsx
// Section colors match official Office theme colors exactly

import ExcelJS from 'exceljs';
import {
  KKOTIUM_DEFAULTS,
  KKOTIUM_DISPLAY,
  SECTION_DEFS,
  COLUMN_LABELS,
  COLUMN_REQUIRED,
  MOBILE_DISCOUNT_ARGB,
} from './naver-defaults';
import type {
  NaverProductData,
  SupplierDefaults,
  ExcelGenerateOptions,
} from './naverExcel.types';

// New 93-col template: mobile discount cols are idx 61,62 (0-based) = col 62,63
// Col layout shift: 5 new cols inserted at idx 5-10, shifting everything after
// Old idx 55,56 (PC+mobile discount) -> new idx 60,61 for PC, 62,63 for mobile
const MOBILE_DISCOUNT_INDICES = new Set([62, 63]);

// Required status values for Row 3 styling
const REQUIRED_ARGB   = 'FFFFF2CB'; // same as 상품기본정보 section — yellow tint
const COND_REQ_ARGB   = 'FFFFFACD'; // lighter yellow for conditional
const NON_REQ_ARGB    = 'FFFFFFFF'; // white

function mergeDefaults(override?: Partial<SupplierDefaults>): SupplierDefaults {
  return { ...KKOTIUM_DEFAULTS, ...(override ?? {}) };
}

// Apply fill + font + alignment + border to a cell
function styleCell(
  cell: ExcelJS.Cell,
  opts: {
    bgArgb?: string;
    bold?: boolean;
    fontSize?: number;
    fontColor?: string;
    hAlign?: ExcelJS.Alignment['horizontal'];
    vAlign?: ExcelJS.Alignment['vertical'];
    wrapText?: boolean;
    borderColor?: string;
    borderStyle?: ExcelJS.BorderStyle;
    italic?: boolean;
  }
) {
  if (opts.bgArgb) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bgArgb } };
  }
  cell.font = {
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    size: opts.fontSize ?? 10,
    color: { argb: opts.fontColor ?? 'FF000000' },
  };
  cell.alignment = {
    horizontal: opts.hAlign ?? 'left',
    vertical: opts.vAlign ?? 'middle',
    wrapText: opts.wrapText ?? false,
  };
  if (opts.borderColor) {
    const border: Partial<ExcelJS.Border> = {
      style: opts.borderStyle ?? 'thin',
      color: { argb: opts.borderColor },
    };
    cell.border = { top: border, bottom: border, left: border, right: border };
  }
}

// Build the 93-column data row for one product (updated 2026-03-19)
function buildDataRow(p: NaverProductData, d: SupplierDefaults): (string | number | null)[] {
  const brand        = p.brand        ?? KKOTIUM_DISPLAY.brand;
  const manufacturer = p.manufacturer ?? KKOTIUM_DISPLAY.manufacturer;
  const importer     = p.importer     ?? KKOTIUM_DISPLAY.importer;
  const deliveryMethod  = p.deliveryMethod  ?? KKOTIUM_DISPLAY.deliveryMethod;
  const deliveryFeeType = p.deliveryFeeType ?? KKOTIUM_DISPLAY.deliveryFeeType;
  const deliveryPayType = p.deliveryPayType ?? KKOTIUM_DISPLAY.deliveryPayType;
  const asGuide      = p.asGuide      ?? KKOTIUM_DISPLAY.asGuide;
  const hasTemplate  = !!p.deliveryTemplateCode;

  return [
    // ── 상품 기본정보 (1~25) — 5 new cols after 판매가 ─────────────────────
    p.sellerProductCode,                          // 1
    p.categoryId,                                  // 2
    p.productName,                                 // 3
    p.productStatus  ?? '신상품',      // 4
    p.price,                                       // 5
    p.unitPriceUse   ?? '',                        // 6  NEW: 단위가격 사용여부
    p.displayVolume  ?? '',                        // 7  NEW: 표시용량
    p.displayUnit    ?? '',                        // 8  NEW: 표시단위
    p.totalVolume    ?? '',                        // 9  NEW: 총용량
    p.taxType        ?? '과세상품', // 10 (was 6)
    p.importTax      ?? '',                        // 11 NEW: 관부가세
    p.stock,                                       // 12
    p.optionType     ?? '',                        // 13
    p.optionNames    ?? '',                        // 14
    p.optionValues   ?? '',                        // 15
    p.optionPrices   ?? '',                        // 16
    p.optionStocks   ?? '',                        // 17
    p.directInputOption ?? '',                     // 18
    p.additionalProductName  ?? '',                // 19
    p.additionalProductValue ?? '',                // 20
    p.additionalProductPrice ?? '',                // 21
    p.additionalProductStock ?? '',                // 22
    p.mainImage,                                   // 23
    p.additionalImages ?? '',                      // 24
    p.description,                                 // 25
    // ── 상품 주요정보 (26~34) ────────────────────────────────────────────
    brand,                                         // 26
    manufacturer,                                  // 27
    p.manufactureDate ?? '',                       // 28
    p.expiryDate      ?? '',                       // 29
    p.originCode      ?? d.originCode,             // 30
    importer,                                      // 31
    p.multipleOrigin  ?? d.multipleOrigin,         // 32
    p.originDirect    ?? '',                       // 33
    p.minorPurchase   ?? d.minorPurchase,          // 34
    // ── 배송정보 (35~50) ─────────────────────────────────────────────────
    p.deliveryTemplateCode ?? '',                  // 35
    hasTemplate ? '' : deliveryMethod,             // 36
    hasTemplate ? '' : (p.courierCode ?? d.courierCode), // 37
    hasTemplate ? '' : deliveryFeeType,            // 38
    hasTemplate ? '' : (p.basicDeliveryFee ?? d.basicDeliveryFee), // 39
    hasTemplate ? '' : deliveryPayType,            // 40
    hasTemplate ? '' : (p.conditionalFreeAmount ?? ''), // 41
    p.quantityBasedQty   ?? '',                    // 42
    p.intervalBased2Qty  ?? '',                    // 43
    p.intervalBased3Qty  ?? '',                    // 44
    p.intervalBased3Fee  ?? '',                    // 45
    p.intervalBasedAddFee ?? '',                   // 46
    hasTemplate ? '' : (p.returnFee   ?? d.returnFee),   // 47
    hasTemplate ? '' : (p.exchangeFee ?? d.exchangeFee), // 48
    p.regionalDeliveryFee ?? '',                   // 49
    p.installationFee     ?? 'N',                  // 50
    // ── 상품정보제공고시 (51~55) ─────────────────────────────────────────
    p.noticeTemplateCode  ?? d.noticeTemplateCode, // 51
    p.noticeBrandName     ?? '',                   // 52
    p.noticeModelName     ?? '',                   // 53
    p.noticeCertification ?? '',                   // 54
    p.noticeManufacturer  ?? '',                   // 55
    // ── A/S, 특이사항 (56~59) ────────────────────────────────────────────
    p.asTemplateCode ?? '',                        // 56
    p.asPhone        ?? d.asPhone,                 // 57
    asGuide,                                       // 58
    p.sellerRemark   ?? '',                        // 59
    // ── 할인/혜택정보 (60~76) ────────────────────────────────────────────
    p.discountValue  ?? d.discountValue,           // 60
    p.discountUnit   ?? d.discountUnit,            // 61
    // Mobile discount must equal PC discount (Naver policy — input is ignored but must match)
    p.discountValue  ?? d.discountValue,           // 62  mobile = PC
    p.discountUnit   ?? d.discountUnit,            // 63  mobile = PC
    p.multipleDiscountCondition     ?? '',         // 64
    p.multipleDiscountConditionUnit ?? '',         // 65
    p.multipleDiscountValue ?? '',                 // 66
    p.multipleDiscountUnit  ?? '',                 // 67
    p.pointValue ?? '',                            // 68
    p.pointUnit  ?? '',                            // 69
    p.textReviewPoint       ?? d.textReviewPoint,  // 70
    p.photoReviewPoint      ?? d.photoReviewPoint, // 71
    p.monthTextReviewPoint  ?? d.monthTextReviewPoint,  // 72
    p.monthPhotoReviewPoint ?? d.monthPhotoReviewPoint, // 73
    p.alarmReviewPoint      ?? d.alarmReviewPoint, // 74
    p.installmentMonths     ?? d.installmentMonths,// 75
    p.gift               ?? '',                    // 76
    // ── 기타 정보 (77~93) ────────────────────────────────────────────────
    p.sellerBarcode      ?? '',                    // 77
    p.reviewVisible      ?? d.reviewVisible,       // 78
    p.reviewHiddenReason ?? '',                    // 79
    p.alarmOnlyCustomer  ?? d.alarmOnlyCustomer,   // 80
    // Book-specific (empty for non-book products)
    p.isbn               ?? '',                    // 81
    p.issn               ?? '',                    // 82
    p.independentPublish ?? '',                    // 83
    p.publishDate        ?? '',                    // 84
    p.publisher          ?? '',                    // 85
    p.authorText         ?? '',                    // 86
    p.authorIllust       ?? '',                    // 87
    p.authorTranslator   ?? '',                    // 88
    p.culturalExpense    ?? '',                    // 89
    // Size info
    p.sizeProductGroup   ?? '',                    // 90
    p.sizeName           ?? '',                    // 91
    p.sizeDetail         ?? '',                    // 92
    p.sizeModelName      ?? '',                    // 93
  ];
}

// Build per-column section ARGB lookup (0-based index)
function buildColArgbMap(): string[] {
  const map: string[] = [];
  for (const sec of SECTION_DEFS) {
    for (let i = 0; i < sec.colSpan; i++) map.push(sec.argb);
  }
  return map;
}

export async function buildNaverWorkbook(
  options: ExcelGenerateOptions
): Promise<ExcelJS.Workbook> {
  const { products, shippingTemplate, supplierOverride } = options;
  const defaults = mergeDefaults(supplierOverride);
  const colArgb  = buildColArgbMap(); // 88 entries

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kkotium';
  wb.created = new Date();

  const ws = wb.addWorksheet('일괄등록', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
    properties: { defaultRowHeight: 18 },
  });

  const totalCols = COLUMN_LABELS.length; // 88

  // ── Row 1: Section headers (merged) ──────────────────────────────────────
  let colCursor = 1;
  for (const sec of SECTION_DEFS) {
    const startCol = colCursor;
    const endCol   = colCursor + sec.colSpan - 1;
    if (sec.colSpan > 1) ws.mergeCells(1, startCol, 1, endCol);

    const cell = ws.getCell(1, startCol);
    cell.value = sec.label;
    styleCell(cell, {
      bgArgb: sec.argb,
      bold: true,
      fontSize: 10,
      fontColor: 'FF1F1F1F',
      hAlign: 'center',
      vAlign: 'middle',
      borderColor: 'FFAAAAAA',
      borderStyle: 'medium',
    });
    colCursor += sec.colSpan;
  }
  ws.getRow(1).height = 22;

  // ── Row 2: Column labels ──────────────────────────────────────────────────
  const labelRow = ws.getRow(2);
  COLUMN_LABELS.forEach((label, idx) => {
    const cell = labelRow.getCell(idx + 1);
    cell.value = label;
    // Mobile discount cols (idx 56,57) use gray
    const bgArgb = MOBILE_DISCOUNT_INDICES.has(idx) ? MOBILE_DISCOUNT_ARGB : colArgb[idx];
    styleCell(cell, {
      bgArgb,
      bold: true,
      fontSize: 9,
      fontColor: 'FF1F1F1F',
      hAlign: 'center',
      vAlign: 'middle',
      wrapText: true,
      borderColor: 'FFBBBBBB',
      borderStyle: 'thin',
    });
  });
  labelRow.height = 30;

  // ── Data rows (from row 3) ────────────────────────────────────────────────
  products.forEach((product, idx) => {
    const enriched: NaverProductData = shippingTemplate
      ? { ...product, deliveryTemplateCode: shippingTemplate.templateCode }
      : product;

    const values = buildDataRow(enriched, defaults);
    const rowNum  = 3 + idx;
    const row     = ws.getRow(rowNum);
    const isAlt   = idx % 2 === 1;
    const rowBg   = isAlt ? 'FFF5F5F5' : 'FFFFFFFF';

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      // Disabled shipping fields when template is set
      const label = COLUMN_LABELS[colIdx] ?? '';
      const isShippingField = [
        '배송방법', '택배사코드', '배송비유형',
        '기본배송비', '배송비 결제방식',
        '나형배송방식', '반품배송비', '교환배송비',
      ].includes(label);
      const isDisabled = !!enriched.deliveryTemplateCode && isShippingField;

      if (isDisabled) {
        cell.value = '';
        styleCell(cell, { bgArgb: 'FFD9D9D9', fontColor: 'FF999999', italic: true, fontSize: 9, hAlign: 'center', vAlign: 'middle' });
      } else {
        cell.value = val as ExcelJS.CellValue;
        styleCell(cell, {
          bgArgb: rowBg,
          fontSize: 10,
          hAlign: 'left',
          vAlign: 'middle',
          borderColor: 'FFEEEEEE',
          borderStyle: 'thin',
        });
      }
    });
    row.height = 18;
  });

  // ── Column widths ─────────────────────────────────────────────────────────
  const widthMap: Record<number, number> = {
    0:  22,  // 판매자 상품코드
    1:  14,  // 카테고리코드
    2:  35,  // 상품명
    4:  12,  // 판매가
    6:  10,  // 재고수량
    8:  14,  // 옵션명
    9:  20,  // 옵션값
    10: 14,  // 옵션가
    11: 14,  // 옵션 재고수량
    17: 38,  // 대표이미지
    18: 38,  // 추가이미지
    19: 45,  // 상세설명
    29: 18,  // 배송비 템플릿코드
    51: 18,  // A/S 전화번호
    52: 35,  // A/S 안내
    53: 30,  // 판매자특이사항
  };
  for (let c = 1; c <= totalCols; c++) {
    ws.getColumn(c).width = widthMap[c - 1] ?? 14;
  }

  return wb;
}

export async function generateNaverExcelBuffer(
  options: ExcelGenerateOptions
): Promise<Buffer> {
  const wb = await buildNaverWorkbook(options);
  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export async function generateNaverExcelFile(
  options: ExcelGenerateOptions,
  outputPath?: string
): Promise<string> {
  const wb  = await buildNaverWorkbook(options);
  const ts  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const out = outputPath ?? `naver_upload_${ts}.xlsx`;
  await wb.xlsx.writeFile(out);
  return out;
}
