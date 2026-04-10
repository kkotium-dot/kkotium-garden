import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // -- 1. Admin User
  const user = await prisma.user.upsert({
    where: { email: 'admin@kkotium.com' },
    update: {},
    create: { email: 'admin@kkotium.com', name: 'Kkotium Admin', level: 10, exp: 9999 },
  });
  console.log('User:', user.email);

  // -- 2. Suppliers
  const sup1 = await prisma.supplier.upsert({
    where: { code: 'SUP-KKOTIUM-001' },
    update: {},
    create: { name: 'Kkotium Direct', code: 'SUP-KKOTIUM-001', abbr: 'KKT', platformCode: 'OWN', contact: '010-0000-0000', address: 'Seoul Gangnam', description: 'Default supplier' },
  });
  const sup2 = await prisma.supplier.upsert({
    where: { code: 'DMM-FLOWER' },
    update: {},
    create: { name: 'Domemae Flower', code: 'DMM-FLOWER', abbr: 'DMF', platformCode: 'DMM', contact: '010-1111-2222', address: 'Seoul Seocho', description: 'Domemae flower supplier' },
  });
  const sup3 = await prisma.supplier.upsert({
    where: { code: 'DMM-LIVING' },
    update: {},
    create: { name: 'Domemae Living', code: 'DMM-LIVING', abbr: 'DML', platformCode: 'DMM', contact: '010-3333-4444', address: 'Seongnam', description: 'Domemae living/interior' },
  });
  const sup4 = await prisma.supplier.upsert({
    where: { code: 'DMK-HOME' },
    update: {},
    create: { name: 'Domeggook Home', code: 'DMK-HOME', abbr: 'DMH', platformCode: 'DMK', contact: '010-5555-6666', address: 'Busan', description: 'Domeggook home deco' },
  });
  const sup5 = await prisma.supplier.upsert({
    where: { code: 'DIRECT-GARDEN' },
    update: {},
    create: { name: 'Garden Direct', code: 'DIRECT-GARDEN', abbr: 'GDN', platformCode: 'OWN', contact: '010-7777-8888', address: 'Goyang', description: 'Garden direct purchase' },
  });
  console.log('Suppliers: 5 created');

  // -- 3. Sample Products
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});

  const products = [
    {
      name: 'Premium Rose Bouquet Birthday Gift Same-Day Delivery',
      sku: 'DMM-10001',
      salePrice: 59000, supplierPrice: 28000, margin: 52.5,
      status: 'ACTIVE', supplierId: sup1.id,
      mainImage: 'https://images.unsplash.com/photo-1548094878-84ced0f6a458?w=800',
      images: ['https://images.unsplash.com/photo-1548094878-84ced0f6a458?w=800'],
      imageAltTexts: ['Rose bouquet main'], imageCount: 1, category: 'flower',
      brand: 'Kkotium', manufacturer: 'Kkotium', shippingFee: 0,
      naver_title: 'Premium Rose Bouquet Birthday Gift Same-Day Delivery',
      naver_keywords: 'rose bouquet,birthday gift,flower bouquet',
      naver_description: 'Premium rose bouquet made from fresh roses.',
      naver_brand: 'Kkotium', naver_material: 'fresh flower', naver_color: 'red,pink', naver_size: 'medium(50cm)',
    },
    {
      name: 'Tulip Bouquet Graduation Gift Spring Flower',
      sku: 'DMM-10002',
      salePrice: 45000, supplierPrice: 20000, margin: 55.6,
      status: 'ACTIVE', supplierId: sup1.id,
      mainImage: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=800',
      images: ['https://images.unsplash.com/photo-1520763185298-1b434c919102?w=800'],
      imageAltTexts: ['Tulip bouquet main'], imageCount: 1, category: 'flower',
      brand: 'Kkotium', manufacturer: 'Kkotium', shippingFee: 3000,
      naver_title: 'Tulip Bouquet Graduation Gift Spring Flower Anniversary',
      naver_keywords: 'tulip bouquet,graduation gift,spring flower',
      naver_description: 'Vibrant tulip bouquet. Perfect for graduation gifts.',
      naver_brand: 'Kkotium', naver_material: 'fresh flower', naver_color: 'yellow,pink,white', naver_size: 'medium(45cm)',
    },
    {
      name: 'Stuckey Air Purifying Plant Iron Pot Housewarming Gift',
      sku: 'DMM-10003',
      salePrice: 38000, supplierPrice: 15000, margin: 60.5,
      status: 'ACTIVE', supplierId: sup2.id,
      mainImage: 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=800',
      images: ['https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=800'],
      imageAltTexts: ['Stuckey pot main'], imageCount: 1, category: 'plant',
      brand: 'Kkotium', manufacturer: 'Kkotium', shippingFee: 3000,
      naver_title: 'Stuckey Air Purifying Plant Iron Pot Housewarming Interior',
      naver_keywords: 'stuckey plant,air purifying,housewarming gift',
      naver_description: 'Easy-care air purifying Stuckey plant.',
      naver_brand: 'Kkotium', naver_material: 'live plant', naver_color: 'green', naver_size: 'medium(40cm)',
    },
    {
      name: 'Monstera Medium Interior Indoor Plant',
      sku: 'DMM-10004',
      salePrice: 55000, supplierPrice: 22000, margin: 60.0,
      status: 'ACTIVE', supplierId: sup2.id,
      mainImage: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800',
      images: ['https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800'],
      imageAltTexts: ['Monstera pot main'], imageCount: 1, category: 'plant',
      brand: 'Kkotium', manufacturer: 'Kkotium', shippingFee: 5000,
      naver_title: 'Monstera Medium Indoor Plant Interior Air Purifying',
      naver_keywords: 'monstera,indoor plant,interior plant',
      naver_description: 'Trendy interior plant Monstera.',
      naver_brand: 'Kkotium', naver_material: 'live plant', naver_color: 'deep green', naver_size: 'medium(60cm)',
    },
    {
      name: 'Dried Flower Mini Bouquet Gift Set',
      sku: 'DMK-20001',
      salePrice: 28000, supplierPrice: 10000, margin: 64.3,
      status: 'ACTIVE', supplierId: sup4.id,
      mainImage: 'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800',
      images: ['https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800'],
      imageAltTexts: ['Dried flower bouquet main'], imageCount: 1, category: 'bouquet',
      brand: 'Kkotium', manufacturer: 'Kkotium', shippingFee: 3000,
      naver_title: 'Dried Flower Mini Bouquet Gift Set Interior Prop',
      naver_keywords: 'dried flower,mini bouquet,gift set',
      naver_description: 'Long-lasting dried flower mini bouquet.',
      naver_brand: 'Kkotium', naver_material: 'dried flower', naver_color: 'beige,pink', naver_size: 'small(25cm)',
    },
    {
      name: 'Premium Flower Wrapping Paper Ribbon Set',
      sku: 'DIRECT-30001',
      salePrice: 15000, supplierPrice: 5000, margin: 66.7,
      status: 'ACTIVE', supplierId: sup5.id,
      mainImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800',
      images: ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800'],
      imageAltTexts: ['Wrapping paper ribbon main'], imageCount: 1, category: 'supplies',
      brand: 'Kkotium', manufacturer: 'Kkotium', shippingFee: 0,
      naver_title: 'Premium Flower Wrapping Paper Ribbon Set Florist Supplies',
      naver_keywords: 'flower wrapping paper,ribbon,florist supplies',
      naver_description: 'Stylish wrapping paper and ribbon set.',
      naver_brand: 'Kkotium', naver_material: 'paper,fabric', naver_color: 'pink,white,kraft', naver_size: '50x60cm',
    },
  ];

  for (const item of products) {
    const r = await prisma.product.create({
      data: { ...item, userId: user.id },
    });
    console.log('Product:', r.sku, r.name.slice(0, 30));
  }

  console.log('Seed complete! Suppliers: 5, Products:', products.length);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
