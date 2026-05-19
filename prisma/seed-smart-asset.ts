// Sprint 7-M2 Smart Asset Workflow v3.1 — seed 12 building blocks + 14 skeleton templates.
// Idempotent (upsert by id). Re-run safely after schema changes.

import { prisma } from '../src/lib/prisma';

type BuildingBlockSeed = {
  id: string;
  displayName: string;
  visualRole: string;
  seoTargetSurface: string;
  description: string;
};

type SkeletonTemplateSeed = {
  id: string;
  displayName: string;
  categoryHint: string;
  buildingBlockIds: string[];
  sectionCount: number;
  estimatedMinutes: number;
};

const BUILDING_BLOCKS: BuildingBlockSeed[] = [
  { id: 'B01', displayName: '무드 히어로',           visualRole: 'mood_hero',        seoTargetSurface: 'image_alt',   description: 'Top-of-detail mood hero image with brand atmosphere keyword in alt' },
  { id: 'B02', displayName: '상품 히어로',           visualRole: 'product_hero',     seoTargetSurface: 'image_alt',   description: 'Clean product-only hero shot, primary alt-text SEO surface' },
  { id: 'B03', displayName: '브랜드 스토리 또는 안전 인증', visualRole: 'brand_or_cert',    seoTargetSurface: 'detail_text', description: 'Brand narrative paragraph or safety certification block' },
  { id: 'B04', displayName: '사용씬 라이프',         visualRole: 'lifestyle',        seoTargetSurface: 'image_alt',   description: 'Lifestyle context image showing the product in real use' },
  { id: 'B05', displayName: '소재 디테일',           visualRole: 'material',         seoTargetSurface: 'detail_text', description: 'Close-up material/fabric/finish detail with descriptive copy' },
  { id: 'B06', displayName: '스펙',                 visualRole: 'spec',             seoTargetSurface: 'option_name', description: 'Specification table — dimensions, weight, capacity, materials' },
  { id: 'B07', displayName: '비교·차별점',           visualRole: 'comparison',       seoTargetSurface: 'detail_text', description: 'Comparison vs alternatives, differentiator narrative' },
  { id: 'B08', displayName: '사용·관리 가이드',       visualRole: 'usage_guide',      seoTargetSurface: 'detail_text', description: 'How-to-use and care/maintenance instructions' },
  { id: 'B09', displayName: 'FAQ',                  visualRole: 'faq',              seoTargetSurface: 'detail_text', description: 'Frequently asked questions block' },
  { id: 'B10', displayName: '후기·뱃지',             visualRole: 'review_badge',     seoTargetSurface: 'hook',        description: 'Reviews and trust badges, hook-text SEO surface' },
  { id: 'B11', displayName: '배송·교환',             visualRole: 'shipping_info',    seoTargetSurface: 'detail_text', description: 'Shipping and exchange/return policy block' },
  { id: 'B12', displayName: '추천·연관',             visualRole: 'related_products', seoTargetSurface: 'tag',         description: 'Related/recommended products carousel, tag SEO surface' },
];

