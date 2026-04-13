// src/lib/category-attributes.ts
// Category-specific required attribute guide for Naver Smart Store
// Aligned with actual 11 D1 categories from naver-categories-full.ts (4,993 entries)
// Used by: products/new (inline guide), products list (completeness badge), naver-seo (score)

export interface AttributeGuide {
  required: string[];    // must-fill attributes (SEO critical)
  recommended: string[]; // recommended for higher attribute score
  tip: string;           // Kkotti tip for this category
}

// All 11 D1 categories from naver-categories-full.ts -> attribute guide
const D1_ATTRIBUTE_MAP: Record<string, AttributeGuide> = {
  '\uAC00\uAD6C/\uC778\uD14C\uB9AC\uC5B4': {
    required: ['\uBE0C\uB79C\uB4DC', '\uC7AC\uC9C8', '\uC0C9\uC0C1'],
    recommended: ['\uD06C\uAE30/\uC0AC\uC774\uC988', '\uBB34\uAC8C', '\uC6D0\uC0B0\uC9C0', '\uC870\uB9BD\uC5EC\uBD80'],
    tip: '\uAC00\uAD6C\uB294 \uC7AC\uC9C8+\uC0C9\uC0C1+\uC0AC\uC774\uC988\uAC00 \uAC80\uC0C9 \uD544\uD130\uC758 \uD575\uC2EC\uC774\uC5D0\uC694. \uAF2D \uCC44\uC6B0\uC138\uC694!',
  },
  '\uB3C4\uC11C': {
    required: ['\uC800\uC790', '\uCD9C\uD310\uC0AC', 'ISBN'],
    recommended: ['\uBC1C\uD589\uC77C', '\uD398\uC774\uC9C0\uC218', '\uC5B8\uC5B4'],
    tip: '\uB3C4\uC11C\uB294 \uC800\uC790\uC640 ISBN\uC774 \uAC80\uC0C9 \uC815\uD655\uB3C4\uC5D0 \uACB0\uC815\uC801\uC774\uC5D0\uC694.',
  },
  '\uB514\uC9C0\uD138/\uAC00\uC804': {
    required: ['\uBE0C\uB79C\uB4DC', '\uBAA8\uB378\uBA85', '\uC6D0\uC0B0\uC9C0'],
    recommended: ['\uC0C9\uC0C1', '\uD06C\uAE30', 'KC\uC778\uC99D'],
    tip: '\uC804\uC790\uC81C\uD488\uC740 \uBAA8\uB378\uBA85\uC744 \uC815\uD655\uD788 \uC785\uB825\uD558\uBA74 \uC815\uD655 \uAC80\uC0C9 \uC720\uC785\uC774 \uC0DD\uACA8\uC694.',
  },
  '\uC0DD\uD65C/\uAC74\uAC15': {
    required: ['\uBE0C\uB79C\uB4DC', '\uC7AC\uC9C8', '\uC6D0\uC0B0\uC9C0'],
    recommended: ['\uC0C9\uC0C1', '\uD06C\uAE30/\uC0AC\uC774\uC988', '\uC778\uC99D\uC815\uBCF4'],
    tip: '\uC0DD\uD65C\uC6A9\uD488\uC740 \uC6D0\uC0B0\uC9C0\uC640 \uC778\uC99D\uC815\uBCF4\uAC00 \uAD6C\uB9E4 \uC2E0\uB8B0\uB3C4\uB97C \uB192\uC5EC\uC918\uC694.',
  },
  '\uC2A4\uD3EC\uCE20/\uB808\uC800': {
    required: ['\uBE0C\uB79C\uB4DC', '\uC7AC\uC9C8', '\uC0C9\uC0C1'],
    recommended: ['\uC0AC\uC774\uC988', '\uBB34\uAC8C', '\uC6D0\uC0B0\uC9C0'],
    tip: '\uC2A4\uD3EC\uCE20 \uC6A9\uD488\uC740 \uC0AC\uC774\uC988\uC640 \uBB34\uAC8C \uC815\uBCF4\uAC00 \uAD6C\uB9E4 \uC804\uD658\uC728\uC744 \uB192\uC5EC\uC694.',
  },
  '\uC2DD\uD488': {
    required: ['\uBE0C\uB79C\uB4DC', '\uC6D0\uC0B0\uC9C0', '\uC911\uB7C9'],
    recommended: ['\uC54C\uB808\uB974\uAE30\uC815\uBCF4', '\uBCF4\uAD00\uBC29\uBC95', '\uC720\uD1B5\uAE30\uD55C'],
    tip: '\uC2DD\uD488\uC740 \uC6D0\uC0B0\uC9C0\uC640 \uC911\uB7C9\uC744 \uD544\uC218\uB85C \uC785\uB825\uD574\uC57C \uD310\uB9E4 \uB4F1\uB85D\uC774 \uAC00\uB2A5\uD574\uC694.',
  },
  '\uC5EC\uAC00/\uC0DD\uD65C\uD3B8\uC758': {
    required: ['\uBE0C\uB79C\uB4DC', '\uC6D0\uC0B0\uC9C0'],
    recommended: ['\uC0C9\uC0C1', '\uC7AC\uC9C8', '\uD06C\uAE30'],
    tip: '\uC5EC\uAC00/\uC0DD\uD65C\uD3B8\uC758 \uCE74\uD14C\uACE0\uB9AC\uB294 \uBE0C\uB79C\uB4DC\uC640 \uC6D0\uC0B0\uC9C0\uAC00 \uAE30\uBCF8\uC774\uC5D0\uC694.',
  },
  '\uCD9C\uC0B0/\uC721\uC544': {
    required: ['\uBE0C\uB79C\uB4DC', '\uC7AC\uC9C8', '\uC6D0\uC0B0\uC9C0', 'KC\uC778\uC99D'],
    recommended: ['\uC0C9\uC0C1', '\uD06C\uAE30', '\uAD8C\uC7A5\uC5F0\uB839'],
    tip: '\uC721\uC544\uC6A9\uD488\uC740 KC\uC778\uC99D\uC774 \uC5C6\uC73C\uBA74 \uB124\uC774\uBC84 \uAC80\uC0C9 \uB178\uCD9C\uC5D0\uC11C \uBD88\uC774\uC775\uC744 \uBC1B\uC744 \uC218 \uC788\uC5B4\uC694!',
  },
  '\uD328\uC158\uC758\uB958': {
    required: ['\uBE0C\uB79C\uB4DC', '\uC0C9\uC0C1', '\uC18C\uC7AC'],
    recommended: ['\uC0AC\uC774\uC988', '\uC6D0\uC0B0\uC9C0', '\uC138\uD0C1\uBC29\uBC95'],
    tip: '\uC637\uC740 \uC18C\uC7AC+\uC0C9\uC0C1+\uC0AC\uC774\uC988 \uC138\uD2B8\uAC00 \uC1FC\uD551 \uD544\uD130 \uB178\uCD9C\uC758 \uAE30\uBCF8\uC774\uC5D0\uC694.',
  },
  '\uD328\uC158\uC7A1\uD654': {
    required: ['\uBE0C\uB79C\uB4DC', '\uC7AC\uC9C8', '\uC0C9\uC0C1'],
    recommended: ['\uC0AC\uC774\uC988', '\uC6D0\uC0B0\uC9C0'],
    tip: '\uC7A1\uD654\uB294 \uBE0C\uB79C\uB4DC\uC640 \uC7AC\uC9C8\uC744 \uBC18\uB4DC\uC2DC \uC785\uB825\uD558\uC138\uC694. \uD544\uD130 \uAC80\uC0C9\uC5D0\uC11C \uC790\uC8FC \uC4F0\uC5EC\uC694.',
  },
  '\uD654\uC7A5\uD488/\uBBF8\uC6A9': {
    required: ['\uBE0C\uB79C\uB4DC', '\uC6D0\uC0B0\uC9C0', '\uD53C\uBD80\uD0C0\uC785'],
    recommended: ['\uC6A9\uB7C9', '\uC131\uBD84', '\uC0AC\uC6A9\uAE30\uD55C'],
    tip: '\uD654\uC7A5\uD488\uC740 \uBE0C\uB79C\uB4DC+\uC6D0\uC0B0\uC9C0+\uD53C\uBD80\uD0C0\uC785\uC774 SEO \uD575\uC2EC \uC18D\uC131\uC774\uC5D0\uC694.',
  },
};

