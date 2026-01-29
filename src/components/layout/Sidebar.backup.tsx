'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
      ],
    },
    {
      category: '크롤링',
      items: [
        { href: '/', label: '단일 크롤링', icon: '🔍' },
        { href: '/crawler/bulk', label: '대량 크롤링', icon: '🔄' },
      ],
    },
    {
      category: '설정',
      items: [
        { href: '/settings', label: '환경 설정', icon: '⚙️' },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <nav className="space-y-6">
          {menuItems.map((section) => (
            <div key={section.category}>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.category}
              </h3>
              <div className="mt-2 space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      pathname === item.href
                        ? 'bg-pink-100 text-pink-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
