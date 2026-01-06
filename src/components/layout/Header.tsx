'use client';

const Header = () => {
  return (
    <header className="h-16 bg-white border-b border-beige sticky top-0 z-10">
      <div className="h-full px-6 flex items-center justify-between">
        {/* 검색 영역 */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="상품 검색..."
              className="w-full px-4 py-2 pl-10 border border-beige rounded-lg focus:outline-none focus:border-pink-main font-pretendard"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              🔍
            </span>
          </div>
        </div>

        {/* 우측 액션 영역 */}
        <div className="flex items-center gap-4">
          {/* 알림 */}
          <button className="relative p-2 hover:bg-beige rounded-lg transition-colors">
            <span className="text-xl">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red rounded-full"></span>
          </button>

          {/* 사용자 정보 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-beige rounded-lg">
            <span className="text-xl">👤</span>
            <span className="text-sm font-pretendard text-text-dark">
              꽃티움
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
