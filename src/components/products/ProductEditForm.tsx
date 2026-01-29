'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ProductEditFormProps {
  product: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function ProductEditForm({ product, onSubmit, onCancel }: ProductEditFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    supplierPrice: '',
    salePrice: '',
    margin: '',
    shippingFee: '',
    description: '',
    keywords: '',
    mainImage: '',
    status: 'todo',

    // Naver SEO
    naverTitle: '',
    naverKeywords: '',
    naverSeoDescription: '',
    naverCategoryCode: '',
    naverOrigin: '',
    naverTaxType: '',
    naverBrand: '',
    naverManufacturer: '',
    naverShippingMethod: '',
    naverShippingFeeType: '',
    naverAfterServicePolicy: '',

    // 추가 정보
    productStatus: '',
    shippingType: '',
    freeShippingMinPrice: '',
    returnShippingFee: '',
    exchangeShippingFee: '',
    courierCode: '',
    asPhone: '',
    minorPurchase: 'Y',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || '',
        supplierPrice: product.supplierPrice?.toString() || '',
        salePrice: product.salePrice?.toString() || '',
        margin: product.margin?.toString() || '',
        shippingFee: product.shippingFee?.toString() || '',
        description: product.description || '',
        keywords: product.keywords || '',
        mainImage: product.mainImage || '',
        status: product.status || 'todo',

        naverTitle: product.naver_title || '',
        naverKeywords: product.naver_keywords || '',
        naverSeoDescription: product.naver_description || '',
        naverCategoryCode: product.naverCategoryCode || '',
        naverOrigin: product.originCode || '',
        naverTaxType: product.taxType || '',
        naverBrand: product.brand || '',
        naverManufacturer: product.manufacturer || '',
        naverShippingMethod: product.shippingMethod || '',
        naverShippingFeeType: product.shippingPayType || '',
        naverAfterServicePolicy: product.asInfo || '',

        productStatus: product.productStatus || '',
        shippingType: product.shippingType || '',
        freeShippingMinPrice: product.freeShippingMinPrice?.toString() || '',
        returnShippingFee: product.returnShippingFee?.toString() || '',
        exchangeShippingFee: product.exchangeShippingFee?.toString() || '',
        courierCode: product.courierCode || '',
        asPhone: product.asPhone || '',
        minorPurchase: product.minorPurchase || 'Y',
      });

      if (product.mainImage) {
        setImagePreview(product.mainImage);
      }
    }
  }, [product]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!imageFile) return formData.mainImage;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        return data.url;
      } else {
        throw new Error(data.error || '이미지 업로드 실패');
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
      return formData.mainImage;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('상품명을 입력해주세요.');
      return;
    }

    const imageUrl = await uploadImage();

    const submitData = {
      ...formData,
      mainImage: imageUrl,
      imageUrl: imageUrl,
      supplierPrice: parseInt(formData.supplierPrice) || 0,
      salePrice: parseInt(formData.salePrice) || 0,
      margin: parseFloat(formData.margin) || 0,
      shippingFee: parseInt(formData.shippingFee) || 0,
      freeShippingMinPrice: parseInt(formData.freeShippingMinPrice) || 30000,
      returnShippingFee: parseInt(formData.returnShippingFee) || 3000,
      exchangeShippingFee: parseInt(formData.exchangeShippingFee) || 6000,
    };

    onSubmit(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // 마진 자동 계산
    if (name === 'supplierPrice' || name === 'salePrice') {
      const supplier = name === 'supplierPrice' ? parseFloat(value) : parseFloat(formData.supplierPrice);
      const sale = name === 'salePrice' ? parseFloat(value) : parseFloat(formData.salePrice);
      if (supplier && sale && sale > 0) {
        const margin = ((sale - supplier) / sale) * 100;
        setFormData(prev => ({ ...prev, margin: margin.toFixed(1) }));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
      {/* 이미지 업로드 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🖼️ 상품 이미지</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          {imagePreview ? (
            <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden mb-4">
              <Image src={imagePreview} alt="미리보기" fill className="object-contain" />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              이미지를 업로드하세요
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full"
          />
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">📦 기본 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">상품명 *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">카테고리</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="식물 > 관엽식물"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 가격 정보 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">💰 가격 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">도매가</label>
            <input
              type="number"
              name="supplierPrice"
              value={formData.supplierPrice}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">판매가</label>
            <input
              type="number"
              name="salePrice"
              value={formData.salePrice}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">마진 (%)</label>
            <input
              type="text"
              name="margin"
              value={formData.margin}
              readOnly
              className="w-full px-3 py-2 border rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">배송비</label>
            <input
              type="number"
              name="shippingFee"
              value={formData.shippingFee}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 상세 설명 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">📝 상세 설명</h3>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="상품에 대한 상세 설명을 입력하세요"
        />
      </div>

      {/* Naver SEO */}
      <div className="mb-6 bg-purple-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">💜 Naver SEO 최적화</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">네이버 검색 제목 (60자)</label>
            <input
              type="text"
              name="naverTitle"
              value={formData.naverTitle}
              onChange={handleChange}
              maxLength={60}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.naverTitle.length}/60</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">네이버 키워드</label>
            <input
              type="text"
              name="naverKeywords"
              value={formData.naverKeywords}
              onChange={handleChange}
              placeholder="키워드1,키워드2,키워드3"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">네이버 설명</label>
            <textarea
              name="naverSeoDescription"
              value={formData.naverSeoDescription}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 상품 정보 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">📋 상품 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">브랜드</label>
            <input
              type="text"
              name="naverBrand"
              value={formData.naverBrand}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">제조사</label>
            <input
              type="text"
              name="naverManufacturer"
              value={formData.naverManufacturer}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">원산지</label>
            <input
              type="text"
              name="naverOrigin"
              value={formData.naverOrigin}
              onChange={handleChange}
              placeholder="대한민국"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 배송 정보 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🚚 배송 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">무료배송 최소금액</label>
            <input
              type="number"
              name="freeShippingMinPrice"
              value={formData.freeShippingMinPrice}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">반품 배송비</label>
            <input
              type="number"
              name="returnShippingFee"
              value={formData.returnShippingFee}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">교환 배송비</label>
            <input
              type="number"
              name="exchangeShippingFee"
              value={formData.exchangeShippingFee}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 상태 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">📊 상태</h3>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="todo">준비중</option>
          <option value="draft">초안</option>
          <option value="published">판매중</option>
        </select>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={uploading}
          className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50"
        >
          {uploading ? '업로드 중...' : '✅ 수정 완료'}
        </button>
      </div>
    </form>
  );
}
