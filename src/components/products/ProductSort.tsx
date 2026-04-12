'use client';

interface SortOption {
  label: string;
  value: string;
  icon?: string;
}

interface ProductSortProps {
  currentSort: string;
  onSortChange: (sort: string) => void;
}

export default function ProductSort({ currentSort, onSortChange }: ProductSortProps) {
  const sortOptions: SortOption[] = [
    { label: '최신순', value: 'date_desc', icon: '🆕' },
    { label: '오래된순', value: 'date_asc' },
    { label: '이름 (가→하)', value: 'name_asc' },
    { label: '이름 (하→가)', value: 'name_desc' },
    { label: '가격 낮은순', value: 'price_asc', icon: '💰' },
    { label: '가격 높은순', value: 'price_desc' },
    { label: '마진 높은순', value: 'margin_desc' },
    { label: '마진 낮은순', value: 'margin_asc', icon: '📉' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">정렬:</span>
      <select
        value={currentSort}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.icon} {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