// Fallback guide for unknown categories
const DEFAULT_GUIDE: AttributeGuide = {
  required: ['\uBE0C\uB79C\uB4DC', '\uC6D0\uC0B0\uC9C0'],
  recommended: ['\uC7AC\uC9C8', '\uC0C9\uC0C1', '\uD06C\uAE30/\uC0AC\uC774\uC988'],
  tip: '\uBE0C\uB79C\uB4DC\uC640 \uC6D0\uC0B0\uC9C0\uB294 \uBAA8\uB4E0 \uCE74\uD14C\uACE0\uB9AC\uC5D0\uC11C SEO \uC810\uC218\uC5D0 \uC601\uD5A5\uC744 \uC918\uC694.',
};

// Get attribute guide by D1 category name (primary lookup)
export function getCategoryAttributeGuideByD1Name(d1Name: string): AttributeGuide {
  return D1_ATTRIBUTE_MAP[d1Name] ?? DEFAULT_GUIDE;
}

// Get attribute guide by category code (fallback via naver-categories-full lookup)
export function getCategoryAttributeGuide(naverCategoryCode: string | null | undefined): AttributeGuide {
  if (!naverCategoryCode) return DEFAULT_GUIDE;
  // Direct D1 name lookup is preferred; this fallback just returns default
  return DEFAULT_GUIDE;
}

