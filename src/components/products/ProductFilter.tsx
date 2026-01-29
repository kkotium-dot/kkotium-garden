'use client';

interface Props {
  filters: {
    category: string;
    status: string;
    minPrice: string;
    maxPrice: string;
  };
  setFilters: (filters: any) => void;
}

export default function ProductFilter({ filters, setFilters }: Props) {
  const handleChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleReset = () => {
    setFilters({
      category: '',
      status: '',
      minPrice: '',
      maxPrice: '',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          카테고리
        </label>
        <select
          value={filters.category}
          onChange={(e) => handleChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        >
          <option value="">전체</option>
          <option value="flower">꽃다발</option>
          <option value="bouquet">부케</option>
          <option value="basket">바구니</option>
          <option value="plant">화분</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          상태
        </label>
        <select
          value={filters.status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        >
          <option value="">전체</option>
          <option value="DRAFT">초안</option>
          <option value="ACTIVE">판매중</option>
          <option value="SOLD_OUT">품절</option>
          <option value="HIDDEN">숨김</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          최소 가격
        </label>
        <input
          type="number"
          value={filters.minPrice}
          onChange={(e) => handleChange('minPrice', e.target.value)}
          placeholder="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          최대 가격
        </label>
        <input
          type="number"
          value={filters.maxPrice}
          onChange={(e) => handleChange('maxPrice', e.target.value)}
          placeholder="999999"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      <div className="md:col-span-4 flex justify-end">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          필터 초기화
        </button>
      </div>
    </div>
  );
}
