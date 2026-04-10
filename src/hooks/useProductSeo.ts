'use client';

import { useState, useCallback } from 'react';

export interface SeoFields {
  title: string;
  description: string;
  keywords: string;
  naver_title: string;
  naver_description: string;
  og_image: string;
  seo_score: number;
  seo_valid: boolean;
}

export function useProductSeo(initialSeo: Partial<SeoFields> = {}) {
  const [seoFields, setSeoFields] = useState<SeoFields>({
    title: initialSeo.title || '',
    description: initialSeo.description || '',
    keywords: initialSeo.keywords || '',
    naver_title: initialSeo.naver_title || '',
    naver_description: initialSeo.naver_description || '',
    og_image: initialSeo.og_image || '',
    seo_score: 0,
    seo_valid: false,
  });

  const updateSeoFields = useCallback((updates: Partial<SeoFields>) => {
    setSeoFields(prev => ({ ...prev, ...updates }));
  }, []);

  const validateSeo = useCallback(() => {
    let score = 0;
    if (seoFields.title.length >= 10) score += 20;
    if (seoFields.description.length >= 50) score += 25;
    if (seoFields.keywords.split(',').filter(Boolean).length >= 3) score += 15;
    if (seoFields.naver_title.length >= 10) score += 20;
    if (seoFields.naver_description.length >= 50) score += 20;

    const valid = score >= 80;
    setSeoFields(prev => ({ ...prev, seo_score: score, seo_valid: valid }));
    return { valid, score };
  }, [seoFields]);

  const toFormData = useCallback(() => {
    const { valid, score } = validateSeo();
    return { ...seoFields, seo_score: score, seo_valid: valid };
  }, [seoFields, validateSeo]);

  return {
    seoFields,
    updateSeoFields,
    validateSeo,
    toFormData,
  };
}
