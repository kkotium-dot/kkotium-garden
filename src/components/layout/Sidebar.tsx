// ~/Downloads/Sidebar_final.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      category: '메인',
      items: [
        { href: '/dashboard', label: '대시보드', icon: '📊' },
      ],
    },
    {
      category: '상품',
      items: [
        { href: '/products', label: '상품 목록', icon: '📦' },
        { href: '/products/new', label: '상품 등록', icon: '➕' },
        { href: '/naver-seo', label: '🔍 네이버 SEO', icon: '🔍' },  // ✅ 추가!
      ],
    },
    {
      category: '주문',
      items: [
        { href: '/orders', label: '주문 관리', icon: '📋' },
      ],
    },
    {
      category: '크롤링',
      items: [
        { href: '/crawl', label: '도매매 크롤러', icon: '🔗' },
        { href: '/crawler/bulk', label: '대량 크롤링', icon: '🔄' },
      ],
    },
    {
      category: '설정',
      items: [
        { href: '/settings', label: '환경 설정', icon: '⚙️' },
        { href: '/seo', label: '네이버 SEO', icon: '🔍' },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* 상단 로고 영역 */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-purple-50">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">🌸</span>
          </div>
          <div>
            <h2 className="font-bold text-lg bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              꽃틔움 가든
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">스마트스토어 관리</p>
          </div>
        </Link>
      </div>

      {/* 메뉴 영역 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {menuItems.map((section) => (
            <div key={section.category}>
              <h3 className="px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {section.category}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full group ${
                      pathname === item.href
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg scale-105'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 hover:text-pink-600'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    {pathname === item.href && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* 하단 실적 위젯 */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="bg-white rounded-xl p-4 border border-pink-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-pink-600" />
            <h3 className="text-xs font-bold text-gray-900">오늘의 실적</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">💰 매출</span>
              <span className="font-bold text-pink-600">0원</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">📦 주문</span>
              <span className="font-bold text-green-600">0건</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">📊 상품</span>
              <span className="font-bold text-blue-600">0개</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
