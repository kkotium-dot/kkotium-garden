'use client';

interface SortDropdownProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
}

export default function SortDropdown({ sortBy, onSortChange }: SortDropdownProps) {
  const sortOptions = [
    { value: 'created_desc', label: '등록일 최신순' },
    { value: 'created_asc', label: '등록일 오래된순' },
    { value: 'price_desc', label: '가격 높은순' },
    { value: 'price_asc', label: '가격 낮은순' },
    { value: 'margin_desc', label: '마진율 높은순' },
    { value: 'margin_asc', label: '마진율 낮은순' },
    { value: 'name_asc', label: '상품명 가나다순' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">정렬:</span>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
