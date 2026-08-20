// src/lib/hooks/useSellerGrade.ts
// P0-1 (2026-08-20): client-side seller grade lookup, backed by
// StoreSettings.sellerGrade (/api/store-settings). Defaults to '영세' while
// loading or if unset — matches the server-side fallback in
// naver-fee-rates-2026.ts / seller-grade.server.ts.
'use client';

import { useEffect, useState } from 'react';
import { isSellerGrade, type SellerGrade } from '@/lib/naver-fee-rates-2026';

export function useSellerGrade(): SellerGrade {
  const [grade, setGrade] = useState<SellerGrade>('영세');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/store-settings')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d?.success && isSellerGrade(d.settings?.sellerGrade)) {
          setGrade(d.settings.sellerGrade);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return grade;
}
