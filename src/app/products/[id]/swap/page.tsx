// src/app/products/[id]/swap/page.tsx
// Product-swap (B-plan) workflow page (Phase 2 task 3). Renders the client
// pipeline component; all data flows through /api/products/[id]/swap-pipeline.

import ProductSwapPipeline from '@/components/products/ProductSwapPipeline';

export const dynamic = 'force-dynamic';

export default function ProductSwapPage({ params }: { params: { id: string } }) {
  return <ProductSwapPipeline productId={params.id} />;
}
