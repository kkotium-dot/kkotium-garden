'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  productSku: string;
  quantity: number;
  price: number;
  options: string;
  product?: {
    id: string;
    mainImage: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  shippingZipcode: string;
  shippingRequest: string;
  paymentMethod: string;
  totalPrice: number;
  shippingFee: number;
  discount: number;
  status: string;
  trackingNumber?: string;
  courierCompany?: string;
  adminMemo?: string;
  orderDate: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  items: OrderItem[];
}

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: '결제대기', color: 'bg-gray-100 text-gray-800' },
  { value: 'paid', label: '결제완료', color: 'bg-blue-100 text-blue-800' },
  { value: 'preparing', label: '배송준비', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'shipping', label: '배송중', color: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: '배송완료', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: '취소', color: 'bg-red-100 text-red-800' },
  { value: 'refunded', label: '환불', color: 'bg-red-100 text-red-800' },
];

const COURIER_COMPANIES = [
  { value: 'CJ대한통운', label: 'CJ대한통운' },
  { value: '한진택배', label: '한진택배' },
  { value: '롯데택배', label: '롯데택배' },
  { value: '우체국택배', label: '우체국택배' },
  { value: 'GS25', label: 'GS25' },
  { value: 'CU', label: 'CU' },
];

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 수정 폼 상태
  const [status, setStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierCompany, setCourierCompany] = useState('');
  const [adminMemo, setAdminMemo] = useState('');

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      const data = await res.json();

      if (data.success) {
        setOrder(data.order);
        setStatus(data.order.status);
        setTrackingNumber(data.order.trackingNumber || '');
        setCourierCompany(data.order.courierCompany || '');
        setAdminMemo(data.order.adminMemo || '');
      } else {
        alert('주문을 찾을 수 없습니다');
        router.push('/orders');
      }
    } catch (error) {
      console.error('주문 조회 실패:', error);
      alert('주문 조회에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const handleSave = async () => {
    if (!order) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          trackingNumber: trackingNumber || null,
          courierCompany: courierCompany || null,
          adminMemo: adminMemo || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('주문이 수정되었습니다');
        fetchOrder();
      } else {
        alert(data.error || '주문 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('주문 수정 실패:', error);
      alert('주문 수정에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR') + '원';
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">주문을 불러오는 중...</p>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const currentStatusOption = ORDER_STATUS_OPTIONS.find((opt) => opt.value === order.status);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <Link
            href="/orders"
            className="text-purple-600 hover:text-purple-700 mb-2 inline-block"
          >
            ← 목록으로
          </Link>
          <h1 className="text-3xl font-bold">주문 상세</h1>
          <p className="text-gray-600 mt-1">{order.orderNumber}</p>
        </div>
        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            currentStatusOption?.color || 'bg-gray-100 text-gray-800'
          }`}
        >
          {currentStatusOption?.label || order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 주문 정보 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 주문 상품 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">주문 상품</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 border-b pb-4 last:border-b-0">
                  {item.product?.mainImage && (
                    <img
                      src={item.product.mainImage}
                      alt={item.productName}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{item.productName}</h3>
                    <p className="text-sm text-gray-500">SKU: {item.productSku}</p>
                    {item.options && (
                      <p className="text-sm text-gray-500">옵션: {item.options}</p>
                    )}
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-sm text-gray-600">수량: {item.quantity}개</span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 금액 요약 */}
            <div className="mt-6 pt-6 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">상품 금액</span>
                <span>{formatPrice(order.totalPrice - order.shippingFee + order.discount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">배송비</span>
                <span>{formatPrice(order.shippingFee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>할인</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>총 결제금액</span>
                <span className="text-purple-600">{formatPrice(order.totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* 고객 정보 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">고객 정보</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-gray-600">이름</span>
                <span className="col-span-2 font-medium">{order.customerName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-gray-600">연락처</span>
                <span className="col-span-2">{order.customerPhone}</span>
              </div>
              {order.customerEmail && (
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-600">이메일</span>
                  <span className="col-span-2">{order.customerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* 배송 정보 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">배송 정보</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-gray-600">주소</span>
                <span className="col-span-2">
                  ({order.shippingZipcode}) {order.shippingAddress}
                </span>
              </div>
              {order.shippingRequest && (
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-600">배송 요청사항</span>
                  <span className="col-span-2">{order.shippingRequest}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <span className="text-gray-600">결제 방법</span>
                <span className="col-span-2">{order.paymentMethod}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 주문 관리 */}
        <div className="space-y-6">
          {/* 상태 관리 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">주문 관리</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  주문 상태
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  택배사
                </label>
                <select
                  value={courierCompany}
                  onChange={(e) => setCourierCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">선택하세요</option>
                  {COURIER_COMPANIES.map((company) => (
                    <option key={company.value} value={company.value}>
                      {company.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  송장번호
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="송장번호 입력"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  관리자 메모
                </label>
                <textarea
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  rows={3}
                  placeholder="관리자 메모 (고객에게 보이지 않음)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? '저장 중...' : '변경사항 저장'}
              </button>
            </div>
          </div>

          {/* 주문 이력 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">주문 이력</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">주문일시</span>
                <span>{formatDate(order.orderDate)}</span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">결제일시</span>
                  <span>{formatDate(order.paidAt)}</span>
                </div>
              )}
              {order.shippedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">배송시작</span>
                  <span>{formatDate(order.shippedAt)}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">배송완료</span>
                  <span>{formatDate(order.deliveredAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
