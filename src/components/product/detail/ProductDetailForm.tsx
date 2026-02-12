'use client';

interface ProductDetailFormProps {
  description: string;
  onChange: (value: string) => void;
}

export default function ProductDetailForm({ description, onChange }: ProductDetailFormProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
        📝 상세 설명
      </h2>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          상세 설명
        </label>
        <textarea
          value={description}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 h-64"
          placeholder="상품의 상세한 설명을 입력하세요.

예시:
- 304 스테인리스 소재로 제작되어 녹이 슬지 않고 오래 사용 가능
- 싱크대 서랍, 선반, 냉장고 정리에 모두 활용 가능
- 깔끔한 디자인으로 주방 인테리어와 잘 어울림"
        />
        <p className="text-xs text-gray-500 mt-1">
          {description.length}자 입력됨
        </p>
      </div>
    </div>
  );
}
