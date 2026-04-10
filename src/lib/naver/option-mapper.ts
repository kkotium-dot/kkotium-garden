// src/lib/naver/option-mapper.ts
// P0: Option system Excel mapping
// Naver format: combination = ^ separator, single = / separator, direct = : separator

export const OPTION_TYPE = {
  COMBINATION: 'COMBINATION',
  SINGLE: 'SINGLE',
  DIRECT: 'DIRECT',
} as const;

export type OptionTypeKey = typeof OPTION_TYPE[keyof typeof OPTION_TYPE];

// Single option row for Excel export
export interface OptionExcelRow {
  optionType: OptionTypeKey;
  // Column: option_value (col 23 in Naver)
  optionValue: string;
  // Column: option_price (col 24)
  optionPrice: number;
  // Column: option_stock (col 25)
  optionStock: number;
  // Column: option_sale_status (col 26)
  saleStatus: string;
  // Column: option_management_code (col 27)
  managementCode: string;
}

// --- Combination Type (^) ---
// e.g., ["Red", "S"] => "Red^S" (with option name "Color^Size")
export function formatCombinationOptionNames(names: string[]): string {
  return names.join('^');
}

export function formatCombinationOptionValue(values: string[]): string {
  return values.join('^');
}

// --- Single Type (/) ---
// e.g., ["Red", "Blue", "Green"] => "Red/Blue/Green"
export function formatSingleOptionValues(values: string[]): string {
  return values.join('/');
}

// --- Direct Input Type (:) ---
// e.g., ["Engraving", "Gift Message"] => "Engraving:Gift Message"
export function formatDirectInputNames(names: string[]): string {
  return names.join(':');
}

// --- Cartesian Product for Combination ---
// Input: [["Red", "Blue"], ["S", "M", "L"]]
// Output: [["Red", "S"], ["Red", "M"], ["Red", "L"], ["Blue", "S"], ...]
export function cartesianProduct(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<string[][]>(
    (acc, curr) =>
      acc.flatMap((combo) => curr.map((val) => [...combo, val])),
    [[]]
  );
}

// --- Build Excel rows from option data ---
export interface OptionData {
  type: OptionTypeKey;
  names: string[];
  // For COMBINATION: values is array of arrays (one per option group)
  // For SINGLE: values is array of string arrays (flat list per group)
  values: string[][];
  prices?: number[];
  stocks?: number[];
  statuses?: string[];
  managementCodes?: string[];
}

export function buildOptionExcelRows(data: OptionData): OptionExcelRow[] {
  const rows: OptionExcelRow[] = [];

  if (data.type === OPTION_TYPE.COMBINATION) {
    const combos = cartesianProduct(data.values);
    combos.forEach((combo, i) => {
      rows.push({
        optionType: OPTION_TYPE.COMBINATION,
        optionValue: formatCombinationOptionValue(combo),
        optionPrice: data.prices?.[i] ?? 0,
        optionStock: data.stocks?.[i] ?? 0,
        saleStatus: data.statuses?.[i] ?? 'SALE',
        managementCode: data.managementCodes?.[i] ?? '',
      });
    });
  } else if (data.type === OPTION_TYPE.SINGLE) {
    // Single: each option group is independent
    data.values.forEach((group, groupIdx) => {
      group.forEach((val, valIdx) => {
        const flatIdx = data.values
          .slice(0, groupIdx)
          .reduce((sum, g) => sum + g.length, 0) + valIdx;
        rows.push({
          optionType: OPTION_TYPE.SINGLE,
          optionValue: val,
          optionPrice: data.prices?.[flatIdx] ?? 0,
          optionStock: data.stocks?.[flatIdx] ?? 0,
          saleStatus: data.statuses?.[flatIdx] ?? 'SALE',
          managementCode: data.managementCodes?.[flatIdx] ?? '',
        });
      });
    });
  } else if (data.type === OPTION_TYPE.DIRECT) {
    // Direct input: no rows, just format the names
    rows.push({
      optionType: OPTION_TYPE.DIRECT,
      optionValue: formatDirectInputNames(data.names),
      optionPrice: 0,
      optionStock: 0,
      saleStatus: 'SALE',
      managementCode: '',
    });
  }

  return rows;
}

// --- Format for Naver Excel column ---
// Returns the string to put in the "option_name" column
export function getExcelOptionNameColumn(data: OptionData): string {
  if (data.type === OPTION_TYPE.COMBINATION) {
    return formatCombinationOptionNames(data.names);
  }
  if (data.type === OPTION_TYPE.SINGLE) {
    return data.names.join('/');
  }
  if (data.type === OPTION_TYPE.DIRECT) {
    return formatDirectInputNames(data.names);
  }
  return '';
}

// Returns the option type string for Naver Excel
export function getExcelOptionTypeString(type: OptionTypeKey): string {
  switch (type) {
    case OPTION_TYPE.COMBINATION:
      return 'COMBINATION';
    case OPTION_TYPE.SINGLE:
      return 'SINGLE';
    case OPTION_TYPE.DIRECT:
      return 'DIRECT_INPUT';
    default:
      return '';
  }
}
