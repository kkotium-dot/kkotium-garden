const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
let c = schema;

// 1. Supplier: products Product[] 다음에 platformId/platform 역방향 추가
c = c.replace(
  "  products    Product[]\n}\n\nmodel Product",
  "  products    Product[]\n  platformId  String?\n  platform    Platform? @relation(fields: [platformId], references: [id])\n}\n\nmodel Product"
);

// 2. Product 관계 섹션에 platformId/platform + shippingTemplateId/shippingTemplate 추가
c = c.replace(
  "  supplierId              String\n  supplier                Supplier  @relation(fields: [supplierId], references: [id])\n  userId                  String\n  user                    User      @relation(fields: [userId], references: [id])\n  orderItems              OrderItem[]",
  "  supplierId              String\n  supplier                Supplier          @relation(fields: [supplierId], references: [id])\n  userId                  String\n  user                    User              @relation(fields: [userId], references: [id])\n  platformId              String?\n  platform                Platform?         @relation(fields: [platformId], references: [id])\n  shippingTemplateId      String?\n  shippingTemplate        ShippingTemplate? @relation(fields: [shippingTemplateId], references: [id])\n  orderItems              OrderItem[]"
);

// 3. Product @@index 추가
c = c.replace(
  "  @@index([imageCount])\n}",
  "  @@index([imageCount])\n  @@index([platformId])\n  @@index([shippingTemplateId])\n}"
);

if (c === schema) {
  console.log('WARNING: No changes made - pattern not found!');
} else {
  fs.writeFileSync('prisma/schema.prisma', c, 'utf8');
  console.log('SUCCESS: schema.prisma updated!');
}
