'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Search, Package, CheckCircle, Upload, BarChart2,
  ChevronDown, ChevronRight, Lightbulb, ArrowRight,
} from 'lucide-react';

interface Step {
  id: number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  actions: { label: string; href: string; description: string }[];
  tips: string[];
}

export default function WorkflowPage() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps: Step[] = [
    {
      id: 1,
      icon: <Search size={28} />,
      title: '1단계: 상품 수집',
      subtitle: '꿀통 사냥터에서 도매 상품 크롤링',
      description: '도매매·도매꾹에서 판매할 상품을 검색하고 소싱 보관함에 저장합니다.',
      actions: [
        { label: '꿀통 사냥터 이동', href: '/crawl', description: 'URL 크롤링 · 대량 수집 · 소싱 보관함' },
      ],
      tips: [
        '처음에는 URL 단건 크롤링으로 상품을 하나씩 확인하세요',
        '마음에 드는 상품은 소싱 보관함에 저장해두고 한 번에 등록할 수 있습니다',
        '도매꾹 API 키를 설정하면 재고·배송 정보가 자동으로 불러와집니다',
      ],
    },
    {
      id: 2,
      icon: <Package size={28} />,
      title: '2단계: 상품 등록 준비',
      subtitle: '씨앗 심기에서 상품 정보 완성',
      description: '수집한 상품에 카테고리·키워드·이미지를 추가해 네이버 등록 준비를 마칩니다.',
      actions: [
        { label: '씨앗 심기 이동', href: '/products/new', description: '상품 정보 입력 · SEO 검색최적화 · 마진 계산' },
        { label: '소싱 보관함에서 바로 시작', href: '/crawl', description: '상품 선택 후 등록 시작 버튼' },
      ],
      tips: [
        'AI SEO 검색최적화 버튼으로 카테고리·키워드·상품명을 자동 생성할 수 있습니다',
        '실전 마진 계산기에서 광고 켜도 손해가 안 나는지 미리 확인하세요',
        '상품코드(SKU)는 자동으로 생성되므로 비워두어도 됩니다',
      ],
    },
    {
      id: 3,
      icon: <CheckCircle size={28} />,
      title: '3단계: 등록 검토',
      subtitle: '정원 창고에서 상품 목록 확인',
      description: '등록된 상품 목록을 확인하고 누락된 정보를 보완합니다.',
      actions: [
        { label: '정원 창고 이동', href: '/products', description: '상품 목록 · 준비도 확인 · 인라인 빠른 편집' },
      ],
      tips: [
        '판매가는 목록에서 더블클릭으로 바로 수정할 수 있습니다',
        '업로드 준비도가 80% 이상인 상품부터 등록하는 것을 권장합니다',
        '꼬띠 추천 상품은 매일 오전 8시 대시보드에서 확인할 수 있습니다',
      ],
    },
    {
      id: 4,
      icon: <Upload size={28} />,
      title: '4단계: 네이버 업로드',
      subtitle: '엑셀 다운로드 후 스마트스토어 등록',
      description: '엑셀 파일을 다운로드하고 네이버 스마트스토어에 상품을 업로드합니다.',
      actions: [
        { label: '정원 창고 엑셀 다운로드', href: '/products', description: '상품 선택 후 엑셀 다운로드' },
      ],
      tips: [
        '상품을 선택하고 엑셀 다운로드 버튼을 누르면 네이버 형식 파일이 생성됩니다',
        '스마트스토어 센터 → 상품 → 상품 일괄등록에서 파일을 업로드하세요',
        '상세 이미지가 없는 상품은 전환율이 낮으니 업로드 전에 추가하세요',
      ],
    },
    {
      id: 5,
      icon: <BarChart2 size={28} />,
      title: '5단계: 운영 관리',
      subtitle: '대시보드에서 전체 현황 모니터링',
      description: '판매 현황, 품절 상품, 꼬띠 추천을 확인하며 스토어를 운영합니다.',
      actions: [
        { label: '대시보드 이동', href: '/dashboard', description: '오늘의 실적 · 꼬띠 추천 · 파이프라인 현황' },
        { label: '주문 관리 이동', href: '/orders', description: '주문 확인 · 송장 등록 · 취소 처리' },
      ],
      tips: [
        '공급가가 5% 이상 변동되면 매주 월요일 디스코드로 자동 알림을 받습니다',
        '30일 이상 판매가 없는 상품은 좀비 부활소에서 재활성화하세요',
        '검색 조련사에서 상품명과 키워드를 주기적으로 최적화하면 노출이 늘어납니다',
      ],
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#FEF0F3' }}>
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1A1A1A', margin: '0 0 8px' }}>
            꽃틔움 가든 운영 가이드
          </h1>
          <p style={{ fontSize: 14, color: '#888', margin: '0 0 20px' }}>
            소싱부터 네이버 등록까지 5단계로 따라하세요
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <Link
              href="/crawl"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: '#e62310', color: '#fff', textDecoration: 'none',
              }}
            >
              <Search size={13} /> 상품 수집 시작
            </Link>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: '#fff', color: '#1A1A1A', border: '1.5px solid #F8DCE5',
                textDecoration: 'none',
              }}
            >
              <BarChart2 size={13} /> 대시보드 보기
            </Link>
          </div>
        </div>

        {/* Step list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {steps.map((step) => {
            const isOpen = activeStep === step.id;
            return (
              <div
                key={step.id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: isOpen ? '1.5px solid #e62310' : '1.5px solid #F8DCE5',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Header row */}
                <button
                  onClick={() => setActiveStep(isOpen ? null : step.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 14, padding: '16px 20px',
                    background: isOpen ? '#FFF0F5' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: isOpen ? '#e62310' : '#FEF0F3',
                    color: isOpen ? '#fff' : '#e62310',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {step.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>{step.title}</p>
                    <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0 }}>{step.subtitle}</p>
                  </div>
                  <div style={{ color: '#B0A0A8', flexShrink: 0 }}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F8DCE5' }}>
                    <p style={{ fontSize: 13, color: '#555', margin: '14px 0 16px', lineHeight: 1.7 }}>
                      {step.description}
                    </p>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {step.actions.map((action, idx) => (
                        <Link
                          key={idx}
                          href={action.href}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 16px', borderRadius: 10,
                            background: '#FEF0F3', border: '1.5px solid #FFB3CE',
                            textDecoration: 'none',
                          }}
                        >
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#e62310', margin: 0 }}>{action.label}</p>
                            <p style={{ fontSize: 11, color: '#B0A0A8', margin: 0 }}>{action.description}</p>
                          </div>
                          <ArrowRight size={14} style={{ color: '#e62310', flexShrink: 0 }} />
                        </Link>
                      ))}
                    </div>

                    {/* Tips */}
                    <div style={{
                      background: '#fffbeb', border: '1px solid #fde68a',
                      borderRadius: 10, padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Lightbulb size={13} style={{ color: '#b45309' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>운영 꿀팁</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {step.tips.map((tip, idx) => (
                          <li key={idx} style={{ fontSize: 12, color: '#78350f', lineHeight: 1.8 }}>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div style={{
          marginTop: 32, padding: '24px 20px', borderRadius: 16, textAlign: 'center',
          background: '#fff', border: '1.5px solid #F8DCE5',
        }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: '0 0 6px' }}>준비되셨나요?</p>
          <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px' }}>
            지금 바로 첫 상품을 수집하고 판매를 시작하세요
          </p>
          <Link
            href="/crawl"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: '#e62310', color: '#fff', textDecoration: 'none',
            }}
          >
            <Search size={13} /> 상품 수집 시작하기
          </Link>
        </div>

      </div>
    </div>
  );
}
