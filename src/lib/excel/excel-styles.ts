// ExcelJS cell styling helpers for Naver template
import type ExcelJS from 'exceljs';

type Fill = ExcelJS.Fill;
type Font = Partial<ExcelJS.Font>;
type Alignment = Partial<ExcelJS.Alignment>;
type Border = Partial<ExcelJS.Borders>;

export interface CellStyle {
  fill?: Fill;
  font?: Font;
  alignment?: Alignment;
  border?: Border;
}

// Solid fill helper
export function solidFill(argb: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

// Section header row style (Row 1, merged)
export function sectionHeaderStyle(argb: string): CellStyle {
  return {
    fill: solidFill(argb),
    font: { bold: true, size: 10, color: { argb: 'FF333333' } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: false },
    border: {
      bottom: { style: 'medium', color: { argb: 'FF999999' } },
    },
  };
}

// Column label row style (Row 2)
export function columnLabelStyle(argb: string): CellStyle {
  return {
    fill: solidFill(argb),
    font: { bold: true, size: 9, color: { argb: 'FF111111' } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top:    { style: 'thin', color: { argb: 'FFBBBBBB' } },
      bottom: { style: 'thin', color: { argb: 'FFBBBBBB' } },
      left:   { style: 'thin', color: { argb: 'FFDDDDDD' } },
      right:  { style: 'thin', color: { argb: 'FFDDDDDD' } },
    },
  };
}

// Guide text row style (Row 3, optional)
export function guideRowStyle(): CellStyle {
  return {
    fill: solidFill('FFF8F8F8'),
    font: { size: 8, italic: true, color: { argb: 'FF888888' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
  };
}

// Normal data row style
export function dataRowStyle(isAlternate: boolean): CellStyle {
  return {
    fill: isAlternate ? solidFill('FFFAFAFA') : undefined,
    font: { size: 10 },
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false },
    border: {
      bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
    },
  };
}

// Disabled field style — shipping fields when template code is set
export function disabledCellStyle(): CellStyle {
  return {
    fill: solidFill('FFD9D9D9'),
    font: { size: 9, color: { argb: 'FF999999' }, italic: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };
}

// Apply CellStyle to an ExcelJS Cell
export function applyStyle(cell: ExcelJS.Cell, style: CellStyle): void {
  if (style.fill)      cell.fill      = style.fill;
  if (style.font)      cell.font      = style.font as ExcelJS.Font;
  if (style.alignment) cell.alignment = style.alignment as ExcelJS.Alignment;
  if (style.border)    cell.border    = style.border   as ExcelJS.Borders;
}
