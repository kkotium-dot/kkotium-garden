// src/lib/gemini.ts — Groq AI 기반 (역사적 파일명 유지, Sprint 7-PC-C 2026-05-19)
//
// ⚠️ DEPRECATED 파일명: 향후 @/lib/ai/groq로 마이그레이션 권고
// 본 파일은 import 호환성 위해 유지 (사용처: /api/keywords, /api/description,
// /api/products/[id]/keywords). 내부는 100% Groq 호출 (Perplexity 제거 완료).
//
// 시그니처 그대로 유지하여 import 사용처 무수정.

import {
  callGroq,
  generateNaverKeywordsGroq,
  generateProductTitleGroq,
  generateProductDescriptionGroq,
} from '@/lib/ai/groq';

export async function generateNaverKeywords(
  productName: string,
  category?: string,
): Promise<string[]> {
  return generateNaverKeywordsGroq(productName, category);
}

export async function generateProductTitle(
  productName: string,
  keywords: string[],
): Promise<string[]> {
  return generateProductTitleGroq(productName, keywords);
}

export async function generateProductDescription(
  productName: string,
  keywords: string[],
  features?: string[],
): Promise<string> {
  return generateProductDescriptionGroq(productName, keywords, features);
}

// Re-export callGroq for any caller that imported a low-level helper
export { callGroq };
