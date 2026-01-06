'use client';

import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  imageUrl?: string | null;
  category?: string | null;
  vendorName?: string | null;
  status: string;
  aiScore?: number | null;
}

interface ProductCardProps {
  product: Product;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ProductCard = ({ product, onEdit, onDelete }: ProductCardProps) => {
  const margin = ((product.price - product.originalPrice) / product.originalPrice * 100).toFixed(1);
  const marginColor = parseFloat(margin) >= 0 ? 'text-green' : 'text-red';

  const statusColors = {
    todo: 'bg-beige text-text-dark',
    active: 'bg-pink-light text-white',
    done: 'bg-green text-white',
  };

  const statusText = {
    todo: '등록대기',
    active: '판매중',
    done: '완료',
  };

  return (
    <Card hover>
      <div className="flex gap-4">
        {/* 이미지 영역 */}
        <div className="w-24 h-24 bg-beige rounded-lg flex items-center justify-center flex-shrink-0">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <span className="text-4xl">📦</span>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-text-dark font-pretendard">
              {product.name}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                statusColors[product.status as keyof typeof statusColors]
              }`}
            >
              {statusText[product.status as keyof typeof statusText]}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-gray-500">
              {product.category || '미분류'}
            </span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-500">
              {product.vendorName || '공급업체 없음'}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-pink-main">
                  {product.price.toLocaleString()}원
                </span>
                <span className="text-sm text-gray-400 line-through">
                  {product.originalPrice.toLocaleString()}원
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${marginColor}`}>
                  마진율: {margin}%
                </span>
                {product.aiScore && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gold">
                      AI 점수: {product.aiScore}/100
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 버튼 영역 */}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                수정
              </Button>
              <Button variant="danger" size="sm" onClick={onDelete}>
                삭제
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;
