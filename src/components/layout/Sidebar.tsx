'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { name: '상품 관리', path: '/', icon: '📦' },
    { name: '새 상품 등록', path: '/products/new', icon: '➕' },
    { name: '대량 업로드', path: '/products/bulk-upload', icon: '📊' },
    { name: '통계', path: '/stats', icon: '📈' },
    { name: '성취', path: '/achievements', icon: '🏆' },
  ];

  return (
    <aside className="w-64 h-screen bg-cream border-r border-beige sticky top-0">
      {/* 로고 영역 */}
      <div className="p-6 border-b border-beige">
        <h1 className="text-2xl font-bold text-pink-main font-poppins">
          🌸 KKOTIUM
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-pretendard">
          꽃티움가든
        </p>
      </div>

      {/* 메뉴 영역 */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200
                  font-pretendard
                  \${
                    pathname === item.path
                      ? 'bg-pink-main text-white shadow-hover'
                      : 'text-text-dark hover:bg-beige'
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 하단 정보 */}
      <div className="absolute bottom-0 w-full p-4 border-t border-beige">
        <div className="bg-beige p-3 rounded-lg">
          <p className="text-xs text-gray-600 font-pretendard">
            레벨 1 • 경험치 0/50
          </p>
          <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
            <div className="bg-pink-main h-2 rounded-full w-0"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
