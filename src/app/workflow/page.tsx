'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function WorkflowPage() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    {
      id: 1,
      icon: '🔍',
      title: 'Step 1: 상품 수집',
      subtitle: '도매매에서 상품 크롤링',
      description: '도매매 사이트에서 원하는 상품을 검색하고 자동으로 수집합니다.',
      actions: [
        {
          label: '키워드 검색 크롤링',
          href: '/crawl',
          description: '키워드로 20개 빠르게 수집',
          color: 'bg-blue-500 hover:bg-blue-600'
        },
        {
          label: 'URL 정밀 크롤링',
          href: '/crawler',
          description: '상품 URL로 1개씩 정확하게',
          color: 'bg-purple-500 hover:bg-purple-600'
        },
        {
          label: '도매매 전용 크롤러',
          href: '/domemae-crawler',
          description: 'API 기반 고급 크롤링',
          color: 'bg-pink-500 hover:bg-pink-600'
        }
      ],
      tips: [
        '💡 처음에는 "키워드 검색"으로 여러 상품을 빠르게 수집하세요',
        '💡 특정 상품이 마음에 들면 "URL 정밀"로 다시 수집하세요',
        '💡 도매매 전용 크롤러는 가장 정확하지만 API 키가 필요합니다'
      ]
    },
    {
      id: 2,
      icon: '📦',
      title: 'Step 2: 수집 상품 관리',
      subtitle: '수집된 상품 검토 및 선택',
      description: '수집한 상품을 확인하고 판매할 상품을 선택합니다.',
      actions: [
        {
          label: '수집된 상품 보기',
          href: '/sourced',
          description: '크롤링한 상품 목록 확인',
          color: 'bg-green-500 hover:bg-green-600'
        }
      ],
      tips: [
        '💡 마진율을 확인하고 60% 이상인 상품을 선택하세요',
        '💡 이미지가 깨끗하고 상품명이 명확한지 확인하세요',
        '💡 여러 상품을 선택해서 한 번에 처리할 수 있습니다'
      ]
    },
    {
      id: 3,
      icon: '✅',
      title: 'Step 3: 상품 승인',
      subtitle: 'Products 테이블로 이동',
      description: '선택한 상품을 승인하여 판매 준비 상태로 만듭니다.',
      actions: [
        {
          label: '상품 승인하기',
          href: '/sourced',
          description: '수집 상품을 Products로 이동',
          color: 'bg-blue-500 hover:bg-blue-600'
        }
      ],
      tips: [
        '💡 승인하면 sourced_products → products 테이블로 이동합니다',
        '💡 승인 후에는 상품 정보를 수정할 수 있습니다',
        '💡 SKU가 자동으로 생성됩니다'
      ]
    },
    {
      id: 4,
      icon: '🚀',
      title: 'Step 4: 네이버 등록',
      subtitle: '스마트스토어에 상품 등록',
      description: '승인된 상품을 네이버 스마트스토어에 자동으로 등록합니다.',
      actions: [
        {
          label: '네이버 등록하기',
          href: '/sourced',
          description: '스마트스토어 자동 등록',
          color: 'bg-green-500 hover:bg-green-600'
        }
      ],
      tips: [
        '💡 현재는 시뮬레이션 모드입니다 (실제 API 연동 예정)',
        '💡 등록되면 네이버 상품 ID가 생성됩니다',
        '💡 등록 후 스마트스토어에서 최종 확인하세요'
      ]
    },
    {
      id: 5,
      icon: '📊',
      title: 'Step 5: 상품 관리',
      subtitle: '등록된 상품 모니터링',
      description: '등록된 상품의 재고, 가격, 판매 현황을 관리합니다.',
      actions: [
        {
          label: '등록된 상품 보기',
          href: '/products',
          description: 'Products 목록 확인',
          color: 'bg-purple-500 hover:bg-purple-600'
        },
        {
          label: '대시보드',
          href: '/dashboard',
          description: '전체 현황 보기',
          color: 'bg-pink-500 hover:bg-pink-600'
        }
      ],
      tips: [
        '💡 정기적으로 재고를 확인하세요',
        '💡 도매가가 변경되면 판매가도 업데이트하세요',
        '💡 판매량이 많은 상품은 별도 관리하세요'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">📖</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-4">
            꽃틔움 가든 사용 가이드
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            도매매 상품 수집부터 네이버 스마트스토어 등록까지, 단계별로 따라하세요!
          </p>
          
          <div className="flex justify-center gap-4">
            <Link
              href="/crawl"
              className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg font-bold rounded-xl hover:from-pink-600 hover:to-purple-700 shadow-lg transform hover:scale-105 transition"
            >
              🚀 지금 시작하기
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-white text-gray-700 text-lg font-bold rounded-xl hover:bg-gray-50 shadow-lg border-2 border-gray-200 transition"
            >
              📊 대시보드 보기
            </Link>
          </div>
        </div>

        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-center mb-8">전체 프로세스</h2>
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg ${
                      activeStep === step.id 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 scale-110' 
                        : 'bg-gradient-to-r from-gray-100 to-gray-200'
                    } transition-all cursor-pointer`}
                    onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}>
                      {step.icon}
                    </div>
                    <p className="text-xs font-semibold mt-2 text-center">
                      Step {step.id}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-8 h-1 bg-gradient-to-r from-pink-200 to-purple-200 mx-2"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all ${
                activeStep === step.id ? 'ring-4 ring-pink-500' : ''
              }`}
            >
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{step.icon}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">{step.title}</h3>
                      <p className="text-gray-600">{step.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-3xl text-gray-400">
                    {activeStep === step.id ? '▼' : '▶'}
                  </div>
                </div>
              </div>

              {activeStep === step.id && (
                <div className="px-6 pb-6 border-t border-gray-200 pt-6">
                  
                  <p className="text-lg text-gray-700 mb-6">{step.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {step.actions.map((action, idx) => (
                      <Link
                        key={idx}
                        href={action.href}
                        className={`${action.color} text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition`}
                      >
                        <h4 className="text-lg font-bold mb-2">{action.label}</h4>
                        <p className="text-sm opacity-90">{action.description}</p>
                      </Link>
                    ))}
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                    <h4 className="font-bold text-yellow-800 mb-2">💡 꿀팁</h4>
                    <ul className="space-y-2">
                      {step.tips.map((tip, idx) => (
                        <li key={idx} className="text-yellow-800 text-sm">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-center mb-8">자주 묻는 질문 (FAQ)</h2>
          <div className="space-y-4">
            {[
              {
                q: '도매매 사이트가 점검중인데 어떻게 하나요?',
                a: '도매매가 점검중일 때는 크롤링이 불가능합니다. 점검 종료 후 다시 시도해주세요. 또는 수동으로 상품 정보를 입력할 수도 있습니다.'
              },
              {
                q: '마진율은 어떻게 계산되나요?',
                a: '마진율 = ((판매가 - 도매가) / 도매가) × 100 입니다. 예: 도매가 10,000원, 판매가 20,000원 = 100% 마진'
              },
              {
                q: '네이버 API 연동은 언제 되나요?',
                a: '현재는 시뮬레이션 모드입니다. 실제 네이버 스마트스토어 API 연동은 다음 업데이트에서 제공될 예정입니다.'
              },
              {
                q: '한 번에 몇 개까지 등록할 수 있나요?',
                a: '제한 없습니다! 키워드 검색은 한 번에 20개, URL 크롤링은 원하는 만큼 반복할 수 있습니다.'
              },
              {
                q: '상품 정보를 수정할 수 있나요?',
                a: '네! 수집 후 /sourced 페이지에서 승인 전에 수정하거나, 승인 후 /products 페이지에서 언제든 수정 가능합니다.'
              }
            ].map((faq, idx) => (
              <details
                key={idx}
                className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition"
              >
                <summary className="font-bold text-gray-800">❓ {faq.q}</summary>
                <p className="mt-2 text-gray-700 pl-6">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
            <h2 className="text-3xl font-bold mb-4">준비되셨나요?</h2>
            <p className="text-xl mb-6">
              지금 바로 첫 번째 상품을 수집하고, 자동화된 판매를 시작하세요!
            </p>
            <Link
              href="/crawl"
              className="inline-block px-12 py-4 bg-white text-pink-600 text-xl font-bold rounded-xl hover:bg-gray-100 shadow-lg transform hover:scale-105 transition"
            >
              🚀 상품 수집 시작하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