const SKELETON_TEMPLATES: SkeletonTemplateSeed[] = [
  { id: 'S1',  displayName: '꽃·플랜테리어',         categoryHint: 'flower_planterior',     buildingBlockIds: ['B01','B02','B04','B05','B11'],                                       sectionCount: 5, estimatedMinutes: 25 },
  { id: 'S2',  displayName: '식품·디저트',           categoryHint: 'food_dessert',          buildingBlockIds: ['B01','B02','B05','B06','B08','B09','B11'],                          sectionCount: 7, estimatedMinutes: 35 },
  { id: 'S3',  displayName: '감성 리빙',             categoryHint: 'emotional_living',      buildingBlockIds: ['B01','B02','B03','B04','B05','B09','B11'],                          sectionCount: 7, estimatedMinutes: 35 },
  { id: 'S4',  displayName: '실용 잡화',             categoryHint: 'utility_misc',          buildingBlockIds: ['B02','B06','B11'],                                                  sectionCount: 3, estimatedMinutes: 15 },
  { id: 'S5',  displayName: '프리미엄 선물',         categoryHint: 'premium_gift',          buildingBlockIds: ['B01','B02','B03','B04','B05','B07','B09','B10','B11'],              sectionCount: 9, estimatedMinutes: 50 },
  { id: 'S6',  displayName: '의류·패션',             categoryHint: 'fashion_apparel',       buildingBlockIds: ['B01','B02','B04','B05','B06','B11'],                                sectionCount: 6, estimatedMinutes: 30 },
  { id: 'S7',  displayName: '건강·뷰티',             categoryHint: 'health_beauty',         buildingBlockIds: ['B02','B03','B05','B06','B08','B09','B11'],                          sectionCount: 7, estimatedMinutes: 35 },
  { id: 'S8',  displayName: '저가 박리다매',         categoryHint: 'low_price_bulk',        buildingBlockIds: ['B02','B06','B11'],                                                  sectionCount: 3, estimatedMinutes: 12 },
  { id: 'S9',  displayName: '가전·전자',             categoryHint: 'electronics',           buildingBlockIds: ['B02','B06','B07','B08','B09','B11'],                                sectionCount: 6, estimatedMinutes: 30 },
  { id: 'S10', displayName: '반려동물',              categoryHint: 'pet',                   buildingBlockIds: ['B01','B02','B04','B05','B08','B09','B11'],                          sectionCount: 7, estimatedMinutes: 35 },
  { id: 'S11', displayName: '시즌·이벤트',           categoryHint: 'seasonal_event',        buildingBlockIds: ['B01','B02','B04','B10','B11'],                                      sectionCount: 5, estimatedMinutes: 25 },
  { id: 'S12', displayName: '커스텀 제작',           categoryHint: 'custom_made',           buildingBlockIds: ['B01','B02','B05','B08','B12','B11'],                                sectionCount: 6, estimatedMinutes: 30 },
  { id: 'S13', displayName: '편안 홈웨어',           categoryHint: 'comfort_homewear',      buildingBlockIds: ['B01','B02','B04','B05','B06','B08','B11'],                          sectionCount: 7, estimatedMinutes: 35 },
  { id: 'S14', displayName: '돌봄·안심',             categoryHint: 'care_safety',           buildingBlockIds: ['B01','B02','B03','B04','B05','B09','B10','B11'],                    sectionCount: 8, estimatedMinutes: 40 },
];

async function main() {
  console.log('[seed-smart-asset] start');

  for (const block of BUILDING_BLOCKS) {
    await prisma.buildingBlock.upsert({
      where: { id: block.id },
      update: {
        displayName: block.displayName,
        visualRole: block.visualRole,
        seoTargetSurface: block.seoTargetSurface,
        description: block.description,
      },
      create: block,
    });
  }
  console.log(`[seed-smart-asset] BuildingBlock upserted: ${BUILDING_BLOCKS.length}`);

  for (const tpl of SKELETON_TEMPLATES) {
    await prisma.skeletonTemplate.upsert({
      where: { id: tpl.id },
      update: {
        displayName: tpl.displayName,
        categoryHint: tpl.categoryHint,
        buildingBlockIds: tpl.buildingBlockIds,
        sectionCount: tpl.sectionCount,
        estimatedMinutes: tpl.estimatedMinutes,
      },
      create: {
        id: tpl.id,
        displayName: tpl.displayName,
        categoryHint: tpl.categoryHint,
        buildingBlockIds: tpl.buildingBlockIds,
        sectionCount: tpl.sectionCount,
        estimatedMinutes: tpl.estimatedMinutes,
        isActive: true,
      },
    });
  }
  console.log(`[seed-smart-asset] SkeletonTemplate upserted: ${SKELETON_TEMPLATES.length}`);

  const blockCount = await prisma.buildingBlock.count();
  const tplCount = await prisma.skeletonTemplate.count();
  console.log(`[seed-smart-asset] done — BuildingBlock=${blockCount}, SkeletonTemplate=${tplCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[seed-smart-asset] error', err);
    await prisma.$disconnect();
    process.exit(1);
  });
