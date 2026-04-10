'use client';

import { MarginCalculator } from '@/components/products/MarginCalculator';
import CategorySelector from '../selectors/CategorySelector';
import OriginSelector from '../selectors/OriginSelector';

interface ProductBasicFormProps {
  formData: {
    name: string;
    sku: string;
    naverCategoryCode: string;
    naverCategoryPath: string;
    salePrice: string;
    supplierPrice: string;
    stock: string;
    brand: string;
    manufacturer: string;
    originCode: string;
    originName: string;
    shippingFee: string;
    sellerProductCode: string;
    supplierProductCode: string;
    instantDiscount: string;
    importerName: string;
  };
  onChange: (updates: Partial<ProductBasicFormProps['formData']>) => void;
}

export default function ProductBasicForm({ formData, onChange }: ProductBasicFormProps) {
  const handleInput = (field: keyof ProductBasicFormProps['formData']) =>
    (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [field]: e.target.value });

  // Computed display values
  const salePriceNum = parseFloat(formData.salePrice) || 0;
  const discountNum = parseFloat(formData.instantDiscount) || 0;
  const effectivePrice = salePriceNum - discountNum;
  const discountPct = salePriceNum > 0 && discountNum > 0
    ? Math.round((discountNum / salePriceNum) * 100)
    : 0;

  return (
    <div className="flex gap-6">
      {/* LEFT: form fields (60%) */}
      <div className="flex-1 space-y-6 min-w-0">
        <h2 className="text-xl font-black text-gray-900">Basic Info</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* product name */}
          <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-gray-400">({formData.name.length} chars, target 20-26)</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleInput('name')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:outline-none"
              placeholder="e.g. stainless kitchen organizer sink drawer cutlery holder"
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              SKU
              <span className="ml-2 text-xs text-green-600 font-semibold">auto-generated</span>
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={handleInput('sku')}
              className="w-full px-4 py-3 border-2 border-green-300 rounded-xl bg-green-50 focus:outline-none"
              placeholder="KKT-20260228-A3F7"
            />
          </div>

          {/* sale price */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Sale Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.salePrice}
              onChange={handleInput('salePrice')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:outline-none"
              placeholder="28900"
            />
          </div>

          {/* instant discount — directly below sale price */}
          <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Instant Discount
              <span className="ml-2 text-xs text-blue-600 font-normal">Naver coupon / immediate discount</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={formData.instantDiscount}
                onChange={handleInput('instantDiscount')}
                className="w-48 px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-400 focus:outline-none"
                placeholder="0"
              />
              {/* Real-time effective price display */}
              {discountNum > 0 && salePriceNum > 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-sm text-gray-500 line-through">{salePriceNum.toLocaleString()}won</span>
                  <span className="text-blue-600 font-bold">-{discountPct}%</span>
                  <span className="text-lg font-extrabold text-blue-700">{effectivePrice.toLocaleString()}won</span>
                </div>
              )}
            </div>
          </div>

          {/* supplier price */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Supplier Price</label>
            <input
              type="number"
              value={formData.supplierPrice}
              onChange={handleInput('supplierPrice')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:outline-none"
              placeholder="17340"
            />
          </div>

          {/* stock */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Stock</label>
            <input
              type="number"
              value={formData.stock}
              onChange={handleInput('stock')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:outline-none"
              placeholder="150"
            />
          </div>

          {/* brand */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Brand
              <span className="ml-2 text-xs text-yellow-600">search visibility</span>
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={handleInput('brand')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:outline-none"
              placeholder="e.g. Lifestyle"
            />
          </div>

          {/* manufacturer */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Manufacturer
              <span className="ml-2 text-xs text-yellow-600">trust signal</span>
            </label>
            <input
              type="text"
              value={formData.manufacturer}
              onChange={handleInput('manufacturer')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:outline-none"
              placeholder="e.g. Kkotium"
            />
          </div>

          {/* shipping fee */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Shipping Fee</label>
            <input
              type="number"
              value={formData.shippingFee}
              onChange={handleInput('shippingFee')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:outline-none"
              placeholder="3500"
            />
          </div>

          {/* category selector */}
          <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Naver Category <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-gray-400">4-level cascade (4,993 items)</span>
            </label>
            <CategorySelector
              valueCode={formData.naverCategoryCode}
              valuePath={formData.naverCategoryPath}
              onChange={({ code, fullPath }) =>
                onChange({ naverCategoryCode: code, naverCategoryPath: fullPath })
              }
            />
          </div>

          {/* origin selector */}
          <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Origin
              <span className="ml-2 text-xs text-gray-400">select country / region (518 codes)</span>
            </label>
            <OriginSelector
              value={formData.originCode}
              importerName={formData.importerName}
              onChange={(code, name) => onChange({ originCode: code, originName: name })}
              onImporterChange={(val) => onChange({ importerName: val })}
            />
          </div>

          {/* seller product code */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Seller Product Code
              <span className="ml-2 text-xs text-gray-400">optional</span>
            </label>
            <input
              type="text"
              value={formData.sellerProductCode}
              onChange={handleInput('sellerProductCode')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:outline-none"
              placeholder="e.g. DMM-12345"
            />
          </div>

          {/* supplier product code */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Supplier Product Code
              <span className="ml-2 text-xs text-gray-400">optional</span>
            </label>
            <input
              type="text"
              value={formData.supplierProductCode}
              onChange={handleInput('supplierProductCode')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:outline-none"
              placeholder="e.g. 12345"
            />
          </div>
        </div>
      </div>

      {/* RIGHT: Margin Calculator Panel (40%) - sticky */}
      <div className="w-[380px] flex-shrink-0">
        <div className="sticky top-6 bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
          <MarginCalculator
            supplierPrice={parseFloat(formData.supplierPrice) || 0}
            salePrice={parseFloat(formData.salePrice) || 0}
            instantDiscount={parseFloat(formData.instantDiscount) || 0}
            shippingFee={parseFloat(formData.shippingFee) || 0}
            categoryPath={formData.naverCategoryPath}
            onSupplierPriceChange={(p) => onChange({ supplierPrice: String(p) })}
            onSalePriceChange={(p) => onChange({ salePrice: String(p) })}
            onInstantDiscountChange={(d) => onChange({ instantDiscount: String(d) })}
            onCategoryChange={(cat) => onChange({ naverCategoryCode: cat.code, naverCategoryPath: cat.fullPath })}
          />
        </div>
      </div>
    </div>
  );
}
