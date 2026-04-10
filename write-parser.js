const fs = require('fs');
const content = `import * as cheerio from 'cheerio';

export class DomemaeParser {
  private $: cheerio.CheerioAPI;

  constructor(html: string) {
    this.$ = cheerio.load(html);
  }

  extractProductName(): string {
    return (
      this.$('h1.product-name, .goods-name, h1').first().text().trim() || 'Unknown Product'
    );
  }

  extractSupplierPrice(): number {
    const text = this.$('.supply-price, .cost-price, [class*=supply]').first().text();
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  }

  extractSalePrice(): number {
    const text = this.$('.sale-price, .price, [class*=price]').first().text();
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  }

  extractImages(): string[] {
    const images: string[] = [];
    this.$('img[src*="goods"], .product-image img, .goods-image img').each((_, el) => {
      const src = this.$(el).attr('src');
      if (src) images.push(src.startsWith('http') ? src : 'https://domeggook.com' + src);
    });
    return [...new Set(images)].slice(0, 10);
  }

  extractOptions(): Array<{ name: string; price: number }> {
    const options: Array<{ name: string; price: number }> = [];
    this.$('select option, .option-item').each((_, el) => {
      const text = this.$(el).text().trim();
      if (text && text !== '선택') {
        const priceMatch = text.match(/\\+?([0-9,]+)원/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
        options.push({ name: text.replace(/[+\\-][0-9,]+원.*/, '').trim(), price });
      }
    });
    return options;
  }

  extractDescription(): string {
    return this.$('.goods-description, .product-detail, #goodsDetail').text().trim().slice(0, 500);
  }

  extractCategory(): string {
    return this.$('.breadcrumb li, .category').last().text().trim() || '';
  }

  extractSupplier(): string {
    return this.$('.seller-name, .shop-name, [class*=seller]').first().text().trim() || '';
  }
}
`;
fs.writeFileSync('/Users/jyekkot/Desktop/kkotium-garden/src/lib/crawler/domemae-parser.ts', content, 'utf8');
console.log('OK', fs.statSync('/Users/jyekkot/Desktop/kkotium-garden/src/lib/crawler/domemae-parser.ts').size, 'bytes');
