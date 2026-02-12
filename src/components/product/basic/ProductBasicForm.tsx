'use client';

interface ProductBasicFormProps {
  formData: {
    name: string;
    sku: string;
    category: string;
    salePrice: string;
    supplierPrice: string;
    stock: string;
    brand: string;
    manufacturer: string;
    origin: string;
    shippingFee: string;
  };
  onChange: (updates: any) => void;
}

export default function ProductBasicForm({ formData, onChange }: ProductBasicFormProps) {
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ [field]: e.target.value });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
        📦 기본 정보
      </h2>

      <div className="grid grid-cols-2 gap-6">
        {/* 상품명 */}
        <div className="col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            상품명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={handleChange('name')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
            placeholder="주방정리함 스테인리스 싱크대 서랍형 수저통 주방용품 정리 수납케이스"
          />
        </div>

        {/* SKU */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            SKU <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-green-600">✅ 자동생성됨</span>
          </label>
          <input
            type="text"
            value={formData.sku}
            onChange={handleChange('sku')}
            className="w-full px-4 py-3 border-2 border-green-300 rounded-xl bg-green-50"
            placeholder="PR0D-PXUKPX"
            readOnly
          />
          <p className="text-xs text-gray-500 mt-1">
            ⚠️ 상품명 입력 시 자동 생성됩니다 (직접 입력도 가능)
          </p>
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            카테고리 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={handleChange('category')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
            placeholder="주방/생활"
          />
        </div>

        {/* 판매가 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            판매가 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.salePrice}
            onChange={handleChange('salePrice')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
            placeholder="28900"
          />
        </div>

        {/* 공급가 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            공급가
          </label>
          <input
            type="number"
            value={formData.supplierPrice}
            onChange={handleChange('supplierPrice')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
            placeholder="17340"
          />
          <p className="text-xs text-gray-500 mt-1">
            💰 마진율: {formData.supplierPrice && formData.salePrice 
              ? ((parseFloat(formData.salePrice) - parseFloat(formData.supplierPrice)) / parseFloat(formData.salePrice) * 100).toFixed(1) 
              : 0}%
          </p>
        </div>

        {/* 재고수량 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            재고수량 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.stock}
            onChange={handleChange('stock')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
            placeholder="150"
          />
        </div>

        {/* 브랜드 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            브랜드 <span className="ml-2 text-xs text-yellow-600">⭐ 검색 노출</span>
          </label>
          <input
            type="text"
            value={formData.brand}
            onChange={handleChange('brand')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
            placeholder="라이프스타일"
          />
        </div>

        {/* 제조사 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            제조사 <span className="ml-2 text-xs text-yellow-600">⭐ 신뢰도</span>
          </label>
          <input
            type="text"
            value={formData.manufacturer}
            onChange={handleChange('manufacturer')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
            placeholder="꽃틔움(협력사)"
          />
        </div>

        {/* 원산지 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            원산지
          </label>
          <select
            value={formData.origin}
            onChange={handleChange('origin')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
          >
            <option value="0200037">국내산</option>
            <option value="0200038">중국산</option>
            <option value="0200039">미국산</option>
          </select>
        </div>

        {/* 배송비 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            배송비
          </label>
          <input
            type="number"
            value={formData.shippingFee}
            onChange={handleChange('shippingFee')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
            placeholder="3500"
          />
        </div>
      </div>
    </div>
  );
}