// ─── C-8: Attribute Completeness Checker ──────────────────────

// Product data fields relevant to attribute completeness
export interface ProductAttributeData {
  brand?: string | null;
  originCode?: string | null;
  material?: string | null;    // naver_material
  color?: string | null;       // naver_color
  size?: string | null;        // naver_size
  careInstructions?: string | null; // naver_care_instructions
  // Category-specific fields
  author?: string | null;      // for books
  publisher?: string | null;   // for books
  isbn?: string | null;        // for books
  modelName?: string | null;   // for electronics
  skinType?: string | null;    // for cosmetics
  weight?: string | null;      // for food
  kcCert?: string | null;      // KC certification
  recommendedAge?: string | null; // for toys/baby
}

export interface AttributeCompletenessResult {
  score: number;          // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  filledRequired: number;
  totalRequired: number;
  filledRecommended: number;
  totalRecommended: number;
  missingRequired: string[];
  missingRecommended: string[];
}

// Map attribute name to product data field
const ATTR_FIELD_MAP: Record<string, keyof ProductAttributeData> = {
  '\uBE0C\uB79C\uB4DC': 'brand',
  '\uC6D0\uC0B0\uC9C0': 'originCode',
  '\uC7AC\uC9C8': 'material',
  '\uC18C\uC7AC': 'material',
  '\uC0C9\uC0C1': 'color',
  '\uD06C\uAE30/\uC0AC\uC774\uC988': 'size',
  '\uC0AC\uC774\uC988': 'size',
  '\uC138\uD0C1\uBC29\uBC95': 'careInstructions',
  '\uBAA8\uB378\uBA85': 'modelName',
  '\uD53C\uBD80\uD0C0\uC785': 'skinType',
  '\uC911\uB7C9': 'weight',
  '\uBB34\uAC8C': 'weight',
  'KC\uC778\uC99D': 'kcCert',
  '\uAD8C\uC7A5\uC5F0\uB839': 'recommendedAge',
  '\uC800\uC790': 'author',
  '\uCD9C\uD310\uC0AC': 'publisher',
  'ISBN': 'isbn',
};

// Check if an attribute is filled based on product data
function isAttrFilled(attrName: string, data: ProductAttributeData): boolean {
  const field = ATTR_FIELD_MAP[attrName];
  if (!field) return false;
  const val = data[field];
  return val != null && String(val).trim().length > 0;
}

// Calculate attribute completeness score
export function calcAttributeCompleteness(
  d1Name: string,
  data: ProductAttributeData
): AttributeCompletenessResult {
  const guide = getCategoryAttributeGuideByD1Name(d1Name);

  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];

  let filledRequired = 0;
  for (const attr of guide.required) {
    if (isAttrFilled(attr, data)) {
      filledRequired++;
    } else {
      missingRequired.push(attr);
    }
  }

  let filledRecommended = 0;
  for (const attr of guide.recommended) {
    if (isAttrFilled(attr, data)) {
      filledRecommended++;
    } else {
      missingRecommended.push(attr);
    }
  }

  const totalRequired = guide.required.length;
  const totalRecommended = guide.recommended.length;

  // Score: required 70% weight + recommended 30% weight
  const reqScore = totalRequired > 0 ? (filledRequired / totalRequired) * 70 : 70;
  const recScore = totalRecommended > 0 ? (filledRecommended / totalRecommended) * 30 : 30;
  const score = Math.round(reqScore + recScore);

  // Grade: S(90+), A(70+), B(50+), C(30+), D(<30)
  const grade: AttributeCompletenessResult['grade'] =
    score >= 90 ? 'S' : score >= 70 ? 'A' : score >= 50 ? 'B' : score >= 30 ? 'C' : 'D';

  return {
    score,
    grade,
    filledRequired,
    totalRequired,
    filledRecommended,
    totalRecommended,
    missingRequired,
    missingRecommended,
  };
}

// Prisma column -> attribute field mapping (for DB queries)
export const PRISMA_ATTR_MAP: Record<string, string> = {
  naver_brand: '\uBE0C\uB79C\uB4DC',
  naver_material: '\uC7AC\uC9C8',
  naver_color: '\uC0C9\uC0C1',
  naver_size: '\uD06C\uAE30/\uC0AC\uC774\uC988',
  naver_origin: '\uC6D0\uC0B0\uC9C0',
  naver_care_instructions: '\uC138\uD0C1\uBC29\uBC95',
};
